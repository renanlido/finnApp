import { describe, expect, it } from 'vitest';
import { CreditCard } from '../src/accounts/CreditCard';
import { BusinessCalendar } from '../src/time/BusinessCalendar';
import { LocalDate } from '../src/time/LocalDate';
import { Money } from '../src/money/Money';

const d = LocalDate.parse;
const calendar = BusinessCalendar.brazil();

describe('CreditCard: em qual fatura a compra cai', () => {
  const nubank = CreditCard.create({ id: 'nu', name: 'Cartão Nubank', closingDay: 3, dueDay: 10 });
  const carrefour = CreditCard.create({ id: 'cf', name: 'Cartão Carrefour', closingDay: 29, dueDay: 5 });

  it('compra no dia do fechamento ainda entra na fatura que fecha', () => {
    const bill = nubank.billFor(d('2026-11-03'));
    expect(bill.closing.toString()).toBe('2026-11-03');
    expect(bill.due.toString()).toBe('2026-11-10');
  });

  it('compra no dia seguinte ao fechamento vai para a fatura do mês seguinte', () => {
    const bill = nubank.billFor(d('2026-11-04'));
    expect(bill.closing.toString()).toBe('2026-12-03');
    expect(bill.due.toString()).toBe('2026-12-10');
  });

  it('vencimento antes do dia de fechamento cai no mês seguinte ao fechamento', () => {
    expect(carrefour.billFor(d('2026-10-29')).due.toString()).toBe('2026-11-05');
    expect(carrefour.billFor(d('2026-10-30')).due.toString()).toBe('2026-12-05');
  });

  it('fatura que vence no sábado é paga na segunda', () => {
    const bill = carrefour.billFor(d('2026-10-30'));
    expect(bill.paymentDate(calendar).toString()).toBe('2026-12-07');
  });

  it('parcela uma compra: cada parcela em uma fatura e na competência do seu mês', () => {
    const plan = nubank.installments(d('2026-08-20'), Money.ofReais(1260), 3);
    expect(plan.map((p) => p.amount.cents)).toEqual([42000, 42000, 42000]);
    expect(plan.map((p) => p.competence.toString())).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(plan.map((p) => p.bill.due.toString())).toEqual(['2026-09-10', '2026-10-10', '2026-11-10']);
  });

  it('recusa dia de fechamento ou vencimento fora de 1–31', () => {
    expect(() => CreditCard.create({ id: 'x', name: 'X', closingDay: 0, dueDay: 10 })).toThrow();
    expect(() => CreditCard.create({ id: 'x', name: 'X', closingDay: 3, dueDay: 32 })).toThrow();
  });
});
