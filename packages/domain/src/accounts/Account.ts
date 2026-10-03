import { Money } from '../money/Money';
import { DomainError } from '../shared/DomainError';
import { LocalDate } from '../time/LocalDate';

/** checking: conta no banco · wallet: dinheiro físico (Carteira) · investment: reserva e metas. */
export type AccountKind = 'checking' | 'wallet' | 'investment';

export class Account {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly kind: AccountKind,
    readonly openingBalance: Money,
    readonly openedOn: LocalDate,
  ) {}

  static create(props: { id: string; name: string; kind: AccountKind; openingBalance?: Money; openedOn: LocalDate }): Account {
    if (!props.id.trim()) throw new DomainError('Conta sem id');
    if (!props.name.trim()) throw new DomainError('Conta sem nome');
    return new Account(props.id, props.name.trim(), props.kind, props.openingBalance ?? Money.zero(), props.openedOn);
  }

  /** Entra no "Em contas" e no saldo disponível: conta corrente e Carteira. */
  get isCash(): boolean {
    return this.kind === 'checking' || this.kind === 'wallet';
  }
}
