import { CreditCard } from '../accounts/CreditCard';
import { Money } from '../money/Money';
import { DomainError } from '../shared/DomainError';
import { LocalDate } from '../time/LocalDate';
import { YearMonth } from '../time/YearMonth';

/** Conta contábil do cartão nos postings: ids de cartão e de conta nunca colidem. */
export const cardLedgerId = (cardId: string) => `card:${cardId}`;

export type EntryKind =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'card_purchase'
  | 'bill_payment'
  | 'goal_contribution'
  | 'wallet_adjustment';

/** Movimento em uma conta, no dia em que o dinheiro passou (regime de caixa). */
export interface Posting {
  account: string;
  amount: Money;
  date: LocalDate;
}

/** Parte do lançamento que pertence a um mês (regime de competência). */
export interface AccrualPart {
  competence: YearMonth;
  side: 'income' | 'expense' | 'goal';
  category: string;
  amount: Money;
}

interface Base {
  id: string;
  date: LocalDate;
  description: string;
}

function positive(amount: Money, what: string): Money {
  if (!amount.isPositive()) throw new DomainError(`${what}: o valor precisa ser maior que zero`);
  return amount;
}

/**
 * Um lançamento. Cada um sabe como mexe no saldo das contas (postings) e a que mês pertence
 * (accrual). As duas visões nunca se misturam: o Extrato lê postings, o Mês a mês lê accrual.
 */
export class Entry {
  private constructor(
    readonly id: string,
    readonly kind: EntryKind,
    readonly date: LocalDate,
    readonly description: string,
    readonly amount: Money,
    readonly refs: { account?: string; from?: string; to?: string; card?: string; goal?: string },
    private readonly postingList: readonly Posting[],
    private readonly accrualList: readonly AccrualPart[],
  ) {}

  static income(p: Base & { account: string; amount: Money; category: string; competence?: YearMonth }): Entry {
    const amount = positive(p.amount, 'Entrada');
    return new Entry(p.id, 'income', p.date, p.description, amount, { account: p.account },
      [{ account: p.account, amount, date: p.date }],
      [{ competence: p.competence ?? YearMonth.of(p.date), side: 'income', category: p.category, amount }]);
  }

  static expense(p: Base & { account: string; amount: Money; category: string; competence?: YearMonth }): Entry {
    const amount = positive(p.amount, 'Despesa');
    return new Entry(p.id, 'expense', p.date, p.description, amount, { account: p.account },
      [{ account: p.account, amount: amount.negate(), date: p.date }],
      [{ competence: p.competence ?? YearMonth.of(p.date), side: 'expense', category: p.category, amount }]);
  }

  /** Entre contas próprias: sai de uma, entra na outra; não é gasto nem receita. */
  static transfer(p: Base & { from: string; to: string; amount: Money }): Entry {
    if (p.from === p.to) throw new DomainError('Transferência para a mesma conta');
    const amount = positive(p.amount, 'Transferência');
    return new Entry(p.id, 'transfer', p.date, p.description, amount, { from: p.from, to: p.to },
      [{ account: p.from, amount: amount.negate(), date: p.date }, { account: p.to, amount, date: p.date }], []);
  }

  /** Compra no cartão: pertence ao mês (ou aos meses, se parcelada), mas só sai da conta quando a fatura é paga. */
  static cardPurchase(p: Base & { card: CreditCard; amount: Money; category: string; installments?: number }): Entry {
    const amount = positive(p.amount, 'Compra no cartão');
    const plan = p.card.installments(p.date, amount, p.installments ?? 1);
    return new Entry(p.id, 'card_purchase', p.date, p.description, amount, { card: p.card.id },
      [{ account: cardLedgerId(p.card.id), amount: amount.negate(), date: p.date }],
      plan.map((i) => ({ competence: i.competence, side: 'expense' as const, category: p.category, amount: i.amount })));
  }

  /** Pagamento de fatura: tira da conta e quita o cartão. Não é despesa nova (já foi contada na compra). */
  static billPayment(p: Base & { from: string; card: string; amount: Money }): Entry {
    const amount = positive(p.amount, 'Pagamento de fatura');
    return new Entry(p.id, 'bill_payment', p.date, p.description, amount, { from: p.from, card: p.card },
      [{ account: p.from, amount: amount.negate(), date: p.date }, { account: cardLedgerId(p.card), amount, date: p.date }], []);
  }

  /** Aporte em meta: sai do disponível, reduz a sobra do mês, mas não é gasto. */
  static goalContribution(p: Base & { from: string; goal?: string; amount: Money; competence?: YearMonth }): Entry {
    if (p.goal === p.from) throw new DomainError('A meta precisa ser outra conta que não a de origem');
    const amount = positive(p.amount, 'Aporte em meta');
    const postings: Posting[] = [{ account: p.from, amount: amount.negate(), date: p.date }];
    if (p.goal) postings.push({ account: p.goal, amount, date: p.date });
    return new Entry(p.id, 'goal_contribution', p.date, p.description, amount, { from: p.from, ...(p.goal ? { goal: p.goal } : {}) },
      postings, [{ competence: p.competence ?? YearMonth.of(p.date), side: 'goal', category: 'metas', amount }]);
  }

  /** Diferença ao contar a Carteira: vira lançamento em Outros, com o sinal da diferença. */
  static walletAdjustment(p: { id: string; account: string; delta: Money; date: LocalDate; description?: string }): Entry {
    if (p.delta.isZero()) throw new DomainError('Ajuste sem diferença');
    return new Entry(p.id, 'wallet_adjustment', p.date, p.description ?? 'Ajuste da carteira', p.delta, { account: p.account },
      [{ account: p.account, amount: p.delta, date: p.date }],
      [{ competence: YearMonth.of(p.date), side: p.delta.isNegative() ? 'expense' : 'income', category: 'outros', amount: p.delta.abs() }]);
  }

  postings(): readonly Posting[] {
    return this.postingList;
  }

  accrual(): readonly AccrualPart[] {
    return this.accrualList;
  }
}
