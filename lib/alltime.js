import {store} from './storage.js';
import {aggregateAllByNickname} from './leaderboard.js';

export const measure = (row, sort) => {
  if (sort === 'score') return Number(row.score ?? 0);
  if (sort === 'kills') return Number(row.killsPlayer ?? row.kills ?? 0);
  if (sort === 'killsMob') return Number(row.killsMob ?? 0);
  if (sort === 'hoarders') return Number(row.plut ?? row.plutonium ?? 0);
  return 0;
};

// Each nickname can appear once on EACH game day. Never sum values across days.
export function buildAllTimeRecords(archives, region, sort) {
  const records = [];
  for (const {day, board} of archives) {
    if (!board || !Array.isArray(board.rows)) continue;
    const daily = region === 'ALL' ? aggregateAllByNickname(board, sort) : board;
    const best = new Map();
    for (const row of daily.rows) {
      if (!row.nickname) continue;
      const previous = best.get(row.nickname);
      if (!previous || measure(row, sort) > measure(previous, sort)) best.set(row.nickname, row);
    }
    for (const row of best.values()) records.push({...row, gameDay: day});
  }
  records.sort((a,b)=>measure(b,sort)-measure(a,sort) || b.gameDay.localeCompare(a.gameDay) || a.nickname.localeCompare(b.nickname));
  return {
    period:'all', region, sort,
    rows:records.map((row,i)=>({...row,place:i+1})),
    total:records.length, complete:true,
    updatedAt:new Date().toISOString(),
    source:'Highest saved daily performances, one record per player per game day',
    days:archives.length
  };
}

// Read the actual Netlify Blobs archives. Do not use the unsupported upstream period=all.
export async function getAllTimeRecords(region, sort, storage=store()) {
  const suffix='/'+region+'/'+sort;
  const found=[];
  let cursor;
  do {
    const page=await storage.list({prefix:'history/', ...(cursor?{cursor}:{})});
    for (const entry of page.blobs ?? []) {
      const match=/^history\/(\d{4}-\d{2}-\d{2})\/([^/]+)\/([^/]+)$/.exec(entry.key);
      if (match && entry.key.endsWith(suffix)) found.push({key:entry.key,day:match[1]});
    }
    cursor=page.cursor;
  } while(cursor);
  const archives=[];
  for (const record of found) {
    const board=await storage.get(record.key,{type:'json'});
    if (board?.rows?.length) archives.push({day:record.day,board});
  }
  return buildAllTimeRecords(archives,region,sort);
}
