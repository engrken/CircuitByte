import {timingSafeEqual} from 'node:crypto';
import {betterAuth} from 'better-auth';
import {db} from '../../../../lib/db.js';
import {sameOrigin} from '../../../../lib/auth.js';
import {adminOtpSchema} from '../../../../lib/admin-otp.mjs';
import {minimumPasswordLength,maximumPasswordLength} from '../../../../lib/account-policy.mjs';
import {isBlockedPassword} from '../../../../lib/password-blocklist.mjs';

const headers={'Cache-Control':'private, no-store'};
const fail=(error,status)=>Response.json({error},{status,headers});

export async function POST(req){
 try{sameOrigin(req);}catch{return fail('Invalid origin',403);}
 let body;
 try{body=await req.json();}catch{return fail('Invalid request',400);}
 const expected=process.env.ADMIN_SETUP_TOKEN;
 const given=typeof body?.token==='string'?body.token:'';
 if(!expected||Buffer.byteLength(given)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(given),Buffer.from(expected))){
  return fail('Invalid setup link',403);
 }
 if(typeof body.password!=='string'||body.password.length<minimumPasswordLength||body.password.length>maximumPasswordLength)return fail('Use 15–128 characters',400);
 if(isBlockedPassword(body.password))return fail('Choose a less common password or passphrase.',400);
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 if(!email)return fail('Setup unavailable. Please contact the site owner.',503);
 let client,locked=false;
 try{
  client=await db().connect();
  await client.query('SELECT pg_advisory_lock(87263491)');locked=true;
  const exists=await client.query('SELECT id FROM "user" WHERE lower(email)=lower($1)',[email]);
  if(exists.rows.length)return fail('Administrator already configured. Sign in instead.',409);
  const setupAuth=betterAuth({
   ...adminOtpSchema(db()),secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL,
   emailAndPassword:{enabled:true,minPasswordLength:minimumPasswordLength,maxPasswordLength:maximumPasswordLength,autoSignIn:false},
   // Only the token-authorized setup request can create this verified administrator.
   databaseHooks:{user:{create:{before:async user=>({data:{...user,emailVerified:true,twoFactorEnabled:true}})}}}
  });
  await setupAuth.api.signUpEmail({body:{email,password:body.password,name:'CircuitByte Administrator'}});
  return Response.json({ok:true,email},{headers});
 }catch(error){
  console.error('Administrator setup failed:',error.code||error.name);
  return fail('Setup unavailable. Please contact the site owner.',500);
 }finally{
  let releaseError;
  if(locked){
   try{await client.query('SELECT pg_advisory_unlock(87263491)');}catch(error){releaseError=error;}
  }
  client?.release(releaseError);
 }
}
