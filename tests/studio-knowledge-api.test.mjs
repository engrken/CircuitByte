import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const pg=new PGlite();
let currentMember=null,administrator=false;
const query=(sql,args)=>String(sql).startsWith('SELECT pg_advisory_xact_lock')?Promise.resolve({rows:[]}):pg.query(sql,args);
mock.module('../lib/db.js',{namedExports:{db:()=>({query,connect:async()=>({query,release(){}})})}});
mock.module('../lib/auth.js',{namedExports:{
 requireUser:async()=>{if(!currentMember)throw Error('Login required');return {id:currentMember,email:currentMember+'@example.org'};},
 requireAdmin:async()=>{if(!administrator)throw Error('Administrator required');return {id:'admin',email:'admin@example.org'};},
 sameOrigin:request=>{if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('Invalid origin');}
}});
const submissions=await import('../app/api/studio/knowledge/submissions/route.js');
const moderator=await import('../app/api/admin/studio-knowledge/route.js');
const lookup=await import('../app/api/studio/knowledge/route.js');
const research=await import('../app/api/studio/knowledge/research/route.js');
after(()=>pg.close());
function request(path,body,origin='https://circuitbyte.vercel.app'){
 return new Request('https://circuitbyte.vercel.app'+path,{
  method:'POST',headers:{'Origin':origin,'Content-Type':'application/json'},body:JSON.stringify(body)
 });
}
test('Unauthenticated, cross-origin and non-admin knowledge operations fail closed',async()=>{
 assert.equal((await submissions.GET()).status,401);
 assert.equal((await submissions.POST(request('/api/studio/knowledge/submissions',{topic:'SIM900A',details:'Please check this 2G modem UART board.'}))).status,403);
 assert.equal((await research.POST(request('/api/studio/knowledge/research',{topic:'SIM900A'}))).status,403);
 assert.equal((await moderator.GET()).status,403);
 currentMember='member-a';
 assert.equal((await moderator.POST(request('/api/admin/studio-knowledge',{id:crypto.randomUUID(),decision:'reject'}))).status,403);
 assert.equal((await submissions.POST(request('/api/studio/knowledge/submissions',{topic:'SIM900A',details:'Please check this 2G modem UART board.'},'https://evil.example'))).status,403);
});
test('Knowledge submissions stay user-scoped and private until moderator approval',async()=>{
 await pg.exec('CREATE TABLE "user"(id text PRIMARY KEY);');
 await pg.exec(await readFile(new URL('../scripts/studio-schema.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../scripts/studio-knowledge-schema.sql',import.meta.url),'utf8'));
 await pg.query("INSERT INTO \"user\"(id) VALUES('member-a'),('member-b')");
 const pending=await submissions.POST(request('/api/studio/knowledge/submissions',{
  topic:'SIM900A',details:'Review power supply, antenna requirements, UART level shifting and 2G network availability.',
  sourceUrl:'https://www.simcom.com/technical_files.html'
 }));
 assert.equal(pending.status,201);
 const id=(await pending.json()).id;
 assert.equal((await submissions.GET()).status,200);
 const own=await (await submissions.GET()).json();
 assert.equal(own.submissions.length,1);
 assert.equal(own.submissions[0].status,'pending');
 currentMember='member-b';
 assert.deepEqual((await (await submissions.GET()).json()).submissions,[]);
 currentMember='member-a';
 const publicBefore=await (await lookup.GET(new Request('https://circuitbyte.vercel.app/api/studio/knowledge?q=SIM900A'))).json();
 assert.deepEqual(publicBefore.reviewed,[]);
 administrator=true;
 const queue=await (await moderator.GET()).json();
 assert.equal(queue.pending[0].id,id);
 assert.equal(queue.pending[0].topic,'SIM900A');
 const invalid=await moderator.POST(request('/api/admin/studio-knowledge',{
  id,decision:'approve',title:'SIM900A GSM modem',summary:'This module needs an adequate power supply, UART voltage review, a SIM and confirmed 2G carrier coverage.',
  sourceUrls:['https://malicious.example/datasheet']
 }));
 assert.equal(invalid.status,400);
 assert.deepEqual((await (await lookup.GET(new Request('https://circuitbyte.vercel.app/api/studio/knowledge?q=SIM900A'))).json()).reviewed,[]);
 const accepted=await moderator.POST(request('/api/admin/studio-knowledge',{
  id,decision:'approve',title:'SIM900A GSM modem',summary:'This module needs an adequate power supply, UART voltage review, a SIM and confirmed 2G carrier coverage.',
  keywords:'SIM900A,2G,GSM,UART',sourceUrls:['https://www.simcom.com/technical_files.html']
 }));
 assert.equal(accepted.status,200);
 const knowledge=await (await lookup.GET(new Request('https://circuitbyte.vercel.app/api/studio/knowledge?q=SIM900A'))).json();
 assert.equal(knowledge.reviewed.length,1);
 assert.equal(knowledge.reviewed[0].title,'SIM900A GSM modem');
 assert.deepEqual(knowledge.reviewed[0].sources,['https://www.simcom.com/technical_files.html']);
 assert.equal((await moderator.POST(request('/api/admin/studio-knowledge',{id,decision:'reject'}))).status,409);
 administrator=false;
 assert.equal((await moderator.GET()).status,403);
});
test('External reference research is authenticated, bounded and never auto-publishes community results',async()=>{
 const invalid=await research.POST(request('/api/studio/knowledge/research',{topic:'password'}));
 assert.equal(invalid.status,400);
 const first=await research.POST(request('/api/studio/knowledge/research',{topic:'SIM900A'}));
 assert.equal(first.status,200);
 const found=await first.json();
 assert.equal(found.foundInLibrary,true);
 assert.equal(found.researchRemaining,9);
 assert.equal(found.sources[0].kind,'official-reference');
 for(let i=1;i<10;i++)assert.equal((await research.POST(request('/api/studio/knowledge/research',{topic:'SIM900A'}))).status,200);
 assert.equal((await research.POST(request('/api/studio/knowledge/research',{topic:'SIM900A'}))).status,429);
 const {rows}=await pg.query('SELECT used FROM studio_knowledge_research_quota WHERE user_id=$1',[currentMember]);
 assert.equal(rows[0].used,10);
});
