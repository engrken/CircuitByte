import {STUDENT_UAT,studentUatRejection} from '../../../../lib/studio-uat.mjs';
import {db} from '../../../../lib/db.js';
import {requireUser,sameOrigin} from '../../../../lib/auth.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {BOARD_OPTIONS} from '../../../../lib/studio-boards.mjs';
import {COMMON_MODULES} from '../../../../lib/studio-modules.mjs';
import {parseStudioAcceptance} from '../../../../lib/studio-drafts.mjs';

export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
const projectSchema=z.object({
 title:z.string().trim().min(1).max(120),
 code:z.string().min(10).max(15000),
 parts:z.array(z.string().regex(/^cb-\d{3}$/)).max(16),
 moduleIds:z.array(z.enum(COMMON_MODULES.map(module=>module.id))).max(8).default([]),
 templateSlug:z.string().regex(/^[a-z0-9-]{0,70}$/).default(''),
 board:z.enum(BOARD_OPTIONS.map(item=>item.id)),
 prompt:z.string().max(800).default(''),
 ownMaterials:z.string().max(600).default(''),
 acceptance:z.unknown().optional()
});
const updateSchema=projectSchema.extend({id:z.string().uuid(),revision:z.number().int().min(1).max(2147483646)});
const selectSql='SELECT id,title,template_slug,code,board,selected_parts,selected_modules,prompt,own_materials,acceptance_record,revision,updated_at,created_at FROM studio_projects WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20';
async function parseBody(request,schema){
 const body=await request.text();
 if(body.length>90000)throw Error('Payload too large');
 const input=schema.parse(JSON.parse(body));
 // The same bounded, user-reported evidence schema is used for local files and cloud writes.
 return {...input,acceptance:parseStudioAcceptance(input.acceptance)};
}
function writeValues(userId,data){
 return [userId,data.title,data.templateSlug,data.code,data.board,
   JSON.stringify(data.parts),JSON.stringify(data.moduleIds),data.prompt,data.ownMaterials,
   JSON.stringify(data.acceptance)];
}

export async function GET(){
 let user;try{user=await requireUser();}catch{return Response.json({error:'Sign in required.'},{status:401,headers:noStore});}
 try{
  const r=await db().query(selectSql,[user.id]);
  return Response.json({projects:r.rows},{headers:noStore});
 }catch{return Response.json({error:'Project history is currently unavailable.'},{status:503,headers:noStore});}
}
export async function POST(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Unauthorized'},{status:403,headers:noStore});}
 const closed=studentUatRejection();if(closed)return closed;
 let data;try{data=await parseBody(request,projectSchema);}catch{return Response.json({error:'Invalid project data or acceptance evidence.'},{status:400,headers:noStore});}
 let client;
 try{
  client=await db().connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id]);
  const count=await client.query('SELECT count(*)::integer AS n FROM studio_projects WHERE user_id=$1',[user.id]);
  if(count.rows[0].n>=STUDENT_UAT.limits.cloudProjects){
   await client.query('ROLLBACK');
   return Response.json({error:'Student / Hobby UAT accounts can save up to '+STUDENT_UAT.limits.cloudProjects+' projects. Open an existing project to update it, or remove one in your dashboard.'},{status:409,headers:noStore});
  }
  const id=randomUUID();
  const {rows}=await client.query(`INSERT INTO studio_projects
    (id,user_id,title,template_slug,code,board,selected_parts,selected_modules,prompt,own_materials,acceptance_record)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,revision,updated_at`,
    [id,...writeValues(user.id,data)]);
  await client.query('COMMIT');
  return Response.json({id,title:data.title,revision:rows[0].revision,updatedAt:rows[0].updated_at},{status:201,headers:noStore});
 }catch{
  if(client){try{await client.query('ROLLBACK');}catch{}}
  return Response.json({error:'Unable to save project. Please retry.'},{status:503,headers:noStore});
 }finally{client?.release();}
}
// Update an owned cloud project in-place. Matching revision is mandatory to avoid silent overwrites
// between devices; updates never consume a new Student/Hobby project slot.
export async function PUT(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Unauthorized'},{status:403,headers:noStore});}
 const closed=studentUatRejection();if(closed)return closed;
 let data;try{data=await parseBody(request,updateSchema);}catch{return Response.json({error:'Invalid project data or acceptance evidence.'},{status:400,headers:noStore});}
 try{
  const {rows}=await db().query(`UPDATE studio_projects SET
    title=$4,template_slug=$5,code=$6,board=$7,selected_parts=$8,selected_modules=$9,
    prompt=$10,own_materials=$11,acceptance_record=$12,revision=revision+1,updated_at=now()
    WHERE id=$1 AND user_id=$2 AND revision=$3 RETURNING id,revision,updated_at`,
    [data.id,user.id,data.revision,...writeValues(user.id,data).slice(1)]);
  if(!rows.length)return Response.json({error:'This project was changed in another session or is no longer available. Reload it from My Dashboard before saving again; export your local JSON first.'},{status:409,headers:noStore});
  return Response.json({id:rows[0].id,revision:rows[0].revision,updatedAt:rows[0].updated_at},{headers:noStore});
 }catch{return Response.json({error:'Project update is currently unavailable. Keep your browser draft and retry.'},{status:503,headers:noStore});}
}
export async function DELETE(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Unauthorized'},{status:403,headers:noStore});}
 let body;try{body=z.object({id:z.string().uuid()}).parse(await request.json());}catch{return Response.json({error:'Invalid project ID.'},{status:400,headers:noStore});}
 try{
  const r=await db().query('DELETE FROM studio_projects WHERE id=$1 AND user_id=$2 RETURNING id',[body.id,user.id]);
  return Response.json({deleted:r.rowCount===1},{headers:noStore});
 }catch{return Response.json({error:'Could not delete project.'},{status:503,headers:noStore});}
}
