import {POST as generateDraft} from '../route.js';
import {createStudioProgressResponse} from '../../../../../lib/studio-progress.mjs';
export const runtime='nodejs';
export const maxDuration=120;
export const dynamic='force-dynamic';

// A single call to the existing handler performs authentication, safety review and quota settlement.
// Streaming transports only status and the already validated final JSON; never partial wiring.
export async function POST(request){
 const controller=new AbortController();
 const onAbort=()=>controller.abort();
 if(request.signal.aborted)controller.abort();
 else request.signal.addEventListener('abort',onAbort,{once:true});
 let forwarded;
 try{forwarded=new Request(request,{signal:controller.signal,duplex:'half'});}
 catch{request.signal.removeEventListener('abort',onAbort);return Response.json({error:'Unable to initialize the project stream.'},{status:400});}
 return createStudioProgressResponse(async()=>{
  try{return await generateDraft(forwarded);}
  finally{request.signal.removeEventListener('abort',onAbort);}
 },{onCancel:()=>controller.abort()});
}
