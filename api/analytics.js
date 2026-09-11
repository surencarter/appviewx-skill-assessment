module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers.authorization || '').trim();
  const key  = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'Storage not configured.' });
  }

  const { KV_REST_API_URL: url, KV_REST_API_TOKEN: token } = process.env;

  // Build last 14 days (newest first)
  const days = [];
  for (var i = 0; i < 14; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Batch all KV calls in one pipeline request:
  // 14 × LLEN (msgs) + 14 × SCARD (convs) + 1 × LRANGE (keywords from last 2 days)
  var pipeline = [];
  days.forEach(function(day) {
    pipeline.push(['LLEN',  'analytics:msgs:'  + day]);
    pipeline.push(['SCARD', 'analytics:convs:' + day]);
  });
  pipeline.push(['LRANGE', 'analytics:msgs:' + days[0], '0', '149']); // today
  pipeline.push(['LRANGE', 'analytics:msgs:' + days[1], '0', '49']);  // yesterday

  const pipeRes = await fetch(url + '/pipeline', {
    method:  'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body:    JSON.stringify(pipeline),
  });

  if (!pipeRes.ok) {
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }

  const results = await pipeRes.json();

  // Parse daily stats (results 0..27, pairs of LLEN+SCARD per day)
  var daily = days.map(function(day, i) {
    return {
      date:          day,
      messages:      (results[i * 2]?.result)     || 0,
      conversations: (results[i * 2 + 1]?.result) || 0,
    };
  });

  // Keywords from today + yesterday (results 28 + 29)
  var rawMsgs = (results[28]?.result || []).concat(results[29]?.result || []);
  var keywords = extractKeywords(rawMsgs);

  // Totals
  var totalMsgs  = daily.reduce(function(s, d) { return s + d.messages; }, 0);
  var totalConvs = daily.reduce(function(s, d) { return s + d.conversations; }, 0);
  var weekMsgs   = daily.slice(0, 7).reduce(function(s, d) { return s + d.messages; }, 0);
  var weekConvs  = daily.slice(0, 7).reduce(function(s, d) { return s + d.conversations; }, 0);

  return res.status(200).json({
    daily:             daily.slice().reverse(), // oldest first for chart
    totalMessages:     totalMsgs,
    totalConversations: totalConvs,
    weekMessages:      weekMsgs,
    weekConversations: weekConvs,
    todayMessages:     daily[0].messages,
    todayConversations: daily[0].conversations,
    keywords,
  });
};

function extractKeywords(rawEntries) {
  var STOP = new Set([
    'what','how','can','the','is','are','a','an','i','to','do','in','for','of',
    'and','or','it','me','my','with','about','on','at','by','be','as','we','you',
    'that','this','if','not','have','has','get','use','does','which','your','their',
    'there','from','will','would','should','could','any','all','some','more','than',
    'but','so','up','out','tell','show','need','want','please','help','know','learn',
    'course','courses','academy','appviewx','avx','hi','hello','hey','thanks','thank',
  ]);

  var counts = {};
  rawEntries.forEach(function(raw) {
    try {
      var entry = JSON.parse(raw);
      var text  = (entry.text || '').toLowerCase();
      text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(function(w) {
        if (w.length >= 3 && !STOP.has(w)) {
          counts[w] = (counts[w] || 0) + 1;
        }
      });
    } catch (e) {}
  });

  return Object.entries(counts)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 12)
    .map(function(pair) { return { word: pair[0], count: pair[1] }; });
}
