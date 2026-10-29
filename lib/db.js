import pg from 'pg';
let pool;
export function db(){if(!process.env.DATABASE_URL)throw new Error('Database not configured');return pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5});}
