# ADR 001 — Stack e estrutura do repositório

**Status:** aceito · outubro de 2026

## Contexto

O FinnApp nasce do canvas de telas e do design system já definidos. A parte contábil é o coração do produto e precisa ser testável sem banco, sem tela e sem rede. O agente Finn (repositório `finn-agent`) vai consumir o app pelas mesmas regras, não por cálculo próprio.

## Decisão

- Monorepo pnpm: `packages/domain`, `packages/tokens`, `apps/api`, `apps/mobile`.
- Domínio em TypeScript puro, testado com Vitest. É a única fonte das regras de saldo, caixa, competência, cartão, dias úteis e recorrência.
- API em Node + Fastify sobre Postgres 16 (`pg`, SQL em migrações versionadas, sem ORM). Dinheiro em `bigint` de centavos.
- App em Expo + TypeScript. O tema vem do `tokens.json` do design system, gerado por script e conferido por teste.

## Consequências

- O Finn e o app enxergam os mesmos números: o agente chama a API, nunca recalcula.
- Postgres em vez de SQLite: multiusuário e restrições de integridade no banco (`entries_refs`, `entries_amount`) desde o começo.
- Integração com Pluggy entra como adaptador na API (ingestão de transações → lançamentos), sem tocar no domínio.
