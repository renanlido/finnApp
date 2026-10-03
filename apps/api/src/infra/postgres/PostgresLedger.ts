import pg from 'pg';
import { Account, CreditCard, Entry, LocalDate, Money, YearMonth, type AccountKind, type EntryKind } from '@finnapp/domain';
import type { LedgerReader } from '../../application/LedgerReader';

// DATE volta como 'AAAA-MM-DD' (sem fuso); bigint de centavos volta como number.
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(20, (v: string) => Number(v));

interface EntryRow {
  id: string;
  kind: EntryKind;
  date: string;
  description: string;
  amount_cents: number;
  category: string | null;
  competence: string | null;
  account_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  goal_account_id: string | null;
  card_id: string | null;
  installments: number;
}

/** Linha inconsistente no banco é erro do servidor (500), não do pedido. */
export class CorruptLedgerError extends Error {}

function req<T>(value: T | null, what: string, id: string): T {
  if (value === null) throw new CorruptLedgerError(`Lançamento ${id} sem ${what}`);
  return value;
}

export class PostgresLedger implements LedgerReader {
  constructor(private readonly pool: pg.Pool) {}

  async accounts(userId: string): Promise<Account[]> {
    const { rows } = await this.pool.query<{ id: string; name: string; kind: AccountKind; opening_balance_cents: number; opened_on: string }>(
      'SELECT id, name, kind, opening_balance_cents, opened_on FROM accounts WHERE user_id = $1 ORDER BY created_at, id', [userId]);
    return rows.map((r) => Account.create({ id: r.id, name: r.name, kind: r.kind, openingBalance: Money.ofCents(r.opening_balance_cents), openedOn: LocalDate.parse(r.opened_on) }));
  }

  async cards(userId: string): Promise<CreditCard[]> {
    const { rows } = await this.pool.query<{ id: string; name: string; closing_day: number; due_day: number }>(
      'SELECT id, name, closing_day, due_day FROM credit_cards WHERE user_id = $1 ORDER BY id', [userId]);
    return rows.map((r) => CreditCard.create({ id: r.id, name: r.name, closingDay: r.closing_day, dueDay: r.due_day }));
  }

  async entriesUntil(userId: string, until: LocalDate): Promise<Entry[]> {
    const cards = new Map((await this.cards(userId)).map((c) => [c.id, c]));
    const { rows } = await this.pool.query<EntryRow>(
      `SELECT id, kind, date, description, amount_cents, category, competence, account_id, from_account_id,
              to_account_id, goal_account_id, card_id, installments
         FROM entries WHERE user_id = $1 AND date <= $2 ORDER BY date, id`, [userId, until.toString()]);
    return rows.map((r) => {
      try {
        return this.toEntry(r, cards);
      } catch (error) {
        if (error instanceof CorruptLedgerError) throw error;
        throw new CorruptLedgerError(`Lançamento ${r.id} inválido: ${(error as Error).message}`);
      }
    });
  }

  private toEntry(r: EntryRow, cards: Map<string, CreditCard>): Entry {
    const base = { id: r.id, date: LocalDate.parse(r.date), description: r.description };
    const amount = Money.ofCents(r.amount_cents);
    const competence = r.competence ? { competence: YearMonth.parse(r.competence) } : {};
    switch (r.kind) {
      case 'income':
        return Entry.income({ ...base, ...competence, account: req(r.account_id, 'conta', r.id), amount, category: req(r.category, 'categoria', r.id) });
      case 'expense':
        return Entry.expense({ ...base, ...competence, account: req(r.account_id, 'conta', r.id), amount, category: req(r.category, 'categoria', r.id) });
      case 'transfer':
        return Entry.transfer({ ...base, from: req(r.from_account_id, 'conta de origem', r.id), to: req(r.to_account_id, 'conta de destino', r.id), amount });
      case 'card_purchase': {
        const card = cards.get(req(r.card_id, 'cartão', r.id));
        if (!card) throw new CorruptLedgerError(`Cartão ${r.card_id} não encontrado`);
        return Entry.cardPurchase({ ...base, card, amount, category: req(r.category, 'categoria', r.id), installments: r.installments });
      }
      case 'bill_payment':
        return Entry.billPayment({ ...base, from: req(r.from_account_id, 'conta de origem', r.id), card: req(r.card_id, 'cartão', r.id), amount });
      case 'goal_contribution':
        return Entry.goalContribution({ ...base, ...competence, from: req(r.from_account_id, 'conta de origem', r.id), ...(r.goal_account_id ? { goal: r.goal_account_id } : {}), amount });
      case 'wallet_adjustment':
        return Entry.walletAdjustment({ id: r.id, date: base.date, description: r.description, account: req(r.account_id, 'conta', r.id), delta: amount });
    }
  }
}
