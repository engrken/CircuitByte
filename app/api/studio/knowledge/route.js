import {COMMON_MODULES,searchCommonModules} from '../../../../lib/studio-modules.mjs';
import {readReviewedKnowledge} from '../../../../lib/studio-knowledge-store.mjs';
import {requireUser} from '../../../../lib/auth.js';

export const dynamic='force-dynamic';
export async function GET(request){
 try{await requireUser();}catch{return Response.json({error:'Verify your email to search Studio knowledge.'},{status:401});}
 const q=new URL(request.url).searchParams.get('q')||'';
 if(q.length>120)return Response.json({error:'Search is too long.'},{status:400});
 let reviewed=[],knowledgeAvailable=true;
 if(q.trim().length>=3){
  try{reviewed=await readReviewedKnowledge(q,6);}
  catch{knowledgeAvailable=false;}
 }
 return Response.json({modules:searchCommonModules(q,30),reviewed,knowledgeAvailable,totalModules:COMMON_MODULES.length,
  notice:'Module references are starting points, not verified schematics or physical safety approval.'},
  {headers:{'Cache-Control':'private, no-store'}});
}
