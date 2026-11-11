-- Grandfather existing accounts once. Rebuilds must never verify new registrations.
CREATE TABLE IF NOT EXISTS circuitbyte_data_migrations (id text PRIMARY KEY);
WITH migration AS (
 INSERT INTO circuitbyte_data_migrations(id) VALUES ('registration-email-otp')
 ON CONFLICT DO NOTHING RETURNING id
)
UPDATE "user" SET "emailVerified"=true
WHERE NOT "emailVerified" AND EXISTS (SELECT 1 FROM migration);
