import {db} from '../../../../lib/db';
import {requireAdmin,sameOrigin} from '../../../../lib/auth';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  await requireAdmin();
  const rows=await db().query(
   'SELECT p.user_id,u.email,u.name,p.school_name,p.program,p.role_name,p.public_consent,p.school_verified,p.school_public_approved,p.verified_by,p.updated_at '+
   'FROM studio_profiles p JOIN "user" u ON u.id=p.user_id WHERE p.school_name<>$1 ORDER BY p.updated_at DESC LIMIT 100',['']);
  return Response.json({profiles:rows.rows},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('School review queue failed',error);return Response.json({error:'Unable to load affiliation reviews.',code:'AFFILIATION_QUEUE_UNAVAILABLE'},{status:503});}
}
export async function POST(request){
 let admin;try{sameOrigin(request);admin=await requireAdmin();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 let d;try{d=z.object({userId:z.string().min(1).max(256),approve:z.boolean()}).parse(await request.json());}
 catch{return Response.json({error:'Invalid review request'},{status:400});}
 try{
  const r=await db().query(
   'UPDATE studio_profiles SET school_verified=$1,school_public_approved=$1,verified_by=$2,updated_at=now() '+
   'WHERE user_id=$3 AND public_consent=true AND school_name<>$4 RETURNING user_id,school_name,school_verified,school_public_approved',
   [d.approve,d.approve,admin.email,d.userId,'']);
  if(!r.rowCount)return Response.json({error:'Member has not opted into a school listing or school name is missing.'},{status:409});
  return Response.json({profile:r.rows[0]},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('School affiliation review failed',error);return Response.json({error:'Unable to review affiliation. Please retry or contact support.',code:'AFFILIATION_REVIEW_UNAVAILABLE'},{status:503});}
}
