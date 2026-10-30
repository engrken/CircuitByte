import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const lessons=JSON.parse(readFileSync(new URL('../content/foundation-lessons.json',import.meta.url),'utf8'));
const profiles=JSON.parse(readFileSync(new URL('../content/product-learning.json',import.meta.url),'utf8'));
const tracks={'Electronics fundamentals':4,'Basic circuits':4,'Arduino coding':6};

test('Learning Lab has fourteen ordered, unique and searchable lessons',()=>{
  assert.equal(lessons.length,14);
  assert.equal(new Set(lessons.map(lesson=>lesson.slug)).size,14);
  assert.deepEqual(Object.fromEntries(Object.keys(tracks).map(track=>[track,lessons.filter(lesson=>lesson.track===track).length])),tracks);
  for(const lesson of lessons){
    assert.match(lesson.slug,/^[a-z0-9-]+$/);
    assert.ok(lesson.title.length>8);
    assert.ok(lesson.intro.length>30);
    assert.ok(lesson.learn.length>=2);
    assert.ok(lesson.concepts.length>=2);
    assert.ok(lesson.steps.length>=3);
    assert.ok(lesson.diagram.length>20);
    assert.ok(lesson.question&&lesson.answer&&lesson.challenge);
  }
});

test('All referenced catalog parts and technical reading links exist',()=>{
  for(const lesson of lessons){
    for(const [id,name] of lesson.parts){
      assert.ok(profiles[id],lesson.slug+' has missing catalog part '+id);
      assert.ok(name);
    }
    for(const [from,to] of lesson.wiring){
      assert.ok(from&&to,lesson.slug+' contains an incomplete connection');
    }
    for(const [title,url] of lesson.references){
      assert.ok(title&&URL.canParse(url)&&new URL(url).protocol==='https:',lesson.slug+' has invalid source');
    }
  }
});

test('All Arduino examples expose setup and loop and have pin safety notes',()=>{
  const coding=lessons.filter(l=>l.track==='Arduino coding');
  assert.equal(coding.length,6);
  for(const lesson of coding){
    assert.match(lesson.code,/void setup\s*\(\s*\)/);
    assert.match(lesson.code,/void loop\s*\(\s*\)/);
    assert.ok(lesson.codeNotes.length>0);
    assert.ok(lesson.safety);
  }
});

test('No circuit exercise requires unsafe mains voltages',()=>{
  for(const lesson of lessons){
    assert.ok(!/\b(120|230|240)\s*VAC\b/i.test(lesson.diagram));
  }
});
