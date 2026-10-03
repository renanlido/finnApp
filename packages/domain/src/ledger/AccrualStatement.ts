import { Money } from '../money/Money';
import { YearMonth } from '../time/YearMonth';
import { Entry } from './Entry';

/**
 * Mês a mês (regime de competência): o que pertence ao mês, não o que passou na conta.
 * Compra no cartão conta no mês da compra (ou da parcela); fatura paga e transferência não contam.
 */
export class AccrualStatement {
  private constructor(
    readonly month: YearMonth,
    readonly income: Money,
    readonly expenses: Money,
    readonly goals: Money,
    private readonly categories: ReadonlyMap<string, Money>,
  ) {}

  static build(p: { entries: readonly Entry[]; month: YearMonth }): AccrualStatement {
    let income = Money.zero();
    let expenses = Money.zero();
    let goals = Money.zero();
    const categories = new Map<string, Money>();
    for (const e of p.entries) {
      for (const part of e.accrual()) {
        if (!part.competence.equals(p.month)) continue;
        if (part.side === 'income') income = income.plus(part.amount);
        else if (part.side === 'goal') goals = goals.plus(part.amount);
        else {
          expenses = expenses.plus(part.amount);
          categories.set(part.category, (categories.get(part.category) ?? Money.zero()).plus(part.amount));
        }
      }
    }
    return new AccrualStatement(p.month, income, expenses, goals, categories);
  }

  /** Sobra do mês = receitas − despesas − aporte nas metas. Negativa: o mês faltou. */
  get surplus(): Money {
    return this.income.minus(this.expenses).minus(this.goals);
  }

  /** Despesas por categoria, da maior para a menor. */
  byCategory(): Map<string, Money> {
    return new Map([...this.categories.entries()].sort((a, b) => b[1].cents - a[1].cents));
  }
}
