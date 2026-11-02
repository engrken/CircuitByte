import {copilotConfigured,copilotIdentity} from '../../../../lib/studio-copilot.mjs';
import {UPLOAD_PROFILES} from '../../../../lib/studio-upload-profiles.mjs';
import {BOARD_OPTIONS} from '../../../../lib/studio-boards.mjs';
import {requireUser} from '../../../../lib/auth.js';
import {readStudentQuota} from '../../../../lib/studio-usage.mjs';
import {getStudentUat} from '../../../../lib/studio-uat.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 const uat=getStudentUat();
 let user;try{user=await requireUser();}catch{/* Public service status contains no member data. */}
 let usage=null;
 if(user){try{usage=await readStudentQuota(user.id);}catch{/* Service status remains available during a ledger outage. */}}
 const copilotReady=uat.active&&copilotConfigured();
 const identity=user&&copilotReady?await copilotIdentity(user.id):null;
 return Response.json({
  copilot:{configured:copilotReady,connected:Boolean(identity),login:identity?.login||null},
  authenticated:Boolean(user),
  aiEnabled:uat.active&&process.env.STUDIO_AI_ENABLED==='true'&&Boolean(identity||process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN),
  diagramEnabled:uat.active&&process.env.STUDIO_AI_ENABLED==='true'&&Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN),
  compilerEnabled:uat.active&&process.env.STUDIO_COMPILER_ENABLED==='true',uat,
  usbUploadEnabled:process.env.STUDIO_USB_UPLOAD_ENABLED==='true',
  compileBoards:BOARD_OPTIONS.map(board=>board.id),uploadBoards:Object.keys(UPLOAD_PROFILES),usage
 },{headers:{'Cache-Control':'private, no-store'}});
}
