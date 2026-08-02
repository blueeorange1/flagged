import dialogue from '../data/dialogue.json' with { type: 'json' }
import world from '../data/world.json' with { type: 'json' }

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

function vars(c) {
  const e = c.evidence
  return {
    sender: c.sender.name,
    first: c.sender.name.split(' ')[0],
    role: c.sender.role,
    company: world.company,
    payee: c.content.payee || c.sender.name,
    amount: money(c.content.amount || 0),
    lastCity: e.lastKnownCity,
    ipCity: e.ipCity,
    knownDevice: e.knownDevices[0],
    device: e.deviceHash,
  }
}

function fill(text, v) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m))
}

// A claim only lands as a catchable lie if SENTRY can actually refute it for
// this case, so replies tagged with a claim are skipped when it cannot.
function claimable(claim, c) {
  const e = c.evidence
  if (claim === 'geo') return e.ipCity !== e.lastKnownCity
  if (claim === 'device') return !e.knownDevices.includes(e.deviceHash)
  return true
}

export function opening(c) {
  const tree = dialogue[c.tactic] || dialogue.none
  return fill(tree.opening, vars(c))
}

export function bakedReply(c, playerText, turn) {
  const tree = dialogue[c.tactic] || dialogue.none
  const v = vars(c)
  const text = playerText.toLowerCase()

  // Score by matched keyword length so a long specific stem ("scam") wins
  // over a short generic one ("you") that happens to appear in every line.
  // Stems match at word starts only; short words need a full-word match so
  // "no" cannot fire on "now".
  const hit = (k) => {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp('\\b' + esc + (k.length <= 3 ? '\\b' : '')).test(text)
  }
  let best = null
  let bestScore = 0
  for (const r of tree.replies) {
    if (r.claim && !claimable(r.claim, c)) continue
    let score = 0
    for (const k of r.keywords) if (hit(k)) score += k.length
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }

  if (best) {
    return {
      reply: fill(best.reply, v),
      frustration: best.frustration,
      contradictionLeaked: best.contradictionLeaked,
    }
  }

  if (turn >= 3) {
    const line = tree.escalation[Math.min(turn - 3, tree.escalation.length - 1)]
    return { reply: fill(line, v), frustration: 4, contradictionLeaked: false }
  }

  return {
    reply: fill(tree.fallback[turn % tree.fallback.length], v),
    frustration: Math.min(turn + 1, 3),
    contradictionLeaked: false,
  }
}
