# FinnApp — instruções para agentes

- Responda e escreva textos de produto em português do Brasil. Código e nomes de arquivo em inglês; textos da interface em português.
- **Nunca cite o Claude nem nenhum agente em commits** (mensagem, trailer `Co-Authored-By` ou corpo).
- Teste antes do código (TDD), principalmente em `packages/domain`. Rode `pnpm test` e `pnpm typecheck` antes de dizer que terminou.

## Arquitetura

- DDD com Clean Architecture pragmática: entidades ricas com construtor privado e `static create()`, injeção por construtor, sem abstração desnecessária.
- `packages/domain` é TypeScript puro e não importa nada de infra (nem Node, nem React, nem banco).
- `apps/api`: casos de uso em `src/application` dependem de portas (`LedgerReader`); adaptadores em `src/infra` (Postgres, memória, HTTP).
- `apps/mobile`: Expo. Leia `apps/mobile/AGENTS.md` antes de mexer em APIs do Expo/React Native. Cores, tipo, espaço e raio vêm de `@finnapp/tokens`; nada de hex no componente.

## Regras contábeis (não negociáveis)

- Dinheiro em `Money` (centavos inteiros). Sinal de menos da interface é U+2212 (`Money.format()`).
- Extrato = caixa; Mês a mês = competência. Transferência própria é neutra; compra no cartão sai do saldo só quando a fatura é paga; fatura paga não é despesa.
- Todo resumo de saldo precisa fechar: saldo inicial + entradas − saídas = saldo final.
- Datas sem fuso: `LocalDate`/`YearMonth`. Vencimento em dia não útil vai para o próximo dia útil (`BusinessCalendar`).

## Design system

Fonte: https://claude.ai/artifact/PCD79XMUEmix8Vx9jDDxY3. Para atualizar o tema: copie o `tokens.json` novo para `packages/tokens/tokens.json` e rode `pnpm tokens`; o teste do pacote falha se o tema gerado estiver desatualizado.
