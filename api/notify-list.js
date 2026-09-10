module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  // Simple secret-key guard
  if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'Storage not configured.' });
  }

  const source = req.query.source || 'certifications';
  const key    = 'notify:' + source;

  const kvRes = await fetch(
    process.env.KV_REST_API_URL + '/lrange/' + encodeURIComponent(key) + '/0/-1',
    { headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN } }
  );

  if (!kvRes.ok) {
    return res.status(500).json({ error: 'Failed to fetch entries.' });
  }

  const data    = await kvRes.json();
  const entries = (data.result || []).map(function(e) {
    try { return JSON.parse(e); } catch(x) { return { raw: e }; }
  });

  // Sort newest first
  entries.sort(function(a, b) { return (b.ts || '').localeCompare(a.ts || ''); });

  return res.status(200).json({ source: source, count: entries.length, entries: entries });
};
