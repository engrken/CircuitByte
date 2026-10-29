import {sameOrigin} from '../../../lib/auth';
import {createOrder,errorResponse,readBody} from '../../../lib/orders';
export const dynamic='force-dynamic';
export async function POST(req){try{sameOrigin(req);}catch{return Response.json({error:'Invalid origin'},{status:403});}try{return Response.json(await createOrder(await readBody(req),req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown'),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
