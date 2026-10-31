import pg from 'pg';
import {databaseUrl} from './database-url.mjs';

let pool;
export function db() {
  return pool ??= new pg.Pool({connectionString: databaseUrl(), max: 5});
}
