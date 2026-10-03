# ADR 002 — Modelo contábil: caixa × competência

**Status:** aceito · outubro de 2026

## Decisão

Cada lançamento (`Entry`) produz duas leituras que nunca se misturam:

- **Postings (caixa):** como o lançamento mexe no saldo de cada conta, no dia em que o dinheiro passou. O Extrato (`CashStatement`) lê só isso.
- **Accrual (competência):** a que mês o valor pertence e se é receita, despesa ou aporte. O Mês a mês (`AccrualStatement`) lê só isso.

| Tipo | Caixa | Competência |
|---|---|---|
| Entrada | + na conta | receita do mês |
| Despesa (Pix, boleto, débito, dinheiro) | − na conta | despesa do mês (ou do mês informado) |
| Transferência entre contas próprias | − origem, + destino | nada |
| Compra no cartão | − no cartão (dívida; conta contábil `card:<id>`, separada das contas) | despesa no mês da compra; parcelada, uma parcela por mês |
| Pagamento de fatura | − na conta, + no cartão | nada (a despesa já foi contada na compra) |
| Aporte em meta | − na conta, + na meta | aporte do mês (reduz a sobra, não é gasto) |
| Ajuste da Carteira | ± na Carteira | Outros: despesa se faltou dinheiro, receita se sobrou |

Sobra do mês = receitas − despesas − aportes.

## Regras de data

- Fatura: uma por mês, identificada pelo mês do vencimento. Compra até o dia do fechamento entra na fatura que fecha; depois, na seguinte. Vencimento antes do dia de fechamento cai no mês seguinte ao fechamento. Em mês curto, se o fechamento preso ao fim do mês encostar no vencimento (fecha 28, vence 31 em fevereiro), o fechamento recua para manter o intervalo.
- Saldo inicial da conta é o saldo no dia da abertura (`openedOn`): lançamentos anteriores, como histórico importado da Pluggy, já estão nele e não mexem de novo no saldo.
- Vencimento em fim de semana ou feriado sai no próximo dia útil. Calendário bancário: feriados nacionais, Paixão de Cristo, Carnaval (segunda e terça), Corpus Christi e 31 de dezembro; feriados locais configuráveis.

## Recorrência

Pagamento fora do cartão vira sugestão de conta fixa quando: mesmo favorecido (descrição sem códigos curtos nem palavras do meio de pagamento; CPF/CNPJ ficam), 3+ meses seguidos terminando no mês atual ou no anterior, dia do vencimento com variação de até 5 dias (pago em 1º conta para o mês anterior se vence no fim do mês) e valor até 50% da mediana. Pagamento extra ao mesmo favorecido no mesmo mês não quebra a sequência.

## Em aberto

- Imposto de renda (deduções de Saúde e Educação, estimativa de restituição): entra como módulo próprio do domínio, com as tabelas do ano-calendário conferidas na fonte oficial antes de codar.
- Previsão (agendados e contas fixas futuras) sobre o mesmo modelo, marcada como prevista.
