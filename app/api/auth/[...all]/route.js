import {auth} from '../../../../lib/auth';
export const dynamic='force-dynamic';
export async function GET(request){return auth().handler(request);}
export async function POST(request){return auth().handler(request);}
