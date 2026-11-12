import {migrationDatabaseUrl,runtimeDatabaseUrl} from '../lib/database-url.mjs';
import fs from 'node:fs/promises';
import pg from 'pg';
import {adminOtpSchema,requireAdminOtpEnrollment} from '../lib/admin-otp.mjs';
import {getMigrations} from 'better-auth/db/migration';
if(process.env.VERCEL_ENV!=='production'){console.log('Skipping database initialization outside production');process.exit(0);}
const migrationConnection=migrationDatabaseUrl();
const runtimeConnection=runtimeDatabaseUrl();
if(!URL.canParse(migrationConnection)||!URL.canParse(runtimeConnection)){
 throw Error('Production database connections must be valid Postgres URLs.');
}
if(new URL(migrationConnection).username===new URL(runtimeConnection).username){
 throw Error('Production migrations and application queries must use different database roles.');
}
await import('./seed.mjs');
await import('./restore-legacy-images.mjs');
const pool=new pg.Pool({connectionString:migrationConnection});
try{
 const {runMigrations}=await getMigrations(adminOtpSchema(pool));
 await runMigrations();
 await requireAdminOtpEnrollment(pool,process.env.ADMIN_EMAIL);
 for(const schema of ['account-verification.sql','manual-account-verification.sql','studio-schema.sql','studio-usage-schema.sql','studio-knowledge-schema.sql']){
  await pool.query(await fs.readFile(new URL(`./${schema}`,import.meta.url),'utf8'));
 }
 const runtimeRole=pg.escapeIdentifier(decodeURIComponent(new URL(runtimeConnection).username));
 await pool.query('GRANT SELECT, INSERT, UPDATE ON TABLE public.shop_promotions, public.account_manual_verifications TO '+runtimeRole);
 console.log('Auth, Shop promotions and Studio schemas ready');
}finally{await pool.end();}

await import('./verify-production-runtime.mjs');
