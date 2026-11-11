import pg from 'pg';
import {runtimeDatabaseUrl} from './database-url.mjs';

let pool;
export function db() {
  return pool ??= new pg.Pool({connectionString: runtimeDatabaseUrl(), max: 5});
}
