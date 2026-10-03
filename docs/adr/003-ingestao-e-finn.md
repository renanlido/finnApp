# ADR 003 — Ingestão em camadas, fila no Postgres e o Finn como cliente da API

**Status:** aceito · outubro de 2026 · detalhes em `docs/design/sistema.md`

## Contexto

O finn-agent já sincroniza a Pluggy e tem um domínio contábil próprio (SQLite, 35 ferramentas MCP). O finnApp tem outro (caixa × competência, ADR 002). Dois domínios para os mesmos números divergem: mês da fatura por fechamento × vencimento, saldo reconstruído para trás × para frente, compra no cartão e fatura contadas duas vezes.

## Decisões

1. **Bruto → derivado → correções.** Transações da Pluggy ficam como vieram (`provider_transactions`). Os lançamentos (`entries`) saem de um tradutor determinístico no domínio. A correção do usuário fica em `entry_overrides` e é aplicada depois. Ressincronizar ou mudar regra reprocessa sem perder o que a pessoa corrigiu.
2. **Fila no Postgres (pg-boss)**, com web e worker como dois processos do mesmo código. O webhook só grava o evento (idempotente por `eventId`) e enfileira. O sync roda com lock por item.
3. **Conciliação contínua.** A conta nasce com o saldo de abertura que faz o livro bater com o banco. Depois, toda diferença entre `CashStatement.closing` e o saldo da Pluggy é alerta.
4. **O finnApp é dono dos números; o Finn é cliente da API.** O `finn-core` é estrangulado em três passos (leitura, escrita, aposentar). O `PluggyAdapter` é portado e corrigido, não reescrito.

## Consequências

- O domínio ganha `cardRefund`, `pending` e o módulo `ingestion` (tradutor), todos testados com payloads reais anonimizados.
- O webhook da Pluggy passa a apontar só para o finnApp no passo 2 do Finn.
- Um banco, um backup: o RPO de 15 minutos vale para fila e dado ao mesmo tempo.
