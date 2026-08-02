import world from '../data/world.json' with { type: 'json' }

const KM_PER_UNIT = 120
const CRUISE_KMH = 800
const GATE_MINUTES = 90

const cityByName = Object.fromEntries(world.cities.map((c) => [c.name, c]))

export function travelMinutes(fromCity, toCity) {
  const a = cityByName[fromCity]
  const b = cityByName[toCity]
  if (!a || !b) return 0
  const km = Math.hypot(a.x - b.x, a.y - b.y) * KM_PER_UNIT
  return (km / CRUISE_KMH) * 60 + GATE_MINUTES
}

export const IRREVERSIBLE = ['wire', 'crypto', 'voucher']

export const RULES = [
  {
    id: 'impossible_travel',
    label: 'IMPOSSIBLE TRAVEL',
    description:
      'Session city differs from last known city with no time to get there.',
    unlockedOnDay: 2,
    check: (c) => {
      const e = c.evidence
      if (e.ipCity === e.lastKnownCity) return false
      const gapMin = (e.sessionTs - e.lastLoginTs) / 60000
      return gapMin < travelMinutes(e.lastKnownCity, e.ipCity)
    },
  },
  {
    id: 'device_mismatch',
    label: 'DEVICE MISMATCH',
    description: 'Request came from a device SENTRY has never seen for them.',
    unlockedOnDay: 2,
    check: (c) => !c.evidence.knownDevices.includes(c.evidence.deviceHash),
  },
  {
    id: 'velocity_limit',
    label: 'VELOCITY LIMIT',
    description: 'Four or more payment attempts from one sender in 24 hours.',
    unlockedOnDay: 3,
    check: (c) => c.evidence.txCount24h >= 4,
  },
  {
    id: 'structuring_threshold',
    label: 'STRUCTURING',
    description:
      'Amount parked just under the $10,000 reporting line, from $8,000 up.',
    unlockedOnDay: 3,
    check: (c) => c.content.amount >= 8000 && c.content.amount < 10000,
  },
  {
    id: 'authority_pressure_flag',
    label: 'AUTHORITY PRESSURE',
    description:
      'Pulls rank and tells you to skip the check or keep it quiet.',
    unlockedOnDay: 4,
    check: (c) => {
      const m = c.content.markers
      return (
        m.includes('invokes_authority') &&
        (m.includes('skip_verification') || m.includes('secrecy'))
      )
    },
  },
  {
    id: 'irreversible_payment_flag',
    label: 'IRREVERSIBLE PAYMENT',
    description:
      'Unrecoverable payment type going to a payee account under 14 days old.',
    unlockedOnDay: 4,
    check: (c) =>
      IRREVERSIBLE.includes(c.content.method) &&
      c.content.payeeAccountAgeDays < 14,
  },
  {
    id: 'off_hours_access',
    label: 'OFF HOURS ACCESS',
    description: 'Sender session outside 07:00 to 20:00 their local time.',
    unlockedOnDay: 5,
    check: (c) => c.evidence.localHour < 7 || c.evidence.localHour >= 20,
  },
  {
    id: 'privilege_mismatch',
    label: 'PRIVILEGE MISMATCH',
    description: 'Asking for access their role does not carry.',
    unlockedOnDay: 5,
    check: (c) => !c.evidence.senderScopes.includes(c.evidence.scopeRequested),
  },
]

export function rulesForDay(day) {
  return RULES.filter((r) => r.unlockedOnDay <= day)
}

export function firedRules(c, day) {
  return rulesForDay(day).filter((r) => {
    try {
      return r.check(c)
    } catch {
      return false
    }
  })
}

export function allFiredRules(c) {
  return RULES.filter((r) => {
    try {
      return r.check(c)
    } catch {
      return false
    }
  })
}
