import {requireUser} from '../../../../lib/auth.js';
import {readStudentQuota} from '../../../../lib/studio-usage.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 let user;try{user=await requireUser();}catch{/* Public service status contains no member data. */}
 let usage=null;
 if(user){try{usage=await readStudentQuota(user.id);}catch{/* Service status remains available during a ledger outage. */}}
 return Response.json({
  authenticated:Boolean(user),
  aiEnabled:process.env.STUDIO_AI_ENABLED==='true'&&Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN),
  compilerEnabled:process.env.STUDIO_COMPILER_ENABLED==='true',
  compileBoards:['arduino:avr:uno'],usage
 },{headers:{'Cache-Control':'private, no-store'}});
}
