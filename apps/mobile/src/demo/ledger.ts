import { Account, CashStatement, Entry, LocalDate, Money } from '@finnapp/domain';

// Dados de demonstração até a API estar ligada: outubro de 2026 do canvas, só a Carteira e o BTG.
const R = Money.ofReais;
const d = LocalDate.parse;
const opened = d('2026-09-30');

const accounts = [
  Account.create({ id: 'btg', name: 'BTG', kind: 'checking', openingBalance: R(804), openedOn: opened }),
  Account.create({ id: 'wallet', name: 'Carteira', kind: 'wallet', openingBalance: R(80), openedOn: opened }),
];

const entries = [
  Entry.income({ id: 'e1', account: 'btg', amount: R(14000), date: d('2026-10-05'), category: 'receita', description: 'Salário' }),
  Entry.expense({ id: 'e2', account: 'btg', amount: R(2400), date: d('2026-10-05'), category: 'moradia', description: 'Aluguel' }),
  Entry.billPayment({ id: 'e3', from: 'btg', card: 'card-carrefour', amount: R(1920), date: d('2026-10-05'), description: 'Fatura Carrefour' }),
  Entry.goalContribution({ id: 'e4', from: 'btg', amount: R(1500), date: d('2026-10-06'), description: 'Reserva' }),
  Entry.transfer({ id: 'e5', from: 'btg', to: 'wallet', amount: R(150), date: d('2026-10-09'), description: 'Saque' }),
  Entry.expense({ id: 'e6', account: 'wallet', amount: R(45), date: d('2026-10-10'), category: 'mercado', description: 'Feira livre' }),
];

export function demoStatement(): CashStatement {
  return CashStatement.build({ accounts, entries, from: d('2026-10-01'), to: d('2026-10-12') });
}
