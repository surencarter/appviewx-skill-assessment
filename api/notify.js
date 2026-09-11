const ALLOWED_SOURCES = ['certifications'];
const RATE_LIMIT_MAX = 5;   // requests per IP per hour
const RATE_LIMIT_TTL = 3600; // seconds

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { email, source: rawSource } = req.body || {};

  // Fix #2: whitelist source — never trust user-supplied key fragment
  const source = ALLOWED_SOURCES.includes(rawSource) ? rawSource : 'certifications';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Vercel KV env vars not set');
    return res.status(500).json({ error: 'Storage not configured.' });
  }

  // Fix #1: IP-based rate limiting (5 requests / IP / hour)
  const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0].trim()) ||
             (req.socket && req.socket.remoteAddress) || 'unknown';
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Fix #4: O(1) duplicate check via Redis SET (SISMEMBER)
  const isDuplicate = await isDuplicateEmail(normalizedEmail, source);

  // Fix #5: same response for duplicate — no email enumeration
  if (isDuplicate) {
    return res.status(200).json({ ok: true });
  }

  // Store in both SET (dedup) and LIST (ordered admin view)
  const stored = await storeEntry(normalizedEmail, source);
  if (!stored) {
    return res.status(500).json({ error: 'Failed to save. Please try again.' });
  }

  return res.status(200).json({ ok: true });
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

async function checkRateLimit(ip) {
  const { KV_REST_API_URL: url, KV_REST_API_TOKEN: token } = process.env;
  const headers = { Authorization: 'Bearer ' + token };
  const key = 'ratelimit:notify:' + ip.replace(/[^a-zA-Z0-9:.]/g, '_');

  try {
    const incrRes = await fetch(url + '/incr/' + encodeURIComponent(key), {
      method: 'POST', headers,
    });
    if (!incrRes.ok) return true; // fail open on KV error
    const { result: count } = await incrRes.json();

    // Set TTL only on the first hit so the window resets naturally
    if (count === 1) {
      await fetch(url + '/expire/' + encodeURIComponent(key) + '/' + RATE_LIMIT_TTL, {
        method: 'POST', headers,
      });
    }
    return count <= RATE_LIMIT_MAX;
  } catch (e) {
    console.error('[RateLimit] ' + e.message);
    return true; // fail open
  }
}

async function isDuplicateEmail(email, source) {
  const { KV_REST_API_URL: url, KV_REST_API_TOKEN: token } = process.env;
  const setKey = 'notify-set:' + source;
  try {
    const res = await fetch(
      url + '/sismember/' + encodeURIComponent(setKey) + '/' + encodeURIComponent(email),
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) return false; // fail open — let them through, SADD below is idempotent
    const { result } = await res.json();
    return result === 1;
  } catch (e) {
    console.error('[DupCheck] ' + e.message);
    return false;
  }
}

async function storeEntry(email, source) {
  const { KV_REST_API_URL: url, KV_REST_API_TOKEN: token } = process.env;
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const listKey = 'notify:' + source;
  const setKey  = 'notify-set:' + source;
  const entry   = JSON.stringify({ email, source, ts: new Date().toISOString() });

  try {
    // Add to SET first (idempotent)
    await fetch(url + '/sadd/' + encodeURIComponent(setKey), {
      method: 'POST', headers, body: JSON.stringify([email]),
    });
    // Then prepend to ordered LIST
    const listRes = await fetch(url + '/lpush/' + encodeURIComponent(listKey), {
      method: 'POST', headers, body: JSON.stringify([entry]),
    });
    if (!listRes.ok) {
      console.error('[Store] LPUSH failed: ' + await listRes.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Store] ' + e.message);
    return false;
  }
}
