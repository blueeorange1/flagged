const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 40
const hits = new Map()

function limited(ip) {
  const now = Date.now()
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
  }
  const h = hits.get(ip)
  if (!h || now > h.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  h.count += 1
  return h.count > LIMIT
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { system, messages, key } = req.body || {}
  if (typeof system !== 'string' || !system || !Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: 'system and messages required' })
  if (system.length > 8000 || messages.length > 16) return res.status(400).json({ error: 'too large' })
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || m.content.length > 2000)
      return res.status(400).json({ error: 'bad message' })
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  if (limited(ip)) return res.status(429).json({ error: 'rate limited' })

  const apiKey = (typeof key === 'string' && key) || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'no key configured' })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
    }),
  })
  const data = await r.json().catch(() => null)
  if (!r.ok || !data) return res.status(502).json({ error: 'upstream error' })
  return res.status(200).json(data)
}
