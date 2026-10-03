import type { Account, CreditCard, Entry, LocalDate } from '@finnapp/domain';
import type { LedgerReader } from '../../application/LedgerReader';

/** Livro-caixa em memória, para testes e para rodar a API sem banco. */
export class InMemoryLedger implements LedgerReader {
  private readonly data = new Map<string, { accounts: Account[]; cards: CreditCard[]; entries: Entry[] }>();

  private of(userId: string) {
    let d = this.data.get(userId);
    if (!d) {
      d = { accounts: [], cards: [], entries: [] };
      this.data.set(userId, d);
    }
    return d;
  }

  addAccount(userId: string, account: Account): void {
    this.of(userId).accounts.push(account);
  }

  addCard(userId: string, card: CreditCard): void {
    this.of(userId).cards.push(card);
  }

  addEntry(userId: string, entry: Entry): void {
    this.of(userId).entries.push(entry);
  }

  async accounts(userId: string): Promise<Account[]> {
    return [...this.of(userId).accounts];
  }

  async cards(userId: string): Promise<CreditCard[]> {
    return [...this.of(userId).cards];
  }

  async entriesUntil(userId: string, until: LocalDate): Promise<Entry[]> {
    return this.of(userId).entries.filter((e) => !e.date.isAfter(until));
  }
}
