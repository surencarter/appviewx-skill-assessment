const KB = require('../data/knowledge-base.json');

const SYSTEM_PROMPT = `You are the AppViewX Academy Learning Assistant — a friendly, knowledgeable guide for learners on academy.appviewx.com.

## Academy course catalog and learning paths:

The Academy is organised into these learning paths. Always link to the correct URL when mentioning them.

- **Foundational Path** (new to AppViewX, start here): https://academy.appviewx.com/page/foundational-courses
- **Professional Path** (advanced implementation & administration): https://academy.appviewx.com/page/professional-courses
- **Automation Track** (workflows, REST APIs, integrations): https://academy.appviewx.com/page/avx-automation

Course topics available on the Academy:
- AVX CLM (Certificate Lifecycle Management) — discovery, issuance, renewal, revocation, expiry alerting
- PKIaaS (PKI as a Service) — private CA setup, SCEP/EST/ACME protocols, AD CS and Vault integration
- Kubernetes / KUBE — cert-manager integration, TLS for ingress controllers and service meshes
- Code Signing — signing policy management, CI/CD pipeline integration, audit trails
- SSH Key Management — SSH key discovery, rotation, governance, orphaned key elimination
- ADC (Application Delivery Controller) — certificate push and renewal on F5, Citrix, A10 load balancers
- DDI (DNS, DHCP, IP Address Management) — certificate workflow integration with network infrastructure
- AppViewX Platform — REST APIs, workflow builder, RBAC, SIEM integration, multi-tenant deployments

Browse the full, up-to-date catalog at: https://academy.appviewx.com

## Your product knowledge:
- AVX CLM: Automates SSL/TLS certificate discovery, issuance, renewal, and revocation across enterprise environments. Prevents certificate expiry outages. Key features: auto-discovery across networks, automated renewal workflows, push-to-endpoint, expiry alerting, audit trails.
- PKIaaS: Cloud-delivered Private Certificate Authority. Issues and manages internal certificates for enterprise environments. Supports SCEP, EST, ACME protocols. Integrates with AD CS, HashiCorp Vault, and other CAs.
- Kubernetes / KUBE: Automates certificate management for containerised workloads. Integrates with cert-manager. Handles TLS for ingress controllers, service meshes, and pod-to-pod communication.
- Code Signing: Manages code signing certificates and workflows. Enforces signing policies, provides audit trails, and integrates with CI/CD pipelines.
- SSH Key Management: Discovers, rotates, and governs SSH keys across enterprise infrastructure. Eliminates orphaned keys and enforces lifecycle policies.
- ADC: Manages SSL/TLS certificates on load balancers and ADCs from F5, Citrix, A10, and others. Automates certificate push and renewal.
- DDI: Integrates certificate workflows with network infrastructure. Manages certificate bindings alongside IP and DNS records.
- AppViewX Platform: The underlying automation engine. Supports REST APIs, workflow builder, role-based access control, SIEM integration, and multi-tenant deployments.

## Rules:
1. Always be conversational and helpful — your tone is friendly but professional.
2. Always include relevant Academy URLs when discussing courses or learning paths.
3. After answering a question about courses or learning paths, ALWAYS end with a personalising follow-up question such as: "What's your role or learning goal? (e.g., 'I'm a security admin new to AppViewX' or 'I need to automate certificate workflows') — I can point you to the best courses for you."
4. Keep answers focused — your audience is IT engineers, security admins, and DevOps practitioners.
5. If you don't know a specific detail, say: "I don't have that detail — please check https://helpcenter.appviewx.com/ or email help@appviewx.com"
6. Never discuss pricing or sales — direct those questions to info@appviewx.com
7. Never make up product features or capabilities you are not certain about.
8. Format responses clearly — use numbered lists for steps, bullet points for features or options.`;

function buildContext(query) {
  if (!query || !KB) return '';
  const tokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(t) { return t.length >= 3; });
  if (!tokens.length) return '';

  function score(keywords) {
    if (!Array.isArray(keywords)) return 0;
    return tokens.reduce(function(n, t) {
      return n + (keywords.some(function(k) { return String(k).toLowerCase().includes(t); }) ? 1 : 0);
    }, 0);
  }

  var results = [];

  (KB.courses || []).forEach(function(c) {
    var searchable = (c.keywords || []).concat(
      String(c.title || '').toLowerCase().split(/\s+/),
      String(c.level || '').toLowerCase().split(/\s+/),
      String(c.description || '').toLowerCase().split(/\s+/)
    );
    var s = score(searchable);
    if (s > 0) {
      results.push({
        score: s,
        text: '**Course: ' + c.title + '**' +
              (c.url        ? '\nURL: ' + c.url : '') +
              (c.level      ? '\nLevel: ' + c.level : '') +
              (c.duration   ? '\nDuration: ' + c.duration : '') +
              (c.description ? '\nDescription: ' + c.description : '') +
              (Array.isArray(c.objectives) && c.objectives.length ? '\nObjectives: ' + c.objectives.join('; ') : '') +
              (c.audience   ? '\nAudience: ' + c.audience : ''),
      });
    }
  });

  (KB.faqs || []).forEach(function(f) {
    var searchable = (f.keywords || []).concat(
      String(f.question || '').toLowerCase().split(/\s+/)
    );
    var s = score(searchable);
    if (s > 0) {
      results.push({
        score: s,
        text: '**Q: ' + f.question + '**\nA: ' + f.answer,
      });
    }
  });

  results.sort(function(a, b) { return b.score - a.score; });
  var top = results.slice(0, 5);
  if (!top.length) return '';
  return top.map(function(r) { return r.text; }).join('\n\n');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { messages, convId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Keep last 20 turns to avoid large payloads
  const history = messages.slice(-20).map(m => ({
    role:    m.role === 'user' ? 'user' : 'assistant',
    content: String(m.content).slice(0, 4000),
  }));

  // Build KB context from the latest user message
  const lastUserMsg = history.length > 0 && history[history.length - 1].role === 'user'
    ? history[history.length - 1].content : '';
  const kbContext = buildContext(lastUserMsg);
  const systemWithContext = SYSTEM_PROMPT +
    (kbContext ? '\n\n## Relevant knowledge base context for this question:\n' + kbContext : '');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-5',
        max_tokens: 1024,
        system:     systemWithContext,
        messages:   history,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Anthropic returns structured errors: { type:'error', error:{ type, message } }
      const msg = data?.error?.message || `HTTP ${response.status}`;
      console.error('Anthropic API error:', response.status, msg);
      return res.status(502).json({ error: 'The assistant is temporarily unavailable. Please try again shortly.' });
    }

    // Some Claude models prepend a "thinking" block — find the first text block explicitly
    const textBlock = Array.isArray(data?.content)
      ? data.content.find(b => b.type === 'text')
      : null;

    if (!textBlock?.text) {
      console.error('No text block in Anthropic response:', JSON.stringify(data).slice(0, 400));
      return res.status(200).json({ error: 'The assistant did not return a response. Please try again.' });
    }

    // Log analytics — fire and forget, never block the response
    const lastUser = history[history.length - 1];
    if (lastUser && lastUser.role === 'user') {
      logAnalytics(lastUser.content, convId).catch(function(){});
    }

    return res.status(200).json({ reply: textBlock.text });


  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}

async function logAnalytics(text, convId) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return;
  const { KV_REST_API_URL: url, KV_REST_API_TOKEN: token } = process.env;
  const today   = new Date().toISOString().slice(0, 10);
  const msgKey  = 'analytics:msgs:'  + today;
  const convKey = 'analytics:convs:' + today;
  const entry   = JSON.stringify({ ts: new Date().toISOString(), text: String(text).slice(0, 500), convId: convId || 'unknown' });
  const TTL     = '7776000'; // 90 days

  // Pipeline: LPUSH + SADD + EXPIRE both keys in one HTTP call
  const pipeline = [
    ['LPUSH',  msgKey,  entry],
    ['SADD',   convKey, convId || 'unknown'],
    ['EXPIRE', msgKey,  TTL],
    ['EXPIRE', convKey, TTL],
  ];

  const res = await fetch(url + '/pipeline', {
    method:  'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body:    JSON.stringify(pipeline),
  });
  if (!res.ok) return;

  const results = await res.json();
  const newLen  = Array.isArray(results) ? (results[0]?.result || 0) : 0;

  // Cap list at 500 entries per day
  if (newLen > 500) {
    await fetch(url + '/ltrim/' + encodeURIComponent(msgKey) + '/0/499', {
      method:  'POST',
      headers: { Authorization: 'Bearer ' + token },
    });
  }
}
