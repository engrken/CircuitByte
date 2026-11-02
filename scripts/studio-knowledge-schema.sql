-- CircuitByte Studio adaptive knowledge. Additive, no existing user or order records modified.
-- User contributions are private and never become trusted/shared without explicit admin approval.
CREATE TABLE IF NOT EXISTS studio_knowledge_entries (
 id uuid PRIMARY KEY,
 topic_key varchar(100) NOT NULL UNIQUE,
 title varchar(160) NOT NULL,
 summary text NOT NULL,
 keywords varchar(500) NOT NULL DEFAULT '',
 source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
 reviewed_by varchar(320) NOT NULL,
 version integer NOT NULL DEFAULT 1,
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_knowledge_entries_title_idx ON studio_knowledge_entries(lower(title));
CREATE TABLE IF NOT EXISTS studio_knowledge_submissions (
 id uuid PRIMARY KEY,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 topic varchar(100) NOT NULL,
 details varchar(1800) NOT NULL,
 source_url text NOT NULL DEFAULT '',
 status varchar(12) NOT NULL DEFAULT 'pending'
  CHECK(status IN ('pending','approved','rejected')),
 reviewed_by varchar(320),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_knowledge_submissions_pending_idx
 ON studio_knowledge_submissions(status,created_at DESC);
CREATE INDEX IF NOT EXISTS studio_knowledge_submissions_owner_idx
 ON studio_knowledge_submissions(user_id,created_at DESC);
