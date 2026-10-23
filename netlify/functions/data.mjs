import {REGIONS,SORTS,PERIODS} from '../../lib/config.js';
import {read} from '../../lib/storage.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'public, max-age=30'}});
export default async request=>{
  try{
    const u=new URL(request.url);
    const seg=u.pathname.replace(/^\/\.netlify\/functions\/data\/?|^\/api\/?/,'').split('/').filter(Boolean);
    if(seg[0]==='status')return json(await read('meta/status')||{state:'not-collected'});
    if(seg[0]==='days')return json(await read('meta/days')||[]);
    if(seg[0]==='board'){
      const [_,period,region,sort]=seg;
      if(!PERIODS.includes(period)||!REGIONS.includes(region)||!SORTS.includes(sort))return json({error:'Unknown leaderboard selection'},400);
      const val=await read(`latest/${period}/${region}/${sort}`);
      return val?json(val):json({error:'No snapshot collected yet. Scheduled collection starts after deployment.'},404);
    }
    if(seg[0]==='history'){
      const [_,day,region,sort]=seg;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!REGIONS.includes(region)||!SORTS.includes(sort))return json({error:'Invalid history selection'},400);
      const val=await read(`history/${day}/${region}/${sort}`);
      return val?json(val):json({error:'No snapshot saved for this day'},404);
    }
    return json({error:'Not found'},404);
  }catch(e){console.error(e);return json({error:'Storage temporarily unavailable'},503)}
};
