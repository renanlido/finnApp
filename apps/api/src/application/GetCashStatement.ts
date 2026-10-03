import { CashStatement, DomainError, LocalDate, Money } from '@finnapp/domain';
import type { LedgerReader } from './LedgerReader';

export class NotFoundError extends Error {}

export interface MoneyDto { cents: number; text: string }
export interface CashStatementDto {
  from: string;
  to: string;
  opening: MoneyDto;
  income: MoneyDto;
  expenses: MoneyDto;
  bills: MoneyDto;
  goals: MoneyDto;
  transfersIn: MoneyDto;
  transfersOut: MoneyDto;
  adjustments: MoneyDto;
  internalTransfers: MoneyDto;
  closing: MoneyDto;
  reconciles: boolean;
  lines: { kind: string; sign: string; label: string; amount: MoneyDto }[];
}

const dto = (m: Money): MoneyDto => ({ cents: m.cents, text: m.format() });

/** Extrato de um período: todas as contas de dinheiro (conta corrente + Carteira) ou uma conta. */
export class GetCashStatement {
  constructor(private readonly ledger: LedgerReader) {}

  async execute(input: { userId: string; from: string; to: string; account?: string }): Promise<CashStatementDto> {
    const from = LocalDate.parse(input.from);
    const to = LocalDate.parse(input.to);
    if (to.isBefore(from)) throw new DomainError('A data final vem antes da inicial');
    const all = await this.ledger.accounts(input.userId);
    const scope = input.account ? all.filter((a) => a.id === input.account) : all.filter((a) => a.isCash);
    if (input.account && scope.length === 0) throw new NotFoundError(`Conta não encontrada: ${input.account}`);
    const entries = await this.ledger.entriesUntil(input.userId, to);
    const s = CashStatement.build({ accounts: scope, entries, from, to });
    return {
      from: from.toString(),
      to: to.toString(),
      opening: dto(s.opening),
      income: dto(s.income),
      expenses: dto(s.expenses),
      bills: dto(s.bills),
      goals: dto(s.goals),
      transfersIn: dto(s.transfersIn),
      transfersOut: dto(s.transfersOut),
      adjustments: dto(s.adjustments),
      internalTransfers: dto(s.internalTransfers),
      closing: dto(s.closing),
      reconciles: s.reconciles(),
      lines: s.lines().map((l) => ({ kind: l.kind, sign: l.sign, label: l.label, amount: dto(l.amount) })),
    };
  }
}
