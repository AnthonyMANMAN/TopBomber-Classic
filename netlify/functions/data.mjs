import {REGIONS,SORTS,PERIODS,gameDay,boardKey} from '../../lib/config.js';
import {read,write} from '../../lib/storage.js';
import {fetchBoard,aggregateAllByNickname} from '../../lib/leaderboard.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async request=>{
 try{
  const u=new URL(request.url);
  const seg=u.pathname.replace(/^\/\.netlify\/functions\/data\/?|^\/api\/?/,'').split('/').filter(Boolean);
  if(seg[0]==='status')return json(await read('meta/status')||{state:'not-collected'});
  if(seg[0]==='days')return json(await read('meta/days')||[]);
  if(seg[0]==='board'){
   const [_,period,region,sort]=seg;
   if(!PERIODS.includes(period)||!REGIONS.includes(region)||!SORTS.includes(sort))return json({error:'Unknown selection'},400);
   const key=`latest/${boardKey(period,region,sort)}`;
   const snapshot=await read(key);
   if(snapshot && !(region==='ALL' && /Combined regional/i.test(snapshot.source||'')))return json(region==='ALL' ? aggregateAllByNickname(snapshot,sort) : snapshot);
   // Seed a new deployment on first visit. A failed upstream fetch returns 503, not a misleading 404.
   try{
    const board=await fetchBoard({period,region,sort,maxRows:25});
    if(!board.rows.length)throw Error('No players in upstream response');
    const day=gameDay();const record={...board,period,region,sort,gameDay:day};
    await write(key,record);
    if(period==='today'){
      await write(`history/${day}/${region}/${sort}`,record);
      const days=await read('meta/days')||[];
      if(!days.includes(day))await write('meta/days',[day,...days]);
    }
    return json(record);
   }catch(e){console.error('Initial board fetch failed',e);return json({error:`No stored snapshot; initial fetch failed: ${String(e.message||e)}`},503)}
  }
  if(seg[0]==='history'){
   const [_,day,region,sort]=seg;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!REGIONS.includes(region)||!SORTS.includes(sort))return json({error:'Invalid history selection'},400);
   const result=await read(`history/${day}/${region}/${sort}`);
   return result?json(region==='ALL' ? aggregateAllByNickname(result,sort) : result):json({error:'No saved snapshot for this day'},404);
  }
  return json({error:'Not found'},404);
 }catch(e){console.error(e);return json({error:'Storage or upstream temporarily unavailable'},503)}
};
