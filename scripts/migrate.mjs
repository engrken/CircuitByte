import {migrationDatabaseUrl,runtimeDatabaseUrl} from '../lib/database-url.mjs';
import fs from 'node:fs/promises';
import pg from 'pg';
import {adminOtpSchema,requireAdminOtpEnrollment} from '../lib/admin-otp.mjs';
import {gmailMethod,verifyGmailSender} from '../lib/studio-email.mjs';
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
if(process.env.ADMIN_EMAIL){
 const method=gmailMethod();
 if(!method)throw Error('Administrator sign-in requires a configured Gmail sender.');
 if(method==='app-password'){
  try{await verifyGmailSender();}
  catch{throw Error('Administrator sign-in sender could not authenticate to Gmail.');}
 }
 console.log('Administrator sign-in sender verified');
}
await import('./seed.mjs');
await import('./restore-legacy-images.mjs');
const pool=new pg.Pool({connectionString:migrationConnection});
try{const {runMigrations}=await getMigrations(adminOtpSchema(pool));await runMigrations();console.log('Auth schema ready');await requireAdminOtpEnrollment(pool,process.env.ADMIN_EMAIL);await pool.query(await fs.readFile(new URL('./account-verification.sql',import.meta.url),'utf8'));await pool.query(await fs.readFile(new URL('./studio-schema.sql',import.meta.url),'utf8'));console.log('Studio schema ready');await pool.query(await fs.readFile(new URL('./studio-usage-schema.sql',import.meta.url),'utf8'));console.log('Studio usage schema ready');await pool.query(await fs.readFile(new URL('./studio-knowledge-schema.sql',import.meta.url),'utf8'));console.log('Studio adaptive knowledge schema ready');}finally{await pool.end();}

const runtime=new pg.Client({connectionString:runtimeConnection});
try{
 await runtime.connect();
 const {rows:[permissions]}=await runtime.query(`SELECT
  pg_has_role(current_user,'neon_superuser','MEMBER') AS elevated,
  has_schema_privilege('public','CREATE') AS can_create,
  has_table_privilege('public."user"','SELECT') AND has_table_privilege('public."user"','UPDATE') AND
  has_table_privilege('public."session"','INSERT') AND has_table_privilege('public."session"','DELETE') AND
  has_table_privilege('public."twoFactor"','SELECT') AND has_table_privilege('public.verification','INSERT') AND
  has_table_privilege('public.verification','DELETE') AND has_table_privilege('public.products','UPDATE') AS app_permissions`);
 if(permissions.elevated||permissions.can_create||!permissions.app_permissions){
  throw Error('Production runtime database permissions failed verification.');
 }
 console.log('Restricted runtime database role verified');
}finally{await runtime.end();}
