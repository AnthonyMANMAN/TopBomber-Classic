import { PAGE_SIZE, MAX_ROWS } from './config.js';
const BASE='https://gameofbombs.com/api/v3/stat/top';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export function decodeBoard(raw, from=0) {
  if (!raw || !Array.isArray(raw.keys) || !Array.isArray(raw.data)) throw new Error('Invalid leaderboard payload');
  return {total:Math.max(0,Number(raw.total)||0),rows:raw.data.map((arr,i)=>{
    const row={place:from+i+1};
    raw.keys.forEach((k,j)=>{row[k] = arr[j] ?? null});
    return row;
  })};
}
export async function fetchBoard({period,region,sort,fetchImpl=fetch,maxRows=MAX_ROWS}){
  let all=[],total=0;
  for(let from=0;from<maxRows;from+=PAGE_SIZE){
    const u=new URL(BASE);
    for(const [k,v] of Object.entries({period,filter:region,sort,from,count:Math.min(PAGE_SIZE,maxRows-from),auth:'b'}))u.searchParams.set(k,String(v));
    let response;
    for(let attempt=0;attempt<3;attempt++){
      try {response=await fetchImpl(u.toString(),{headers:{accept:'application/json','user-agent':'TopBomber-Classic/1.0 (public rankings collector)'},signal:AbortSignal.timeout(10000)});if(response.ok)break;throw new Error(`Upstream ${response.status}`)}
      catch(e){if(attempt===2)throw e;await delay(300*(attempt+1))}
    }
    const data=decodeBoard(await response.json(),from);
    total=data.total;all.push(...data.rows);
    if(!data.rows.length || all.length>=total || data.rows.length<PAGE_SIZE)break;
    await delay(90);
  }
  return {rows:all,total,complete:all.length>=total,updatedAt:new Date().toISOString(),source:'Game of Bombs public leaderboard'};
}
export function combineRegions(boards,sort){
  // Prefer game-provided ALL. This is only a fallback when the upstream ALL filter is unavailable.
  // Nicknames are not unique stable player IDs, so preserve region entries instead of summing by nickname.
  const rows=boards.flatMap(({region,board})=>board.rows.map(x=>({...x,region}))).sort((a,b)=>(Number(b[sort==='kills'?'killsPlayer':sort==='hoarders'?'score':'score'])||0)-(Number(a[sort==='kills'?'killsPlayer':sort==='hoarders'?'score':'score'])||0)).slice(0,MAX_ROWS).map((x,i)=>({...x,place:i+1}));
  return {rows,total:rows.length,complete:boards.every(b=>b.board.complete),updatedAt:new Date().toISOString(),source:'Combined regional boards (not official ALL)'};
}
