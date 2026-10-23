import {REGIONS,SORTS,PERIODS,gameDay,boardKey} from './config.js';
import {fetchBoard} from './leaderboard.js';
const CONCURRENCY = 6;
const ROW_LIMIT = 25;
// Confirmed: prev7days/US/score and prev30days/all/score and killsMob. Other combinations remain provisional.
// Other previously supported boards stay in place pending exact game request verification.
const planned = PERIODS.flatMap(period => (['prev7days','prev30days'].includes(period) ? (period === 'prev7days' ? ['score'] : ['score','killsMob']) : ['score','kills','hoarders']).map(sort => ({period,sort})));
const allTasks = planned.flatMap(({period,sort})=>REGIONS.filter(r=>r!=='ALL').map(region=>({period,region,sort})));
const officialAll = planned.map(({period,sort})=>({period,region:'ALL',sort}));
export async function collect({readFn=read,writeFn=write,fetchFn=fetchBoard,now=new Date()}={}) {
 const day=gameDay(now);
 const report={collectedAt:now.toISOString(),gameDay:day,ok:[],errors:[],attempted:0};
 const tasks=[...officialAll,...allTasks];
 let cursor=0;
 const fetched=new Map();
 async function work(){
   while(cursor<tasks.length){
     const {period,region,sort}=tasks[cursor++];const key=boardKey(period,region,sort);report.attempted++;
     try{
       const board=await fetchFn({period,region,sort,maxRows:ROW_LIMIT});
       if(!board.rows?.length)throw Error('No players returned');
       const previous=await readFn(`latest/${key}`);
       if(period==='today'&&previous?.gameDay&&previous.gameDay!==day){
         // The previous day's archive remains frozen after rollover.
         const oldKey=`history/${previous.gameDay}/${region}/${sort}`;
         if(!(await readFn(oldKey)))await writeFn(oldKey,previous);
       }
       const record={...board,period,region,sort,gameDay:day};
       await writeFn(`latest/${key}`,record);
       if(period==='today')await writeFn(`history/${day}/${region}/${sort}`,record);
       fetched.set(key,record);report.ok.push(key);
     }catch(e){report.errors.push({period,region,sort,error:String(e?.message||e).slice(0,180)});}
   }
 }
 await Promise.all(Array.from({length:CONCURRENCY},()=>work()));
 if(report.ok.some(key=>key.startsWith('today/'))){
   const days=await readFn('meta/days')||[];
   if(!days.includes(day))days.unshift(day);
   await writeFn('meta/days',[...new Set(days)].sort().reverse());
 }
 await writeFn('meta/status',report);
 return report;
}
