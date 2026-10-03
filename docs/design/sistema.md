# FinnApp — desenho do sistema

**Versão:** 1 · outubro de 2026
**Escopo:** do Open Finance (Pluggy) até a tela e o Finn. Cobre ingestão, livro-caixa, API, app, agente, operação e crescimento.

Este documento parte do que já existe:
- **finnApp** — domínio contábil testado: `Entry` com caixa e competência, `CashStatement`, `CreditCard`, `BusinessCalendar` e `RecurrenceDetector`.
- **finn-agent** — integração Pluggy, 35 ferramentas MCP sobre SQLite e Hermes como runtime.

Hoje os dois têm **domínios contábeis paralelos**. O desenho elimina a duplicação: o finnApp vira dono dos números, e o Finn vira cliente da API.

---

## 1. Requisitos

### Funcionais (v1, uso pessoal)

1. Conectar contas e cartões via Pluggy pelo próprio app (Pluggy Connect) e manter tudo sincronizado sem ação manual.
2. **Extrato (caixa)** por conta e para todas as contas, com o saldo fechando no centavo e conferido contra o saldo do banco.
3. **Mês a mês (competência)**: cartão no mês da compra, parcelas distribuídas e fatura paga sem contar de novo.
4. Classificar automaticamente cada lançamento:
   - entrada, despesa, transferência entre contas próprias;
   - compra no cartão, estorno, pagamento de fatura;
   - aporte em meta.
   O usuário corrige, e a correção sobrevive a novas sincronizações.
5. Lançamentos manuais (Carteira, dinheiro físico) e "Contar a carteira" com ajuste.
6. Sugerir contas fixas a partir de pagamentos recorrentes fora do cartão (Pix, boleto, débito) e confirmar com um toque.
7. O Finn responde perguntas usando a API. Nunca calcula, só narra o que a API devolveu.

**Depois da v1:** orçamento, metas com aporte, previsão de meses futuros, investimentos, imposto de renda, vários usuários.

### Não funcionais

| Requisito | Alvo | Por quê |
|---|---|---|
| Correção do saldo | diferença livro × banco = R$ 0,00 em ≥ 99% das contas-dia; toda diferença gera alerta | é o produto |
| Resposta ao webhook da Pluggy | 2xx em < 200 ms (p99) | a Pluggy desiste depois de 10 s e só tenta 3 vezes |
| Frescor | lançamento visível ≤ 2 min depois do webhook | "o que acabou de acontecer" precisa aparecer |
| Leitura de extrato/mês | p95 < 150 ms | tela abre instantânea |
| Disponibilidade | 99% (VPS única) na v1 | uso pessoal; perder minutos não perde dado |
| Durabilidade | RPO 15 min, RTO 4 h | dado financeiro; a Pluggy guarda só 365 dias para reimportar |
| Privacidade | nenhuma senha de banco no sistema; CPF/CNPJ de terceiros só em HMAC fora do bruto | LGPD; a Pluggy guarda as credenciais |

### Restrições

- Uma pessoa desenvolve, com Claude Code executando. A operação tem que caber num `docker compose`.
- Stack decidida: Node/TS, Postgres 16, Expo (ADR 001).
- Uso comercial da Pluggy ainda sem aprovação: a v1 é de um usuário (Meu Pluggy).
- Regras contábeis não negociáveis (ADR 002 e `CLAUDE.md`).

### Volume (premissas)

- **Uso pessoal:** 5 contas + 3 cartões, ~300 transações/mês.
  - Importação inicial: até 365 dias, ≈ 3.600 transações.
  - Bruto em `jsonb` ≈ 1,5 KB por transação → ~6 MB/ano. Irrelevante.
- **Lançamento público (hipótese de 10 mil usuários):** ≈ 36 milhões de transações/ano.
  - Bruto ≈ 54 GB/ano; lançamentos ≈ 10 GB/ano.
  - Postgres único com índices por `(user_id, date)` aguenta. Revisões na seção 9.
- **Sincronização:** a Pluggy atualiza cada item 1×/dia.
  - Janela de 7 dias no Open Finance; 4–5 dias nos conectores diretos.
  - 10 mil usuários ≈ 10 mil execuções/dia ≈ 0,12/s em média, com picos de manhã. Fila no Postgres sobra.

---

## 2. Visão geral

```
                ┌─────────────── celular ───────────────┐
                │  apps/mobile (Expo)                   │
                │  telas · @finnapp/tokens · cache      │
                │  Pluggy Connect (widget)              │
                └──────────────┬────────────────────────┘
                               │ HTTPS (REST /v1, token)
┌──────────── Pluggy ────────┐ │        ┌──────── finn-agent (host) ────────┐
│ /auth /items /accounts     │ │        │ Hermes ⇄ finn-mcp (ferramentas)   │
│ /v2/transactions /bills    │ │        │ memória: pgvector                 │
│ webhooks ──────────────┐   │ │        └──────────────┬────────────────────┘
└────────────────────────┼───┘ │                       │ HTTPS (REST /v1, token de serviço)
                         ▼     ▼                       ▼
                ┌────────────────────────────────────────────┐
                │ apps/api  (processo web, Fastify)          │
                │  /v1/webhooks/pluggy → grava evento + fila │
                │  /v1/... leitura e comandos                │
                └──────────────┬─────────────────────────────┘
                               │ mesmo código, outro processo
                ┌──────────────▼─────────────────────────────┐
                │ apps/api  (processo worker, pg-boss)       │
                │  sync → bruto → tradutor → livro-caixa     │
                │  conciliação · recorrência · alertas       │
                └──────────────┬─────────────────────────────┘
                               ▼
                ┌────────────────────────────────────────────┐
                │ Postgres 16                                │
                │  provider_* (bruto) │ ledger (entries…)    │
                │  pgboss.* (fila)    │ audit                │
                └────────────────────────────────────────────┘
                        packages/domain (TS puro) é usado pela API, pelo worker e pelo app
```

### Decisões que definem o desenho

1. **Duas camadas de dado: bruto do provedor → livro-caixa derivado.**
   - O que veio da Pluggy fica como veio (`provider_transactions`, `jsonb`, chave = id da Pluggy).
   - O livro-caixa (`entries`) é **derivado** por um tradutor determinístico.
   - A correção do usuário fica em `entry_overrides`, fora do derivado.
   - Ressincronizar ou mudar uma regra reprocessa sem perder o que a pessoa corrigiu.
2. **Fila no Postgres (pg-boss), não Redis/RabbitMQ.** Um banco, um backup e transação única entre "gravar evento" e "agendar job". O volume previsto é ordens de grandeza abaixo do limite.
3. **Monólito modular com dois processos: web e worker.** Mesmo código, mesmo deploy. O webhook só grava e responde; o trabalho pesado fica no worker.
4. **O finnApp é dono dos números; o Finn é cliente.**
   - As ferramentas MCP passam a chamar a API.
   - O SQLite e o domínio do `finn-core` são aposentados aos poucos (estrangulamento).
   - Fica no finn-agent o que é dele: Hermes, a skill, a memória semântica e os canais de alerta.
5. **Calcular na leitura, materializar depois.**
   - O extrato de um mês tem ~300 lançamentos: somar na hora é mais simples e sempre correto.
   - Saldos diários materializados só quando o histórico ficar longo (seção 9).

---

## 3. Fluxos

### 3.1 Conectar um banco

```
app → POST /v1/connections/connect-token → API → Pluggy POST /connect_token (vale 30 min)
app abre o Pluggy Connect com o token → usuário autoriza no banco
Pluggy → webhook item/created → API grava provider_event (eventId) + job sync(itemId) → 200
worker: GET /items/{id} → /accounts → /v2/transactions (365 dias) → /bills → /identity
        → upsert bruto → mapear contas → tradutor → conciliação inicial
app (polling ou push) mostra "BTG conectado · 5 contas"
```

**Conta nova.** A conta do livro nasce com:
- `openedOn` = dia anterior à transação mais antiga importada;
- `openingBalance` = saldo do banco − Σ dos postings importados.

Assim o fechamento de hoje bate com o banco por construção. A partir daí, qualquer diferença é sinal de transação faltando ou duplicada (ADR 002).

### 3.2 Sincronização incremental

**Gatilhos:**
- webhooks `transactions/created`, `transactions/updated`, `transactions/deleted`, `item/updated`;
- uma rodada diária de garantia, porque webhook pode se perder: 3 tentativas e depois nada.

**Job `sync(itemId, reason)`** — idempotente, com lock por item via `singletonKey` do pg-boss. Webhook e agendador nunca rodam juntos no mesmo item.

1. `GET /items/{id}`. Se o status pede ação do usuário (`LOGIN_ERROR`, `WAITING_USER_INPUT`), marca a conexão e avisa. Sem busca.
2. Por conta, busca `/v2/transactions` de duas formas e une o resultado:
   - **criadas:** `createdAtFrom = último sucesso − 1 h`;
   - **revisadas:** `dateFrom = hoje − 10 dias`, que cobre a janela de 7 dias da Pluggy com folga.
   - Paginação pelo cursor `next`. **Falha de página aborta o job e tenta de novo.** Nunca trunca em silêncio (risco achado no finn-agent).
3. Quando o webhook traz `transactionIds`, busca com `ids=` em vez de varrer.
4. Upsert no bruto por `provider_id`, guardando `updatedAt` do provedor. Excluídas viram `deleted_at`.
5. Tradutor só sobre o que mudou (seção 4). Depois, conciliação por conta.

**Token da Pluggy.** O apiKey vale 2 h. O cliente guarda e renova com 10 min de folga. Hoje o finn-agent pede um `/auth` a cada chamada.

### 3.3 Leitura (app e Finn)

`GET /v1/cash-statement`, `/v1/months/{AAAA-MM}`, `/v1/accounts`:
- carrega contas, cartões e lançamentos do usuário até a data;
- aplica as correções do usuário;
- chama `CashStatement` / `AccrualStatement` do domínio;
- devolve valor em centavos + texto formatado + a "equação" (as linhas com sinal).

O Finn narra a equação, nunca soma (regra que já existe na skill dele).

---

## 4. O tradutor: transação da Pluggy → lançamento

O coração da ingestão. É uma função pura no domínio (`packages/domain/src/ingestion`), testada com payloads reais gravados, que recebe:
- as transações brutas;
- as contas e os cartões;
- o CPF do usuário (em HMAC);
- as faturas.

E devolve lançamentos mais os vínculos `entry_sources` (N transações → 1 lançamento).

**Ordem de decisão.** A primeira regra que casa vence.

| # | Sinal na Pluggy | Vira | Regra |
|---|---|---|---|
| 1 | conta `CREDIT`, `type=DEBIT` | `cardPurchase` | Com `creditCardMetadata.totalInstallments > 1`: uma compra só, com `totalAmount`, `purchaseDate` e N parcelas. As parcelas 2..N que chegarem depois são **vinculadas** à compra, não viram lançamento novo. Sem isso, a despesa conta duas vezes. |
| 2 | conta `CREDIT`, `type=CREDIT` que bate com `bills[].payments` (valor exato, ±3 dias) | lado cartão do `billPayment` | casa com o débito na conta corrente da regra 3 |
| 3 | conta `BANK`, `DEBIT` que bate com pagamento de fatura de um cartão do usuário (valor exato, ±3 dias; ou descrição/categoria de pagamento de fatura) | `billPayment` | **não é despesa**. Hoje o finn-agent conta compra + fatura (dupla contagem). |
| 4 | conta `CREDIT`, `type=CREDIT` sem pagamento correspondente | `cardRefund` (estorno) | despesa negativa na competência da compra original. **Exige um novo tipo no domínio.** |
| 5 | par débito/crédito entre duas contas do usuário, mesmo valor, ±2 dias, e (`paymentData` payer = receiver = CPF do usuário, ou a descrição cita a outra instituição) | `transfer` | Duas transações viram um lançamento. Sem a confirmação por CPF, entra como **sugestão** ("revisar"), não como certeza. Assim dois Pix de terceiros com o mesmo valor não viram transferência. |
| 6 | débito para conta de investimento ou meta do usuário | `goalContribution` | quando a conta de destino está ligada a uma meta |
| 7 | `CREDIT` em conta `BANK` | `income` | categoria pela tabela de-para Pluggy → `cat-*`, ou pela regra do usuário |
| 8 | `DEBIT` em conta `BANK` | `expense` | idem |

### Regras transversais

- **Data.** `date` vem em UTC. O tradutor converte para `America/Sao_Paulo` antes de virar `LocalDate`: um Pix às 23h30 do dia 12 não pode cair no dia 13.
- **Sinal.** Usar `type` (DEBIT/CREDIT) e conferir contra o sinal de `amount` por tipo de conta. Divergência vira alerta de dado, não palpite. (A convenção de sinal da conta de cartão precisa de confirmação com payload real.)
- **PENDING.**
  - Entra como lançamento `pending`: aparece apagado, igual ao canvas.
  - Fica fora do saldo conciliado até virar `POSTED`.
  - Se o POSTED chegar com outro id, casa por conta + valor + ±3 dias + descrição normalizada e substitui.
- **Excluída.** `transactions/deleted` retira o lançamento (exclusão lógica + auditoria) e reabre o par, se havia um.
- **Correção do usuário.** `entry_overrides` (tipo, categoria, competência, "não é transferência") é aplicada depois da derivação, sempre. Uma regra nova reprocessa os derivados sem tocar nas correções.
- **Valor.** Sempre via `Money.ofReais(amountInAccountCurrency ?? amount)`, que arredonda de forma simétrica.

---

## 5. Dados (Postgres)

Já existem: `accounts`, `credit_cards`, `entries` (migração 001).

| Tabela | Chave | Para quê |
|---|---|---|
| `users` | id | dono de tudo; HMAC do CPF para casar transferências |
| `provider_items` | id Pluggy | conexão: status, último sucesso, último erro, precisa de ação? |
| `provider_accounts` | id Pluggy | conta no provedor → `account_id` **ou** `card_id` do livro; saldo informado + data |
| `provider_transactions` | id Pluggy | bruto `jsonb` + colunas extraídas (`account`, `date_local`, `amount_cents`, `type`, `status`, `provider_updated_at`, `deleted_at`, `fingerprint`); CPF/CNPJ de terceiros só em HMAC |
| `provider_bills` | id Pluggy | faturas com pagamentos, para as regras 2 e 3 |
| `provider_events` | `eventId` | idempotência do webhook; `processed_at` |
| `entry_sources` | (`provider_transaction_id`) único | N transações → 1 lançamento; papel: principal, contrapartida, parcela |
| `entry_overrides` | `entry_id` | correções do usuário que sobrevivem à ressincronização |
| `entries` (estender) | id | + `origin` (provider, manual), `pending`, `deleted_at`, `refund` |
| `reconciliations` | (`account_id`, `date`) | saldo banco × saldo livro × diferença |
| `recurring_bills` | id | conta fixa confirmada (`payeeKey`, dia, valor ou estimado, conta) |
| `sync_runs` | id | job: início, fim, contagens, erro |
| `audit_log` | id | antes/depois de toda correção e exclusão |

### Índices e integridade

- `entries (user_id, date)` — já existe.
- `provider_transactions (user_id, provider_account_id, date_local)`.
- `entry_sources (entry_id)`.
- Chaves estrangeiras compostas com `user_id`, como na 001: ninguém aponta para dado de outra pessoa.

### LGPD

- O bruto da Pluggy traz nome e CPF de terceiros em `paymentData`.
- Na gravação, `documentNumber` é trocado por HMAC (com chave fora do banco). O nome fica, porque é o que aparece no extrato.
- Remover a conexão apaga o bruto (cascade) e mantém os lançamentos manuais.

---

## 6. API (REST, `/v1`)

Contratos em `packages/contracts` com zod. Daí saem a validação no Fastify, o OpenAPI e os tipos do app e das ferramentas do Finn. É REST, não tRPC, porque o Finn e futuros clientes não são TypeScript.

| Método e rota | Uso |
|---|---|
| `POST /v1/connections/connect-token` | token do widget (30 min) |
| `GET /v1/connections` · `POST /v1/connections/{id}/sync` · `DELETE /v1/connections/{id}` | tela de conexões |
| `POST /v1/webhooks/pluggy` | grava o evento e enfileira; autenticado por segredo em header cadastrado no `POST /webhooks` da Pluggy, comparado em tempo constante (a Pluggy não assina o corpo) |
| `GET /v1/accounts` | saldo por conta + status da conciliação (pills do Extrato) |
| `GET /v1/cash-statement?from&to&account` | Extrato (já existe) |
| `GET /v1/months/{AAAA-MM}` | Mês a mês: receitas, despesas por categoria, aportes, sobra, status fechado/em andamento/previsto |
| `GET /v1/entries?from&to&account&kind&review` | lista do extrato, incluindo o filtro "revisar" |
| `PATCH /v1/entries/{id}` | correção (vira override) |
| `POST /v1/entries` | lançamento manual |
| `POST /v1/wallet/count` | Contar a carteira → ajuste |
| `GET /v1/cards/{id}/bills` | faturas: aberta, fechada, parcelas futuras |
| `GET /v1/recurrences/suggestions` · `POST /v1/recurrences` | conta fixa sugerida e confirmada |

### Convenções

- Dinheiro sempre `{ cents, text }`.
- Datas `AAAA-MM-DD`.
- Erros `{ error }` em português, com 400 para pedido inválido, 404 e 500.
- Toda resposta de número traz a equação (linhas com sinal), no mesmo espírito do contrato de explicabilidade do `get_card_state` do finn-agent.

### Autenticação

- **v1:**
  - token do app: um por dispositivo, revogável;
  - token de serviço do Finn: escopo de leitura + correções; sem apagar conexão.
- **Público:** login por e-mail com código e sessão por dispositivo. O `userFrom` da API já é o ponto de troca.

---

## 7. App e Finn

### App (Expo)

- **Dados:** TanStack Query sobre a API, com cache persistido para abrir com o último extrato mesmo sem rede (só leitura).
- **Lançamento manual offline:** fila local, enviada ao reconectar, com id gerado no app (idempotente).
- **Contexto da tela:** cada tela mostra a data de referência do saldo e o selo fechado/em andamento/previsto, como no canvas.
- **Conexões:** Pluggy Connect via WebView com o connect token.

### Finn (estrangulamento em 3 passos)

1. **Leitura.** As ferramentas de extrato, mês, contas, faturas e recorrência passam a chamar a API. O `finn-core` continua para o resto.
2. **Escrita.** Lançamento manual, correção e conta fixa via API. O webhook da Pluggy sai do finn-agent e o finnApp passa a recebê-lo.
3. **Aposentar.** O SQLite e o domínio do `finn-core` saem. Ficam Hermes, a skill (com a regra "PROIBIDO CALCULAR"), a memória pgvector e os alertas.

**O que portar do finn-agent em vez de reescrever:**
- `PluggyAdapter`, corrigindo o truncamento silencioso, o `/auth` repetido e os campos ignorados (`status`, `paymentData`, `creditCardMetadata.installmentNumber`, `totalInstallments`);
- a orquestração por produto com status;
- `Merchant.normalize`;
- as regras de classificação do usuário;
- `detectAnomalies`;
- o contrato de explicabilidade.

---

## 8. Operação

- **Deploy:** uma VPS com `docker compose`:
  - `api` (web) e `worker`, a mesma imagem;
  - `postgres:16`;
  - Traefik com TLS, que pode ser o mesmo do finn-agent;
  - backup.
- **Backup:** WAL-G para armazenamento de objetos (PITR, RPO 15 min) + `pg_dump` diário. Teste de restauração mensal: dado financeiro sem restauração testada não está guardado.
- **Migrações:** SQL versionado (já existe `migrate`), aplicado antes de subir a versão nova.
- **Logs:** pino (já vem no Fastify) com `requestId`, `jobId` e `itemId`. Nunca logar `jsonb` bruto nem CPF.
- **Métricas e alertas.** Os quatro números que importam:

  | Métrica | Alerta |
  |---|---|
  | contas com diferença de conciliação ≠ 0 | > 0 por mais de 24 h |
  | atraso do último sync bem-sucedido por item | > 26 h |
  | jobs falhando | 3 falhas seguidas no mesmo item |
  | webhooks recebidos × processados | qualquer evento com mais de 10 min sem processar |

  O alerta sai pelo canal de alertas do Finn (`hermes/alerts.md`). O stack LGTM fica para quando houver mais de um usuário.
- **Testes:**
  - domínio e tradutor com fixtures de payload real da Pluggy, anonimizadas;
  - integração com Postgres no CI (já existe);
  - um teste de ponta a ponta "importa 365 dias → saldo bate com o banco".

---

## 9. Trade-offs

| Decisão | Escolha | Alternativa | Por que agora | Rever quando |
|---|---|---|---|---|
| Fila | pg-boss no Postgres | Redis/BullMQ, RabbitMQ | um serviço a menos; job e dado na mesma transação | > 100 jobs/s sustentados ou fan-out para vários consumidores |
| Ingestão | bruto + derivado + overrides | gravar direto como lançamento | reprocessar sem perder correção; depurar com o dado original | bruto passar de 50 GB: particionar por mês e tirar `jsonb` antigo |
| Saldos | calcular na leitura | saldos diários materializados | correto por construção; ~300 lançamentos/mês | extrato de conta com > 3 anos passar de 150 ms: materializar fechamento mensal |
| Processos | monólito, web + worker | microsserviços | uma pessoa mantém; deploy único | times separados ou escala muito desigual entre leitura e sync |
| Contrato | REST + zod + OpenAPI | tRPC, GraphQL | o Finn não é TS; telas são poucas e conhecidas | app com dezenas de telas compondo dados variados |
| Domínio do Finn | estrangular o `finn-core` | manter os dois | dois domínios divergem (fatura por fechamento × vencimento; saldo para trás × para frente) | — |
| Provedor | só Pluggy, atrás de uma porta | vários agregadores | a porta já existe no finn-agent | aprovação comercial ou custo pedir um segundo provedor |
| Hospedagem | VPS + compose | gerenciado (RDS, Fly, Render) | você opera Docker/Proxmox; custo baixo | usuários pagantes: Postgres gerenciado com PITR pronto |

### O que revisitar ao crescer

- **Vários usuários:**
  - autenticação de verdade;
  - aprovação comercial da Pluggy;
  - Row-Level Security no Postgres como segunda barreira além do `user_id` nas FKs;
  - política de retenção do bruto.
- **Conciliação como produto:** tela "a conta não fechou" com a diferença e as transações suspeitas, em vez de só um alerta.
- **Consentimento do Open Finance:** expira e precisa de renovação. Confirmar o prazo e o evento com a Pluggy e avisar antes.
- **Previsão:** contas fixas confirmadas + parcelas futuras + fatura aberta, gerando lançamentos `previsto` sobre o mesmo modelo.
- **Imposto de renda:** módulo de domínio próprio, com as tabelas do ano-calendário conferidas na fonte oficial.

---

## 10. Plano de execução

| Fase | Entrega | Pronto quando |
|---|---|---|
| 1. Ingestão | migração 002 (bruto, vínculos, overrides, eventos, sync_runs); `PluggyAdapter` portado e corrigido; tradutor com as regras 1–8; webhook + worker + agendador; conciliação | importar 365 dias do BTG real e o saldo de hoje bater com o banco em todas as contas |
| 2. Telas reais | Hoje, Extrato e Mês a mês no app consumindo a API; Pluggy Connect no app; correção de lançamento | extrato do app igual ao do banco em outubro |
| 3. Finn na API | ferramentas de leitura e escrita via API; webhook só no finnApp | o Finn responde "quanto falta pagar este mês" sem tocar no SQLite |
| 4. Planejar | contas fixas confirmadas, orçamento, metas, previsão | Mês a mês mostra os 12 meses como no canvas |
| 5. IR | módulo de domínio + tela | estimativa do ano-calendário com deduções de Saúde e Educação |

Domínio novo nas fases 1–2: `cardRefund`, `pending` no `Entry`, e o tradutor em `packages/domain/src/ingestion`.
