import {db} from '../../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const result=await db().query(
   "SELECT school_name AS name FROM studio_profiles WHERE public_consent=true AND school_verified=true AND school_public_approved=true AND school_name<>'' GROUP BY school_name ORDER BY school_name LIMIT 24"
  );
  return Response.json({schools:result.rows,notice:'Members with confirmed affiliation have opted in to public recognition. Listing does not imply that a school officially endorses CircuitByte.'},{headers:{'Cache-Control':'public, max-age=0, s-maxage=120'}});
 }catch{return Response.json({schools:[],notice:'School membership listings are not yet available.'},{headers:{'Cache-Control':'no-store'}});}
}
