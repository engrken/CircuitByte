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


-- Additive order migration. On-hand stock remains in products.stock.
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_reservation_check' AND conrelid='products'::regclass) THEN
  ALTER TABLE products ADD CONSTRAINT products_reservation_check CHECK(reserved_stock>=0 AND (stock IS NULL AND reserved_stock=0 OR stock IS NOT NULL AND stock>=reserved_stock));
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, reference text UNIQUE NOT NULL, token_hash text UNIQUE NOT NULL,
 request_hash text NOT NULL, customer_name text NOT NULL, contact text NOT NULL,
 proposed_location text NOT NULL, confirmed_location text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '', customer_update text NOT NULL DEFAULT '',
 items jsonb NOT NULL, total_cents bigint NOT NULL CHECK(total_cents>=0),
 status text NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Confirmed','Ready','Completed','Cancelled')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE TABLE IF NOT EXISTS order_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id),
 status text NOT NULL, actor text NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_rate_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL);
