import {REGIONS,SORTS,PERIODS,gameDay,boardKey} from '../../lib/config.js';
import {fetchBoard,combineRegions} from '../../lib/leaderboard.js';
import {read,write} from '../../lib/storage.js';

export default async () => {
  const day=gameDay();const report={collectedAt:new Date().toISOString(),gameDay:day,ok:[],errors:[]};
  // Process one board at a time to avoid a burst of traffic on the game's server.
  for(const period of PERIODS){
    for(const sort of SORTS){
      const byRegion=[];
      for(const region of REGIONS){
        try{
          // First try the game's own ALL filter, as with the rest of the original UI.
          const board=await fetchBoard({period,region,maxRows:100});
          if(!board.rows.length)throw new Error('Upstream returned no players');
          const key=boardKey(period,region,sort);
          // Freeze an old day's final snapshot on rollover. 'latest' remains current.
          const previous=await read(`latest/${key}`);
          if(period==='today' && previous?.gameDay && previous.gameDay!==day){
            const archiveKey=`history/${previous.gameDay}/${region}/${sort}`;
            if(!(await read(archiveKey))) await write(archiveKey,previous);
          }
          const record={...board,period,region,sort,gameDay:day};
          await write(`latest/${key}`,record);
          if(period==='today'){
            // Keep the latest successful snapshot for each game day, including its date.
            await write(`history/${day}/${region}/${sort}`,record);
          }
          report.ok.push(key);
          if(region!=='ALL')byRegion.push({region,board:record});
        }catch(e){
          report.errors.push({period,region,sort,error:String(e.message||e).slice(0,160)});
        }
      }
      // If ALL was not provided upstream, derive an explicitly labeled fallback.
      if(!report.ok.includes(boardKey(period,'ALL',sort)) && byRegion.length){
        const board=combineRegions(byRegion,sort);
        const record={...board,period,region:'ALL',sort,gameDay:day};
        await write(`latest/${boardKey(period,'ALL',sort)}`,record);
        if(period==='today')await write(`history/${day}/ALL/${sort}`,record);
        report.ok.push(boardKey(period,'ALL',sort)+' (fallback)');
      }
    }
  }
  // Keep an index, avoid listing all blob keys client-side.
  let index=await read('meta/days')||[];
  if(!index.includes(day))index=[day,...index].sort().reverse();
  await write('meta/days',index);
  await write('meta/status',report);
  console.log('TopBomber collection:',JSON.stringify({ok:report.ok.length,errors:report.errors.length,day}));
  return new Response(JSON.stringify({ok:report.ok.length,errors:report.errors.length}),{headers:{'content-type':'application/json'}});
};
