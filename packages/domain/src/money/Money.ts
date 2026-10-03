import { DomainError } from '../shared/DomainError';

const MINUS = '−';

export interface MoneyFormat {
  /** Mostra centavos (padrão true). */
  cents?: boolean;
  /** Prefixa "+" em valores positivos (o "−" aparece sempre). */
  signed?: boolean;
  /** Prefixa "R$ " (padrão true). */
  currency?: boolean;
}

/** Valor em reais guardado em centavos inteiros. Nunca use number solto para dinheiro. */
export class Money {
  private constructor(readonly cents: number) {}

  static ofCents(cents: number): Money {
    if (!Number.isInteger(cents)) throw new DomainError('Money exige centavos inteiros');
    return new Money(cents === 0 ? 0 : cents);
  }

  static ofReais(reais: number): Money {
    // Arredonda a magnitude, para que −2,675 e 2,675 virem −267 e 267 (simétrico).
    const cents = Math.round(Math.abs(reais) * 100);
    return Money.ofCents(reais < 0 ? -cents : cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  static sum(values: readonly Money[]): Money {
    return values.reduce((acc, v) => acc.plus(v), Money.zero());
  }

  plus(other: Money): Money {
    return Money.ofCents(this.cents + other.cents);
  }

  minus(other: Money): Money {
    return Money.ofCents(this.cents - other.cents);
  }

  negate(): Money {
    return Money.ofCents(-this.cents);
  }

  abs(): Money {
    return Money.ofCents(Math.abs(this.cents));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /** Divide em n parcelas; a sobra de centavos vai para as primeiras. */
  split(parts: number): Money[] {
    if (!Number.isInteger(parts) || parts < 1) throw new DomainError('Número de parcelas inválido');
    const sign = this.cents < 0 ? -1 : 1;
    const total = Math.abs(this.cents);
    const base = Math.floor(total / parts);
    const rest = total - base * parts;
    return Array.from({ length: parts }, (_, i) => Money.ofCents(sign * (base + (i < rest ? 1 : 0))));
  }

  toReais(): number {
    return this.cents / 100;
  }

  /** "−R$ 186,30", "+R$ 14.000,00", "R$ 3.794": as mesmas regras do design system. */
  format(options: MoneyFormat = {}): string {
    const showCents = options.cents !== false;
    const abs = Math.abs(this.cents);
    const units = showCents ? Math.floor(abs / 100) : Math.round(abs / 100);
    const grouped = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const body = showCents ? `${grouped},${String(abs % 100).padStart(2, '0')}` : grouped;
    const shownIsZero = showCents ? abs === 0 : units === 0;
    const sign = shownIsZero ? '' : this.cents < 0 ? MINUS : options.signed ? '+' : '';
    const currency = options.currency === false ? '' : 'R$ ';
    return `${sign}${currency}${body}`;
  }

  toString(): string {
    return this.format();
  }
}
