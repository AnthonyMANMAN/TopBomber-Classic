// Keep saved payloads intact. Resolve game-provided hoarder stat keys
// when rendering/ranking without coercing unknown keys to zero.
const ALIASES = {
  plut: ['plutoniumFound','plut','plutonium','pluto','plutoniumCollected','plutCollected','plutoniumEarned','plutEarned','plutoniumTotal'],
  balls: ['footballGoals','balls','ball','ballsCollected','ballsEarned','ballsTotal'],
  gold: ['money','gold','goldCollected','goldEarned','goldTotal']
};
export function hoarderField(row, field) {
  for (const key of ALIASES[field] ?? []) {
    const value=row?.[key];
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}
export function hoardersAvailable(row) {
  return ['plut','balls','gold'].some(field=>hoarderField(row,field)!==null);
}

export function rankHoarders(board) {
  if (!board || !Array.isArray(board.rows)) return board;
  const rows=[...board.rows].sort((a,b)=>
    (hoarderField(b,'gold')??-1)-(hoarderField(a,'gold')??-1) ||
    (hoarderField(b,'balls')??-1)-(hoarderField(a,'balls')??-1) ||
    (hoarderField(b,'plut')??-1)-(hoarderField(a,'plut')??-1) ||
    String(a.nickname??'').localeCompare(String(b.nickname??''))
  ).map((row,i)=>({...row,place:i+1}));
  return {...board,rows};
}
