import { useState } from 'react'
import { travelMinutes } from '../lib/rules.js'

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')
const hhmm = (ts) => {
  const d = new Date(ts)
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0')
}

function Row({ k, v, warn, spot }) {
  return (
    <div data-spot={spot} style={{ display: 'flex', gap: 3 }}>
      <span style={{ color: 'var(--color-c06)', flex: '0 0 50px' }}>{k}</span>
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
    <div style={{ color: 'var(--color-c11)', marginTop: 3, marginBottom: 1 }}>{children}</div>
  )
}

export function Inbox({ c, archive }) {
  const [open, setOpen] = useState(0)
  const mail = c.surface === 'inbox' ? c : null

  if (!mail) {
    return (
      <div>
        <div style={{ color: 'var(--color-c06)' }}>No new mail.</div>
        <Head>ARCHIVE</Head>
        {archive.length === 0 && <div style={{ color: 'var(--color-c02)' }}>empty</div>}
        {archive.map((a) => (
          <div key={a.id} style={{ color: 'var(--color-c06)' }}>
            {a.subject}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div
        style={{ cursor: 'pointer', color: 'var(--color-c09)' }}
        onClick={() => setOpen(open ? 0 : 1)}
      >
        {open ? '[-] ' : '[+] '}
        {mail.content.subject}
      </div>
      <Row k="FROM" v={mail.content.fromAddress} />
      <Row k="NAME" v={mail.sender.name} />
      {open === 1 && (
        <div style={{ marginTop: 3, color: 'var(--color-c08)' }}>{mail.content.body}</div>
      )}
      {mail.content.tells.map((t, i) => (
        <div key={i} style={{ color: 'var(--color-c12)', marginTop: 2 }}>
          ! {t}
        </div>
      ))}
      <Head>ARCHIVE</Head>
      {archive.map((a) => (
        <div key={a.id} style={{ color: 'var(--color-c06)' }}>
          {a.subject}
        </div>
      ))}
    </div>
  )
}

export function Ledger({ c, balance, personal, history, day, live }) {
  const pending = c.content.kind === 'payment'
  return (
    <div>
      <Row k="COMPANY" v={money(balance)} />
      {day >= 4 && <Row k="PERSONAL" v={money(personal)} warn />}

      <Head>PENDING</Head>
      {pending ? (
        <div className={live ? 'pulse-outline' : ''} style={{ padding: 1 }}>
          <Row k="PAYEE" v={c.content.payee} />
          <Row k="AMOUNT" v={money(c.content.amount)} />
          <Row k="METHOD" v={c.content.method.toUpperCase()} />
          <Row k="ACCT AGE" v={c.content.payeeAccountAgeDays + ' days'} />
          <Row k="TARGET" v={c.target === 'personal' ? 'YOUR ACCOUNT' : 'Meridian ops'} />
          {c.content.memo && <Row k="MEMO" v={c.content.memo} spot="memo" />}
        </div>
      ) : (
        <div style={{ color: 'var(--color-c06)' }}>
          No money movement. This one asks for access.
        </div>
      )}

      <Head>HISTORY</Head>
      {history.length === 0 && <div style={{ color: 'var(--color-c02)' }}>no entries</div>}
      {history
        .slice()
        .reverse()
        .map((h) => (
          <div key={h.id} style={{ display: 'flex', gap: 3 }}>
            <span style={{ color: h.decision === 'approve' ? 'var(--color-c10)' : 'var(--color-c14)' }}>
              {h.decision === 'approve' ? 'APR' : 'HLD'}
            </span>
            <span style={{ flex: 1, color: 'var(--color-c06)' }}>{h.payee}</span>
            <span style={{ color: 'var(--color-c07)' }}>{money(h.amount)}</span>
          </div>
        ))}
    </div>
  )
}

export function Sentry({ c }) {
  const e = c.evidence
  const geoOdd = e.ipCity !== e.lastKnownCity
  const devOdd = !e.knownDevices.includes(e.deviceHash)
  const gapMin = Math.round((e.sessionTs - e.lastLoginTs) / 60000)
  const needMin = Math.round(travelMinutes(e.lastKnownCity, e.ipCity))

  return (
    <div>
      <Head>SUBJECT</Head>
      <Row k="NAME" v={c.sender.name} />
      <Row k="ROLE" v={c.sender.role} />
      <Row k="ACCT AGE" v={c.sender.accountAge + ' days'} warn={c.sender.accountAge < 30} />
      <Row k="CONTACT" v={c.sender.knownContact ? 'in directory' : 'unrecognised'} warn={!c.sender.knownContact} />

      <Head>SESSION</Head>
      <Row k="DEVICE" v={e.deviceHash} warn={devOdd} spot="sentry-dev" />
      <Row k="KNOWN DEV" v={e.knownDevices.join(', ')} />
      <Row k="LOCATION" v={e.ipCity + ', ' + e.ipCountry} warn={geoOdd} spot="sentry-loc" />
      <Row k="LAST SEEN" v={e.lastKnownCity + ' ' + hhmm(e.lastLoginTs)} />
      <Row k="ELAPSED" v={gapMin + ' min'} warn={geoOdd && gapMin < needMin} />
      {geoOdd && <Row k="TRAVEL" v={'needs ' + needMin + ' min'} warn={gapMin < needMin} />}
      <Row k="LOCAL HR" v={String(e.localHour).padStart(2, '0') + ':00'} warn={e.localHour < 7 || e.localHour >= 20} />

      <Head>ACCESS</Head>
      <Row k="ASKING" v={e.scopeRequested} warn={!e.senderScopes.includes(e.scopeRequested)} />
      <Row k="HOLDS" v={e.senderScopes.join(', ')} />
      <Row k="24H TX" v={e.txCount24h + ' attempts'} warn={e.txCount24h >= 4} />

      <Head>EVENTS</Head>
      {e.recentEvents.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 3 }}>
          <span style={{ color: 'var(--color-c06)', flex: '0 0 26px' }}>{hhmm(ev.ts)}</span>
          <span style={{ color: 'var(--color-c11)', flex: '0 0 40px' }}>{ev.type}</span>
          <span style={{ flex: 1, color: 'var(--color-c08)' }}>{ev.detail}</span>
        </div>
      ))}

      {c.herrings && c.herrings.length > 0 && (
        <>
          <Head>NOTES</Head>
          {c.herrings.map((h, i) => (
            <div key={i} style={{ color: 'var(--color-c06)' }}>
              - {h}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
