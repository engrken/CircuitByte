-- Student beta usage ledger. One row per account, operation, and UTC calendar month.
CREATE TABLE IF NOT EXISTS studio_usage_monthly (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
 operation text NOT NULL CHECK (operation IN ('ai','compile')),
 used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,period,operation)
);
