import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {STUDIO_BUILDS} from '../lib/studio.mjs';
import {validateStudioSpecification,estimateStudioBom} from '../lib/studio-documentation.mjs';

const read=async file=>JSON.parse(await readFile(path.resolve(file),'utf8'));
const [specs,catalog,pricing]=await Promise.all([
 read('content/studio-project-specs.json'),read('scripts/catalog.json'),read('content/studio-pricing.json')
]);
const lookup=new Map(catalog.map(p=>[p.id,p]));
test('Every guided Studio template has curated diagram references and unambiguous, structured UNO nets',async()=>{
 assert.deepEqual(Object.keys(specs).sort(),STUDIO_BUILDS.map(b=>b.slug).sort());
 for(const build of STUDIO_BUILDS){
  const spec=specs[build.slug];
  assert.deepEqual(validateStudioSpecification(spec,build.slug),[],build.slug);
  const requiredIds=spec.bom.filter(row=>!row.optional).map(row=>row.id);
  assert.deepEqual(requiredIds.slice().sort(),build.parts.slice().sort(),build.slug+' BOM must cover all listed catalog parts');
  for(const kind of ['schematic','wiring']){
   const file=path.resolve('public',spec.assets[kind].replace(/^\//,''));
   await access(file);
   const svg=await readFile(file,'utf8');
   assert.match(svg,/<svg\b/);
   assert.match(svg,/<title\b/);
   assert.match(svg,/<desc\b/);
   assert.doesNotMatch(svg,/<script\b/i);
  }
  for(const item of spec.bom)assert.ok(lookup.has(item.id),build.slug+' unknown BOM item '+item.id);
  assert.ok(spec.connections.length>=4);
 }
});
test('Itemized pricing reflects static catalog prices and quantities, not imaginary checkout discounts',()=>{
 const result=estimateStudioBom(specs['three-led-scanner'],catalog);
 assert.equal(result.requiredTotal,
   270+3*5+3*3+70+7*2); // UNO, 3 LEDs, 3 resistors, breadboard, 7 jumpers
 assert.equal(result.excluded.length,0);
 assert.equal(result.complete,true);
 assert.match(result.pricingNotice,/not a live quotation/i);
});
test('MicroSD schematic exposes missing LDR, memory card, and 3.3V SPI level-conversion uncertainty',()=>{
 const spec=specs['micro-sd-light-logger'];
 const result=estimateStudioBom(spec,catalog);
 assert.equal(result.complete,false);
 assert.ok(result.excluded.length>=3);
 assert.match(spec.cautions.join(' '),/regulator/i);
 assert.match(spec.cautions.join(' '),/level shifting/i);
});
test('Proposed SaaS pricing does not activate billing or promise unlimited AI/compilation',()=>{
 assert.equal(pricing.salesEnabled,false);
 assert.equal(pricing.status,'proposal');
 assert.deepEqual(pricing.plans.map(x=>x.monthlyPhp),[0,99,499,2999]);
 assert.equal(pricing.plans[0].aiDrafts,0);
 assert.equal(pricing.plans[0].compileRuns,0);
 assert.ok(pricing.plans.every(plan=>plan.access&&!/unlimited/i.test(plan.highlights.join(' '))));
});
test('Netlist validator catches conflicting signals and wrong image slugs',()=>{
 const spec=structuredClone(specs['three-led-scanner']);
 spec.connections.push({pin:'D8',to:'Other peripheral',net:'DIFFERENT',kind:'digital-output'});
 assert.match(validateStudioSpecification(spec,'three-led-scanner').join(' '),/Conflicting nets/);
 spec.assets.wiring='/education/diagrams/another-wiring.svg';
 assert.match(validateStudioSpecification(spec,'three-led-scanner').join(' '),/Diagram path mismatch/);
});
