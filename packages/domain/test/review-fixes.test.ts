import { describe, expect, it } from 'vitest';
import { Account } from '../src/accounts/Account';
import { CreditCard } from '../src/accounts/CreditCard';
import { CashStatement } from '../src/ledger/CashStatement';
import { Entry } from '../src/ledger/Entry';
import { Money } from '../src/money/Money';
import { BusinessCalendar } from '../src/time/BusinessCalendar';
import { LocalDate } from '../src/time/LocalDate';

const d = LocalDate.parse;
const R = Money.ofReais;

describe('correções da revisão', () => {
  it('conta e cartão com o mesmo id não se misturam', () => {
    const conta = Account.create({ id: 'nubank', name: 'Nubank', kind: 'checking', openingBalance: R(1000), openedOn: d('2026-09-30') });
    const cartao = CreditCard.create({ id: 'nubank', name: 'Cartão Nubank', closingDay: 3, dueDay: 10 });
    const entries = [
      Entry.cardPurchase({ id: 'c', card: cartao, amount: R(300), date: d('2026-10-05'), category: 'mercado', description: 'Compra' }),
      Entry.billPayment({ id: 'f', from: 'nubank', card: 'nubank', amount: R(200), date: d('2026-10-10'), description: 'Fatura' }),
    ];
    const s = CashStatement.build({ accounts: [conta], entries, from: d('2026-10-01'), to: d('2026-10-31') });
    expect(s.closing.format()).toBe('R$ 800,00');
    expect(s.expenses.isZero()).toBe(true);
    expect(s.bills.format()).toBe('R$ 200,00');
    expect(s.reconciles()).toBe(true);
  });

  it('mês curto: uma fatura por mês, fechamento antes do vencimento (fecha 28, vence 31)', () => {
    const card = CreditCard.create({ id: 'x', name: 'X', closingDay: 28, dueDay: 31 });
    const bill = card.billFor(d('2026-02-10'));
    expect(bill.due.toString()).toBe('2026-02-28');
    expect(bill.closing.toString()).toBe('2026-02-25');
    expect(card.billFor(d('2026-02-26')).due.toString()).toBe('2026-03-31');
    expect(card.installments(d('2026-01-10'), R(300), 3).map((i) => i.bill.due.toString())).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('meta igual à conta de origem e fatura paga pelo próprio cartão são recusadas', () => {
    expect(() => Entry.goalContribution({ id: 'g', from: 'btg', goal: 'btg', amount: R(500), date: d('2026-10-06'), description: 'x' })).toThrow();
    expect(() => Entry.billPayment({ id: 'b', from: 'nu', card: 'nu', amount: R(1), date: d('2026-10-06'), description: 'x' })).not.toThrow();
  });

  it('feriado local em 29 de fevereiro não quebra o calendário em ano comum', () => {
    const cal = BusinessCalendar.brazil({ local: { '02-29': 'Feriado bissexto' } });
    expect(cal.nextBusinessDay(d('2026-10-12')).toString()).toBe('2026-10-13');
    expect(cal.holidayName(d('2028-02-29'))).toBe('Feriado bissexto');
  });

  it('31 de dezembro não tem expediente bancário', () => {
    expect(BusinessCalendar.brazil().nextBusinessDay(d('2026-12-31')).toString()).toBe('2027-01-04');
    expect(BusinessCalendar.brazil({ bank: false }).isBusinessDay(d('2026-12-31'))).toBe(true);
  });

  it('lançamento anterior à abertura da conta não muda o saldo (o saldo inicial já o inclui)', () => {
    const conta = Account.create({ id: 'btg', name: 'BTG', kind: 'checking', openingBalance: R(804), openedOn: d('2026-09-30') });
    const antigo = Entry.expense({ id: 'h', account: 'btg', amount: R(100), date: d('2026-09-20'), category: 'outros', description: 'Histórico importado' });
    const s = CashStatement.build({ accounts: [conta], entries: [antigo], from: d('2026-10-01'), to: d('2026-10-12') });
    expect(s.opening.format()).toBe('R$ 804,00');
    expect(s.closing.format()).toBe('R$ 804,00');
  });

  it('meio centavo arredonda igual para os dois sinais', () => {
    expect(Money.ofReais(-2.675).equals(Money.ofReais(2.675).negate())).toBe(true);
  });
});
