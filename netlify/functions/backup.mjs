import { store } from '../../lib/storage.js';
import { timingSafeEqual } from 'node:crypto';

function authorized(request) {
  const secret = process.env.TOPBOMBER_BACKUP_TOKEN;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!secret || !supplied) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' }
});

// Read-only archive export: never changes or deletes existing Netlify Blobs.
export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (process.env.CONTEXT !== 'production') return json({ error: 'Production only' }, 403);
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const day = url.searchParams.get('day');
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: 'Invalid YYYY-MM-DD day' }, 400);

  const prefix = day ? `history/${day}/` : 'history/';
  try {
    const s = store();
    const entries = [];
    let cursor;
    do {
      const page = await s.list({ prefix, ...(cursor ? { cursor } : {}) });
      for (const { key } of page.blobs) {
        const value = await s.get(key, { type: 'json' });
        if (value !== null) entries.push({ key, value });
      }
      cursor = page.cursor;
    } while (cursor);

    return new Response(JSON.stringify({
      format: 'topbomber-history-backup-v1',
      createdAt: new Date().toISOString(),
      prefix,
      count: entries.length,
      entries
    }), {
      headers: {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="topbomber-history-${day || 'all'}.json"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('History backup failed', error);
    return json({ error: 'Backup export failed; check Netlify function logs' }, 503);
  }
}
