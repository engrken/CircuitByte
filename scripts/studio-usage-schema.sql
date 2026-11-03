-- Student usage ledger. One row per account, operation, and Asia/Manila calendar month.
CREATE TABLE IF NOT EXISTS studio_usage_monthly (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
 operation text NOT NULL CHECK (operation IN ('ai','compile')),
 used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,period,operation)
);

-- Pending work reserves capacity but never counts as consumed credit.
CREATE TABLE IF NOT EXISTS studio_usage_reservations (
 id text PRIMARY KEY,
 user_id text NOT NULL,
 period text NOT NULL,
 operation text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
 FOREIGN KEY(user_id,period,operation) REFERENCES studio_usage_monthly(user_id,period,operation) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS studio_usage_pending ON studio_usage_reservations(user_id,period,operation,expires_at) WHERE status='pending';
