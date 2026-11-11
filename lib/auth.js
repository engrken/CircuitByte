import {betterAuth} from 'better-auth';
import {APIError,createAuthMiddleware,getSessionFromCtx} from 'better-auth/api';
import {emailOTP} from 'better-auth/plugins';
import {headers} from 'next/headers.js';
import {db} from './db.js';
import {gmailConfigured,sendGmailMessage} from './studio-email.mjs';
import {minimumPasswordLength,maximumPasswordLength} from './account-policy.mjs';
import {isBlockedPassword} from './password-blocklist.mjs';
import {adminOtpPlugin,adminOtpSession,adminOtpSendPath,adminOtpVerifyPath,requireAdminOtpEnrollment} from './admin-otp.mjs';

const passwordEndpoints=new Set(['/sign-up/email','/reset-password','/change-password']);

let instance;
export const studioSignupEnabled=()=>gmailConfigured();
export const isStudioAdminEmail=email=>Boolean(process.env.ADMIN_EMAIL)&&email?.trim().toLowerCase()===process.env.ADMIN_EMAIL.trim().toLowerCase();

export function auth(){
 return instance??=betterAuth({
  database:db(),
  disabledPaths:[
   '/sign-in/email-otp','/verify-email','/send-verification-email',
   '/email-otp/check-verification-otp','/email-otp/request-password-reset','/forget-password/email-otp',
   '/email-otp/reset-password','/email-otp/request-email-change','/email-otp/change-email',
   '/two-factor/enable','/two-factor/disable','/two-factor/get-totp-uri','/two-factor/verify-totp',
   '/two-factor/generate-backup-codes','/two-factor/verify-backup-code'
  ],
  emailAndPassword:{
   enabled:true,disableSignUp:!studioSignupEnabled(),requireEmailVerification:true,
   minPasswordLength:minimumPasswordLength,maxPasswordLength:maximumPasswordLength,autoSignIn:false,revokeSessionsOnPasswordReset:true,
   resetPasswordTokenExpiresIn:1800,
   async sendResetPassword({user,url}){
    if(!user.emailVerified)return;
    await sendGmailMessage({to:user.email,subject:'Set your CircuitByte password',
     body:`Open this link within 30 minutes to set a password for CircuitByte Shop and Studio:\n${url}\n\nIf you did not request this link, you can ignore this message.`});
   }
  },
  emailVerification:{sendOnSignUp:true,sendOnSignIn:false},
  session:adminOtpSession,
  hooks:{
   before:createAuthMiddleware(async ctx=>{
    if(passwordEndpoints.has(ctx.path)&&isBlockedPassword(ctx.body?.newPassword??ctx.body?.password)){
     throw new APIError('BAD_REQUEST',{message:'Choose a less common password or a longer passphrase.'});
    }
    if(ctx.path==='/sign-in/email'&&isStudioAdminEmail(ctx.body?.email)){
     if(!gmailConfigured())throw new APIError('SERVICE_UNAVAILABLE',{message:'Administrator email verification is temporarily unavailable.'});
     await requireAdminOtpEnrollment(db(),ctx.body.email);
    }
    if((ctx.path===adminOtpSendPath||ctx.path===adminOtpVerifyPath)&&await getSessionFromCtx(ctx)){
     throw new APIError('BAD_REQUEST',{message:'This verification step is only available during administrator sign-in.'});
    }
    if(ctx.path===adminOtpVerifyPath&&ctx.body?.trustDevice){
     throw new APIError('BAD_REQUEST',{message:'A verification code is required for every administrator sign-in.'});
    }
    if(ctx.path==='/change-password')return {context:{body:{...ctx.body,revokeOtherSessions:true}}};
   }),
   after:createAuthMiddleware(async ctx=>{
    if(ctx.path===adminOtpSendPath&&ctx.context.adminOtpDeliveryFailed){
     throw new APIError('SERVICE_UNAVAILABLE',{message:'Could not send the administrator code. Try again shortly.'});
    }
   })
  },
  plugins:[emailOTP({
   disableSignUp:true,overrideDefaultEmailVerification:true,
   expiresIn:300,otpLength:6,allowedAttempts:3,storeOTP:'hashed',
   sendVerificationOTP:async({email,otp,type})=>{
    if(type!=='email-verification')throw new APIError('BAD_REQUEST',{message:'Email codes are for registration only.'});
    const {rows}=await db().query(`SELECT 1 FROM "user" WHERE email=$1 AND NOT "emailVerified"`,[email]);
    if(!rows.length)return;
    await sendGmailMessage({to:email,subject:'Verify your CircuitByte email',body:`Your CircuitByte registration code is ${otp}.\n\nEnter it within 5 minutes. If you did not request a CircuitByte account, you can ignore this message.`});
   }
  }),adminOtpPlugin(async({user,otp},ctx)=>{
   if(!isStudioAdminEmail(user.email)||!user.emailVerified){
    ctx.context.adminOtpDeliveryFailed=true;
    return;
   }
   try{
    await sendGmailMessage({to:user.email,subject:'CircuitByte administrator sign-in code',
     body:`Your administrator sign-in code is ${otp}.\n\nIt expires in 5 minutes. If you did not try to sign in, change your password.`});
   }catch(error){
    ctx.context.adminOtpDeliveryFailed=true;
    console.error('Administrator code delivery failed:',error.code||error.name);
   }
  })],
  databaseHooks:{
   user:{create:{before:async user=>{
    if(isStudioAdminEmail(user.email)){
     throw new APIError('FORBIDDEN',{message:'This email is reserved for the CircuitByte administrator.'});
    }
    return {data:user};
   }}},
   session:{create:{before:async(session,ctx)=>{
    const verified=ctx?.path===adminOtpVerifyPath||
     (ctx?.path==='/change-password'&&ctx.context.session?.session?.adminOtpVerified===true);
    return {data:{...session,adminOtpVerified:verified}};
   }}}
  },
  rateLimit:{enabled:true,storage:'database',customRules:{
   [adminOtpSendPath]:{window:60,max:2},
   [adminOtpVerifyPath]:{window:60,max:6}
  }},
  secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL
 });
}
export async function requireUser(){
 const session=await auth().api.getSession({headers:await headers()});
 if(!session?.user?.id)throw new Error('Sign in required');
 if(!session.user.emailVerified)throw new Error('Verify your email before accessing your CircuitByte account.');
 if(isStudioAdminEmail(session.user.email)&&(!session.user.twoFactorEnabled||session.session.adminOtpVerified!==true)){
  throw new Error('Sign in again and verify your administrator code.');
 }
 return session.user;
}
export async function requireAdmin(){
 const user=await requireUser();
 if(!isStudioAdminEmail(user.email))throw new Error('Unauthorized');
 return user;
}
export function sameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid origin');}
