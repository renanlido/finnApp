import type { Account, CreditCard, Entry, LocalDate } from '@finnapp/domain';

/** Porta de leitura do livro-caixa de uma pessoa. Postgres em produção, memória nos testes. */
export interface LedgerReader {
  accounts(userId: string): Promise<Account[]>;
  cards(userId: string): Promise<CreditCard[]>;
  /** Lançamentos com data até `until` (inclusive): o saldo inicial depende de tudo que veio antes. */
  entriesUntil(userId: string, until: LocalDate): Promise<Entry[]>;
}
