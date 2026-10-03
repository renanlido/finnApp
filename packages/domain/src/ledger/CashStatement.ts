import { Account } from '../accounts/Account';
import { Money } from '../money/Money';
import { shortDate } from '../shared/format';
import { DomainError } from '../shared/DomainError';
import { LocalDate } from '../time/LocalDate';
import { Entry } from './Entry';

export type CashLineKind =
  | 'opening'
  | 'income'
  | 'transfers_in'
  | 'expenses'
  | 'bills'
  | 'goals'
  | 'transfers_out'
  | 'adjustments'
  | 'closing';

/** Linha da tabela do resumo: sinal na frente, magnitude para + e −, valor com sinal para '' e =. */
export interface CashLine {
  kind: CashLineKind;
  sign: '' | '+' | '-' | '=';
  label: string;
  amount: Money;
}

/**
 * Extrato (regime de caixa) de um conjunto de contas num período:
 * saldo inicial + entradas − saídas = saldo final, no centavo.
 */
export class CashStatement {
  private constructor(
    readonly from: LocalDate,
    readonly to: LocalDate,
    readonly opening: Money,
    readonly income: Money,
    readonly expenses: Money,
    readonly bills: Money,
    readonly goals: Money,
    readonly transfersIn: Money,
    readonly transfersOut: Money,
    readonly adjustments: Money,
    /** Transferências entre contas do próprio conjunto: neutras, só para a nota de rodapé. */
    readonly internalTransfers: Money,
    readonly closing: Money,
  ) {}

  static build(p: { accounts: readonly Account[]; entries: readonly Entry[]; from: LocalDate; to: LocalDate }): CashStatement {
    if (p.to.isBefore(p.from)) throw new DomainError('Período invertido');
    const scope = new Set(p.accounts.map((a) => a.id));
    const inScope = (id: string | undefined) => id !== undefined && scope.has(id);
    const live = (id: string | undefined, date: LocalDate) => inScope(id) && counts(id!, date);
    const inPeriod = (date: LocalDate) => !date.isBefore(p.from) && !date.isAfter(p.to);

    // O saldo inicial é o saldo no dia da abertura: lançamentos anteriores (histórico importado) já estão nele.
    const openedOn = new Map(p.accounts.map((a) => [a.id, a.openedOn]));
    const counts = (account: string, date: LocalDate) => {
      const since = openedOn.get(account);
      return since !== undefined && !date.isBefore(since);
    };
    let opening = Money.sum(p.accounts.map((a) => a.openingBalance));
    let closing = opening;
    for (const e of p.entries) {
      for (const posting of e.postings()) {
        if (!counts(posting.account, posting.date) || posting.date.isAfter(p.to)) continue;
        closing = closing.plus(posting.amount);
        if (posting.date.isBefore(p.from)) opening = opening.plus(posting.amount);
      }
    }

    const t = { income: Money.zero(), expenses: Money.zero(), bills: Money.zero(), goals: Money.zero(),
      transfersIn: Money.zero(), transfersOut: Money.zero(), adjustments: Money.zero(), internal: Money.zero() };
    for (const e of p.entries) {
      if (!inPeriod(e.date)) continue;
      const { account, from, to, goal } = e.refs;
      switch (e.kind) {
        case 'income':
          if (live(account, e.date)) t.income = t.income.plus(e.amount);
          break;
        case 'expense':
          if (live(account, e.date)) t.expenses = t.expenses.plus(e.amount);
          break;
        case 'card_purchase':
          // Compra no cartão não passa por conta de dinheiro: entra no Mês a mês, não no Extrato.
          break;
        case 'bill_payment':
          if (live(from, e.date)) t.bills = t.bills.plus(e.amount);
          break;
        case 'goal_contribution':
          if (live(from, e.date) && live(goal, e.date)) t.internal = t.internal.plus(e.amount);
          else if (live(from, e.date)) t.goals = t.goals.plus(e.amount);
          else if (live(goal, e.date)) t.transfersIn = t.transfersIn.plus(e.amount);
          break;
        case 'transfer':
          if (live(from, e.date) && live(to, e.date)) t.internal = t.internal.plus(e.amount);
          else if (live(from, e.date)) t.transfersOut = t.transfersOut.plus(e.amount);
          else if (live(to, e.date)) t.transfersIn = t.transfersIn.plus(e.amount);
          break;
        case 'wallet_adjustment':
          if (live(account, e.date)) t.adjustments = t.adjustments.plus(e.amount);
          break;
      }
    }
    return new CashStatement(p.from, p.to, opening, t.income, t.expenses, t.bills, t.goals,
      t.transfersIn, t.transfersOut, t.adjustments, t.internal, closing);
  }

  /** A identidade do saldo vale? (o saldo final é somado de forma independente das linhas). */
  reconciles(): boolean {
    const computed = this.opening
      .plus(this.income).plus(this.transfersIn).plus(this.adjustments)
      .minus(this.expenses).minus(this.bills).minus(this.goals).minus(this.transfersOut);
    return computed.equals(this.closing);
  }

  lines(): CashLine[] {
    const out: CashLine[] = [{ kind: 'opening', sign: '', label: `Saldo em ${shortDate(this.from)}`, amount: this.opening }];
    out.push({ kind: 'income', sign: '+', label: 'Entradas', amount: this.income });
    if (!this.transfersIn.isZero()) out.push({ kind: 'transfers_in', sign: '+', label: 'Transferências recebidas', amount: this.transfersIn });
    out.push({ kind: 'expenses', sign: '-', label: 'Gastos e contas', amount: this.expenses });
    if (!this.bills.isZero()) out.push({ kind: 'bills', sign: '-', label: 'Faturas de cartão', amount: this.bills });
    if (!this.goals.isZero()) out.push({ kind: 'goals', sign: '-', label: 'Guardado nas metas', amount: this.goals });
    if (!this.transfersOut.isZero()) out.push({ kind: 'transfers_out', sign: '-', label: 'Transferências enviadas', amount: this.transfersOut });
    if (!this.adjustments.isZero()) {
      out.push({ kind: 'adjustments', sign: this.adjustments.isNegative() ? '-' : '+', label: 'Ajuste da carteira', amount: this.adjustments.abs() });
    }
    out.push({ kind: 'closing', sign: '=', label: `Saldo em ${shortDate(this.to)}`, amount: this.closing });
    return out;
  }
}
