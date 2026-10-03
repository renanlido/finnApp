import { describe, expect, it } from 'vitest';
import { CreditCard } from '../src/accounts/CreditCard';
import { Entry } from '../src/ledger/Entry';
import { Money } from '../src/money/Money';
import { RecurrenceDetector } from '../src/recurrence/RecurrenceDetector';
import { BusinessCalendar } from '../src/time/BusinessCalendar';
import { LocalDate } from '../src/time/LocalDate';

const d = LocalDate.parse;
const R = Money.ofReais;
const calendar = BusinessCalendar.brazil();
const asOf = d('2026-10-12');
let seq = 0;
const pay = (description: string, value: number, date: string, category = 'outros') =>
  Entry.expense({ id: `r${seq++}`, account: 'btg', amount: R(value), date: d(date), category, description });

const academia = [
  pay('PIX ACADEMIA SMART 0612', 139, '2026-06-02', 'lazer'),
  pay('Pix Academia Smart 0713', 139, '2026-07-04', 'lazer'),
  pay('PIX ACADEMIA SMART 0811', 139, '2026-08-04', 'lazer'),
  pay('PIX ACADEMIA SMART 0909', 139, '2026-09-03', 'lazer'),
  pay('PIX ACADEMIA SMART 1002', 139, '2026-10-03', 'lazer'),
];
const energia = [
  pay('Energia Enel', 214, '2026-08-08', 'moradia'),
  pay('Energia Enel', 198, '2026-09-09', 'moradia'),
  pay('Energia Enel', 230, '2026-10-08', 'moradia'),
];

describe('RecurrenceDetector: o que virou conta fixa sem ninguém cadastrar', () => {
  const detector = RecurrenceDetector.create({ calendar });

  it('acha o Pix da academia: mesmo valor, todo mês, entre os dias 2 e 4', () => {
    const [s] = detector.detect([...academia], { asOf });
    expect(s).toBeDefined();
    expect(s!.amount.format()).toBe('R$ 139,00');
    expect(s!.variable).toBe(false);
    expect(s!.dayOfMonth).toBe(3);
    expect(s!.months).toBe(5);
    expect(s!.nextDue.toString()).toBe('2026-11-03');
    expect(s!.category).toBe('lazer');
  });

  it('conta de valor variável vira sugestão estimada, e o vencimento no domingo sai na segunda', () => {
    const [s] = detector.detect([...energia], { asOf });
    expect(s!.variable).toBe(true);
    expect(s!.amount.format()).toBe('R$ 214,00');
    expect(s!.nextDue.toString()).toBe('2026-11-08');
    expect(s!.nextCashDate.toString()).toBe('2026-11-09');
  });

  it('não sugere com menos de três meses seguidos', () => {
    const gap = [pay('Diarista Maria', 150, '2026-06-13'), pay('Diarista Maria', 150, '2026-07-13'), pay('Diarista Maria', 150, '2026-09-13'), pay('Diarista Maria', 150, '2026-10-13')];
    expect(detector.detect(gap, { asOf })).toHaveLength(0);
    expect(detector.detect([pay('Loja online', 89.9, '2026-10-07')], { asOf })).toHaveLength(0);
  });

  it('não sugere quando o dia do mês varia demais', () => {
    const spread = [pay('Pix João', 50, '2026-08-01'), pay('Pix João', 50, '2026-09-15'), pay('Pix João', 50, '2026-10-28')];
    expect(detector.detect(spread, { asOf })).toHaveLength(0);
  });

  it('ignora compras no cartão: quem detecta recorrência no cartão é a fatura', () => {
    const card = CreditCard.create({ id: 'nu', name: 'Cartão Nubank', closingDay: 3, dueDay: 10 });
    const streaming = ['2026-08-06', '2026-09-06', '2026-10-06'].map((date, i) =>
      Entry.cardPurchase({ id: `s${i}`, card, amount: R(21.9), date: d(date), category: 'assinaturas', description: 'Streaming de música' }));
    expect(detector.detect(streaming, { asOf })).toHaveLength(0);
  });

  it('não repete o que já está cadastrado como conta fixa', () => {
    const [s] = detector.detect(academia, { asOf });
    expect(detector.detect(academia, { asOf, known: [s!.key] })).toHaveLength(0);
  });

  it('ordena pelas que têm mais meses', () => {
    const list = detector.detect([...energia, ...academia], { asOf });
    expect(list.map((s) => s.description)).toEqual(['PIX ACADEMIA SMART 1002', 'Energia Enel']);
  });

  it('um pagamento a mais no mês não quebra a sequência', () => {
    const extra = pay('PIX ACADEMIA SMART 1020', 60, '2026-10-20', 'lazer');
    const [s] = detector.detect([...academia, extra], { asOf });
    expect(s?.amount.format()).toBe('R$ 139,00');
    expect(s?.months).toBe(5);
  });

  it('vencimento perto da virada do mês: pago no dia 1º conta para o mês anterior', () => {
    const a = [pay('Escola', 900, '2026-03-30'), pay('Escola', 900, '2026-04-30'), pay('Escola', 900, '2026-06-01'), pay('Escola', 900, '2026-06-30')];
    const [sa] = detector.detect(a, { asOf: d('2026-07-05') });
    expect(sa?.months).toBe(4);
    const b = [pay('Condomínio Ed. Sol', 690, '2026-07-30'), pay('Condomínio Ed. Sol', 690, '2026-08-31'), pay('Condomínio Ed. Sol', 690, '2026-10-01')];
    const [sb] = detector.detect(b, { asOf });
    expect(sb?.months).toBe(3);
    expect(sb?.nextDue.toString()).toBe('2026-10-31');
  });

  it('não sugere o que parou de ser pago', () => {
    const parou = [pay('Curso de violão', 200, '2026-01-10'), pay('Curso de violão', 200, '2026-02-10'), pay('Curso de violão', 200, '2026-03-10')];
    expect(detector.detect(parou, { asOf })).toHaveLength(0);
  });

  it('aceita valor que varia até 50% em torno da mediana', () => {
    const agua = [pay('Sabesp', 100, '2026-08-15'), pay('Sabesp', 140, '2026-09-15'), pay('Sabesp', 200, '2026-10-15')];
    const [s] = detector.detect(agua, { asOf: d('2026-10-20') });
    expect(s?.amount.format()).toBe('R$ 140,00');
    expect(s?.variable).toBe(true);
  });

  it('não junta favorecidos diferentes nem descrições genéricas', () => {
    const pix = [pay('PIX ENVIADO 11122233344', 100, '2026-08-05'), pay('PIX ENVIADO 55566677788', 100, '2026-09-05'), pay('PIX ENVIADO 99988877766', 100, '2026-10-05')];
    expect(detector.detect(pix, { asOf })).toHaveLength(0);
    const numeros = [pay('123456', 50, '2026-08-05'), pay('654321', 50, '2026-09-05'), pay('***', 50, '2026-10-05')];
    expect(detector.detect(numeros, { asOf })).toHaveLength(0);
  });
});
