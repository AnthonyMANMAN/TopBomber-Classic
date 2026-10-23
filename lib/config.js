export const REGIONS = ['ALL','EU','US','RU','BR','Asia'];
export const SORTS = ['score','kills','hoarders','killsMob'];
export const PERIODS = ['today','prev7days','prev30days','all'];
export const PAGE_SIZE = 100;
export const MAX_ROWS = 1000;
export const RESET_HOUR = 18;
export const ZONE = process.env.GAME_TIMEZONE || 'America/Toronto';
export const asISODate = date => `${date.year}-${date.month}-${date.day}`;
export function gameDay(now = new Date(), zone = ZONE, resetHour = RESET_HOUR) {
  const d = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const p=Object.fromEntries(d.map(x=>[x.type,x.value]));
  const today = `${p.year}-${p.month}-${p.day}`;
  if (+p.hour < resetHour) return today;
  const next=new Date(`${today}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+1);
  return next.toISOString().slice(0,10);
}
export function previousGameDay(gameDayKey){const d=new Date(gameDayKey+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}
export function boardKey(period, region, sort){return `${period}/${region}/${sort}`}
export function isChoice(value,choices){return choices.includes(value)}
