import {studioSignupEnabled} from '../../../../lib/auth';
export const dynamic='force-dynamic';
export async function GET(){
 return Response.json({registrationOpen:studioSignupEnabled(),emailVerificationRequired:true,
 notice:studioSignupEnabled()?'Email verification is required before signing in.':'New account registration will open after verified email delivery is configured. Existing authorized users may sign in.'},{headers:{'Cache-Control':'no-store'}});
}
