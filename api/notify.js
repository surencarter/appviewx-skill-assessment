module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { email, source } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Vercel KV env vars not set');
    return res.status(500).json({ error: 'Storage not configured.' });
  }

  const key   = 'notify:' + (source || 'certifications');
  const entry = JSON.stringify({
    email: email.toLowerCase().trim(),
    source: source || 'certifications',
    ts: new Date().toISOString(),
  });

  // Prevent duplicates: check if email already exists in the list
  const checkRes = await fetch(
    process.env.KV_REST_API_URL + '/lrange/' + encodeURIComponent(key) + '/0/-1',
    { headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN } }
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    const alreadyIn = (existing.result || []).some(function(e) {
      try { return JSON.parse(e).email === email.toLowerCase().trim(); } catch(x) { return false; }
    });
    if (alreadyIn) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
  }

  // Store new entry
  const storeRes = await fetch(
    process.env.KV_REST_API_URL + '/lpush/' + encodeURIComponent(key),
    {
      method:  'POST',
      headers: {
        Authorization:  'Bearer ' + process.env.KV_REST_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([entry]),
    }
  );

  if (!storeRes.ok) {
    const err = await storeRes.text();
    console.error('KV store error:', err);
    return res.status(500).json({ error: 'Failed to save. Please try again.' });
  }

  return res.status(200).json({ ok: true });
};
