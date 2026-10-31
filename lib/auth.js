import {betterAuth} from 'better-auth';
import {APIError} from 'better-auth/api';
import {headers} from 'next/headers';
import {db} from './db';
import {gmailConfigured,sendGmailMessage} from './studio-email.mjs';

let instance;
export const studioSignupEnabled=()=>process.env.STUDIO_PUBLIC_SIGNUPS_ENABLED==='true'&&gmailConfigured();
export const isStudioAdminEmail=email=>Boolean(process.env.ADMIN_EMAIL)&&email?.trim().toLowerCase()===process.env.ADMIN_EMAIL.trim().toLowerCase();
async function sendVerificationEmail({user,url}){
 if(!studioSignupEnabled())throw new Error('Verified registration email is not configured.');
 await sendGmailMessage({
  to:user.email,subject:'Verify your CircuitByte Studio account',
  body:'Hello '+(user.name||'CircuitByte maker')+'!\n\nPlease verify your CircuitByte Studio account by opening this link:\n'+url+'\n\nIf you did not request this account, ignore this email.\n\nCircuitByte Studio'
 });
}
export function auth(){
 return instance??=betterAuth({
  database:db(),
  emailAndPassword:{
   enabled:true,disableSignUp:!studioSignupEnabled(),
   // Turn on only after verifying existing administrator's email in Better Auth.
   requireEmailVerification:false, // Protect existing unverified admin; enforce verified member access in requireUser below.
   minPasswordLength:12,autoSignIn:false
  },
  emailVerification:{sendOnSignUp:studioSignupEnabled(),sendOnSignIn:false,sendVerificationEmail},
  databaseHooks:{user:{create:{before:async user=>{
   if(user.email?.trim().toLowerCase()===process.env.ADMIN_EMAIL?.trim().toLowerCase()){
    throw new APIError('FORBIDDEN',{message:'This email is reserved for the CircuitByte administrator.'});
   }
   return {data:user};
  }}}},
  rateLimit:{enabled:true,storage:'database'},
  secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL
 });
}
export async function requireUser(){
 const session=await auth().api.getSession({headers:await headers()});
 if(!session?.user?.id)throw new Error('Sign in required');
 if(!session.user.emailVerified && !isStudioAdminEmail(session.user.email))throw new Error('Verify your email before accessing Studio.');
 return session.user;
}
export async function requireAdmin(){
 const user=await requireUser();
 if(!isStudioAdminEmail(user.email))throw new Error('Unauthorized');
 return user;
}
export function sameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid origin');}
