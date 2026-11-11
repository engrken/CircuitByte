CREATE TABLE IF NOT EXISTS account_manual_verifications (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 email text NOT NULL,
 verified_by text NOT NULL,
 reason text NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT now(),
 claimed_at timestamptz,
 sent_at timestamptz,
 failed_at timestamptz
);
