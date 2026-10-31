import {db} from '../../../../lib/db';
import {requireUser,sameOrigin} from '../../../../lib/auth';
import {z} from 'zod';
export const dynamic='force-dynamic';
const schema=z.object({schoolName:z.string().trim().max(120),program:z.string().trim().max(120),
 role:z.enum(['student','educator','hobbyist','professional','other']),publicConsent:z.boolean()});
export async function GET(){
 try{
  const user=await requireUser();
  const result=await db().query('SELECT school_name,program,role_name,public_consent,school_verified,school_public_approved FROM studio_profiles WHERE user_id=$1',[user.id]);
  return Response.json({user:{id:user.id,name:user.name,email:user.email},profile:result.rows[0]||null},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Sign in to view your Studio profile.'},{status:401});}
}
export async function POST(request){
 let user;try{sameOrigin(request);user=await requireUser();}catch{return Response.json({error:'Unauthorized'},{status:403});}
 let data;try{data=schema.parse(await request.json());}catch{return Response.json({error:'Invalid profile details.'},{status:400});}
 if(data.publicConsent&&!data.schoolName)return Response.json({error:'A school name is needed before requesting public school listing.'},{status:400});
 try{
  const sql='INSERT INTO studio_profiles(user_id,school_name,program,role_name,public_consent) VALUES($1,$2,$3,$4,$5) '+
  'ON CONFLICT(user_id) DO UPDATE SET school_name=EXCLUDED.school_name,program=EXCLUDED.program,role_name=EXCLUDED.role_name,'+
  'public_consent=EXCLUDED.public_consent,'+
  'school_verified=CASE WHEN lower(studio_profiles.school_name)=lower(EXCLUDED.school_name) AND EXCLUDED.public_consent THEN studio_profiles.school_verified ELSE false END,'+
  'school_public_approved=CASE WHEN lower(studio_profiles.school_name)=lower(EXCLUDED.school_name) AND EXCLUDED.public_consent THEN studio_profiles.school_public_approved ELSE false END,'+
  'verified_by=CASE WHEN lower(studio_profiles.school_name)=lower(EXCLUDED.school_name) AND EXCLUDED.public_consent THEN studio_profiles.verified_by ELSE NULL END,'+
  'updated_at=now() RETURNING school_name,program,role_name,public_consent,school_verified,school_public_approved';
  const result=await db().query(sql,[user.id,data.schoolName,data.program,data.role,data.publicConsent]);
  return Response.json({profile:result.rows[0]},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not save school profile. Please retry.'},{status:503});}
}
