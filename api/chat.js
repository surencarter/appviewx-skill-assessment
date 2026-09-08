const SYSTEM_PROMPT = `You are the AppViewX Academy Learning Assistant — an expert guide for learners on academy.appviewx.com.

## Your expertise covers all AppViewX products:
- AVX CLM (Certificate Lifecycle Management): Automates SSL/TLS certificate discovery, issuance, renewal, and revocation across enterprise environments. Prevents certificate expiry outages. Key features: auto-discovery across networks, automated renewal workflows, push-to-endpoint, expiry alerting, audit trails.
- PKIaaS (PKI as a Service): Cloud-delivered Private Certificate Authority. Issues and manages internal certificates for enterprise environments. Supports SCEP, EST, ACME protocols. Integrates with AD CS, HashiCorp Vault, and other CAs.
- Kubernetes / KUBE: Automates certificate management for containerised workloads. Integrates with cert-manager. Handles TLS for ingress controllers, service meshes, and pod-to-pod communication.
- Code Signing: Manages code signing certificates and workflows. Enforces signing policies, provides audit trails, and integrates with CI/CD pipelines.
- SSH Key Management: Discovers, rotates, and governs SSH keys across enterprise infrastructure. Eliminates orphaned keys and enforces lifecycle policies.
- ADC (Application Delivery Controller): Manages SSL/TLS certificates on load balancers and ADCs from F5, Citrix, A10, and others. Automates certificate push and renewal.
- DDI (DNS, DHCP, IP Address Management): Integrates certificate workflows with network infrastructure. Manages certificate bindings alongside IP and DNS records.
- AppViewX Platform: The underlying automation engine. Supports REST APIs, workflow builder, role-based access control, SIEM integration, and multi-tenant deployments.

## Rules:
1. Keep answers concise — your audience is IT engineers, security admins, and DevOps practitioners.
2. When relevant, recommend which Academy course or learning path covers the topic in depth.
3. If you don't know a specific detail, say: "I don't have that detail — please check https://helpcenter.appviewx.com/ or email help@appviewx.com"
4. Never discuss pricing or sales — direct those questions to info@appviewx.com
5. Never make up product features or capabilities you are not certain about.
6. Format responses clearly — use bullet points or numbered lists when listing steps or features.`;

export default async function handler(req, res) {
  // CORS — allow the Academy and local dev
  const allowed = ['https://academy.appviewx.com', 'http://localhost:3000', 'http://localhost:5500'];
  const origin  = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin',  allowed.includes(origin) ? origin : 'https://academy.appviewx.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
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
        system:     SYSTEM_PROMPT,
        messages:   history,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Anthropic API error:', response.status, text);
      return res.status(502).json({ error: 'AI service unavailable. Please try again.' });
    }

    const data  = await response.json();
    const reply = data?.content?.[0]?.text ?? 'Sorry, I could not generate a response.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
