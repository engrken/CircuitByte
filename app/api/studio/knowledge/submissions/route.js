import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requireUser,sameOrigin} from '../../../../../lib/auth.js';
import {db} from '../../../../../lib/db.js';
import {validKnowledgeTopic} from '../../../../../lib/studio-modules.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const schema=z.object({
 topic:z.string().trim().min(3).max(90),
 details:z.string().trim().min(20).max(1800),
 sourceUrl:z.string().trim().max(400).default('')
});
function safeSourceUrl(value){
 if(!value)return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname);}
 catch{return false;}
}
export async function GET(){
 let user;try{user=await requireUser();}catch{return Response.json({error:'Sign in required.'},{status:401});}
 try{
  const result=await db().query('SELECT id,topic,status,created_at,reviewed_at FROM studio_knowledge_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[user.id]);
  return Response.json({submissions:result.rows},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Unable to view your suggestions.'},{status:503});}
}
export async function POST(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'A verified member account is required.'},{status:403});}
 let data;try{data=schema.parse(await request.json());}
 catch{return Response.json({error:'Describe the module (20–1,800 characters) and optional HTTPS reference.'},{status:400});}
 const topic=validKnowledgeTopic(data.topic);
 if(!topic||!safeSourceUrl(data.sourceUrl))
  return Response.json({error:'Use a hardware topic and an optional valid HTTPS reference URL. Do not include private information.'},{status:400});
 let client;
 try{
  client=await db().connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['studio-knowledge:'+user.id]);
  const count=await client.query("SELECT count(*)::integer AS n FROM studio_knowledge_submissions WHERE user_id=$1 AND created_at >= now()-interval '24 hours'",[user.id]);
  if(Number(count.rows[0].n)>=5){
   await client.query('ROLLBACK');
   return Response.json({error:'Maximum of five knowledge suggestions per member per day.'},{status:429});
  }
  const id=randomUUID();
  await client.query('INSERT INTO studio_knowledge_submissions(id,user_id,topic,details,source_url) VALUES($1,$2,$3,$4,$5)',
   [id,user.id,topic,data.details,data.sourceUrl]);
  await client.query('COMMIT');
  return Response.json({id,status:'pending',message:'Submitted privately for administrator review. It is not public or trusted knowledge.'},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch{
  try{await client?.query('ROLLBACK');}catch{}
  return Response.json({error:'Could not submit the knowledge suggestion.'},{status:503});
 }finally{client?.release();}
}
