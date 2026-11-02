import {requireUser,sameOrigin} from '../../../../../lib/auth.js';
import {db} from '../../../../../lib/db.js';
import {validKnowledgeTopic} from '../../../../../lib/studio-modules.mjs';
import {discoverModuleReferences} from '../../../../../lib/studio-research.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){
 let user;
 try{sameOrigin(request);user=await requireUser();}
 catch{return Response.json({error:'Verify your Studio account before researching external sources.'},{status:403});}
 let data;
 try{data=await request.json();}
 catch{return Response.json({error:'Invalid request.'},{status:400});}
 const topic=validKnowledgeTopic(data?.topic);
 if(!topic)return Response.json({error:'Use a module or chip name (3–90 characters). Do not enter private information.'},{status:400});
 // Limit external calls to 10 per member per Manila calendar day. Do not store search text.
 const dayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let row;
 try{
  const result=await db().query(`INSERT INTO studio_knowledge_research_quota(user_id,day_key,used)
   VALUES($1,$2,1) ON CONFLICT(user_id,day_key)
   DO UPDATE SET used=studio_knowledge_research_quota.used+1
   WHERE studio_knowledge_research_quota.used < 10 RETURNING used`,[user.id,dayKey]);
  row=result.rows[0];
 }catch{return Response.json({error:'Research allowance is temporarily unavailable. Local module references are still accessible.'},{status:503});}
 if(!row)return Response.json({error:'Daily external research limit reached (10 searches). Try the built-in module library.'},{status:429});
 const result=await discoverModuleReferences(topic);
 return Response.json({...result,researchRemaining:Math.max(0,10-Number(row.used))},
  {headers:{'Cache-Control':'private, no-store'}});
}
