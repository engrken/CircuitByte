import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAcceptanceRecord,acceptanceScope,acceptanceSummary,rebaseAcceptance,ACCEPTANCE_STATUSES} from '../lib/studio-acceptance.mjs';
import {parseStudioDraft,serializeStudioDraft} from '../lib/studio-drafts.mjs';

const current={board:'arduino:avr:uno',code:'void setup(){} void loop(){}',prompt:'Blink an LED when the pushbutton is pressed.',selected:['cb-059','cb-009'],moduleIds:[],boardModel:'Uno R3 / LED module revision A',supplyNotes:'5.02 V USB supply and 4.97 V at module'};
const scope=()=>acceptanceScope(current);
const example=()=>({board:current.board,code:current.code,prompt:current.prompt,selected:current.selected,mode:'guide',project:{slug:'studio-generated',title:'LED alarm',method:'ai-draft'}});
test('Acceptance evidence starts untested and cannot be invented by a compiler',()=>{
 const record=createAcceptanceRecord(),report=acceptanceSummary(record,scope());
 assert.equal(record.version,1);
 assert.equal(record.criteria.length,4);
 assert.ok(record.criteria.every(x=>x.status==='not-tested'&&!x.observed));
 assert.equal(report.passed,0);
 assert.equal(report.complete,false);
 assert.ok(!ACCEPTANCE_STATUSES.includes('independently-reviewed'));
});
test('Only self-reported measured results count for an exact board/project/sketch scope',()=>{
 const started=rebaseAcceptance(createAcceptanceRecord(),scope());
 const first={...started.criteria[0],observed:'Supply was disconnected; no measured short.',status:'passed-by-user'};
 const evidence={...started,boardModel:current.boardModel,supplyNotes:current.supplyNotes,criteria:[first,...started.criteria.slice(1)]};
 assert.equal(acceptanceSummary(evidence,scope()).passed,1);
 const changed=acceptanceScope({...current,code:current.code+' // modified'});
 const report=acceptanceSummary(evidence,changed);
 assert.equal(report.passed,0);
 assert.equal(report.stale,true);
 assert.equal(report.complete,false);
 const newRevision=rebaseAcceptance(evidence,changed);
 assert.equal(newRevision.revision,evidence.revision+1);
 assert.ok(newRevision.criteria.every(x=>x.status==='not-tested'&&!x.observed));
 assert.equal(acceptanceSummary(newRevision,changed).stale,false);
});
test('Hardware model, supply, parts and observable requirements also invalidate a previous pass',()=>{
 const a=scope();
 assert.notEqual(a,acceptanceScope({...current,boardModel:'Unknown model'}));
 assert.notEqual(a,acceptanceScope({...current,supplyNotes:'Battery voltage not measured'}));
 assert.notEqual(a,acceptanceScope({...current,selected:['cb-059']}));
 assert.notEqual(a,acceptanceScope({...current,prompt:'Blink an LED at night only.'}));
 assert.equal(a,acceptanceScope({...current,selected:[...current.selected].reverse()}),'part ordering should not invent a new hardware revision');
});
test('Browser project exports round-trip bounded acceptance evidence and accept legacy projects',()=>{
 const raw=example();
 const legacy=parseStudioDraft(raw);
 assert.equal(legacy.acceptance.criteria.length,4);
 const started=rebaseAcceptance(createAcceptanceRecord(),scope());
 const evidence={...started,boardModel:current.boardModel,supplyNotes:current.supplyNotes,criteria:started.criteria.map((item,i)=>i===0?{...item,observed:'Measured no supply-to-ground short; power off.',status:'passed-by-user'}:item)};
 const restored=parseStudioDraft(serializeStudioDraft({...raw,acceptance:evidence}));
 assert.deepEqual(restored.acceptance,evidence);
 assert.equal(acceptanceSummary(restored.acceptance,scope()).passed,1);
});
test('Imported evidence rejects forged reviewer status, duplicate criteria and missing measurements',()=>{
 const base=example();
 const record=rebaseAcceptance(createAcceptanceRecord(),scope());
 const bad=[
  {...record,criteria:record.criteria.map((item,i)=>i===0?{...item,status:'independently-reviewed',observed:'Independent lab pass'}:item)},
  {...record,criteria:[record.criteria[0],record.criteria[0]]},
  {...record,criteria:record.criteria.map((item,i)=>i===0?{...item,status:'passed-by-user',observed:''}:item)},
  {...record,criteria:record.criteria.map((item,i)=>i===0?{...item,observed:'A'.repeat(601)}:item)}
 ];
 for(const evidence of bad)assert.throws(()=>parseStudioDraft({...base,acceptance:evidence}),/invalid/i);
});
test('Studio coach has one measurable acceptance record and refreshes local saved drafts',()=>{
 const workspace=readFileSync(new URL('../app/studio/workspace.jsx',import.meta.url),'utf8');
 const coach=readFileSync(new URL('../app/studio/project-coach.jsx',import.meta.url),'utf8');
 assert.match(workspace,/<StudioAcceptancePanel value=\{acceptance\}/);
 assert.match(workspace,/serializeStudioDraft\(\{project,code,prompt,selected,board,mode,codeDirty,moduleIds:extraModules,ownMaterials,acceptance\}\)/);
 assert.match(workspace,/setAcceptance\(saved\.acceptance\|\|createAcceptanceRecord\(\)\)/);
 assert.doesNotMatch(coach,/type="checkbox"/);
});
