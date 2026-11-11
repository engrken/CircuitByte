// pg's default parser treats these legacy modes exactly like verify-full.
// Explicit libpq compatibility selects different TLS semantics.
export function databaseUrl(value = process.env.DATABASE_URL || process.env.circuitbyte_DATABASE_URL) {
  if (!value) throw new Error('Database not configured');
  if (!URL.canParse(value)) return value;
  const url = new URL(value);
  const modes = url.searchParams.getAll('sslmode');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.searchParams.has('uselibpqcompat') || modes.length !== 1 ||
      !['prefer', 'require', 'verify-ca'].includes(modes[0])) return value;
  url.searchParams.set('sslmode', 'verify-full');
  return url.href;
}

export function runtimeDatabaseUrl(env=process.env) {
  if (env.VERCEL_ENV==='preview') {
    if (!env.CIRCUITBYTE_PREVIEW_DATABASE_URL) throw new Error('Preview database is not configured');
    return databaseUrl(env.CIRCUITBYTE_PREVIEW_DATABASE_URL);
  }
  if (env.VERCEL_ENV==='production'&&!env.CIRCUITBYTE_RUNTIME_DATABASE_URL) {
    throw new Error('The production runtime database connection is not configured');
  }
  return databaseUrl(env.CIRCUITBYTE_RUNTIME_DATABASE_URL||env.DATABASE_URL||env.circuitbyte_DATABASE_URL);
}

export function migrationDatabaseUrl(env=process.env) {
  return databaseUrl(env.CIRCUITBYTE_MIGRATION_DATABASE_URL||env.circuitbyte_DATABASE_URL_UNPOOLED||
    env.DATABASE_URL||env.circuitbyte_DATABASE_URL);
}
