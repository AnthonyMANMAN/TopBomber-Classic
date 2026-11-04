// Keep saved payloads intact. Resolve game-provided hoarder stat keys
// when rendering/ranking without coercing unknown keys to zero.
const ALIASES = {
  plut: ['plut','plutonium','pluto','plutoniumCollected','plutCollected','plutoniumEarned','plutEarned','plutoniumTotal'],
  balls: ['balls','ball','ballsCollected','ballsEarned','ballsTotal'],
  gold: ['gold','goldCollected','goldEarned','goldTotal']
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
