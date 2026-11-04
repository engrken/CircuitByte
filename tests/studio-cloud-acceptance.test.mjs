import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {acceptanceScope,createAcceptanceRecord,rebaseAcceptance} from '../lib/studio-acceptance.mjs';

mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-15T12:00:00+08:00')});
const pg=new PGlite();
let userId='user-one';
mock.module('../lib/auth.js',{namedExports:{
 sameOrigin:()=>{},requireUser:async()=>({id:userId})
}});
mock.module('../lib/db.js',{namedExports:{db:()=>({
 query:(sql,params)=>pg.query(sql,params),
 connect:async()=>({query:(sql,params)=>pg.query(sql,params),release:()=>{}})
})}});
const {GET,POST,PUT,DELETE}=await import('../app/api/studio/projects/route.js');
after(()=>pg.close());

const api='https://circuitbyte.vercel.app/api/studio/projects';
const sketch='void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);delay(500);}';
const createPayload=()=>({title:'Private LED experiment',templateSlug:'',code:sketch,
 board:'arduino:avr:uno',parts:['cb-059','cb-009'],moduleIds:[],prompt:'Blink the real LED and measure its voltage when high.',ownMaterials:'5V USB cable'});
function request(method,body){return new Request(api,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
async function reset(){
 await pg.exec('CREATE TABLE "user"(id text PRIMARY KEY);');
 await pg.exec(await readFile(new URL('../scripts/studio-schema.sql',import.meta.url),'utf8'));
 await pg.query('INSERT INTO "user"(id) VALUES ($1),($2)',['user-one','user-two']);
}
test('Private project acceptance is versioned, owner-only and does not create a new slot on update',async()=>{
 await reset();
 const original=createPayload();
 const posted=await POST(request('POST',original));
 assert.equal(posted.status,201,JSON.stringify(await posted.clone().json()));
 const created=await posted.json();
 assert.equal(created.revision,1);
 let list=(await (await GET()).json()).projects;
 assert.equal(list.length,1);
 assert.equal(list[0].prompt,original.prompt);
 assert.equal(list[0].own_materials,original.ownMaterials);
 assert.equal(list[0].acceptance_record.criteria.length,4);
 const firstScope=acceptanceScope({board:original.board,code:original.code,prompt:original.prompt,
  selected:original.parts,moduleIds:original.moduleIds,boardModel:'Arduino Uno R3 physical v1',supplyNotes:'Measured 4.99 V USB'});
 let evidence=rebaseAcceptance(createAcceptanceRecord(),firstScope);
 evidence={...evidence,boardModel:'Arduino Uno R3 physical v1',supplyNotes:'Measured 4.99 V USB',criteria:
  evidence.criteria.map((item,i)=>i===0?{...item,observed:'Power-off meter: no unintended 5V-GND short.',status:'passed-by-user'}:item)};
 const update=await PUT(request('PUT',{...original,id:created.id,revision:created.revision,acceptance:evidence}));
 assert.equal(update.status,200,JSON.stringify(await update.clone().json()));
 const saved=await update.json();
 assert.equal(saved.revision,2);
 list=(await (await GET()).json()).projects;
 assert.equal(list.length,1,'save existing project must not consume another slot');
 assert.deepEqual(list[0].acceptance_record,evidence);
 assert.equal(list[0].revision,2);
 const stale=await PUT(request('PUT',{...original,id:created.id,revision:1,acceptance:evidence,title:'Old tab overwrite'}));
 assert.equal(stale.status,409,'stale tab cannot overwrite a newer revision');
 list=(await (await GET()).json()).projects;
 assert.equal(list[0].title,original.title);
 userId='user-two';
 assert.equal((await (await GET()).json()).projects.length,0,'private projects are not listed to other users');
 assert.equal((await PUT(request('PUT',{...original,id:created.id,revision:2}))).status,409,'other user cannot update even with ID');
 assert.deepEqual(await (await DELETE(request('DELETE',{id:created.id}))).json(),{deleted:false});
 userId='user-one';
 assert.equal((await (await GET()).json()).projects.length,1);
 // Build and migration retries must preserve user-entered records.
 await pg.exec(await readFile(new URL('../scripts/studio-schema.sql',import.meta.url),'utf8'));
 assert.equal((await (await GET()).json()).projects[0].acceptance_record.criteria[0].status,'passed-by-user');
});
test('Malformed or forged acceptance is rejected before database writes; existing records still readable after UAT closes',async()=>{
 userId='user-one';
 const base=createPayload();
 const bad={
  ...rebaseAcceptance(createAcceptanceRecord(),'scope-1'),
  criteria:createAcceptanceRecord().criteria.map((x,i)=>i===0?{...x,status:'independently-reviewed',observed:'claim without independent certificate'}:x)
 };
 assert.equal((await POST(request('POST',{...base,acceptance:bad}))).status,400);
 assert.equal((await PUT(request('PUT',{...base,id:'b673f8aa-3000-4000-8000-000000000001',revision:1,acceptance:bad}))).status,400);
 assert.equal((await (await GET()).json()).projects.length,1);
 mock.timers.setTime(Date.parse('2026-12-01T00:00:00+08:00'));
 assert.equal((await POST(request('POST',base))).status,403);
 const id=(await (await GET()).json()).projects[0].id;
 assert.equal((await PUT(request('PUT',{...base,id,revision:2}))).status,403);
 assert.equal((await (await GET()).json()).projects[0].id,id,'UAT expiry never deletes private project/evidence');
});
