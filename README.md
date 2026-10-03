# FinnApp

Finanças pessoais em cima do Open Finance (Pluggy), com o Finn como agente. Simples no dia a dia, rigoroso na conta: todo saldo que o app mostra fecha no centavo e diz de onde vem.

## Estrutura

```
packages/
  domain/   regras contábeis em TypeScript puro, sem dependências (dinheiro, datas, dias úteis,
            contas, cartões, lançamentos, extrato por caixa, mês a mês por competência, recorrência)
  tokens/   tokens.json do design system → tema do app (cores dos dois temas, tipo, espaço, raio)
apps/
  api/      Node + Fastify + Postgres. Casos de uso sobre o domínio; adaptadores Postgres e em memória
  mobile/   Expo (React Native) + TypeScript, tema e componentes do design system
docs/       decisões (ADRs)
```

Referências de produto:
- Telas (canvas): https://claude.ai/artifact/HeayNosscPQ28Qmz6jD3SE
- Design system: https://claude.ai/artifact/PCD79XMUEmix8Vx9jDDxY3

## Comandos

Requisitos: Node 22+, pnpm 10, Docker (para o Postgres).

```bash
pnpm install
pnpm test            # testes de todos os pacotes
pnpm typecheck       # TypeScript em todos os pacotes

docker compose up -d                 # Postgres 16 local (bancos finnapp e finnapp_test)
cp apps/api/.env.example apps/api/.env
pnpm --filter @finnapp/api migrate   # aplica apps/api/migrations
pnpm --filter @finnapp/api dev       # API em http://localhost:3333

TEST_DATABASE_URL=postgres://finnapp:finnapp@localhost:5432/finnapp_test pnpm --filter @finnapp/api test

pnpm --filter @finnapp/mobile start  # Expo
pnpm tokens                          # regenera o tema depois de trocar packages/tokens/tokens.json
```

## Regras que o código garante

- Dinheiro é `Money` em centavos inteiros. Nunca `number` solto.
- Extrato é **caixa** (o que passou na conta, no dia em que passou); Mês a mês é **competência** (o que pertence ao mês). As duas visões nunca se misturam.
- Saldo inicial + entradas − saídas = saldo final. `CashStatement.reconciles()` confere a identidade com o saldo somado de forma independente.
- Transferência entre contas próprias é neutra. Compra no cartão entra no mês, mas só sai da conta quando a fatura é paga. Fatura paga não é despesa nova.
- Vencimento em fim de semana ou feriado sai no próximo dia útil (calendário bancário brasileiro, feriados locais configuráveis).
- Pagamento fora do cartão que se repete três meses seguidos vira sugestão de conta fixa.

Desenho do sistema (ingestão Pluggy, API, Finn, operação): `docs/design/sistema.md`. Decisões e o porquê: `docs/adr/`.
