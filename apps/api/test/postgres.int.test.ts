import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { GetCashStatement } from '../src/application/GetCashStatement';
import { migrate } from '../src/infra/postgres/migrate';
import { PostgresLedger } from '../src/infra/postgres/PostgresLedger';

// Postgres de verdade. Rode com TEST_DATABASE_URL apontando para um banco VAZIO (o teste recria o schema).
// Ex.: docker compose up -d && TEST_DATABASE_URL=postgres://finnapp:finnapp@localhost:5432/finnapp_test pnpm test
const url = process.env.TEST_DATABASE_URL;
const user = 'renan';

describe.skipIf(!url)('PostgresLedger (integração)', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    expect(await migrate(pool)).toEqual(['001_ledger.sql']);
    expect(await migrate(pool)).toEqual([]);

    await pool.query(`INSERT INTO accounts (id, user_id, name, kind, opening_balance_cents, opened_on) VALUES
      ('btg', $1, 'BTG', 'checking', 80400, '2026-09-30'),
      ('wallet', $1, 'Carteira', 'wallet', 8000, '2026-09-30'),
      ('goals', $1, 'Metas', 'investment', 0, '2026-09-30'),
      ('outro', 'outra-pessoa', 'Conta de outra pessoa', 'checking', 999900, '2026-09-30')`, [user]);
    await pool.query(`INSERT INTO credit_cards (id, user_id, name, closing_day, due_day) VALUES ('card-nubank', $1, 'Cartão Nubank', 3, 10)`, [user]);
    await pool.query(`INSERT INTO entries (id, user_id, kind, date, description, amount_cents, category, account_id, from_account_id, to_account_id, goal_account_id, card_id, installments) VALUES
      ('e1', $1, 'income',            '2026-10-05', 'Salário',          1400000, 'receita',      'btg',    NULL,  NULL,     NULL,    NULL,          1),
      ('e2', $1, 'expense',           '2026-10-05', 'Aluguel',           240000, 'moradia',      'btg',    NULL,  NULL,     NULL,    NULL,          1),
      ('e3', $1, 'transfer',          '2026-10-09', 'Saque',              15000, NULL,           NULL,     'btg', 'wallet', NULL,    NULL,          1),
      ('e4', $1, 'expense',           '2026-10-10', 'Feira livre',         4500, 'mercado',      'wallet', NULL,  NULL,     NULL,    NULL,          1),
      ('e5', $1, 'card_purchase',     '2026-10-10', 'Restaurante Maré',   11840, 'restaurantes', NULL,     NULL,  NULL,     NULL,    'card-nubank', 1),
      ('e6', $1, 'goal_contribution', '2026-10-06', 'Reserva',           150000, NULL,           NULL,     'btg', NULL,     'goals', NULL,          1),
      ('e7', $1, 'wallet_adjustment', '2026-10-12', 'Ajuste da carteira', -1500, NULL,           'wallet', NULL,  NULL,     NULL,    NULL,          1),
      ('e8', $1, 'expense',           '2026-10-20', 'Depois do período',  10000, 'outros',       'btg',    NULL,  NULL,     NULL,    NULL,          1)`, [user]);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('lê o livro-caixa e fecha o extrato no centavo', async () => {
    const s = await new GetCashStatement(new PostgresLedger(pool)).execute({ userId: user, from: '2026-10-01', to: '2026-10-12' });
    expect(s.opening.text).toBe('R$ 884,00');
    expect(s.income.text).toBe('R$ 14.000,00');
    expect(s.expenses.text).toBe('R$ 2.445,00');
    expect(s.goals.text).toBe('R$ 1.500,00');
    expect(s.adjustments.text).toBe('−R$ 15,00');
    expect(s.internalTransfers.text).toBe('R$ 150,00');
    expect(s.closing.text).toBe('R$ 10.924,00');
    expect(s.reconciles).toBe(true);
  });

  it('a Carteira recebe a transferência e o ajuste', async () => {
    const s = await new GetCashStatement(new PostgresLedger(pool)).execute({ userId: user, from: '2026-10-01', to: '2026-10-12', account: 'wallet' });
    expect(s.transfersIn.text).toBe('R$ 150,00');
    expect(s.closing.text).toBe('R$ 170,00');
  });

  it('o banco recusa lançamento inconsistente', async () => {
    await expect(pool.query(`INSERT INTO entries (id, user_id, kind, date, description, amount_cents, from_account_id, to_account_id)
      VALUES ('bad', $1, 'transfer', '2026-10-01', 'Para a mesma conta', 100, 'btg', 'btg')`, [user])).rejects.toThrow(/entries_refs/);
    await expect(pool.query(`INSERT INTO entries (id, user_id, kind, date, description, amount_cents, category, account_id)
      VALUES ('neg', $1, 'expense', '2026-10-01', 'Negativa', -100, 'outros', 'btg')`, [user])).rejects.toThrow(/entries_amount/);
    await expect(pool.query(`INSERT INTO entries (id, user_id, kind, date, description, amount_cents, category, account_id)
      VALUES ('alheia', $1, 'expense', '2026-10-01', 'Conta de outra pessoa', 100, 'outros', 'outro')`, [user])).rejects.toThrow(/foreign key/);
  });
});
