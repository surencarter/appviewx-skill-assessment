const ALLOWED_SOURCES = ['certifications'];
const PAGE_LIMIT_MAX  = 100;

module.exports = async function handler(req, res) {
  // Fix #3: admin key in Authorization header, not query string
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const authHeader   = (req.headers.authorization || '').trim();
  const providedKey  = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!process.env.ADMIN_KEY || providedKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'Storage not configured.' });
  }

  // Whitelist source
  const rawSource = req.query.source || 'certifications';
  const source    = ALLOWED_SOURCES.includes(rawSource) ? rawSource : 'certifications';
  const listKey   = 'notify:' + source;

  // Fix #6: pagination — offset + limit via LRANGE, total via LLEN (parallel)
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit  = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const { KV_REST_API_URL: url, KV_REST_API_TOKEN: token } = process.env;
  const headers = { Authorization: 'Bearer ' + token };

  const [rangeRes, lenRes] = await Promise.all([
    fetch(url + '/lrange/' + encodeURIComponent(listKey) + '/' + offset + '/' + (offset + limit - 1), { headers }),
    fetch(url + '/llen/'   + encodeURIComponent(listKey), { headers }),
  ]);

  if (!rangeRes.ok) {
    return res.status(500).json({ error: 'Failed to fetch entries.' });
  }

  const rangeData = await rangeRes.json();
  const total     = lenRes.ok ? (await lenRes.json()).result || 0 : null;

  const entries = (rangeData.result || []).map(function(e) {
    try { return JSON.parse(e); } catch (x) { return { raw: e }; }
  });

  return res.status(200).json({
    source,
    total,
    offset,
    limit,
    count:   entries.length,
    hasMore: total !== null ? (offset + limit) < total : entries.length === limit,
    entries,
  });
};
