import {STUDENT_UAT,studentUatRejection} from '../../../../lib/studio-uat.mjs';
import {db} from '../../../../lib/db.js';
import {requireUser,sameOrigin} from '../../../../lib/auth.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
export const dynamic='force-dynamic';
const saveSchema=z.object({title:z.string().trim().min(1).max(120),code:z.string().min(10).max(15000),
 parts:z.array(z.string().regex(/^cb-\d{3}$/)).max(16),templateSlug:z.string().regex(/^[a-z0-9-]{0,70}$/).default(''),board:z.enum(['arduino:avr:uno','esp8266:esp8266:nodemcuv2','esp32:esp32:esp32','esp32:esp32:m5stack-core-esp32'])});
export async function GET(){
 let user;try{user=await requireUser();}catch{return Response.json({error:'Sign in required.'},{status:401});}
 try{
  const r=await db().query('SELECT id,title,template_slug,code,board,selected_parts,updated_at,created_at FROM studio_projects WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20',[user.id]);
  return Response.json({projects:r.rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Project history is currently unavailable.'},{status:503});}
}
export async function POST(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 const closed=studentUatRejection();if(closed)return closed;
 let data;try{data=saveSchema.parse(await request.json());}catch{return Response.json({error:'Invalid project data.'},{status:400});}
 let client;
 try{
  client=await db().connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id]);
  const count=await client.query('SELECT count(*)::integer AS n FROM studio_projects WHERE user_id=$1',[user.id]);
  if(count.rows[0].n>=STUDENT_UAT.limits.cloudProjects){await client.query('ROLLBACK');return Response.json({error:'Student / Hobby UAT accounts can save up to '+STUDENT_UAT.limits.cloudProjects+' projects. Remove one in your dashboard to save another.'},{status:409});}
  const id=randomUUID();
  await client.query('INSERT INTO studio_projects(id,user_id,title,template_slug,code,board,selected_parts) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,user.id,data.title,data.templateSlug,data.code,data.board,JSON.stringify(data.parts)]);
  await client.query('COMMIT');
  return Response.json({id,title:data.title},{status:201});
 }catch{if(client){try{await client.query('ROLLBACK');}catch{}}return Response.json({error:'Unable to save project. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 finally{client?.release();}
}
export async function DELETE(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 let body;try{body=z.object({id:z.string().uuid()}).parse(await request.json());}catch{return Response.json({error:'Invalid project ID.'},{status:400});}
 try{
  const r=await db().query('DELETE FROM studio_projects WHERE id=$1 AND user_id=$2 RETURNING id',[body.id,user.id]);
  return Response.json({deleted:r.rowCount===1});
 }catch{return Response.json({error:'Could not delete project.'},{status:503});}
}
