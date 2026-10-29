import {betterAuth} from 'better-auth';
import {headers} from 'next/headers';
import {db} from './db';
let instance;
export function auth(){return instance??=betterAuth({database:db(),emailAndPassword:{enabled:true,disableSignUp:true,minPasswordLength:12},rateLimit:{enabled:true,storage:'database'},secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL});}
export async function requireAdmin(){const session=await auth().api.getSession({headers:await headers()});if(!session||session.user.email.toLowerCase()!==process.env.ADMIN_EMAIL?.toLowerCase())throw new Error('Unauthorized');return session.user;}
export function sameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid origin');}
