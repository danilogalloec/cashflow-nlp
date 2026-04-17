-- ============================================================
-- CashFlow System — PostgreSQL Schema
-- Isolation: every tenant table has user_id NOT NULL FK
-- UUIDs as PKs to prevent enumeration attacks
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive email

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120)    NOT NULL,
    email           CITEXT          NOT NULL UNIQUE,
    hashed_password VARCHAR(255)    NOT NULL,        -- Argon2id output
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    failed_logins   SMALLINT        NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- REFRESH TOKENS  (stored hashed; revocable)
-- ============================================================
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64)     NOT NULL UNIQUE,  -- SHA-256 of raw token
    expires_at      TIMESTAMPTZ     NOT NULL,
    revoked         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rt_user_id ON refresh_tokens (user_id);

-- ============================================================
-- CATEGORIES  (seeded per user; allows custom categories)
-- ============================================================
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(80)     NOT NULL,
    color           CHAR(7),                          -- hex color e.g. #FF5733
    icon            VARCHAR(40),
    is_system       BOOLEAN         NOT NULL DEFAULT FALSE,  -- seeded defaults
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_categories_user_id ON categories (user_id);

-- ============================================================
-- ACCOUNTS  (Efectivo, Bancaria, Digital Asset, etc.)
-- ============================================================
CREATE TYPE account_type AS ENUM ('cash', 'bank', 'digital', 'investment', 'credit');
CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'GTQ', 'MXN', 'BTC', 'USDT');

CREATE TABLE accounts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(120)    NOT NULL,
    account_type    account_type    NOT NULL,
    currency        currency_code   NOT NULL DEFAULT 'USD',
    balance         NUMERIC(18, 8)  NOT NULL DEFAULT 0,   -- 8 decimals for crypto
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_accounts_user_id ON accounts (user_id);

-- ============================================================
-- INCOME SOURCES
-- ============================================================
CREATE TYPE income_frequency AS ENUM ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'annual');

CREATE TABLE income_sources (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(120)    NOT NULL,
    amount          NUMERIC(18, 2)  NOT NULL CHECK (amount > 0),
    currency        currency_code   NOT NULL DEFAULT 'USD',
    frequency       income_frequency NOT NULL DEFAULT 'monthly',
    next_expected   DATE,
    account_id      UUID            REFERENCES accounts(id) ON DELETE SET NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_income_user_id ON income_sources (user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TYPE transaction_direction AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_status    AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE input_method          AS ENUM ('manual', 'voice', 'text_nlp', 'import');

CREATE TABLE transactions (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID                NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id     UUID                REFERENCES categories(id) ON DELETE SET NULL,
    income_source_id UUID               REFERENCES income_sources(id) ON DELETE SET NULL,

    -- For transfers: target account
    to_account_id   UUID                REFERENCES accounts(id) ON DELETE RESTRICT,

    direction       transaction_direction NOT NULL,
    amount          NUMERIC(18, 8)      NOT NULL CHECK (amount > 0),
    currency        currency_code       NOT NULL DEFAULT 'USD',
    description     VARCHAR(500),
    notes           TEXT,
    status          transaction_status  NOT NULL DEFAULT 'completed',
    input_method    input_method        NOT NULL DEFAULT 'manual',
    raw_input       TEXT,               -- original NLP utterance for audit
    transaction_date DATE               NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- Transfers must reference a target account
    CONSTRAINT chk_transfer_has_target
        CHECK (direction != 'transfer' OR to_account_id IS NOT NULL),
    -- Transfers cannot point to same account
    CONSTRAINT chk_transfer_different_accounts
        CHECK (to_account_id IS NULL OR to_account_id != account_id)
);

CREATE INDEX idx_tx_user_id        ON transactions (user_id);
CREATE INDEX idx_tx_account_id     ON transactions (account_id);
CREATE INDEX idx_tx_date           ON transactions (user_id, transaction_date DESC);
CREATE INDEX idx_tx_direction      ON transactions (user_id, direction);
CREATE INDEX idx_tx_category       ON transactions (user_id, category_id);

-- ============================================================
-- TRIGGER: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','accounts','income_sources','transactions'] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: keep account.balance consistent on transaction change
-- (handles INSERT, UPDATE, DELETE; transfer debits source and credits target)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_account_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Reverse old row effect
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF OLD.direction = 'income' THEN
            UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.direction = 'expense' THEN
            UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.direction = 'transfer' THEN
            UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
        END IF;
    END IF;

    -- Apply new row effect
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.direction = 'income' THEN
            UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.direction = 'expense' THEN
            UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.direction = 'transfer' THEN
            UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
        END IF;
        RETURN NEW;
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_transactions_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION sync_account_balance();

-- ============================================================
-- ROW-LEVEL SECURITY (defence-in-depth at the DB layer)
-- Requires app to SET LOCAL app.current_user_id = '<uuid>'
-- before each request within the transaction.
-- ============================================================
ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens    ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_accounts     ON accounts         USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY tenant_income       ON income_sources   USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY tenant_transactions ON transactions      USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY tenant_categories   ON categories       USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY tenant_refresh      ON refresh_tokens   USING (user_id = current_setting('app.current_user_id')::UUID);
