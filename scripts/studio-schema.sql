-- Additive CircuitByte Studio user data (independent from store orders).
-- School affiliation is user-supplied, private by default, never an institutional endorsement.
CREATE TABLE IF NOT EXISTS studio_profiles (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 school_name text NOT NULL DEFAULT '',
 program text NOT NULL DEFAULT '',
 role_name text NOT NULL DEFAULT 'student',
 public_consent boolean NOT NULL DEFAULT false,
 school_verified boolean NOT NULL DEFAULT false,
 school_public_approved boolean NOT NULL DEFAULT false,
 verified_by text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Upgrade existing profiles tables created before affiliation review fields existed.
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS school_name text NOT NULL DEFAULT '';
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT '';
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS role_name text NOT NULL DEFAULT 'student';
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS public_consent boolean NOT NULL DEFAULT false;
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS school_verified boolean NOT NULL DEFAULT false;
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS school_public_approved boolean NOT NULL DEFAULT false;
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE studio_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS studio_profiles_public_school_idx
 ON studio_profiles(school_name) WHERE public_consent=true AND school_verified=true AND school_public_approved=true;
CREATE TABLE IF NOT EXISTS studio_projects (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 title text NOT NULL, template_slug text NOT NULL DEFAULT '', code text NOT NULL, board text NOT NULL DEFAULT 'arduino:avr:uno',
 selected_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio_projects_owner_idx ON studio_projects(user_id,updated_at DESC);
