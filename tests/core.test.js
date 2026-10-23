import test from 'node:test';import assert from 'node:assert/strict';import {decodeBoard} from '../lib/leaderboard.js';import {gameDay} from '../lib/config.js';
test('decode key-indexed arrays',()=>{const o=decodeBoard({total:1,keys:['rank','skin','nickname','score'],data:[[14,'abc','Exemplary',250910]]});assert.equal(o.rows[0].nickname,'Exemplary');assert.equal(o.rows[0].score,250910);assert.equal(o.rows[0].place,1)});
test('game day rollover Toronto',()=>{assert.equal(gameDay(new Date('2026-10-23T21:45:00Z')),'2026-10-23');assert.equal(gameDay(new Date('2026-10-23T23:05:00Z')),'2026-10-24')});

test('official ALL filter uses lowercase all rather than combining regions',async()=>{
 const {fetchBoard}=await import('../lib/leaderboard.js');
 let received;
 const fetchImpl=async url=>{received=new URL(url);return {ok:true,json:async()=>({total:1,keys:['rank','skin','nickname','score'],data:[[2,null,'Player',300]]})}};
 const board=await fetchBoard({period:'today',region:'ALL',sort:'score',fetchImpl,maxRows:25});
 assert.equal(received.searchParams.get('filter'),'all');
 assert.equal(board.rows[0].nickname,'Player');
});


test('ALL adds scores for same nickname across servers and reorders placements', async () => {
 const {aggregateAllByNickname}=await import('../lib/leaderboard.js');
 const board={rows:[
   {place:1,rank:12,skin:'default',nickname:'Twin',score:90,region:'EU'},
   {place:2,rank:10,skin:'skin2',nickname:'Other',score:150,region:'US'},
   {place:3,rank:14,skin:'custom',nickname:'Twin',score:100,region:'US'}
 ],total:3,complete:true};
 const result=aggregateAllByNickname(board,'score');
 assert.equal(result.rows.length,2);
 assert.equal(result.rows[0].nickname,'Twin');
 assert.equal(result.rows[0].score,190);
 assert.equal(result.rows[0].rank,14);
 assert.equal(result.rows[0].skin,'custom');
 assert.equal(result.rows[0].place,1);
 assert.equal(result.rows[0].entries,2);
 assert.equal(result.rawTotal,3);
 assert.equal(aggregateAllByNickname(result,'score').rows[0].score,190);
});

test('ALL adds hunters numeric statistics, not ranks', async () => {
 const {aggregateAllByNickname}=await import('../lib/leaderboard.js');
 const result=aggregateAllByNickname({rows:[
  {nickname:'Twin',rank:6,killsPlayer:50,killsBot:3,deaths:5,roundsPlayed:4},
  {nickname:'Twin',rank:9,killsPlayer:60,killsBot:8,deaths:6,roundsPlayed:10}
 ],total:2},'kills');
 assert.equal(result.rows[0].killsPlayer,110);
 assert.equal(result.rows[0].killsBot,11);
 assert.equal(result.rows[0].deaths,11);
 assert.equal(result.rows[0].roundsPlayed,14);
 assert.equal(result.rows[0].rank,9);
});

test('6 PM Toronto reset: October 23 evening belongs to October 24', () => {
 assert.equal(gameDay(new Date('2026-10-23T21:59:59Z')), '2026-10-23');
 assert.equal(gameDay(new Date('2026-10-23T22:00:00Z')), '2026-10-24');
 assert.equal(gameDay(new Date('2026-10-23T23:05:00Z')), '2026-10-24');
});

test('upstream 400 includes rejected parameters and is not retried',async()=>{
 const {fetchBoard}=await import('../lib/leaderboard.js');
 let hits=0;
 await assert.rejects(()=>fetchBoard({period:'today',region:'EU',sort:'hoarders',maxRows:25,fetchImpl:async()=>{hits++;return {ok:false,status:400,text:async()=>'{"message":"invalid sort"}'};}}), /Upstream 400 for period=today, filter=EU, sort=hoarders/);
 assert.equal(hits,1);
});


test('confirmed 30-day official ALL Monster Hunters request', async()=>{
 const {fetchBoard}=await import('../lib/leaderboard.js');
 let requested;
 const fetchImpl=async url=>{requested=new URL(url);return {ok:true,json:async()=>({total:2,keys:['rank','skin','nickname','killsMob','tibiaId','lolId'],data:[[14,'default','Exemplary',7862],[7,null,'Guest',3287]]})};};
 const result=await fetchBoard({period:'prev30days',region:'ALL',sort:'killsMob',fetchImpl,maxRows:25});
 assert.equal(requested.searchParams.get('period'),'prev30days');
 assert.equal(requested.searchParams.get('filter'),'all');
 assert.equal(requested.searchParams.get('sort'),'killsMob');
 assert.equal(result.rows[0].killsMob,7862);
});

test('duplicate Monster Hunters kills add up on ALL',async()=>{
 const {aggregateAllByNickname}=await import('../lib/leaderboard.js');
 const result=aggregateAllByNickname({rows:[{nickname:'Twin',killsMob:12,rank:8},{nickname:'Twin',killsMob:15,rank:9},{nickname:'Other',killsMob:20,rank:1}],total:3},'killsMob');
 assert.equal(result.rows[0].killsMob,27);
 assert.equal(result.rows[0].nickname,'Twin');
});

test('hoarders ALL adds plutonium balls and gold separately',async()=>{
 const {aggregateAllByNickname}=await import('../lib/leaderboard.js');
 const board=aggregateAllByNickname({rows:[
  {nickname:'Twin',plut:10,balls:3,gold:20,rank:4},
  {nickname:'Twin',plut:15,balls:7,gold:6,rank:9},
  {nickname:'Another',plut:9,balls:90,gold:300,rank:2}
 ],total:3},'hoarders');
 assert.equal(board.rows[0].nickname,'Twin');
 assert.equal(board.rows[0].plut,25);
 assert.equal(board.rows[0].balls,10);
 assert.equal(board.rows[0].gold,26);
});
