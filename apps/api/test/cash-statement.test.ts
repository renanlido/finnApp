import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Account, CreditCard, Entry, LocalDate, Money } from '@finnapp/domain';
import { buildApp } from '../src/infra/http/app';
import { InMemoryLedger } from '../src/infra/memory/InMemoryLedger';

const d = LocalDate.parse;
const R = Money.ofReais;
const opened = d('2026-09-30');
const user = 'renan';

function seed(): InMemoryLedger {
  const ledger = new InMemoryLedger();
  const nubank = CreditCard.create({ id: 'card-nubank', name: 'Cartão Nubank', closingDay: 3, dueDay: 10 });
  ledger.addAccount(user, Account.create({ id: 'btg', name: 'BTG', kind: 'checking', openingBalance: R(804), openedOn: opened }));
  ledger.addAccount(user, Account.create({ id: 'wallet', name: 'Carteira', kind: 'wallet', openingBalance: R(80), openedOn: opened }));
  ledger.addAccount(user, Account.create({ id: 'goals', name: 'Metas', kind: 'investment', openedOn: opened }));
  ledger.addCard(user, nubank);
  ledger.addEntry(user, Entry.income({ id: 'e1', account: 'btg', amount: R(14000), date: d('2026-10-05'), category: 'receita', description: 'Salário' }));
  ledger.addEntry(user, Entry.expense({ id: 'e2', account: 'btg', amount: R(2400), date: d('2026-10-05'), category: 'moradia', description: 'Aluguel' }));
  ledger.addEntry(user, Entry.transfer({ id: 'e3', from: 'btg', to: 'wallet', amount: R(150), date: d('2026-10-09'), description: 'Saque' }));
  ledger.addEntry(user, Entry.expense({ id: 'e4', account: 'wallet', amount: R(45), date: d('2026-10-10'), category: 'mercado', description: 'Feira livre' }));
  ledger.addEntry(user, Entry.cardPurchase({ id: 'e5', card: nubank, amount: R(118.4), date: d('2026-10-10'), category: 'restaurantes', description: 'Restaurante Maré' }));
  ledger.addEntry(user, Entry.goalContribution({ id: 'e6', from: 'btg', goal: 'goals', amount: R(1500), date: d('2026-10-06'), description: 'Reserva' }));
  return ledger;
}

describe('API', () => {
  const app = buildApp({ ledger: seed(), userFrom: () => user });
  beforeAll(() => app.ready());
  afterAll(() => app.close());

  it('GET /health responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /v1/cash-statement fecha a conta das contas de dinheiro (sem metas, sem cartão)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/cash-statement?from=2026-10-01&to=2026-10-12' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.opening).toEqual({ cents: 88400, text: 'R$ 884,00' });
    expect(body.closing).toEqual({ cents: 1093900, text: 'R$ 10.939,00' });
    expect(body.internalTransfers.text).toBe('R$ 150,00');
    expect(body.reconciles).toBe(true);
    expect(body.lines.map((l: { sign: string; label: string }) => `${l.sign}${l.label}`)).toEqual([
      'Saldo em 1º out', '+Entradas', '-Gastos e contas', '-Guardado nas metas', '=Saldo em 12 out',
    ]);
  });

  it('filtra por uma conta', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/cash-statement?from=2026-10-01&to=2026-10-12&account=wallet' });
    const body = res.json();
    expect(body.transfersIn.text).toBe('R$ 150,00');
    expect(body.closing.text).toBe('R$ 185,00');
  });

  it('recusa período mal formado com 400 e mensagem em português', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/cash-statement?from=10/01/2026&to=2026-10-12' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/AAAA-MM-DD/);
  });

  it('conta desconhecida dá 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/cash-statement?from=2026-10-01&to=2026-10-12&account=itau' });
    expect(res.statusCode).toBe(404);
  });
});
