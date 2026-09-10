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

  const normalizedEmail = email.toLowerCase().trim();
  const key   = 'notify:' + (source || 'certifications');
  const entry = JSON.stringify({
    email: normalizedEmail,
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
      try { return JSON.parse(e).email === normalizedEmail; } catch(x) { return false; }
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

  // Send confirmation email via Resend (best-effort — don't fail the request if email fails)
  if (process.env.RESEND_API_KEY) {
    const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'AppViewX Academy <onboarding@resend.dev>';
    try {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          Authorization:  'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    fromEmail,
          to:      [normalizedEmail],
          subject: "You're on the list — AppViewX Certifications",
          html:    buildEmailHtml(normalizedEmail),
        }),
      });
    } catch (e) {
      console.error('Resend email error:', e);
    }
  }

  return res.status(200).json({ ok: true });
};

function buildEmailHtml(email) {
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

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="https://cc.sj-cdn.net/instructor/1n4vvi18nnyfs-appviewx/themes/119fgrg1k6qdg/favicon.1774413970.png"
                   alt="AppViewX" width="48" height="48"
                   style="display:block;border-radius:10px;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:16px;padding:40px 40px 36px;box-shadow:0 1px 4px rgba(0,0,0,.08);">

              <!-- Hero badge -->
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

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #F3F4F6;margin:0 0 28px;" />

              <!-- What to expect -->
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.06em;
                         text-transform:uppercase;color:#9CA3AF;">
                What to expect
              </p>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;">
                    <span style="color:#5B21B6;font-weight:700;margin-right:10px;">✦</span>
                    Industry-recognised certification for PKI &amp; certificate management
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;">
                    <span style="color:#5B21B6;font-weight:700;margin-right:10px;">✦</span>
                    Hands-on exams across Foundational, Professional, and Automation tracks
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;">
                    <span style="color:#5B21B6;font-weight:700;margin-right:10px;">✦</span>
                    Digital badges you can share on LinkedIn and your résumé
                  </td>
                </tr>
              </table>

              <!-- CTA -->
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

          <!-- Footer -->
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
