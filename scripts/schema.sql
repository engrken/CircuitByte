CREATE TABLE IF NOT EXISTS products (
 id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '',
 categories text[] NOT NULL, price_cents integer NOT NULL CHECK(price_cents>=0),
 stock integer CHECK(stock>=0), quantity_label text NOT NULL DEFAULT '',
 image_url text, active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, product_id text NOT NULL REFERENCES products(id),
 actor text NOT NULL, reason text NOT NULL, before_data jsonb, after_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
