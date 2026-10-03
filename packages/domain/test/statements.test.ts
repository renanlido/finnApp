import { describe, expect, it } from 'vitest';
import { CashStatement } from '../src/ledger/CashStatement';
import { AccrualStatement } from '../src/ledger/AccrualStatement';
import { Entry } from '../src/ledger/Entry';
import { Money } from '../src/money/Money';
import { LocalDate } from '../src/time/LocalDate';
import { YearMonth } from '../src/time/YearMonth';
import { accounts, cashAccounts, entries } from './fixtures/october';

const d = LocalDate.parse;
const R = Money.ofReais;
const october = { from: d('2026-10-01'), to: d('2026-10-12') };

describe('Extrato (caixa): o saldo sempre fecha', () => {
  const all = CashStatement.build({ accounts: cashAccounts, entries, ...october });

  it('parte do saldo em 1º de outubro e chega ao saldo de hoje', () => {
    expect(all.opening.format()).toBe('R$ 2.196,90');
    expect(all.closing.format()).toBe('R$ 4.820,00');
  });

  it('separa entradas, gastos e contas, faturas e metas', () => {
    expect(all.income.format()).toBe('R$ 14.000,00');
    expect(all.expenses.format()).toBe('R$ 4.956,90');
    expect(all.bills.format()).toBe('R$ 4.920,00');
    expect(all.goals.format()).toBe('R$ 1.500,00');
  });

  it('transferência entre as próprias contas é neutra e só aparece na nota', () => {
    expect(all.transfersIn.isZero()).toBe(true);
    expect(all.transfersOut.isZero()).toBe(true);
    expect(all.internalTransfers.format()).toBe('R$ 200,00');
  });

  it('compra no cartão não mexe no saldo das contas', () => {
    const semCartao = CashStatement.build({ accounts: cashAccounts, entries: entries.filter((e) => e.kind !== 'card_purchase'), ...october });
    expect(semCartao.closing.equals(all.closing)).toBe(true);
    expect(semCartao.expenses.equals(all.expenses)).toBe(true);
    expect(all.reconciles()).toBe(true);
  });

  it('a conta de uma conta só inclui as transferências que entram e saem dela', () => {
    const btg = CashStatement.build({ accounts: [accounts.btg], entries, ...october });
    expect(btg.opening.format()).toBe('R$ 804,00');
    expect(btg.transfersOut.format()).toBe('R$ 200,00');
    expect(btg.closing.format()).toBe('R$ 3.794,00');
    expect(btg.reconciles()).toBe(true);

    const wallet = CashStatement.build({ accounts: [accounts.wallet], entries, ...october });
    expect(wallet.transfersIn.format()).toBe('R$ 150,00');
    expect(wallet.closing.format()).toBe('R$ 120,00');
  });

  it('a soma dos saldos por conta bate com o saldo de todas', () => {
    const sum = Money.sum(cashAccounts.map((a) => CashStatement.build({ accounts: [a], entries, ...october }).closing));
    expect(sum.equals(all.closing)).toBe(true);
  });

  it('as linhas com sinal formam a tabela do resumo', () => {
    expect(all.lines().map((l) => [l.sign, l.label, l.amount.format()])).toEqual([
      ['', 'Saldo em 1º out', 'R$ 2.196,90'],
      ['+', 'Entradas', 'R$ 14.000,00'],
      ['-', 'Gastos e contas', 'R$ 4.956,90'],
      ['-', 'Faturas de cartão', 'R$ 4.920,00'],
      ['-', 'Guardado nas metas', 'R$ 1.500,00'],
      ['=', 'Saldo em 12 out', 'R$ 4.820,00'],
    ]);
  });

  it('ajuste da Carteira entra na conta do mês com sinal', () => {
    const adjust = Entry.walletAdjustment({ id: 'a1', account: 'wallet', delta: R(-15), date: d('2026-10-12') });
    const wallet = CashStatement.build({ accounts: [accounts.wallet], entries: [...entries, adjust], ...october });
    expect(wallet.adjustments.format()).toBe('−R$ 15,00');
    expect(wallet.closing.format()).toBe('R$ 105,00');
    expect(wallet.reconciles()).toBe(true);
  });
});

describe('Mês a mês (competência): o que pertence ao mês', () => {
  const oct = AccrualStatement.build({ entries, month: YearMonth.parse('2026-10') });

  it('conta receitas pelo mês a que pertencem', () => {
    expect(oct.income.format()).toBe('R$ 14.000,00');
  });

  it('despesas incluem compras no cartão e a parcela do mês, e não a fatura paga', () => {
    // 4.956,90 em conta + 118,40 + 186,30 no cartão + 420,00 da 3ª parcela do notebook
    expect(oct.expenses.format()).toBe('R$ 5.681,60');
  });

  it('transferência não é receita nem despesa', () => {
    expect(oct.byCategory().get('transferencia')).toBeUndefined();
  });

  it('sobra = receitas − despesas − aporte nas metas', () => {
    expect(oct.goals.format()).toBe('R$ 1.500,00');
    expect(oct.surplus.format()).toBe('R$ 6.818,40');
  });

  it('agrupa despesas por categoria', () => {
    const cats = oct.byCategory();
    expect(cats.get('moradia')?.format()).toBe('R$ 3.090,00');
    expect(cats.get('mercado')?.format()).toBe('R$ 545,30');
    expect(cats.get('parcelas')?.format()).toBe('R$ 420,00');
  });

  it('a parcela de agosto fica em agosto', () => {
    const aug = AccrualStatement.build({ entries, month: YearMonth.parse('2026-08') });
    expect(aug.expenses.format()).toBe('R$ 420,00');
  });

  it('competência explícita vence a data de caixa', () => {
    const late = Entry.expense({ id: 'x', account: 'btg', amount: R(214), date: d('2026-10-13'), category: 'moradia', description: 'Energia de setembro', competence: YearMonth.parse('2026-09') });
    const sep = AccrualStatement.build({ entries: [late], month: YearMonth.parse('2026-09') });
    expect(sep.expenses.format()).toBe('R$ 214,00');
  });
});
