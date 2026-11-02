import http from 'node:http';
import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CopilotClient} from '@github/copilot-sdk';
const secret=process.env.COPILOT_SERVICE_SECRET;
if(!secret||secret.length<32)throw Error('COPILOT_SERVICE_SECRET must have at least 32 characters.');
const expected=createHash('sha256').update('Bearer '+secret).digest();
const active=new Set();
function reply(res,status,body){if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}}
const server=http.createServer(async(req,res)=>{
 const supplied=createHash('sha256').update(req.headers.authorization||'').digest();
 if(!timingSafeEqual(supplied,expected))return reply(res,401,{error:'Unauthorized'});
 if(req.method==='GET'&&req.url==='/health')return reply(res,200,{ready:true});
 if(req.method!=='POST'||req.url!=='/completion')return reply(res,404,{error:'Not found'});
 let body;try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>80000){reply(res,413,{error:'Request too large'});req.destroy();return;}}body=JSON.parse(raw);}catch{return reply(res,400,{error:'Invalid request'});}
 if(typeof body.token!=='string'||!/^gh[ou]_[A-Za-z0-9_]+$/.test(body.token)||body.token.length>1000||!Array.isArray(body.messages)||body.messages.length!==2||body.messages[0]?.role!=='system'||body.messages[1]?.role!=='user'||body.messages.some(m=>typeof m.content!=='string'||m.content.length>30000))return reply(res,400,{error:'Invalid completion input'});
 const account=createHash('sha256').update(body.token).digest('hex');
 if(active.size>=2||active.has(account))return reply(res,429,{error:'A request is already running. Try later.'});
 active.add(account);
 let client,directory,timer;
 try{
  directory=await mkdtemp(join(tmpdir(),'circuitbyte-copilot-'));
  // Only this request's token reaches its session. No repository, shell, MCP or filesystem tools.
  client=new CopilotClient({mode:'empty',baseDirectory:directory,useLoggedInUser:false,logLevel:'none',sessionIdleTimeoutSeconds:120,env:{PATH:process.env.PATH,HOME:directory,TMPDIR:directory,...(process.env.COPILOT_CLI_PATH?{COPILOT_CLI_PATH:process.env.COPILOT_CLI_PATH}:{})}});
  const run=async()=>{
   const session=await client.createSession({sessionId:randomUUID(),gitHubToken:body.token,model:process.env.COPILOT_MODEL||'gpt-5.4',availableTools:[],systemMessage:{mode:'append',content:body.messages[0].content}});
   const result=await session.sendAndWait({prompt:body.messages[1].content},80000);
   if(typeof result?.data?.content!=='string'||result.data.content.length>50000)throw Error('Invalid result');
   return result.data.content;
  };
  const content=await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Deadline')),85000);})]);
  reply(res,200,{content});
 }catch{reply(res,503,{error:'Copilot could not complete the request. Check authorization, subscription, model access and allowance.'});}
 finally{clearTimeout(timer);if(client)await client.forceStop().catch(()=>{});if(directory)await rm(directory,{recursive:true,force:true}).catch(()=>{});active.delete(account);}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT)||8080,'0.0.0.0');
