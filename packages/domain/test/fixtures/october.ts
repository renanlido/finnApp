import { Account } from '../../src/accounts/Account';
import { CreditCard } from '../../src/accounts/CreditCard';
import { Entry } from '../../src/ledger/Entry';
import { Money } from '../../src/money/Money';
import { LocalDate } from '../../src/time/LocalDate';

/**
 * Outubro de 2026 do canvas: saldo em 1º out R$ 2.196,90, hoje (12 out) R$ 4.820,00.
 * BTG 3.794 · Nubank 612 · PagBank 184 · M. Pago 110 · Carteira 120.
 */
const R = Money.ofReais;
const d = LocalDate.parse;
const opened = d('2026-09-30');

export const accounts = {
  btg: Account.create({ id: 'btg', name: 'BTG', kind: 'checking', openingBalance: R(804), openedOn: opened }),
  nubank: Account.create({ id: 'nubank', name: 'Nubank', kind: 'checking', openingBalance: R(926), openedOn: opened }),
  pagbank: Account.create({ id: 'pagbank', name: 'PagBank', kind: 'checking', openingBalance: R(226.9), openedOn: opened }),
  mercadopago: Account.create({ id: 'mercadopago', name: 'M. Pago', kind: 'checking', openingBalance: R(160), openedOn: opened }),
  wallet: Account.create({ id: 'wallet', name: 'Carteira', kind: 'wallet', openingBalance: R(80), openedOn: opened }),
  goals: Account.create({ id: 'goals', name: 'Metas', kind: 'investment', openingBalance: R(0), openedOn: opened }),
};

export const cards = {
  nubank: CreditCard.create({ id: 'card-nubank', name: 'Cartão Nubank', closingDay: 3, dueDay: 10 }),
  carrefour: CreditCard.create({ id: 'card-carrefour', name: 'Cartão Carrefour', closingDay: 29, dueDay: 5 }),
};

export const cashAccounts = [accounts.btg, accounts.nubank, accounts.pagbank, accounts.mercadopago, accounts.wallet];

export const entries: Entry[] = [
  Entry.income({ id: 'e1', account: 'btg', amount: R(14000), date: d('2026-10-05'), category: 'receita', description: 'Salário' }),
  Entry.expense({ id: 'e2', account: 'btg', amount: R(2400), date: d('2026-10-05'), category: 'moradia', description: 'Aluguel' }),
  Entry.expense({ id: 'e3', account: 'btg', amount: R(690), date: d('2026-10-10'), category: 'moradia', description: 'Condomínio' }),
  Entry.expense({ id: 'e4', account: 'btg', amount: R(320), date: d('2026-10-05'), category: 'transporte', description: 'Seguro do carro' }),
  Entry.expense({ id: 'e5', account: 'btg', amount: R(120), date: d('2026-10-06'), category: 'assinaturas', description: 'Internet' }),
  Entry.expense({ id: 'e6', account: 'btg', amount: R(139), date: d('2026-10-03'), category: 'lazer', description: 'Academia' }),
  Entry.expense({ id: 'e7', account: 'btg', amount: R(450), date: d('2026-10-06'), category: 'casa', description: 'Diarista (3x)' }),
  Entry.expense({ id: 'e8', account: 'btg', amount: R(271), date: d('2026-10-08'), category: 'saude', description: 'Farmácia' }),
  Entry.expense({ id: 'e9', account: 'nubank', amount: R(314), date: d('2026-10-09'), category: 'mercado', description: 'Atacadão (débito)' }),
  Entry.expense({ id: 'e10', account: 'pagbank', amount: R(42.9), date: d('2026-10-07'), category: 'outros', description: 'Barbeiro' }),
  Entry.expense({ id: 'e11', account: 'mercadopago', amount: R(100), date: d('2026-10-10'), category: 'transporte', description: 'Posto Serra Verde' }),
  Entry.expense({ id: 'e12', account: 'wallet', amount: R(45), date: d('2026-10-10'), category: 'mercado', description: 'Feira livre' }),
  Entry.expense({ id: 'e13', account: 'wallet', amount: R(65), date: d('2026-10-11'), category: 'restaurantes', description: 'Pastel e caldo' }),
  Entry.billPayment({ id: 'e14', from: 'btg', card: 'card-nubank', amount: R(3000), date: d('2026-10-10'), description: 'Fatura Nubank de outubro' }),
  Entry.billPayment({ id: 'e15', from: 'btg', card: 'card-carrefour', amount: R(1920), date: d('2026-10-05'), description: 'Fatura Carrefour de outubro' }),
  Entry.goalContribution({ id: 'e16', from: 'btg', goal: 'goals', amount: R(1500), date: d('2026-10-06'), description: 'Reserva e Juntar' }),
  Entry.transfer({ id: 'e17', from: 'btg', to: 'wallet', amount: R(150), date: d('2026-10-09'), description: 'Saque para a Carteira' }),
  Entry.transfer({ id: 'e18', from: 'btg', to: 'mercadopago', amount: R(50), date: d('2026-10-09'), description: 'Pix para o Mercado Pago' }),
  // Compras no cartão: entram no mês, não no saldo da conta.
  Entry.cardPurchase({ id: 'e19', card: cards.nubank, amount: R(118.4), date: d('2026-10-10'), category: 'restaurantes', description: 'Restaurante Maré' }),
  Entry.cardPurchase({ id: 'e20', card: cards.carrefour, amount: R(186.3), date: d('2026-10-10'), category: 'mercado', description: 'Mercado Bom Preço' }),
  Entry.cardPurchase({ id: 'e21', card: cards.nubank, amount: R(1260), date: d('2026-08-20'), category: 'parcelas', description: 'Notebook', installments: 3 }),
];
