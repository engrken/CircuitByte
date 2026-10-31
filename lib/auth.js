import {betterAuth} from 'better-auth';
import {APIError} from 'better-auth/api';
import {headers} from 'next/headers';
import {db} from './db';

let instance;
export const studioSignupEnabled=()=>process.env.STUDIO_PUBLIC_SIGNUPS_ENABLED==='true'&&Boolean(process.env.RESEND_API_KEY&&process.env.STUDIO_EMAIL_FROM);
async function sendVerificationEmail({user,url}){
 if(!studioSignupEnabled())throw new Error('Signup email verification is not configured.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',
  headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({from:process.env.STUDIO_EMAIL_FROM,to:[user.email],subject:'Verify your CircuitByte Studio account',
    text:'Verify your account by opening: '+url+'\n\nIf you did not request this, ignore this email.'})});
 if(!response.ok)throw new Error('Unable to deliver Studio verification email.');
}
export function auth(){
 return instance??=betterAuth({
  database:db(),
  emailAndPassword:{
   enabled:true,disableSignUp:!studioSignupEnabled(),
   // Turn on only after verifying existing administrator's email in Better Auth.
   requireEmailVerification:studioSignupEnabled(),
   minPasswordLength:12,autoSignIn:false
  },
  emailVerification:{sendOnSignUp:studioSignupEnabled(),sendOnSignIn:studioSignupEnabled(),sendVerificationEmail},
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
 return session.user;
}
export async function requireAdmin(){
 const user=await requireUser();
 if(!process.env.ADMIN_EMAIL||user.email?.toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())throw new Error('Unauthorized');
 return user;
}
export function sameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid origin');}
