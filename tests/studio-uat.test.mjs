import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDENT_UAT,getStudentUat,requireStudentUat,studentUsagePeriod,studentUatRejection} from '../lib/studio-uat.mjs';
test('UAT is exactly the Manila November calendar month, with an exclusive December deadline',()=>{
 assert.equal(getStudentUat('2026-10-31T15:59:59.999Z').status,'upcoming');
 assert.equal(getStudentUat('2026-10-31T16:00:00Z').active,true);
 assert.equal(getStudentUat('2026-11-30T15:59:59.999Z').active,true);
 assert.equal(getStudentUat('2026-11-30T16:00:00Z').status,'closed');
 assert.equal(getStudentUat('invalid').active,false);
});
test('The free offer and all Student quotas share one policy',()=>{
 assert.equal(STUDENT_UAT.pricePhp,0);assert.equal(STUDENT_UAT.automaticRenewal,false);
 assert.deepEqual(STUDENT_UAT.limits,{ai:30,compile:50,cloudProjects:10});
 assert.equal(studentUsagePeriod('2026-10-31T16:00:00Z'),'2026-11');
 assert.equal(studentUsagePeriod('2026-11-30T16:00:00Z'),'2026-12');
});
test('Expired UAT fails closed with a clear API response and keeps saved-project readability explicit',async()=>{
 assert.throws(()=>requireStudentUat('2026-12-01T00:00:00+08:00'),error=>error.code==='STUDIO_UAT_CLOSED');
 const response=studentUatRejection('2026-12-01T00:00:00+08:00');
 assert.equal(response.status,403);assert.match(response.headers.get('cache-control'),/no-store/);
 const body=await response.json();assert.equal(body.code,'STUDIO_UAT_CLOSED');assert.match(body.error,/remain readable/);
 assert.equal(studentUatRejection('2026-11-15T12:00:00+08:00'),null);
});
