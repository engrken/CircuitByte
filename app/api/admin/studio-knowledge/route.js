import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requireAdmin,sameOrigin} from '../../../../lib/auth.js';
import {db} from '../../../../lib/db.js';
import {isReviewedSourceUrl,normalizeKnowledgeKey} from '../../../../lib/studio-knowledge-store.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reviewSchema=z.object({
 id:z.string().uuid(),
 decision:z.enum(['approve','reject']),
 title:z.string().trim().max(160).default(''),
 summary:z.string().trim().max(1800).default(''),
 keywords:z.string().trim().max(500).default(''),
 sourceUrls:z.array(z.string().max(400)).max(4).default([])
});
export async function GET(){
 try{await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 try{
  const result=await db().query("SELECT id,topic,details,source_url,created_at FROM studio_knowledge_submissions WHERE status='pending' ORDER BY created_at ASC LIMIT 80");
  return Response.json({pending:result.rows},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Knowledge review queue is unavailable.'},{status:503});}
}
export async function POST(request){
 let admin;try{sameOrigin(request);admin=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 let data;try{data=reviewSchema.parse(await request.json());}
 catch{return Response.json({error:'Invalid review request.'},{status:400});}
 if(data.decision==='approve'&&(data.title.length<6||data.summary.length<40||!data.sourceUrls.length||
    data.sourceUrls.some(url=>!isReviewedSourceUrl(url))))
  return Response.json({error:'Approval requires a reviewer-authored title, a substantive summary, and a manufacturer or official documentation HTTPS source.'},{status:400});
 let client;
 try{
  client=await db().connect();
  await client.query('BEGIN');
  const selected=await client.query("SELECT id,topic FROM studio_knowledge_submissions WHERE id=$1 AND status='pending' FOR UPDATE",[data.id]);
  if(!selected.rowCount){
   await client.query('ROLLBACK');
   return Response.json({error:'Submission is missing or already reviewed.'},{status:409});
  }
  if(data.decision==='approve'){
   const key=normalizeKnowledgeKey(selected.rows[0].topic);
   if(!key){await client.query('ROLLBACK');return Response.json({error:'Topic cannot be indexed.'},{status:400});}
   await client.query(
    `INSERT INTO studio_knowledge_entries(id,topic_key,title,summary,keywords,source_urls,reviewed_by)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(topic_key) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,
      keywords=EXCLUDED.keywords,source_urls=EXCLUDED.source_urls,reviewed_by=EXCLUDED.reviewed_by,
      version=studio_knowledge_entries.version+1,reviewed_at=now(),updated_at=now()`,
    [randomUUID(),key,data.title,data.summary,data.keywords,JSON.stringify(data.sourceUrls),admin.email||'studio-admin']);
  }
  await client.query("UPDATE studio_knowledge_submissions SET status=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1",
   [data.id,data.decision==='approve'?'approved':'rejected',admin.email||'studio-admin']);
  await client.query('COMMIT');
  return Response.json({reviewed:true,status:data.decision==='approve'?'approved':'rejected'},
   {headers:{'Cache-Control':'private, no-store'}});
 }catch{
  try{await client?.query('ROLLBACK');}catch{}
  return Response.json({error:'Unable to complete knowledge review.'},{status:503});
 }finally{client?.release();}
}
