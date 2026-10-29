import {requireAdmin} from '../../../../lib/auth';
import {db} from '../../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){try{await requireAdmin();const {rows}=await db().query('SELECT a.id,a.actor,a.reason,a.created_at,a.before_data,a.after_data,p.name FROM product_audit a JOIN products p ON p.id=a.product_id ORDER BY a.id DESC LIMIT 100');return Response.json(rows,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Unauthorized or unavailable'},{status:401});}}
