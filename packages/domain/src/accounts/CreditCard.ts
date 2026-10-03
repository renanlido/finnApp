import { Money } from '../money/Money';
import { DomainError } from '../shared/DomainError';
import { BusinessCalendar } from '../time/BusinessCalendar';
import { LocalDate } from '../time/LocalDate';
import { YearMonth } from '../time/YearMonth';

export class Bill {
  private constructor(
    readonly cardId: string,
    readonly closing: LocalDate,
    readonly due: LocalDate,
  ) {}

  static create(cardId: string, closing: LocalDate, due: LocalDate): Bill {
    return new Bill(cardId, closing, due);
  }

  /** Mês de referência da fatura: o mês em que ela vence. */
  get reference(): YearMonth {
    return YearMonth.of(this.due);
  }

  /** Quando o pagamento sai da conta: vencimento em dia não útil vai para o próximo dia útil. */
  paymentDate(calendar: BusinessCalendar): LocalDate {
    return calendar.nextBusinessDay(this.due);
  }
}

export interface Installment {
  number: number;
  of: number;
  amount: Money;
  /** Mês ao qual a parcela pertence no orçamento (competência). */
  competence: YearMonth;
  bill: Bill;
}

/** Cartão de crédito: compra não sai do saldo da conta; sai a fatura, quando é paga. */
export class CreditCard {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly closingDay: number,
    readonly dueDay: number,
  ) {}

  static create(props: { id: string; name: string; closingDay: number; dueDay: number }): CreditCard {
    for (const [label, day] of [['fechamento', props.closingDay], ['vencimento', props.dueDay]] as const) {
      if (!Number.isInteger(day) || day < 1 || day > 31) throw new DomainError(`Dia de ${label} inválido: ${day}`);
    }
    return new CreditCard(props.id, props.name, props.closingDay, props.dueDay);
  }

  /**
   * A fatura que vence no mês `dueMonth`. Uma fatura por mês: se o fechamento preso ao fim de um mês
   * curto encostar no vencimento (fecha 28, vence 31 em fevereiro), ele recua para manter o intervalo.
   */
  billDueIn(dueMonth: YearMonth): Bill {
    const due = dueMonth.day(this.dueDay);
    let closing = this.closingDay < this.dueDay ? dueMonth.day(this.closingDay) : dueMonth.plus(-1).day(this.closingDay);
    if (!closing.isBefore(due)) closing = due.plusDays(-Math.max(1, this.dueDay - this.closingDay));
    return Bill.create(this.id, closing, due);
  }

  /** Fatura em que uma compra feita nesta data entra (compra no dia do fechamento ainda entra). */
  billFor(purchase: LocalDate): Bill {
    let month = YearMonth.of(purchase).plus(-1);
    for (;;) {
      const bill = this.billDueIn(month);
      if (!purchase.isAfter(bill.closing)) return bill;
      month = month.plus(1);
    }
  }

  /** Divide a compra em parcelas: a parcela i cai na fatura i meses depois e no mês i do orçamento. */
  installments(purchase: LocalDate, total: Money, count: number): Installment[] {
    const first = this.billFor(purchase);
    return total.split(count).map((amount, i) => ({
      number: i + 1,
      of: count,
      amount,
      competence: YearMonth.of(purchase).plus(i),
      bill: this.billDueIn(first.reference.plus(i)),
    }));
  }
}
