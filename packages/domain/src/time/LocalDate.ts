import { DomainError } from '../shared/DomainError';

const DAY_MS = 86_400_000;

/** Data de calendário sem hora nem fuso. Lançamento, vencimento e saldo trabalham sempre em dias. */
export class LocalDate {
  private constructor(readonly epochDay: number) {}

  static of(year: number, month: number, day: number): LocalDate {
    const ms = Date.UTC(year, month - 1, day);
    const d = new Date(ms);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      throw new DomainError(`Data inválida: ${year}-${month}-${day}`);
    }
    return new LocalDate(Math.round(ms / DAY_MS));
  }

  static parse(iso: string): LocalDate {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) throw new DomainError(`Data fora do formato AAAA-MM-DD: ${iso}`);
    return LocalDate.of(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  private get utc(): Date {
    return new Date(this.epochDay * DAY_MS);
  }

  get year(): number {
    return this.utc.getUTCFullYear();
  }

  get month(): number {
    return this.utc.getUTCMonth() + 1;
  }

  get day(): number {
    return this.utc.getUTCDate();
  }

  /** 0 = domingo … 6 = sábado. */
  get dayOfWeek(): number {
    return this.utc.getUTCDay();
  }

  plusDays(days: number): LocalDate {
    return new LocalDate(this.epochDay + days);
  }

  /** Soma meses; se o dia não existe no mês de destino, usa o último dia dele. */
  plusMonths(months: number): LocalDate {
    const index = this.year * 12 + (this.month - 1) + months;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return LocalDate.of(year, month, Math.min(this.day, lastDay));
  }

  compare(other: LocalDate): number {
    return this.epochDay - other.epochDay;
  }

  isBefore(other: LocalDate): boolean {
    return this.epochDay < other.epochDay;
  }

  isAfter(other: LocalDate): boolean {
    return this.epochDay > other.epochDay;
  }

  equals(other: LocalDate): boolean {
    return this.epochDay === other.epochDay;
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
  }
}
