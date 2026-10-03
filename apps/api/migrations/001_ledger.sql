-- Livro-caixa: contas, cartões e lançamentos. Dinheiro sempre em centavos (bigint).

CREATE TABLE accounts (
  id                    text PRIMARY KEY,
  user_id               text NOT NULL,
  name                  text NOT NULL,
  kind                  text NOT NULL CHECK (kind IN ('checking', 'wallet', 'investment')),
  institution           text,
  opening_balance_cents bigint NOT NULL DEFAULT 0,
  opened_on             date NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE INDEX accounts_user ON accounts (user_id);

CREATE TABLE credit_cards (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  name        text NOT NULL,
  closing_day smallint NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day     smallint NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE INDEX credit_cards_user ON credit_cards (user_id);

CREATE TABLE entries (
  id              text PRIMARY KEY,
  user_id         text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('income', 'expense', 'transfer', 'card_purchase', 'bill_payment', 'goal_contribution', 'wallet_adjustment')),
  date            date NOT NULL,
  description     text NOT NULL,
  -- Magnitude positiva; só wallet_adjustment guarda o valor com sinal.
  amount_cents    bigint NOT NULL,
  category        text,
  -- Mês de competência quando difere do mês da data (AAAA-MM).
  competence      char(7) CHECK (competence ~ '^\d{4}-\d{2}$'),
  account_id      text,
  from_account_id text,
  to_account_id   text,
  goal_account_id text,
  card_id         text,
  installments    smallint NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 48),
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Toda referência é da mesma pessoa: (conta, user_id) precisa existir.
  FOREIGN KEY (account_id, user_id)      REFERENCES accounts (id, user_id),
  FOREIGN KEY (from_account_id, user_id) REFERENCES accounts (id, user_id),
  FOREIGN KEY (to_account_id, user_id)   REFERENCES accounts (id, user_id),
  FOREIGN KEY (goal_account_id, user_id) REFERENCES accounts (id, user_id),
  FOREIGN KEY (card_id, user_id)         REFERENCES credit_cards (id, user_id),
  CONSTRAINT entries_amount CHECK (
    (kind = 'wallet_adjustment' AND amount_cents <> 0) OR (kind <> 'wallet_adjustment' AND amount_cents > 0)
  ),
  CONSTRAINT entries_refs CHECK (
    CASE kind
      WHEN 'income'            THEN account_id IS NOT NULL AND category IS NOT NULL
      WHEN 'expense'           THEN account_id IS NOT NULL AND category IS NOT NULL
      WHEN 'wallet_adjustment' THEN account_id IS NOT NULL
      WHEN 'transfer'          THEN from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id <> to_account_id
      WHEN 'card_purchase'     THEN card_id IS NOT NULL AND category IS NOT NULL
      WHEN 'bill_payment'      THEN from_account_id IS NOT NULL AND card_id IS NOT NULL
      WHEN 'goal_contribution' THEN from_account_id IS NOT NULL AND goal_account_id IS DISTINCT FROM from_account_id
    END
  )
);
CREATE INDEX entries_user_date ON entries (user_id, date);
