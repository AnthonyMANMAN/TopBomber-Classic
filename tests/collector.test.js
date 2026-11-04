import test from 'node:test';
import assert from 'node:assert/strict';
import {collect} from '../lib/collection.js';
test('scheduled collector saves daily boards and date index with mocked upstream',async()=>{
 const db=new Map();const calls=[];
 const result=await collect({now:new Date('2026-10-23T20:00:00Z'),readFn:async k=>db.get(k),writeFn:async(k,v)=>{db.set(k,v)},fetchFn:async p=>{calls.push(p);return {rows:[{place:1,nickname:'Tester',score:42,rank:3}],total:1,complete:true,updatedAt:'2026-10-23T20:00:00Z',source:'test'}}});
 assert.equal(result.errors.length,0);assert.equal(calls.length,42);
 assert.ok(calls.some(c=>c.period==='today'&&c.region==='ALL'&&c.sort==='killsMob'));
 assert.ok(calls.some(c=>c.period==='today'&&c.region==='EU'&&c.sort==='killsMob'));
 assert.equal(db.get('history/2026-10-23/ALL/killsMob').rows[0].nickname,'Tester');
 assert.equal(db.get('history/2026-10-23/EU/killsMob').rows[0].nickname,'Tester');
 assert.equal(db.get('latest/today/EU/score').rows[0].score,42);
 assert.ok(db.get('history/2026-10-23/EU/score'));
 assert.deepEqual(db.get('meta/days'),['2026-10-23']);
});
