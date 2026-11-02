import {readArduinoLibraryIndex} from '../../../../lib/studio-library-index.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 const params=new URL(request.url).searchParams,q=(params.get('q')||'').trim().slice(0,100).toLowerCase();
 if(q.length<2)return Response.json({libraries:[],total:0});
 try{const catalog=await readArduinoLibraryIndex();const matches=catalog.filter(x=>[x.name,x.author,x.description,...x.headers].join(' ').toLowerCase().includes(q));return Response.json({libraries:matches.slice(0,30),total:matches.length,catalogTotal:catalog.length},{headers:{'Cache-Control':'public, max-age=300'}});}catch{return Response.json({error:'Arduino library catalog is temporarily unavailable. Known libraries and ZIP import remain available.'},{status:503});}
}
