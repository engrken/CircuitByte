import pg from 'pg';
import {runtimeDatabaseUrl} from '../lib/database-url.mjs';
import {gmailMethod,verifyGmailSender} from '../lib/studio-email.mjs';

if(process.env.VERCEL_ENV!=='production')process.exit(0);

if(process.env.ADMIN_EMAIL){
 const method=gmailMethod();
 if(!method)throw Error('Administrator sign-in requires a configured Gmail sender.');
 if(method==='app-password'){
  try{await verifyGmailSender();}
  catch{throw Error('Administrator sign-in sender could not authenticate to Gmail.');}
 }
 console.log('Administrator sign-in sender verified');
}
const runtimeConnection=runtimeDatabaseUrl();
const runtime=new pg.Client({connectionString:runtimeConnection});
try{
 await runtime.connect();
 const {rows:[permissions]}=await runtime.query(`SELECT
  pg_has_role(current_user,'neon_superuser','MEMBER') AS elevated,
  has_schema_privilege('public','CREATE') AS can_create,
  has_table_privilege('public."user"','SELECT') AND has_table_privilege('public."user"','UPDATE') AND
  has_table_privilege('public."session"','INSERT') AND has_table_privilege('public."session"','DELETE') AND
  has_table_privilege('public."twoFactor"','SELECT') AND has_table_privilege('public.verification','INSERT') AND
  has_table_privilege('public.verification','DELETE') AND has_table_privilege('public.products','UPDATE') AND
  has_table_privilege('public.shop_promotions','SELECT') AND has_table_privilege('public.shop_promotions','INSERT') AND
  has_table_privilege('public.shop_promotions','UPDATE') AND has_table_privilege('public.account_manual_verifications','SELECT') AND
  has_table_privilege('public.account_manual_verifications','INSERT') AND has_table_privilege('public.account_manual_verifications','UPDATE') AS app_permissions`);
 if(permissions.elevated||permissions.can_create||!permissions.app_permissions){
  throw Error('Production runtime database permissions failed verification.');
 }
 console.log('Restricted runtime database role verified');
}finally{await runtime.end();}
