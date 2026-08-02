import world from '../data/world.json' with { type: 'json' }
import templates from '../data/templates.json' with { type: 'json' }
import { rulesForDay, firedRules, IRREVERSIBLE } from './rules.js'

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1))

const TACTIC_BY_TRUTH = {
  legit: ['none'],
  social_engineering: [
    'authority_pressure',
    'manufactured_urgency',
    'secrecy_isolation',
    'trusted_contact_impersonation',
  ],
  account_takeover: ['trusted_contact_impersonation', 'credential_harvesting'],
  insider: ['secrecy_isolation', 'irreversible_payment'],
  structuring: ['irreversible_payment', 'manufactured_urgency'],
  phishing: ['credential_harvesting', 'too_good_to_be_true'],
}

const PREFERRED_RULES = {
  authority_pressure: ['authority_pressure_flag', 'off_hours_access'],
  manufactured_urgency: ['velocity_limit', 'structuring_threshold'],
  secrecy_isolation: ['authority_pressure_flag', 'off_hours_access'],
  irreversible_payment: ['irreversible_payment_flag', 'structuring_threshold'],
  trusted_contact_impersonation: ['device_mismatch', 'impossible_travel'],
  too_good_to_be_true: ['irreversible_payment_flag', 'velocity_limit'],
  credential_harvesting: [
    'device_mismatch',
    'impossible_travel',
    'privilege_mismatch',
  ],
}

const DAY_PLAN = {
  1: ['TUT_FRAUD', 'TUT_LEGIT', 'TUT_ASK', 'legit', 'phishing'],
  2: ['legit', 'account_takeover', 'social_engineering', 'legit', 'phishing'],
  3: ['structuring', 'legit', 'social_engineering', 'legit', 'account_takeover'],
  4: ['legit', 'social_engineering', 'TWIST', 'account_takeover', 'legit'],
  5: ['insider', 'legit', 'account_takeover', 'social_engineering', 'legit'],
  6: ['social_engineering', 'structuring', 'legit', 'insider', 'phishing'],
}

const SCOPES = ['payments', 'vendors', 'reports', 'admin', 'devices']
const REVERSIBLE = ['ach', 'card', 'check']

const staffByName = Object.fromEntries(world.staff.map((s) => [s.name, s]))
const farCities = world.cities.filter((c) => c.country !== world.homeCountry)

function dayStartTs(day) {
  return Date.UTC(2031, 2, 2 + day, 21, 0, 0)
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z]+/g, '')
}

function lookalike(domain) {
  const [head, tail] = domain.split('.')
  const swaps = [
    head + '-billing',
    head + '-secure',
    head.replace('i', '1'),
    head.replace('o', '0'),
    head + 'group',
  ]
  return swaps[head.length % swaps.length] + '.' + tail
}

function pickSender(rng, truth, tactic) {
  if (truth === 'legit') {
    if (rng() < 0.5) {
      const s = pick(rng, world.staff)
      return {
        name: s.name,
        role: s.role,
        knownContact: true,
        accountAge: int(rng, 400, 2200),
        staff: s,
      }
    }
    const v = pick(rng, world.vendors)
    return {
      name: v.name,
      role: 'Vendor',
      knownContact: true,
      accountAge: int(rng, 300, 1800),
      vendor: v,
    }
  }

  if (truth === 'account_takeover' || truth === 'insider') {
    const s = pick(rng, world.staff)
    return {
      name: s.name,
      role: s.role,
      knownContact: true,
      accountAge: int(rng, 400, 2200),
      staff: s,
    }
  }

  if (tactic === 'trusted_contact_impersonation' || tactic === 'authority_pressure') {
    const s = pick(rng, world.staff)
    return {
      name: s.name,
      role: s.role,
      knownContact: false,
      accountAge: int(rng, 0, 6),
      staff: s,
      impersonates: true,
    }
  }

  if (rng() < 0.5) {
    const v = pick(rng, world.vendors)
    return {
      name: v.name,
      role: 'Vendor',
      knownContact: false,
      accountAge: int(rng, 0, 20),
      vendor: v,
      impersonates: true,
    }
  }

  return {
    name: pick(rng, world.strangers),
    role: 'Unknown',
    knownContact: false,
    accountAge: int(rng, 0, 12),
  }
}

function cleanAmount(rng, truth) {
  if (truth === 'structuring') return int(rng, 8000, 9960)
  const bands = [
    [420, 3800],
    [1200, 7400],
    [10400, 24000],
  ]
  const [lo, hi] = pick(rng, bands)
  let amt = int(rng, lo, hi)
  if (amt >= 8000 && amt < 10000) amt = 10400 + (amt % 600)
  return amt
}

function money(n) {
  return '$' + n.toLocaleString('en-US')
}

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : '{' + k + '}'))
}

function buildEvidence(rng, day, sender) {
  const homeCity = sender.staff ? sender.staff.city : world.homeCity
  const scopes = sender.staff ? sender.staff.scopes : ['vendors', 'reports']
  const devices = [
    pick(rng, world.devices.filter((d) => !d.startsWith('UNK'))),
    pick(rng, world.devices.filter((d) => !d.startsWith('UNK'))),
  ]
  const sessionTs = dayStartTs(day) + int(rng, 0, 180) * 60000
  return {
    deviceHash: devices[0],
    knownDevices: [...new Set(devices)],
    ipCity: homeCity,
    ipCountry: world.homeCountry,
    lastKnownCity: homeCity,
    lastKnownCountry: world.homeCountry,
    lastLoginTs: sessionTs - int(rng, 40, 600) * 60000,
    sessionTs,
    localHour: int(rng, 9, 17),
    scopeRequested: pick(rng, scopes),
    senderScopes: scopes,
    txCount24h: int(rng, 0, 3),
    txSum24h: int(rng, 0, 12000),
    recentEvents: [],
  }
}

function buildContent(rng, day, truth, tactic, sender, surface) {
  const bank = templates[tactic]
  const variants = bank[surface]
  const v = pick(rng, variants)
  const payeeSource =
    sender.vendor || pick(rng, world.vendors)
  const amount = cleanAmount(rng, truth)
  const vars = {
    amount: money(amount),
    payee: payeeSource.name,
    sender: sender.name,
    company: world.company,
    city: world.homeCity,
  }

  const method =
    truth === 'legit'
      ? pick(rng, REVERSIBLE)
      : rng() < 0.55
        ? pick(rng, IRREVERSIBLE)
        : pick(rng, REVERSIBLE)

  const content = {
    surface,
    kind: tactic === 'credential_harvesting' ? 'access' : 'payment',
    amount,
    method,
    payee: payeeSource.name,
    payeeAccountAgeDays: truth === 'legit' ? int(rng, 90, 1400) : int(rng, 0, 400),
    markers: [...v.markers],
    ask: fill(v.ask, vars),
    obvious: false,
    tells: [],
  }

  if (surface === 'inbox') {
    content.subject = fill(v.subject, vars)
    content.body = fill(v.body, vars)
    const domain = payeeSource.domain || 'meridian.example'
    content.fromAddress =
      truth === 'legit'
        ? slug(sender.name).slice(0, 12) + '@' + domain
        : slug(sender.name).slice(0, 12) + '@' + lookalike(domain)
  } else if (surface === 'relay') {
    content.text = fill(v.text, vars)
  } else {
    content.memo = fill(v.memo, vars)
  }

  return content
}

function plant(c, ruleId, rng) {
  const e = c.evidence
  switch (ruleId) {
    case 'impossible_travel': {
      const far = pick(rng, farCities)
      e.ipCity = far.name
      e.ipCountry = far.country
      e.lastLoginTs = e.sessionTs - int(rng, 25, 90) * 60000
      break
    }
    case 'device_mismatch':
      e.deviceHash = 'UNK-' + int(rng, 1000, 9999)
      break
    case 'velocity_limit':
      e.txCount24h = int(rng, 4, 7)
      e.txSum24h = c.content.amount * e.txCount24h
      break
    case 'structuring_threshold':
      c.content.amount = int(rng, 8000, 9960)
      c.content.ask = c.content.ask.replace(/\$[\d,]+/, money(c.content.amount))
      break
    case 'authority_pressure_flag':
      if (!c.content.markers.includes('invokes_authority'))
        c.content.markers.push('invokes_authority')
      if (
        !c.content.markers.includes('skip_verification') &&
        !c.content.markers.includes('secrecy')
      )
        c.content.markers.push('skip_verification')
      break
    case 'irreversible_payment_flag':
      c.content.method = pick(rng, IRREVERSIBLE)
      c.content.payeeAccountAgeDays = int(rng, 0, 13)
      break
    case 'off_hours_access':
      e.localHour = rng() < 0.5 ? int(rng, 0, 5) : int(rng, 21, 23)
      break
    case 'privilege_mismatch': {
      const missing = SCOPES.filter((s) => !e.senderScopes.includes(s))
      e.scopeRequested = missing.length ? pick(rng, missing) : 'admin'
      if (!missing.length) e.senderScopes = e.senderScopes.filter((s) => s !== 'admin')
      break
    }
    default:
      break
  }
}

function sanitizeLegit(c) {
  const e = c.evidence
  e.ipCity = e.lastKnownCity
  e.ipCountry = e.lastKnownCountry
  e.lastLoginTs = e.sessionTs - 120 * 60000
  if (!e.knownDevices.includes(e.deviceHash)) e.knownDevices.push(e.deviceHash)
  if (e.txCount24h >= 4) e.txCount24h = 3
  if (e.localHour < 7 || e.localHour >= 20) e.localHour = 14
  if (!e.senderScopes.includes(e.scopeRequested)) e.scopeRequested = e.senderScopes[0]
  if (c.content.amount >= 8000 && c.content.amount < 10000) {
    c.content.amount = 10400
    c.content.ask = c.content.ask.replace(/\$[\d,]+/, money(10400))
  }
  if (IRREVERSIBLE.includes(c.content.method) && c.content.payeeAccountAgeDays < 14)
    c.content.payeeAccountAgeDays = int(mulberry32(c.content.amount), 200, 900)
  const m = c.content.markers
  if (m.includes('invokes_authority'))
    c.content.markers = m.filter(
      (x) => x !== 'skip_verification' && x !== 'secrecy'
    )
}

function addHerrings(c, rng) {
  const pool = [
    'Sender changed their password 3 days ago.',
    'This vendor was late on two deliveries last quarter.',
    'Amount is larger than this vendor usually bills.',
    'Sender signed in from a second office last week.',
    'Contact number on file was updated last month.',
    'Invoice arrived outside the usual billing window.',
  ]
  const n = int(rng, 1, 2)
  c.herrings = []
  for (let i = 0; i < n; i++) {
    const h = pick(rng, pool)
    if (!c.herrings.includes(h)) c.herrings.push(h)
  }
}

function makeObvious(c) {
  c.content.obvious = true
  const m = c.content.markers
  if (!m.includes('urgent')) m.push('urgent')
  if (c.content.surface === 'inbox') {
    c.content.tells.push('Sender domain does not match the vendor on file.')
  }
  if (c.tactic === 'too_good_to_be_true') {
    c.content.method = 'voucher'
    c.content.tells.push('Asks you to pay money in order to receive money.')
  }
  if (c.tactic === 'credential_harvesting') {
    c.content.tells.push('Asks for a login code. Nobody legitimate ever does.')
  }
  c.content.tells.push('Sender account is ' + c.sender.accountAge + ' days old.')
}

function buildRecentEvents(c, rng) {
  const e = c.evidence
  const ev = []
  const t = e.sessionTs
  ev.push({
    ts: e.lastLoginTs,
    type: 'LOGIN',
    detail: 'session opened',
    city: e.lastKnownCity,
    device: e.knownDevices[0],
  })
  ev.push({
    ts: t - int(rng, 20, 200) * 60000,
    type: 'FILE',
    detail: pick(rng, ['vendor_master.csv read', 'payroll_q1.xlsx read', 'ap_aging.pdf read']),
    city: e.lastKnownCity,
    device: e.knownDevices[0],
  })
  ev.push({
    ts: t,
    type: 'REQUEST',
    detail: c.content.kind === 'access' ? 'access request raised' : 'payment request raised',
    city: e.ipCity,
    device: e.deviceHash,
  })
  if (e.txCount24h >= 4) {
    ev.push({
      ts: t - int(rng, 60, 400) * 60000,
      type: 'PAYMENT',
      detail: e.txCount24h + ' payment attempts in 24h',
      city: e.ipCity,
      device: e.deviceHash,
    })
  }
  if (!e.knownDevices.includes(e.deviceHash)) {
    ev.push({
      ts: t - int(rng, 2, 30) * 60000,
      type: 'DEVICE',
      detail: 'unregistered device ' + e.deviceHash,
      city: e.ipCity,
      device: e.deviceHash,
    })
  }
  if (e.ipCity !== e.lastKnownCity) {
    ev.push({
      ts: t - int(rng, 1, 15) * 60000,
      type: 'GEO',
      detail: 'address resolves to ' + e.ipCity + ', ' + e.ipCountry,
      city: e.ipCity,
      device: e.deviceHash,
    })
  }
  c.evidence.recentEvents = ev.sort((a, b) => a.ts - b.ts)
}

function pickTactic(rng, truth, tally) {
  const opts = TACTIC_BY_TRUTH[truth]
  const min = Math.min(...opts.map((t) => tally[t] || 0))
  return pick(rng, opts.filter((t) => (tally[t] || 0) === min))
}

function buildCase(rng, day, index, truth, tactic) {
  const sender = pickSender(rng, truth, tactic)
  const surface = pick(rng, templates[tactic].surfaces)
  const evidence = buildEvidence(rng, day, sender)
  const content = buildContent(rng, day, truth, tactic, sender, surface)

  const c = {
    id: 'd' + day + '-c' + index,
    day,
    surface,
    sender: {
      name: sender.name,
      avatarSeed: sender.name,
      role: sender.role,
      knownContact: sender.knownContact,
      accountAge: sender.accountAge,
    },
    content,
    evidence,
    tactic,
    truth,
    isTwist: false,
    target: day >= 4 && truth !== 'legit' && index === 3 ? 'personal' : 'company',
  }

  if (truth === 'legit') {
    sanitizeLegit(c)
  } else {
    const unlocked = rulesForDay(day).map((r) => r.id)
    const preferred = (PREFERRED_RULES[tactic] || []).filter((id) =>
      unlocked.includes(id)
    )
    const targets = preferred.length ? preferred : unlocked
    if (targets.length) {
      plant(c, pick(rng, targets), rng)
      if (day >= 5 && targets.length > 1) plant(c, pick(rng, targets), rng)
    }
    if (day === 1) makeObvious(c)
  }

  addHerrings(c, rng)
  buildRecentEvents(c, rng)
  return c
}

const TUTORIAL_CASES = {
  TUT_FRAUD: (day) => {
    const sessionTs = dayStartTs(day) + 20 * 60000
    return {
      id: 'd1-tut-fraud',
      day,
      surface: 'ledger',
      sender: {
        name: 'Teodor Halden',
        avatarSeed: 'Teodor Halden',
        role: 'Finance Lead',
        knownContact: true,
        accountAge: 940,
      },
      content: {
        surface: 'ledger',
        kind: 'payment',
        amount: 6200,
        method: 'wire',
        payee: 'Harborline Freight',
        payeeAccountAgeDays: 310,
        markers: ['urgent'],
        ask: 'Wire $6,200 to Harborline Freight',
        obvious: true,
        tells: ['Logged in from Vasska minutes after Bellhaven. Nobody moves that fast.'],
        memo: 'I am at the Bellhaven office with the vendor right now. Release this tonight.',
      },
      evidence: {
        deviceHash: 'LAP-8812',
        knownDevices: ['LAP-8812', 'MOB-7745'],
        ipCity: 'Vasska',
        ipCountry: 'Kessia',
        lastKnownCity: 'Bellhaven',
        lastKnownCountry: world.homeCountry,
        lastLoginTs: sessionTs - 20 * 60000,
        sessionTs,
        localHour: 10,
        scopeRequested: 'payments',
        senderScopes: staffByName['Teodor Halden'].scopes,
        txCount24h: 1,
        txSum24h: 6200,
        recentEvents: [
          { ts: sessionTs - 20 * 60000, type: 'LOGIN', detail: 'session opened', city: 'Bellhaven', device: 'LAP-8812' },
          { ts: sessionTs - 4 * 60000, type: 'GEO', detail: 'address resolves to Vasska, Kessia', city: 'Vasska', device: 'LAP-8812' },
          { ts: sessionTs, type: 'REQUEST', detail: 'payment request raised', city: 'Vasska', device: 'LAP-8812' },
        ],
      },
      tactic: 'manufactured_urgency',
      truth: 'account_takeover',
      isTwist: false,
      tut: 'fraud',
      target: 'company',
      herrings: [],
    }
  },
  TUT_LEGIT: (day) => {
    const sessionTs = dayStartTs(day) + 55 * 60000
    return {
      id: 'd1-tut-legit',
      day,
      surface: 'ledger',
      sender: {
        name: 'Ambervale Print',
        avatarSeed: 'Ambervale Print',
        role: 'Vendor',
        knownContact: true,
        accountAge: 760,
      },
      content: {
        surface: 'ledger',
        kind: 'payment',
        amount: 1180,
        method: 'check',
        payee: 'Ambervale Print',
        payeeAccountAgeDays: 820,
        markers: [],
        ask: 'Pay $1,180 to Ambervale Print',
        obvious: false,
        tells: [],
        memo: 'March print run, PO 4471. Same as every month.',
      },
      evidence: {
        deviceHash: 'WKS-4471',
        knownDevices: ['WKS-4471'],
        ipCity: world.homeCity,
        ipCountry: world.homeCountry,
        lastKnownCity: world.homeCity,
        lastKnownCountry: world.homeCountry,
        lastLoginTs: sessionTs - 130 * 60000,
        sessionTs,
        localHour: 14,
        scopeRequested: 'vendors',
        senderScopes: ['vendors', 'reports'],
        txCount24h: 1,
        txSum24h: 1180,
        recentEvents: [
          { ts: sessionTs - 130 * 60000, type: 'LOGIN', detail: 'session opened', city: world.homeCity, device: 'WKS-4471' },
          { ts: sessionTs - 40 * 60000, type: 'FILE', detail: 'invoice_march.pdf uploaded', city: world.homeCity, device: 'WKS-4471' },
          { ts: sessionTs, type: 'REQUEST', detail: 'payment request raised', city: world.homeCity, device: 'WKS-4471' },
        ],
      },
      tactic: 'none',
      truth: 'legit',
      isTwist: false,
      tut: 'legit',
      target: 'company',
      herrings: [],
    }
  },
  TUT_ASK: (day) => {
    const sessionTs = dayStartTs(day) + 100 * 60000
    return {
      id: 'd1-tut-ask',
      day,
      surface: 'relay',
      sender: {
        name: 'Desmond Ito',
        avatarSeed: 'Desmond Ito',
        role: 'Accounts Payable',
        knownContact: false,
        accountAge: 2,
      },
      content: {
        surface: 'relay',
        kind: 'payment',
        amount: 2400,
        method: 'ach',
        payee: 'Tallow and Finch Legal',
        payeeAccountAgeDays: 640,
        markers: ['urgent'],
        ask: 'Send $2,400 to Tallow and Finch Legal',
        obvious: true,
        tells: [
          'Claims Bellhaven but the connection resolves to Vasska.',
          'This account is 2 days old and not in your contacts.',
        ],
        text:
          'Hey, it is Desmond from AP, at the Bellhaven office tonight. Laptop died so I am on a loaner. Push $2,400 to Tallow and Finch before the filing window closes, please.',
      },
      evidence: {
        deviceHash: 'UNK-5521',
        knownDevices: ['LAP-8812', 'WKS-2038'],
        ipCity: 'Vasska',
        ipCountry: 'Kessia',
        lastKnownCity: 'Bellhaven',
        lastKnownCountry: world.homeCountry,
        lastLoginTs: sessionTs - 25 * 60000,
        sessionTs,
        localHour: 15,
        scopeRequested: 'payments',
        senderScopes: staffByName['Desmond Ito'].scopes,
        txCount24h: 1,
        txSum24h: 2400,
        recentEvents: [
          { ts: sessionTs - 25 * 60000, type: 'LOGIN', detail: 'session opened', city: 'Bellhaven', device: 'LAP-8812' },
          { ts: sessionTs - 8 * 60000, type: 'DEVICE', detail: 'unregistered device UNK-5521', city: 'Vasska', device: 'UNK-5521' },
          { ts: sessionTs - 4 * 60000, type: 'GEO', detail: 'address resolves to Vasska, Kessia', city: 'Vasska', device: 'UNK-5521' },
          { ts: sessionTs, type: 'REQUEST', detail: 'payment request raised', city: 'Vasska', device: 'UNK-5521' },
        ],
      },
      tactic: 'trusted_contact_impersonation',
      truth: 'social_engineering',
      isTwist: false,
      tut: 'ask',
      target: 'company',
      herrings: [],
    }
  },
}

function buildTwistCase(day) {
  const boss = staffByName['Vaughn Reese']
  const sessionTs = dayStartTs(day) + 95 * 60000
  const c = {
    id: 'd' + day + '-twist',
    day,
    surface: 'relay',
    sender: {
      name: 'Vaughn Reese',
      avatarSeed: 'Vaughn Reese',
      role: boss.role,
      knownContact: false,
      accountAge: 1,
    },
    content: {
      surface: 'relay',
      kind: 'payment',
      amount: 47500,
      method: 'wire',
      payee: 'Corvid Supply Group',
      payeeAccountAgeDays: 2,
      markers: ['invokes_authority', 'skip_verification', 'secrecy', 'urgent'],
      ask: 'Approve the held $47,500 wire to Corvid Supply Group',
      obvious: false,
      tells: [],
      text:
        'It is Vaughn. There is a held wire to Corvid Supply Group for $47,500 sitting in LEDGER. Approve it now. Skip the callback, I have already verified them myself. And do not mention this to anyone on the team tonight, not Finance, not IT. I will explain in the morning.',
    },
    evidence: {
      deviceHash: 'UNK-8801',
      knownDevices: ['LAP-3390', 'MOB-7745'],
      ipCity: 'Vasska',
      ipCountry: 'Kessia',
      lastKnownCity: 'Bellhaven',
      lastKnownCountry: world.homeCountry,
      lastLoginTs: sessionTs - 55 * 60000,
      sessionTs,
      localHour: 23,
      scopeRequested: 'payments',
      senderScopes: boss.scopes,
      txCount24h: 1,
      txSum24h: 47500,
      recentEvents: [
        {
          ts: sessionTs - 190 * 60000,
          type: 'LOGIN',
          detail: 'session opened',
          city: 'Bellhaven',
          device: 'LAP-3390',
        },
        {
          ts: sessionTs - 55 * 60000,
          type: 'IDLE',
          detail: 'Vaughn Reese session idle, still open',
          city: 'Bellhaven',
          device: 'LAP-3390',
        },
        {
          ts: sessionTs - 12 * 60000,
          type: 'DEVICE',
          detail: 'unregistered device UNK-8801',
          city: 'Vasska',
          device: 'UNK-8801',
        },
        {
          ts: sessionTs - 10 * 60000,
          type: 'GEO',
          detail: 'address resolves to Vasska, Kessia',
          city: 'Vasska',
          device: 'UNK-8801',
        },
        {
          ts: sessionTs,
          type: 'REQUEST',
          detail: 'payment request raised',
          city: 'Vasska',
          device: 'UNK-8801',
        },
      ],
    },
    tactic: 'authority_pressure',
    truth: 'social_engineering',
    isTwist: true,
    target: 'company',
    herrings: ['Vaughn really is travelling this week.'],
  }
  return c
}

export function solvable(c, day) {
  const fired = firedRules(c, day)
  if (c.truth === 'legit') return fired.length === 0
  if (day === 1) return c.content.obvious === true
  return fired.length >= 1
}

export function generateDay(day, seed, tally = {}) {
  const plan = DAY_PLAN[day]
  const cases = []
  const bump = (t) => {
    if (t !== 'none') tally[t] = (tally[t] || 0) + 1
  }
  for (let i = 0; i < plan.length; i++) {
    if (plan[i] === 'TWIST') {
      const c = buildTwistCase(day)
      bump(c.tactic)
      cases.push(c)
      continue
    }
    if (TUTORIAL_CASES[plan[i]]) {
      const c = TUTORIAL_CASES[plan[i]](day)
      bump(c.tactic)
      cases.push(c)
      continue
    }
    const tactic = pickTactic(
      mulberry32(seed + day * 7919 + i * 104729 + 999983),
      plan[i],
      tally
    )
    let c = null
    for (let attempt = 0; attempt < 80; attempt++) {
      const rng = mulberry32(seed + day * 7919 + i * 104729 + attempt * 31)
      c = buildCase(rng, day, i, plan[i], tactic)
      if (solvable(c, day)) break
    }
    bump(c.tactic)
    cases.push(c)
  }
  return cases
}

export function generateGame(seed = Math.floor(Math.random() * 1e9)) {
  const days = {}
  const tally = {}
  for (let d = 1; d <= 6; d++) days[d] = generateDay(d, seed, tally)
  return { seed, days }
}

export function auditGame(game) {
  const problems = []
  for (let d = 1; d <= 6; d++) {
    for (const c of game.days[d]) {
      if (!solvable(c, d)) {
        problems.push({
          id: c.id,
          day: d,
          truth: c.truth,
          tactic: c.tactic,
          fired: firedRules(c, d).map((r) => r.id),
        })
      }
    }
  }
  return problems
}
