import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';

const TOKEN_RE = /^gh[ou]_[A-Za-z0-9_]+$/;
const MAX_BODY_BYTES = 80000;
const MAX_MESSAGE_CHARS = 30000;

function respond(res,status,body){
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  });
  res.end(JSON.stringify(body));
}

export function validCompletionInput(body){
  return Boolean(body && typeof body === 'object' && !Array.isArray(body) &&
    typeof body.token === 'string' && TOKEN_RE.test(body.token) && body.token.length <= 1000 &&
    Array.isArray(body.messages) && body.messages.length === 2 &&
    body.messages[0]?.role === 'system' && body.messages[1]?.role === 'user' &&
    body.messages.every(m => typeof m.content === 'string' && m.content.length > 0 && m.content.length <= MAX_MESSAGE_CHARS));
}

export function createBridgeServer({secret,complete,concurrency=2}={}){
  if(typeof secret !== 'string' || secret.length < 32)throw Error('COPILOT_SERVICE_SECRET must be at least 32 characters.');
  if(typeof complete !== 'function')throw Error('Copilot completion handler required.');
  if(!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10)throw Error('Invalid concurrency.');
  const expected = createHash('sha256').update('Bearer '+secret).digest();
  const active = new Set();
  const server = http.createServer(async (req,res)=>{
    // No sensitive state in the public Railway liveness endpoint.
    if(req.method==='GET' && req.url==='/healthz')return respond(res,200,{ready:true});
    const actual=createHash('sha256').update(req.headers.authorization||'').digest();
    if(!timingSafeEqual(actual,expected))return respond(res,401,{error:'Unauthorized'});
    if(req.method==='GET' && req.url==='/health')return respond(res,200,{ready:true});
    if(req.method!=='POST' || req.url!=='/completion')return respond(res,404,{error:'Not found'});
    if(req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()!=='application/json')return respond(res,415,{error:'JSON required'});
    const contentLength=Number(req.headers['content-length']);
    if(Number.isFinite(contentLength)&&contentLength>MAX_BODY_BYTES)return respond(res,413,{error:'Request too large'});
    let raw='';let size=0;
    try{
      for await(const chunk of req){
        size+=chunk.length;
        if(size>MAX_BODY_BYTES)throw Error('Too large');
        raw+=chunk.toString('utf8');
      }
    }catch(e){return respond(res,size>MAX_BODY_BYTES?413:400,{error:size>MAX_BODY_BYTES?'Request too large':'Invalid request'});}
    let body;
    try{body=JSON.parse(raw);}catch{return respond(res,400,{error:'Invalid JSON'});}
    if(!validCompletionInput(body))return respond(res,400,{error:'Invalid completion input'});
    const account=createHash('sha256').update(body.token).digest('hex');
    if(active.size>=concurrency || active.has(account))return respond(res,429,{error:'Copilot service busy. Try later.'});
    active.add(account);
    try{
      const content=await complete({token:body.token,messages:body.messages});
      if(typeof content!=='string' || !content.length || content.length>50000)throw Error('Invalid result');
      respond(res,200,{content});
    }catch{
      respond(res,503,{error:'Copilot could not complete the request. Verify authorization and subscription.'});
    }finally{active.delete(account);}
  });
  server.requestTimeout=15000;
  server.headersTimeout=10000;
  return server;
}
