import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { travelMinutes } from '../lib/rules.js'

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')
const hhmm = (ts) => {
  const d = new Date(ts)
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0')
}

function Row({ k, v, warn, spot }) {
  return (
    <div data-spot={spot} style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
      <span style={{ color: 'var(--color-c06)', flex: '0 0 48px' }}>{k}</span>
      <span
        style={{
          color: warn ? 'var(--color-c12)' : 'var(--color-c08)',
          flex: 1,
          minWidth: 0,
          overflowWrap: 'anywhere',
        }}
      >
        {v}
      </span>
    </div>
  )
}

function Head({ children }) {
  return (
    <div style={{ color: 'var(--accent)', marginTop: 4, marginBottom: 2 }}>{children}</div>
  )
}

function More({ on, set, label }) {
  return (
    <button className="btn" style={{ marginTop: 2 }} onClick={() => set(!on)}>
      {on ? 'LESS' : label}
    </button>
  )
}

// Evidence the player can read off the request itself. Purely presentational:
// nothing here is recorded, so an impersonator lies the same either way.
function ProfileChip({ s }) {
  if (!s.knownContact || s.role === 'Vendor' || s.role === 'Unknown') return null
  return (
    <div
      data-spot="profile-chip"
      style={{
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        padding: 2,
        marginBottom: 2,
        background: 'var(--color-c01)',
        borderLeft: '2px solid var(--accent)',
      }}
    >
      <Avatar seed={s.avatarSeed} size={14} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--color-c09)' }}>{s.name}</div>
        <div style={{ color: 'var(--color-c06)' }}>{s.role}</div>
      </div>
      <div style={{ color: s.accountAge < 30 ? 'var(--color-c12)' : 'var(--color-c07)' }}>
        {s.accountAge}d
      </div>
    </div>
  )
}

export function Inbox({ c, archive }) {
  const [open, setOpen] = useState(false)
  const mail = c.surface === 'inbox' ? c : null

  return (
    <div>
      {mail ? (
        <div
          onClick={() => setOpen(!open)}
          style={{ cursor: 'pointer', borderLeft: '2px solid var(--accent)', paddingLeft: 2 }}
        >
          <ProfileChip s={mail.sender} />
          <div style={{ color: 'var(--color-c09)' }}>{mail.sender.name}</div>
          <div style={{ color: 'var(--color-c08)', marginBottom: 2 }}>
            {open ? '- ' : '+ '}
            {mail.content.subject}
          </div>
          <Row k="FROM" v={mail.content.fromAddress} />
          {open && (
            <div style={{ color: 'var(--color-c08)', marginTop: 2, marginBottom: 2 }}>
              {mail.content.body}
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: 'var(--color-c06)' }}>No new mail.</div>
      )}

      {mail &&
        mail.content.tells.map((t, i) => (
          <div key={i} style={{ color: 'var(--color-c12)', marginTop: 2 }}>
            ! {t}
          </div>
        ))}

      <Head>ARCHIVE</Head>
      {archive.length === 0 && <div style={{ color: 'var(--color-c02)' }}>empty</div>}
      {archive
        .slice()
        .reverse()
        .map((a) => (
          <div key={a.id} style={{ color: 'var(--color-c06)', marginBottom: 2 }}>
            {a.subject}
          </div>
        ))}
    </div>
  )
}

export function Ledger({ c, balance, personal, history, day, live }) {
  const [more, setMore] = useState(false)
  const pending = c.content.kind === 'payment'
  const recent = history.slice().reverse()
  const shown = more ? recent : recent.slice(0, 2)

  return (
    <div>
      <Row k="COMPANY" v={money(balance)} />
      {day >= 4 && <Row k="PERSONAL" v={money(personal)} warn />}

      <Head>PENDING</Head>
      {pending ? (
        <div className={live ? 'pulse-outline' : ''} style={{ padding: 2 }}>
          <ProfileChip s={c.sender} />
          <div className="t14" style={{ color: 'var(--color-c12)' }}>
            {money(c.content.amount)}
          </div>
          <div style={{ color: 'var(--color-c09)', marginBottom: 2 }}>{c.content.payee}</div>
          <Row k="METHOD" v={c.content.method.toUpperCase()} />
          <Row k="ACCT AGE" v={c.content.payeeAccountAgeDays + ' days'} />
          <Row k="TARGET" v={c.target === 'personal' ? 'YOUR ACCOUNT' : 'Meridian ops'} />
          {c.content.memo && <Row k="MEMO" v={c.content.memo} spot="memo" />}
        </div>
      ) : (
        <div style={{ color: 'var(--color-c06)' }}>No money movement. This one asks for access.</div>
      )}

      <Head>HISTORY</Head>
      {recent.length === 0 && <div style={{ color: 'var(--color-c02)' }}>no entries</div>}
      {shown.map((h) => (
        <div key={h.id} style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          <span style={{ color: h.decision === 'approve' ? 'var(--color-c10)' : 'var(--color-c14)' }}>
            {h.decision === 'approve' ? 'APR' : 'HLD'}
          </span>
          <span style={{ flex: 1, minWidth: 0, color: 'var(--color-c06)' }}>{h.payee}</span>
          <span style={{ color: 'var(--color-c07)' }}>{money(h.amount)}</span>
        </div>
      ))}
      {recent.length > 2 && <More on={more} set={setMore} label={'MORE (' + (recent.length - 2) + ')'} />}
    </div>
  )
}

const EVENTS_SHOWN = 5

export function Sentry({ c }) {
  const [more, setMore] = useState(false)
  const e = c.evidence
  const geoOdd = e.ipCity !== e.lastKnownCity
  const devOdd = !e.knownDevices.includes(e.deviceHash)
  const gapMin = Math.round((e.sessionTs - e.lastLoginTs) / 60000)
  const needMin = Math.round(travelMinutes(e.lastKnownCity, e.ipCity))
  const scopeOdd = !e.senderScopes.includes(e.scopeRequested)
  const hourOdd = e.localHour < 7 || e.localHour >= 20

  // core rows always show; anything flagged shows itself so a tell is never buried
  const sections = [
    {
      head: 'SUBJECT',
      rows: [
        { k: 'NAME', v: c.sender.name, core: true },
        { k: 'ROLE', v: c.sender.role },
        { k: 'ACCT AGE', v: c.sender.accountAge + ' days', warn: c.sender.accountAge < 30 },
        {
          k: 'CONTACT',
          v: c.sender.knownContact ? 'in directory' : 'unrecognised',
          warn: !c.sender.knownContact,
          core: true,
        },
      ],
    },
    {
      head: 'SESSION',
      rows: [
        { k: 'DEVICE', v: e.deviceHash, warn: devOdd, spot: 'sentry-dev', core: true },
        { k: 'KNOWN DEV', v: e.knownDevices.join(', ') },
        {
          k: 'LOCATION',
          v: e.ipCity + ', ' + e.ipCountry,
          warn: geoOdd,
          spot: 'sentry-loc',
          core: true,
        },
        { k: 'LAST SEEN', v: e.lastKnownCity + ' ' + hhmm(e.lastLoginTs), core: true },
        { k: 'ELAPSED', v: gapMin + ' min', warn: geoOdd && gapMin < needMin },
        ...(geoOdd ? [{ k: 'TRAVEL', v: 'needs ' + needMin + ' min', warn: gapMin < needMin, core: true }] : []),
        { k: 'LOCAL HR', v: String(e.localHour).padStart(2, '0') + ':00', warn: hourOdd },
      ],
    },
    {
      head: 'ACCESS',
      rows: [
        { k: 'ASKING', v: e.scopeRequested, warn: scopeOdd, core: c.content.kind === 'access' },
        { k: 'HOLDS', v: e.senderScopes.join(', ') },
        { k: '24H TX', v: e.txCount24h + ' attempts', warn: e.txCount24h >= 4 },
      ],
    },
  ]

  const events = e.recentEvents.slice().sort((a, b) => b.ts - a.ts)
  const shownEvents = more ? events : events.slice(0, EVENTS_SHOWN)
  const hiddenRows = sections.reduce((n, s) => n + s.rows.filter((r) => !r.core && !r.warn).length, 0)
  const hidden = hiddenRows + Math.max(0, events.length - EVENTS_SHOWN)

  return (
    <div>
      {sections.map((s) => {
        const rows = more ? s.rows : s.rows.filter((r) => r.core || r.warn)
        if (rows.length === 0) return null
        return (
          <div key={s.head}>
            <Head>{s.head}</Head>
            {rows.map((r) => (
              <Row key={r.k} k={r.k} v={r.v} warn={r.warn} spot={r.spot} />
            ))}
          </div>
        )
      })}

      <Head>EVENTS</Head>
      {shownEvents.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          <span style={{ color: 'var(--color-c06)', flex: '0 0 26px' }}>{hhmm(ev.ts)}</span>
          <span style={{ color: 'var(--accent)', flex: '0 0 40px' }}>{ev.type}</span>
          <span style={{ flex: 1, minWidth: 0, color: 'var(--color-c08)' }}>{ev.detail}</span>
        </div>
      ))}

      {more && c.herrings && c.herrings.length > 0 && (
        <>
          <Head>NOTES</Head>
          {c.herrings.map((h, i) => (
            <div key={i} style={{ color: 'var(--color-c06)', marginBottom: 2 }}>
              - {h}
            </div>
          ))}
        </>
      )}

      {(hidden > 0 || more) && <More on={more} set={setMore} label={'MORE (' + hidden + ')'} />}
    </div>
  )
}
