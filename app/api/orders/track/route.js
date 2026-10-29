import {trackOrder,errorResponse,readBody} from '../../../../lib/orders';
export const dynamic='force-dynamic';
export async function POST(req){try{return Response.json(await trackOrder((await readBody(req)).token),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
