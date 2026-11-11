import {migrationDatabaseUrl} from '../lib/database-url.mjs';
import pg from 'pg';
import {betterAuth} from 'better-auth';
import {adminOtpSchema} from '../lib/admin-otp.mjs';
import {minimumPasswordLength,maximumPasswordLength} from '../lib/account-policy.mjs';
import {isBlockedPassword} from '../lib/password-blocklist.mjs';
import {getMigrations} from 'better-auth/db/migration';
const pool=new pg.Pool({connectionString:migrationDatabaseUrl()});
const options={
 ...adminOtpSchema(pool),secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL,
 emailAndPassword:{enabled:true,autoSignIn:false,minPasswordLength:minimumPasswordLength,maxPasswordLength:maximumPasswordLength},
 databaseHooks:{user:{create:{before:async user=>({data:{...user,emailVerified:true,twoFactorEnabled:true}})}}}
};
try{
 const {runMigrations}=await getMigrations(options);
 await runMigrations();
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 const password=process.env.INITIAL_ADMIN_PASSWORD;
 if(!email||!password||password.length<minimumPasswordLength||isBlockedPassword(password)){
  throw Error('Provide ADMIN_EMAIL and a strong INITIAL_ADMIN_PASSWORD of 15 or more characters locally.');
 }
 await betterAuth(options).api.signUpEmail({body:{email,password,name:'CircuitByte Admin'}});
 console.log('Administrator created. Remove INITIAL_ADMIN_PASSWORD from the local environment.');
}finally{await pool.end();}
