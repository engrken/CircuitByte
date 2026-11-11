import {requireUser} from '../../../../lib/auth';
import {listCustomerOrders} from '../../../../lib/orders';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await requireUser();return Response.json({orders:await listCustomerOrders(user.id)},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e.message||'Sign in required'},{status:401});}}
