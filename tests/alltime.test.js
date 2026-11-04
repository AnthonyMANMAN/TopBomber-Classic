import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAllTimeRecords, getAllTimeRecords} from '../lib/alltime.js';

test('same nickname can occupy multiple places on different days', () => {
  const x=buildAllTimeRecords([
    {day:'2026-10-24',board:{rows:[{nickname:'Extrakt',score:100},{nickname:'Another',score:150}]}},
    {day:'2026-10-25',board:{rows:[{nickname:'Extrakt',score:200}]}}
  ],'EU','score');
  assert.deepEqual(x.rows.map(r=>[r.nickname,r.gameDay,r.score]),[
    ['Extrakt','2026-10-25',200],['Another','2026-10-24',150],['Extrakt','2026-10-24',100]
  ]);
});

test('picks highest same-day performance once per nickname', () => {
  const x=buildAllTimeRecords([{day:'2026-10-24',board:{rows:[{nickname:'Example',score:20},{nickname:'Example',score:30}]}}],'EU','score');
  assert.equal(x.rows.length,1);assert.equal(x.rows[0].score,30);
});

test('ALL aggregates same-day regional duplicates without combining separate days', () => {
  const x=buildAllTimeRecords([
    {day:'2026-10-24',board:{rows:[{nickname:'A',score:10},{nickname:'A',score:15}]}},
    {day:'2026-10-25',board:{rows:[{nickname:'A',score:20}]}}
  ],'ALL','score');
  assert.deepEqual(x.rows.map(r=>r.score),[25,20]);
});

test('reads history keys without touching latest or writing to storage', async()=>{
  const values={'history/2026-10-24/EU/score':{rows:[{nickname:'A',score:5}]},'latest/today/EU/score':{rows:[{nickname:'B',score:999}]}};
  const storage={
    async list(){return {blobs:[{key:'history/2026-10-24/EU/score'}],cursor:undefined}},
    async get(key){return values[key]}
  };
  const x=await getAllTimeRecords('EU','score',storage);
  assert.equal(x.total,1);assert.equal(x.rows[0].nickname,'A');
});
