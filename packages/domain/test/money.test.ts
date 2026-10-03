import { describe, expect, it } from 'vitest';
import { Money } from '../src/money/Money';

describe('Money', () => {
  it('guarda centavos inteiros e converte de reais sem erro de ponto flutuante', () => {
    expect(Money.ofReais(186.3).cents).toBe(18630);
    expect(Money.ofReais(0.1).plus(Money.ofReais(0.2)).cents).toBe(30);
  });

  it('recusa centavos fracionados', () => {
    expect(() => Money.ofCents(10.5)).toThrow('centavos inteiros');
  });

  it('soma, subtrai e nega', () => {
    const a = Money.ofReais(14000);
    const b = Money.ofReais(4956.9);
    expect(a.minus(b).cents).toBe(904310);
    expect(b.negate().isNegative()).toBe(true);
    expect(Money.sum([a, b.negate()]).equals(Money.ofReais(9043.1))).toBe(true);
  });

  it('formata como a interface: sinal de menos verdadeiro antes do R$', () => {
    expect(Money.ofReais(-186.3).format()).toBe('−R$ 186,30');
    expect(Money.ofReais(1234567.89).format()).toBe('R$ 1.234.567,89');
    expect(Money.ofReais(14000).format({ signed: true })).toBe('+R$ 14.000,00');
    expect(Money.ofReais(3794.4).format({ cents: false })).toBe('R$ 3.794');
    expect(Money.ofReais(-136).format({ cents: false, signed: true, currency: false })).toBe('−136');
    expect(Money.zero().format({ signed: true })).toBe('R$ 0,00');
  });

  it('divide em parcelas sem perder centavo: a sobra vai para a primeira', () => {
    const parts = Money.ofReais(1000).split(3);
    expect(parts.map((p) => p.cents)).toEqual([33334, 33333, 33333]);
    expect(Money.sum(parts).cents).toBe(100000);
  });

  it('recusa número de parcelas inválido', () => {
    expect(() => Money.ofReais(10).split(0)).toThrow();
  });
});
