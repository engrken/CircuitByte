import {test,mock,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const pg=new PGlite();
mock.module('../lib/db.js',{namedExports:{db:()=>({query:(sql,params)=>pg.query(sql,params)})}});
const {readReviewedKnowledge}=await import('../lib/studio-knowledge-store.mjs');
after(()=>pg.close());

test('Production adaptive knowledge migration is additive, repeatable, queryable and cascade-safe',async()=>{
 await pg.exec('CREATE TABLE "user"(id text PRIMARY KEY);');
 await pg.exec(await readFile(new URL('../scripts/studio-schema.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../scripts/studio-usage-schema.sql',import.meta.url),'utf8'));
 await pg.query('INSERT INTO "user"(id) VALUES ($1)', ['migration-test-member']);
 const projectId='b673f8aa-3000-4000-8000-000000000001';
 await pg.query("INSERT INTO studio_projects(id,user_id,title,code) VALUES($1,$2,'Before migration','void setup(){} void loop(){}')",
  [projectId,'migration-test-member']);
 const sql=await readFile(new URL('../scripts/studio-knowledge-schema.sql',import.meta.url),'utf8');
 await pg.exec(sql);
 await pg.exec(sql); // Production build retries must never corrupt data.
 const {rows:projects}=await pg.query('SELECT title,selected_parts,selected_modules FROM studio_projects WHERE id=$1',[projectId]);
 assert.equal(projects[0].title,'Before migration');
 assert.deepEqual(projects[0].selected_modules,[]);
 assert.deepEqual(projects[0].selected_parts,[]);
 await pg.query('UPDATE studio_projects SET selected_modules=$2 WHERE id=$1',[projectId,JSON.stringify(['ina226','sim900a'])]);
 const {rows:restored}=await pg.query('SELECT selected_modules FROM studio_projects WHERE id=$1',[projectId]);
 assert.deepEqual(restored[0].selected_modules,['ina226','sim900a']);

 const entryId='b673f8aa-3000-4000-8000-000000000002';
 const submissionId='b673f8aa-3000-4000-8000-000000000003';
 await pg.query("INSERT INTO studio_knowledge_entries(id,topic_key,title,summary,keywords,source_urls,reviewed_by) VALUES($1,'ina226','INA226 Current Monitor','INA226 measures DC voltage and shunt current; check its bus limits, shunt selection and board voltage.','ina226,current,shunt',$2,'qa-reviewer')",
 [entryId,JSON.stringify(['https://www.ti.com/'])]);
 await pg.query("INSERT INTO studio_knowledge_submissions(id,user_id,topic,details,source_url) VALUES($1,$2,'INA226 current sensor','Please review INA226 breakout supply range and calibration.','https://www.ti.com/')",
 [submissionId,'migration-test-member']);
 const hits=await readReviewedKnowledge('Create an INA226 current logging project');
 assert.equal(hits.length,1);
 assert.equal(hits[0].title,'INA226 Current Monitor');
 assert.deepEqual(hits[0].sources,['https://www.ti.com/']);
 const {rows:privateCount}=await pg.query('SELECT count(*)::integer AS total FROM studio_knowledge_submissions WHERE user_id=$1',
 ['migration-test-member']);
 assert.equal(privateCount[0].total,1);
 await pg.query('DELETE FROM "user" WHERE id=$1',['migration-test-member']);
 const {rows:remaining}=await pg.query('SELECT count(*)::integer AS total FROM studio_knowledge_submissions WHERE id=$1',[submissionId]);
 assert.equal(remaining[0].total,0);
 assert.equal((await readReviewedKnowledge('INA226')).length,1); // Reviewed, public knowledge is independent of a user's account.
});

test('Untrusted private submissions are never returned by the shared approved-knowledge reader',async()=>{
 const hits=await readReviewedKnowledge('SIM900A modem');
 assert.deepEqual(hits,[]);
});
