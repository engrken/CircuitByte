import {studioSignupEnabled} from '../../../../lib/auth';
import {getStudentUat} from '../../../../lib/studio-uat.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 const uat=getStudentUat(),registrationOpen=studioSignupEnabled();
 return Response.json({registrationOpen,emailVerificationRequired:true,uat,
 notice:!uat.active?uat.message:registrationOpen?uat.message:'UAT registration is temporarily unavailable. Existing verified members may sign in.'},{headers:{'Cache-Control':'no-store'}});
}
