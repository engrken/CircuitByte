import {betterAuth} from 'better-auth';
import {APIError} from 'better-auth/api';
import {emailOTP} from 'better-auth/plugins';
import {headers} from 'next/headers.js';
import {db} from './db.js';
import {gmailConfigured,sendGmailMessage} from './studio-email.mjs';

let instance;
export const studioSignupEnabled=()=>gmailConfigured();
export const isStudioAdminEmail=email=>Boolean(process.env.ADMIN_EMAIL)&&email?.trim().toLowerCase()===process.env.ADMIN_EMAIL.trim().toLowerCase();

export function auth(){
 return instance??=betterAuth({
  database:db(),
  disabledPaths:[
   '/sign-in/email-otp','/verify-email','/send-verification-email',
   '/email-otp/check-verification-otp','/email-otp/request-password-reset','/forget-password/email-otp',
   '/email-otp/reset-password','/email-otp/request-email-change','/email-otp/change-email'
  ],
  emailAndPassword:{
   enabled:true,disableSignUp:!studioSignupEnabled(),requireEmailVerification:true,
   minPasswordLength:12,autoSignIn:false,revokeSessionsOnPasswordReset:true,
   resetPasswordTokenExpiresIn:1800,
   async sendResetPassword({user,url}){
    if(!user.emailVerified)return;
    await sendGmailMessage({to:user.email,subject:'Set your CircuitByte password',
     body:`Open this link within 30 minutes to set a password for CircuitByte Shop and Studio:\n${url}\n\nIf you did not request this link, you can ignore this message.`});
   }
  },
  emailVerification:{sendOnSignUp:true,sendOnSignIn:false},
  plugins:[emailOTP({
   disableSignUp:true,overrideDefaultEmailVerification:true,
   expiresIn:300,otpLength:6,allowedAttempts:3,storeOTP:'hashed',
   sendVerificationOTP:async({email,otp,type})=>{
    if(type!=='email-verification')throw new APIError('BAD_REQUEST',{message:'Email codes are for registration only.'});
    const {rows}=await db().query(`SELECT 1 FROM "user" WHERE email=$1 AND NOT "emailVerified"`,[email]);
    if(!rows.length)return;
    await sendGmailMessage({to:email,subject:'Verify your CircuitByte email',body:`Your CircuitByte registration code is ${otp}.\n\nEnter it within 5 minutes. If you did not request a CircuitByte account, you can ignore this message.`});
   }
  })],
  databaseHooks:{user:{create:{before:async user=>{
   if(isStudioAdminEmail(user.email)){
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
 if(!session.user.emailVerified)throw new Error('Verify your email before accessing your CircuitByte account.');
 return session.user;
}
export async function requireAdmin(){
 const user=await requireUser();
 if(!isStudioAdminEmail(user.email))throw new Error('Unauthorized');
 return user;
}
export function sameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid origin');}
