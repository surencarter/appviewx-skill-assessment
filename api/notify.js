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

  // Fix #8: log Resend failures with full detail instead of swallowing them
  if (process.env.RESEND_API_KEY) {
    const from = process.env.NOTIFY_FROM_EMAIL || 'AppViewX Academy <onboarding@resend.dev>';
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          Authorization:  'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to:      [normalizedEmail],
          subject: "You're on the list — AppViewX Certifications",
          html:    buildEmailHtml(),
        }),
      });
      if (!emailRes.ok) {
        const body = await emailRes.text();
        console.error('[Resend] HTTP ' + emailRes.status + ' for ' + normalizedEmail + ': ' + body);
      }
    } catch (e) {
      console.error('[Resend] Exception for ' + normalizedEmail + ': ' + e.message);
    }
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

function buildEmailHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're on the list!</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="https://cc.sj-cdn.net/instructor/1n4vvi18nnyfs-appviewx/themes/119fgrg1k6qdg/favicon.1774413970.png"
                   alt="AppViewX" width="48" height="48"
                   style="display:block;border-radius:10px;" />
            </td>
          </tr>

          <tr>
            <td style="background:#fff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,.08);">

              <p style="margin:0 0 20px;text-align:center;">
                <span style="display:inline-block;background:#EDE9FE;color:#5B21B6;font-size:13px;font-weight:700;
                             letter-spacing:.04em;text-transform:uppercase;border-radius:20px;padding:5px 14px;">
                  Certifications Coming Soon
                </span>
              </p>

              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;text-align:center;line-height:1.3;">
                You're on the list! 🎓
              </h1>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;text-align:center;line-height:1.6;">
                We'll email you the moment <strong>AppViewX Certifications</strong> go live.<br/>
                Be the first to validate your skills and stand out.
              </p>

              <hr style="border:none;border-top:1px solid #F3F4F6;margin:0 0 28px;" />

              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.06em;
                         text-transform:uppercase;color:#9CA3AF;">What to expect</p>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;">
                  <span style="color:#5B21B6;font-weight:700;margin-right:10px;">✦</span>
                  Industry-recognised certification for PKI &amp; certificate management
                </td></tr>
                <tr><td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;">
                  <span style="color:#5B21B6;font-weight:700;margin-right:10px;">✦</span>
                  Hands-on exams across Foundational, Professional, and Automation tracks
                </td></tr>
                <tr><td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;">
                  <span style="color:#5B21B6;font-weight:700;margin-right:10px;">✦</span>
                  Digital badges you can share on LinkedIn and your résumé
                </td></tr>
              </table>

              <div style="text-align:center;margin-top:32px;">
                <a href="https://academy.appviewx.com"
                   style="display:inline-block;background:linear-gradient(135deg,#5B21B6,#4F46E5);
                          color:#fff;text-decoration:none;font-size:14px;font-weight:700;
                          border-radius:8px;padding:12px 28px;">
                  Explore the Academy →
                </a>
              </div>

            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;font-size:12px;color:#9CA3AF;line-height:1.6;">
              You're receiving this because you signed up for certification updates at
              <a href="https://academy.appviewx.com" style="color:#5B21B6;text-decoration:none;">academy.appviewx.com</a>.<br/>
              &copy; ${new Date().getFullYear()} AppViewX, Inc. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
