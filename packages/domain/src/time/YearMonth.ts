import { DomainError } from '../shared/DomainError';
import { LocalDate } from './LocalDate';

/** Um mês do calendário: a unidade da visão por competência e do orçamento. */
export class YearMonth {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  static of(date: LocalDate): YearMonth {
    return new YearMonth(date.year, date.month);
  }

  static from(year: number, month: number): YearMonth {
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new DomainError(`Mês inválido: ${month}`);
    return new YearMonth(year, month);
  }

  static parse(value: string): YearMonth {
    const m = /^(\d{4})-(\d{2})$/.exec(value);
    if (!m) throw new DomainError(`Mês fora do formato AAAA-MM: ${value}`);
    return YearMonth.from(Number(m[1]), Number(m[2]));
  }

  plus(months: number): YearMonth {
    const index = this.year * 12 + (this.month - 1) + months;
    return new YearMonth(Math.floor(index / 12), (index % 12) + 1);
  }

  first(): LocalDate {
    return LocalDate.of(this.year, this.month, 1);
  }

  last(): LocalDate {
    return LocalDate.of(this.year, this.month, new Date(Date.UTC(this.year, this.month, 0)).getUTCDate());
  }

  /** Dia do mês, preso ao último dia quando o mês é mais curto (dia 31 em fevereiro vira 28). */
  day(day: number): LocalDate {
    return LocalDate.of(this.year, this.month, Math.min(day, this.last().day));
  }

  contains(date: LocalDate): boolean {
    return date.year === this.year && date.month === this.month;
  }

  equals(other: YearMonth): boolean {
    return this.year === other.year && this.month === other.month;
  }

  compare(other: YearMonth): number {
    return (this.year - other.year) * 12 + (this.month - other.month);
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
}
