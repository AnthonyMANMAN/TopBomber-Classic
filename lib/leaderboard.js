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
    for(const [k,v] of Object.entries({period,filter:region==='ALL'?'all':region,sort,from,count:Math.min(PAGE_SIZE,maxRows-from),auth:'b'}))u.searchParams.set(k,String(v));
    let response;
    for(let attempt=0;attempt<3;attempt++){
      try {response=await fetchImpl(u.toString(),{headers:{accept:'application/json','user-agent':'TopBomber-Classic/1.0 (public rankings collector)'},signal:AbortSignal.timeout(10000)});if(response.ok)break;
        const errorBody=(await response.text().catch(()=>'' )).slice(0,240).replace(/\s+/g,' ');
        const err=new Error(`Upstream ${response.status} for period=${period}, filter=${region==='ALL'?'all':region}, sort=${sort}${errorBody?' — '+errorBody:''}`);
        err.status=response.status;
        throw err}
      catch(e){if(e.status && e.status>=400 && e.status<500)throw e;if(attempt===2)throw e;await delay(300*(attempt+1))}
    }
    const data=decodeBoard(await response.json(),from);
    total=data.total;all.push(...data.rows);
    if(!data.rows.length || all.length>=total || data.rows.length<PAGE_SIZE)break;
    await delay(90);
  }
  const board={rows:all,total,complete:all.length>=total,updatedAt:new Date().toISOString(),source:'Game of Bombs public leaderboard'};
  return region==='ALL' ? aggregateAllByNickname(board,sort) : board;
}
// The game's ALL filter can return the same nickname once per server.
// Combine them into one entry for ALL only. Nicknames are the requested
// grouping key; two distinct accounts with the same name cannot be separated.
export function aggregateAllByNickname(board, sort) {
  if (!board || !Array.isArray(board.rows)) return board;
  if (board.aggregatedByNickname) return board;
  const grouped = new Map();
  const ignored = new Set(['rank','place','tibiaId','lolId']);
  for (const row of board.rows) {
    const name = String(row.nickname ?? '');
    // Do not merge nameless entries.
    const key = name || `__missing_nickname_${row.place ?? grouped.size}`;
    if (!grouped.has(key)) {
      grouped.set(key, {...row, servers: row.region ? [row.region] : [], entries: 1});
      continue;
    }
    const target = grouped.get(key);
    target.entries++;
    if (row.region && !target.servers.includes(row.region)) target.servers.push(row.region);
    const oldRank = Number(target.rank), nextRank = Number(row.rank);
    if (Number.isFinite(nextRank) && (!Number.isFinite(oldRank) || nextRank > oldRank)) target.rank = row.rank;
    if ((!target.skin || target.skin === 'default') && row.skin && row.skin !== 'default') target.skin = row.skin;
    for (const [field,value] of Object.entries(row)) {
      if (ignored.has(field) || field === 'nickname' || field === 'skin' || field === 'region' || field === 'servers' || field === 'entries') continue;
      if (typeof value === 'number' && Number.isFinite(value)) target[field] = (Number(target[field]) || 0) + value;
    }
  }
  const valueOf = row => sort === 'kills' ? Number(row.killsPlayer ?? row.kills ?? 0)
    : sort === 'killsMob' ? Number(row.killsMob ?? 0)
    : sort === 'hoarders' ? Number(row.plut ?? row.plutonium ?? 0)
    : Number(row.score ?? 0);
  const rows = [...grouped.values()].sort((a,b) => valueOf(b) - valueOf(a) || a.nickname.localeCompare(b.nickname))
    .map((row,i)=>({...row,place:i+1}));
  return {...board,rows,total:rows.length,rawTotal:board.total,aggregatedByNickname:true,
    source:(board.source || 'Game of Bombs public leaderboard') + ' · same nicknames summed across servers'};
}

export function combineRegions(boards,sort){
  // Prefer game-provided ALL. This is only a fallback when the upstream ALL filter is unavailable.
  // Nicknames are not unique stable player IDs, so preserve region entries instead of summing by nickname.
  const rows=boards.flatMap(({region,board})=>board.rows.map(x=>({...x,region}))).sort((a,b)=>(Number(b[sort==='kills'?'killsPlayer':sort==='killsMob'?'killsMob':sort==='hoarders'?'plut':'score'])||0)-(Number(a[sort==='kills'?'killsPlayer':sort==='killsMob'?'killsMob':sort==='hoarders'?'plut':'score'])||0)).slice(0,MAX_ROWS).map((x,i)=>({...x,place:i+1}));
  return {rows,total:rows.length,complete:boards.every(b=>b.board.complete),updatedAt:new Date().toISOString(),source:'Combined regional boards (not official ALL)'};
}
