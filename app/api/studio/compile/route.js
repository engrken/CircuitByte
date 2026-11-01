import {requireUser,sameOrigin} from '../../../../lib/auth.js';
import {consumeStudentQuota} from '../../../../lib/studio-usage.mjs';
import {resolveStudioLibraries,STUDIO_LIBRARY_REGISTRY} from '../../../../lib/studio-libraries.mjs';
import {BOARD_PROFILES,compileStudioSketch} from '../../../../lib/studio-compiler.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;

export async function POST(request) {
  let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Sign in with a verified account to use Student compilation.'},{status:403});}
  if(process.env.STUDIO_COMPILER_ENABLED!=='true'){
    return Response.json({error:'The sandbox compiler is not activated. Enable STUDIO_COMPILER_ENABLED after setting cost limits and verifying Vercel Sandbox access.'},{status:503});
  }
  let payload;
  try{payload=await request.json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
  const code=typeof payload?.code==='string'?payload.code:'';
  const board=String(payload?.board||'');
  const profile=Object.hasOwn(BOARD_PROFILES,board)?BOARD_PROFILES[board]:null;
  if(!profile||code.length<10||code.length>15000||
    !/\bvoid\s+setup\s*\(/.test(code)||!/\bvoid\s+loop\s*\(/.test(code)){
    return Response.json({error:'Choose a supported board and provide a valid 10–15,000 character sketch containing setup() and loop().'}, {status:400});
  }
  const parts=Array.isArray(payload?.parts)?payload.parts.slice(0,16).filter(x=>typeof x==='string'&&/^cb-\d{3}$/.test(x)):[];
  const manualLibraries=Array.isArray(payload?.manualLibraries)?payload.manualLibraries:[];
  if(manualLibraries.length>15||manualLibraries.some(id=>typeof id!=='string'||!Object.hasOwn(STUDIO_LIBRARY_REGISTRY,id)))
    return Response.json({error:'Choose only supported Arduino libraries from Studio Library Manager.'},{status:400});
  const dependencies=resolveStudioLibraries({parts,code,manualLibraries,board:profile.fqbn});
  // Third-party ESP board packages can be large; the sandbox has a hard execution limit.
  // A failed installation is reported as a toolchain failure rather than a compilation success.
  const customLibrary=payload?.customLibrary;
  if(customLibrary!==undefined && (typeof customLibrary!=='string'||customLibrary.length>340000||!/^[-A-Za-z0-9+/=]+$/.test(customLibrary))){
    return Response.json({error:'Custom Arduino ZIP must be base64-encoded and no larger than 250 KB.'},{status:400});
  }
  if(customLibrary && Buffer.byteLength(customLibrary,'base64')>250000){
    return Response.json({error:'Custom library archive is too large (250 KB maximum).'},{status:400});
  }
  if(dependencies.unknownIncludes.includes('M5Stack.h')&&!customLibrary){
    return Response.json({error:'The legacy M5Stack.h library does not support the installed ESP32 3.3.12 core. Use M5Unified.h from Library Manager, or compile with a matching legacy core in Arduino IDE.'},{status:422});
  }
  if(dependencies.unknownIncludes.length && !customLibrary){
    return Response.json({error:'Unknown library header(s): '+dependencies.unknownIncludes.join(', ')+'. Import your own ZIP library or use a supported module.'},{status:422});
  }
  let quota;try{quota=await consumeStudentQuota(user.id,'compile');}catch{return Response.json({error:'Compilation usage ledger unavailable; compilation is temporarily disabled.'},{status:503});}
  if(!quota.allowed)return Response.json({error:'Student monthly compile allowance reached (50 runs).',quota},{status:429});
  const result=await compileStudioSketch({code,profile,dependencies,customLibrary});
  return Response.json({...result,board:String(payload.board),fqbn:profile.fqbn},{status:result.stage==='service'?503:200,headers:{'Cache-Control':'no-store'}});
}
