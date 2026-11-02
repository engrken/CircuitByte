import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {COMMON_MODULES,searchCommonModules,selectKnownModules,validKnowledgeTopic} from '../lib/studio-modules.mjs';
import {discoverModuleReferences} from '../lib/studio-research.mjs';
import {isReviewedSourceUrl,normalizeKnowledgeKey} from '../lib/studio-knowledge-store.mjs';
import catalog from '../scripts/catalog.json' with {type:'json'};
import changelog from '../content/studio-changelog.json' with {type:'json'};

test('Module reference library is complete, unique, searchable and linked to real catalog IDs',()=>{
 const ids=new Set(catalog.map(x=>x.id));
 assert.ok(COMMON_MODULES.length>=25);
 assert.equal(new Set(COMMON_MODULES.map(x=>x.id)).size,COMMON_MODULES.length);
 assert.deepEqual(searchCommonModules('sim900').map(x=>x.id),['sim900a']);
 assert.ok(searchCommonModules('neo-6m').some(x=>x.id==='neo6m'));
 assert.ok(searchCommonModules('ina226').some(x=>x.id==='ina226'));
 assert.ok(searchCommonModules('rfid').some(x=>x.id==='mfrc522'));
 for(const item of COMMON_MODULES){
  assert.match(item.id,/^[a-z0-9-]+$/);assert.ok(item.name&&item.summary&&item.caution);
  assert.ok(Array.isArray(item.aliases));assert.ok(item.catalogIds.every(id=>ids.has(id)),item.id);
  assert.equal(new URL(item.sourceUrl).protocol,'https:');
 }
});
test('Every common module provides a beginner what-is explanation, practical how-to and first test',()=>{
 for(const module of COMMON_MODULES){
  assert.ok(module.whatIs.length>=50,'Missing What Is This: '+module.id);
  assert.ok(Array.isArray(module.howTo)&&module.howTo.length>=3,'Missing How To: '+module.id);
  assert.ok(module.howTo.every(step=>step.length>=35),'Too-vague instructions: '+module.id);
  assert.ok(module.suggestedLibraries.length>=10,'Missing library/interface notes: '+module.id);
  assert.ok(module.firstExperiment.length>=18,'Missing beginner first test: '+module.id);
  assert.doesNotMatch(module.whatIs,/definitely certified|guaranteed safety/i);
 }
});
test('Catalog-linked module selections and the Knowledge Center both expose step-by-step guides',async()=>{
 const ui=await readFile(new URL('../app/studio/workspace.jsx',import.meta.url),'utf8');
 const center=await readFile(new URL('../app/studio/knowledge-center.jsx',import.meta.url),'utf8');
 assert.match(ui,/selectedModuleGuides=useMemo/);
 assert.match(ui,/module\.howTo\.map/);
 assert.match(ui,/module\.firstExperiment/);
 assert.match(center,/module\.whatIs/);
 assert.match(center,/module\.howTo\.map/);
 assert.match(center,/selectedModules\.includes\(module\.id\)/);
 const ai=await readFile(new URL('../app/api/studio/ai/route.js',import.meta.url),'utf8');
 assert.match(ai,/setupGuide:module\.howTo/);
});
test('Shared module selection is bounded and inherited input IDs are never accepted',()=>{
 const result=selectKnownModules(['sim900a','neo6m','sim900a','__proto__','constructor']);
 assert.deepEqual(result.map(x=>x.id),['sim900a','neo6m']);
 assert.equal(selectKnownModules(COMMON_MODULES.map(x=>x.id)).length,8);
 assert.deepEqual(selectKnownModules('not an array'),[]);
});
test('Hardware inquiry only accepts non-sensitive module names',()=>{
 for(const q of ['SIM800L','ESP32-C3','PN532 NFC','INA226 current monitor'])assert.equal(validKnowledgeTopic(q),q);
 for(const q of ['','password', 'someone@example.org', 'sk-abc123456', '192.168.1.1\n', '<script>','09171234567','https://example.com'])assert.equal(validKnowledgeTopic(q),null,q);
 assert.equal(normalizeKnowledgeKey('  NEO-6M GPS  '),'neo-6m-gps');
});
test('External research uses only the GitHub discovery endpoint, never a user-controlled destination',async()=>{
 let url,options;
 const fetcher=async (request,opts)=>{url=new URL(request);options=opts;return {ok:true,json:async()=>({items:[
  {full_name:'Arduino/Arduino',html_url:'https://github.com/arduino/Arduino',description:'Arduino core'},
  {full_name:'unsafe/bad',html_url:'http://localhost:8080/private',description:'Malicious result'}
 ]})};};
 const result=await discoverModuleReferences('MAX6675 thermocouple',{fetcher});
 assert.equal(url.hostname,'api.github.com');assert.equal(url.pathname,'/search/repositories');
 assert.ok(url.searchParams.get('q').includes('MAX6675'));
 assert.equal(result.foundInLibrary,false);
 assert.equal(result.sources.filter(item=>item.kind==='unverified-community-candidate').length,1);
 assert.ok(result.sources.every(source=>source.url.startsWith('https://')));
 assert.equal(options.headers.Accept,'application/vnd.github+json');
 assert.match(result.notice,/not verified/i);
 const known=await discoverModuleReferences('SIM900A',{fetcher:async()=>{throw Error('Should never query externally for indexed modules');}});
 assert.equal(known.foundInLibrary,true);
});
test('Shared knowledge only accepts sources from vetted manufacturer or official documentation hosts',()=>{
 for(const url of ['https://www.u-blox.com/en/product/neo-6-series','https://docs.espressif.com/projects/arduino-esp32/en/latest/api/serial.html'])
  assert.equal(isReviewedSourceUrl(url),true);
 for(const url of ['https://evil.example/docs','https://docs.arduino.cc.evil.example/','http://docs.arduino.cc','https://user:pass@www.u-blox.com/','https://localhost/private'])
  assert.equal(isReviewedSourceUrl(url),false,url);
});
test('Release notices contain stable IDs, dates and readable change logs',async()=>{
 assert.ok(changelog.length>=2);
 assert.equal(new Set(changelog.map(item=>item.id)).size,changelog.length);
 assert.ok(changelog.every(item=>/^20\d{2}-\d\d-\d\d$/.test(item.date)&&item.title&&item.highlights.length));
 const updateSource=await readFile(new URL('../app/studio/studio-updates.jsx',import.meta.url),'utf8');
 assert.match(updateSource,/studio-changelog\.json/);
 assert.match(updateSource,/changes\.slice\(0,8\)/);
});
test('Reviewed knowledge lives apart from raw suggestions and migrates safely',async()=>{
 const sql=await readFile(new URL('../scripts/studio-knowledge-schema.sql',import.meta.url),'utf8');
 const migration=await readFile(new URL('../scripts/migrate.mjs',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS studio_knowledge_entries/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS studio_knowledge_submissions/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS studio_knowledge_research_quota/);
 assert.match(sql,/REFERENCES "user"\(id\) ON DELETE CASCADE/);
 assert.match(sql,/ALTER TABLE studio_projects ADD COLUMN IF NOT EXISTS selected_modules/);
 assert.match(migration,/studio-knowledge-schema\.sql/);
});
test('Generation reads only curated reviewed knowledge, and does not leak member queries to shared memory',async()=>{
 const ai=await readFile(new URL('../app/api/studio/ai/route.js',import.meta.url),'utf8');
 const search=await readFile(new URL('../app/api/studio/knowledge/route.js',import.meta.url),'utf8');
 const submit=await readFile(new URL('../app/api/studio/knowledge/submissions/route.js',import.meta.url),'utf8');
 const admin=await readFile(new URL('../app/api/admin/studio-knowledge/route.js',import.meta.url),'utf8');
 assert.match(ai,/readReviewedKnowledge\(prompt,4\)/);
 assert.match(ai,/selectKnownModules/);
 assert.match(search,/readReviewedKnowledge/);
 assert.match(submit,/status:'pending'/);
 assert.match(admin,/requireAdmin/);
 assert.match(admin,/isReviewedSourceUrl/);
 assert.doesNotMatch(submit,/studio_knowledge_entries/);
});
