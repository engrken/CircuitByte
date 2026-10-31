import fs from 'node:fs/promises';
import pg from 'pg';
import {getMigrations} from 'better-auth/db/migration';
if(process.env.VERCEL_ENV!=='production'){console.log('Skipping database initialization outside production');process.exit(0);}
if(!process.env.circuitbyte_DATABASE_URL&&!process.env.DATABASE_URL)throw Error('Missing database connection');
await import('./seed.mjs');
await import('./restore-legacy-images.mjs');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL||process.env.circuitbyte_DATABASE_URL});
try{const {runMigrations}=await getMigrations({database:pool,emailAndPassword:{enabled:true},rateLimit:{enabled:true,storage:'database'}});await runMigrations();console.log('Auth schema ready');await pool.query(await fs.readFile(new URL('./studio-schema.sql',import.meta.url),'utf8'));console.log('Studio schema ready');}finally{await pool.end();}
