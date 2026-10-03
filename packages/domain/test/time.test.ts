import { describe, expect, it } from 'vitest';
import { LocalDate } from '../src/time/LocalDate';
import { YearMonth } from '../src/time/YearMonth';
import { BusinessCalendar } from '../src/time/BusinessCalendar';

describe('LocalDate', () => {
  it('lê e escreve AAAA-MM-DD e sabe o dia da semana (0 = domingo)', () => {
    const d = LocalDate.parse('2026-10-12');
    expect(d.toString()).toBe('2026-10-12');
    expect(d.dayOfWeek).toBe(1);
  });

  it('recusa data inexistente', () => {
    expect(() => LocalDate.of(2026, 2, 30)).toThrow();
  });

  it('soma dias atravessando mês e ano', () => {
    expect(LocalDate.parse('2026-12-30').plusDays(3).toString()).toBe('2027-01-02');
  });

  it('soma meses prendendo no último dia do mês', () => {
    expect(LocalDate.parse('2027-01-31').plusMonths(1).toString()).toBe('2027-02-28');
    expect(LocalDate.parse('2028-01-31').plusMonths(1).toString()).toBe('2028-02-29');
  });

  it('compara datas', () => {
    const a = LocalDate.parse('2026-10-01');
    const b = LocalDate.parse('2026-10-12');
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
    expect(a.equals(LocalDate.of(2026, 10, 1))).toBe(true);
  });
});

describe('YearMonth', () => {
  it('sabe o primeiro e o último dia e se contém uma data', () => {
    const m = YearMonth.parse('2026-02');
    expect(m.first().toString()).toBe('2026-02-01');
    expect(m.last().toString()).toBe('2026-02-28');
    expect(m.contains(LocalDate.parse('2026-02-15'))).toBe(true);
    expect(m.contains(LocalDate.parse('2026-03-01'))).toBe(false);
  });

  it('anda meses para frente e para trás', () => {
    expect(YearMonth.parse('2026-11').plus(3).toString()).toBe('2027-02');
    expect(YearMonth.parse('2026-01').plus(-1).toString()).toBe('2025-12');
    expect(YearMonth.of(LocalDate.parse('2026-10-12')).toString()).toBe('2026-10');
  });
});

describe('BusinessCalendar (Brasil)', () => {
  const cal = BusinessCalendar.brazil();

  it('conhece os feriados nacionais fixos, inclusive Consciência Negra', () => {
    expect(cal.holidayName(LocalDate.parse('2026-10-12'))).toBe('Nossa Senhora Aparecida');
    expect(cal.holidayName(LocalDate.parse('2026-11-20'))).toBe('Consciência Negra');
    expect(cal.isHoliday(LocalDate.parse('2026-12-25'))).toBe(true);
  });

  it('calcula os feriados móveis a partir da Páscoa', () => {
    expect(cal.holidayName(LocalDate.parse('2026-04-03'))).toBe('Paixão de Cristo');
    expect(cal.holidayName(LocalDate.parse('2026-02-16'))).toBe('Carnaval');
    expect(cal.holidayName(LocalDate.parse('2026-02-17'))).toBe('Carnaval');
    expect(cal.holidayName(LocalDate.parse('2026-06-04'))).toBe('Corpus Christi');
    expect(cal.holidayName(LocalDate.parse('2027-03-26'))).toBe('Paixão de Cristo');
    expect(cal.holidayName(LocalDate.parse('2027-02-08'))).toBe('Carnaval');
  });

  it('sem calendário bancário, Carnaval e Corpus Christi são dias úteis', () => {
    const civil = BusinessCalendar.brazil({ bank: false });
    expect(civil.isBusinessDay(LocalDate.parse('2026-02-16'))).toBe(true);
    expect(civil.isBusinessDay(LocalDate.parse('2026-04-03'))).toBe(false);
  });

  it('conta que vence no sábado sai na segunda', () => {
    expect(cal.nextBusinessDay(LocalDate.parse('2026-11-07')).toString()).toBe('2026-11-09');
  });

  it('pula feriado e fim de semana em sequência', () => {
    expect(cal.nextBusinessDay(LocalDate.parse('2026-11-20')).toString()).toBe('2026-11-23');
    expect(cal.nextBusinessDay(LocalDate.parse('2026-10-12')).toString()).toBe('2026-10-13');
  });

  it('dia útil fica onde está', () => {
    expect(cal.nextBusinessDay(LocalDate.parse('2026-11-03')).toString()).toBe('2026-11-03');
  });

  it('aceita feriados municipais', () => {
    const sp = BusinessCalendar.brazil({ local: { '01-25': 'Aniversário de São Paulo' } });
    expect(sp.holidayName(LocalDate.parse('2027-01-25'))).toBe('Aniversário de São Paulo');
  });
});
