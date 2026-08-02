import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { PANEL } from '../lib/scene.js'

const hhmm = (ts) => {
  const d = new Date(ts)
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0')
}

export const SUGGESTED = [
  'What city are you in right now?',
  'What device are you messaging from?',
  'Can I call you back on the number in our vendor file?',
  'Who are you and what is your role here?',
  'Why does this have to happen tonight?',
  'Read me back the account details on this request.',
  'Can this wait until my manager is in tomorrow?',
  'What happens if I hold this?',
]

const ROTATE = SUGGESTED.slice(1)

// the city question always leads; the rest rotate so the buttons never cover
// every angle and typing your own stays worth doing
export function questionsFor(caseId) {
  let h = 0
  for (let i = 0; i < caseId.length; i++) h = (h * 31 + caseId.charCodeAt(i)) >>> 0
  const start = h % ROTATE.length
  const rest = []
  for (let i = 0; i < 4; i++) rest.push(ROTATE[(start + i) % ROTATE.length])
  return [SUGGESTED[0], ...rest]
}

export const unreadOf = (th) =>
  th.msgs.reduce((n, m) => n + (m.from === 'them' && !m.read ? 1 : 0), 0)

function sortThreads(threads) {
  return Object.entries(threads).sort(([, a], [, b]) => {
    const d = unreadOf(b) - unreadOf(a)
    return d !== 0 ? d : b.lastTs - a.lastTs
  })
}

function ListRow({ th, active, onOpen }) {
  const last = th.msgs[th.msgs.length - 1]
  const unread = unreadOf(th)
  return (
    <div
      data-spot={active ? 'thread-active' : undefined}
      onClick={onOpen}
      style={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        padding: 2,
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-c01)',
        background: unread > 0 ? 'var(--color-c01)' : 'transparent',
      }}
    >
      <Avatar seed={th.sender.avatarSeed} size={14} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ color: 'var(--color-c09)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {th.sender.name}
          </span>
          <span style={{ color: 'var(--color-c06)' }}>{hhmm(th.lastTs)}</span>
        </div>
        <div style={{ color: th.sender.knownContact ? 'var(--color-c06)' : 'var(--color-c14)' }}>
          {th.sender.knownContact ? 'IN CONTACTS' : 'UNKNOWN'}
        </div>
        <div
          style={{
            color: 'var(--color-c07)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {last ? (last.from === 'me' ? 'you: ' : '') + last.text : ''}
        </div>
      </div>
      {unread > 0 && (
        <span
          className="pulse-chip"
          style={{ background: 'var(--color-c12)', color: 'var(--color-c00)', padding: '0 2px' }}
        >
          {unread}
        </span>
      )}
    </div>
  )
}

function Field({ k, v, warn }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      <span style={{ color: 'var(--color-c06)', width: 62, flex: '0 0 auto' }}>{k}</span>
      <span style={{ color: warn ? 'var(--color-c14)' : 'var(--color-c08)', flex: 1 }}>{v}</span>
    </div>
  )
}

function ContactCard({ s }) {
  const days = s.accountAge
  return (
    <div
      data-spot="contact-card"
      style={{
        flex: '0 0 auto',
        padding: 3,
        background: 'var(--color-c01)',
        borderBottom: '1px solid var(--color-c02)',
      }}
    >
      <div style={{ color: 'var(--color-c11)', marginBottom: 2 }}>DIRECTORY CARD</div>
      <Field k="NAME" v={s.name} />
      <Field k="ROLE" v={s.role} />
      <Field
        k="STATUS"
        v={s.knownContact ? 'IN CONTACTS' : 'NOT IN CONTACTS'}
        warn={!s.knownContact}
      />
      <Field k="ACCOUNT" v={days + (days === 1 ? ' day old' : ' days old')} warn={days < 14} />
      {s.knownContact ? (
        <>
          <Field k="USUAL CITY" v={s.homeCity || 'not recorded'} />
          <Field k="USUAL KIT" v={s.homeDevice || 'not recorded'} />
          {s.homeCity && (
            <div style={{ color: 'var(--color-c06)', marginTop: 2 }}>
              Compare this against what SENTRY logged for tonight.
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--color-c14)', marginTop: 2 }}>
          Nothing else on file. Meridian has no city and no device for this account. An empty card
          is the signal.
        </div>
      )}
    </div>
  )
}

function Thread({ th, isActive, code, busy, onSend, suggest, questions, hlFirst, onBack }) {
  const [text, setText] = useState('')
  const [card, setCard] = useState(false)
  const endRef = useRef(null)
  const lastThem = th.msgs.map((m) => m.from).lastIndexOf('them')
  const unasked = questions.filter((q) => !th.msgs.some((m) => m.from === 'me' && m.text === q))

  useEffect(() => {
    const box = endRef.current && endRef.current.closest('.phone-body')
    if (box) box.scrollTop = box.scrollHeight
  }, [th.msgs.length, busy, suggest, unasked.length])

  function send() {
    const t = text.trim()
    if (!t || busy) return
    setText('')
    onSend(t)
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          padding: 2,
          flex: '0 0 auto',
          borderBottom: '1px solid var(--color-c02)',
          background: 'var(--color-c00)',
        }}
      >
        <button className="btn" data-spot="phone-back" onClick={onBack}>
          {'<'}
        </button>
        <div
          data-spot="profile"
          onClick={() => setCard((v) => !v)}
          style={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <Avatar seed={th.sender.avatarSeed} size={14} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--color-c09)' }}>{th.sender.name}</div>
            <div style={{ color: th.sender.knownContact ? 'var(--color-c06)' : 'var(--color-c14)' }}>
              {th.sender.role} - {th.sender.knownContact ? 'IN CONTACTS' : 'UNKNOWN'}
            </div>
          </div>
          <span style={{ color: 'var(--color-c11)', flex: '0 0 auto' }}>
            {card ? 'HIDE' : 'CARD'}
          </span>
        </div>
      </div>

      {card && <ContactCard s={th.sender} />}

      <div className="phone-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 2 }}>
        {th.msgs.map((m, i) => (
          <div
            key={i}
            data-spot={isActive && i === lastThem ? 'reply-last' : undefined}
            style={{
              marginBottom: 2,
              marginLeft: m.from === 'me' ? 14 : 0,
              marginRight: m.from === 'me' ? 0 : 14,
              padding: 2,
              background: m.from === 'me' ? 'var(--color-c05)' : 'var(--color-c01)',
              color: m.from === 'me' ? 'var(--color-c09)' : 'var(--color-c08)',
              overflowWrap: 'anywhere',
            }}
          >
            {m.text}
            <div style={{ color: m.from === 'me' ? 'var(--color-c07)' : 'var(--color-c06)' }}>{hhmm(m.ts)}</div>
          </div>
        ))}
        {busy && isActive && <div style={{ color: 'var(--color-c06)' }}>...</div>}
        <div ref={endRef} />
      </div>

      {isActive || code ? (
        <div style={{ flex: '0 0 auto', padding: 2, borderTop: '1px solid var(--color-c02)' }}>
          {code && (
            <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
              <button className="btn btn-no" style={{ flex: 1 }} onClick={() => onSend(code.send)}>
                {code.sendLabel}
              </button>
              <button className="btn btn-ok" style={{ flex: 1 }} onClick={() => onSend(code.refuse)}>
                {code.refuseLabel}
              </button>
            </div>
          )}
          {!code &&
            suggest &&
            unasked.map((q) => (
              <button
                key={q}
                className={'btn' + (hlFirst && q === SUGGESTED[0] ? ' pulse-outline' : '')}
                data-spot={q === SUGGESTED[0] ? 'suggest-0' : undefined}
                disabled={busy}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: 1,
                  whiteSpace: 'normal',
                }}
                onClick={() => onSend(q)}
              >
                {'> ' + q}
              </button>
            ))}
          <div style={{ display: 'flex', gap: 2 }}>
            <input
              style={{ flex: 1, minWidth: 0 }}
              value={text}
              maxLength={140}
              placeholder="message"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn" onClick={send} disabled={busy}>
              SEND
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: '0 0 auto', padding: 2, color: 'var(--color-c06)', borderTop: '1px solid var(--color-c02)' }}>
          sender offline - thread kept for the night
        </div>
      )}
    </>
  )
}

export default function Phone({ threads, view, setView, activeName, codeName, code, busy, onSend, suggest, questions, hlFirst, onClose, dim, aiOn }) {
  const th = view.mode === 'thread' ? threads[view.name] : null
  return (
    <div
      id="phone-panel"
      style={{
        position: 'absolute',
        left: PANEL.x,
        top: PANEL.y,
        width: PANEL.w,
        height: PANEL.h,
        background: 'var(--color-c00)',
        border: '2px solid var(--color-c02)',
        boxShadow: '3px 3px 0 var(--color-c00)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 600,
        filter: dim ? 'brightness(0.4)' : undefined,
        pointerEvents: dim ? 'none' : undefined,
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          padding: '1px 2px',
          background: 'var(--color-c01)',
          borderBottom: '1px solid var(--color-c02)',
        }}
      >
        <span style={{ color: 'var(--color-c11)', flex: 1 }}>RELAY</span>
        <span style={{ color: aiOn ? 'var(--color-c10)' : 'var(--color-c02)', marginRight: 3 }}>
          {aiOn ? 'AI' : 'OFF'}
        </span>
        <span style={{ width: 20, height: 2, background: 'var(--color-c02)' }} />
      </div>

      {th ? (
        <Thread
          th={th}
          isActive={view.name === activeName}
          code={codeName && view.name === codeName ? code : null}
          busy={busy}
          onSend={(t) => onSend(t, view.name)}
          suggest={suggest}
          questions={questions}
          hlFirst={hlFirst}
          onBack={() => setView({ mode: 'list' })}
        />
      ) : (
        <div className="phone-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {sortThreads(threads).map(([k, t]) => (
            <ListRow
              key={k}
              th={t}
              active={k === activeName}
              onOpen={() => setView({ mode: 'thread', name: k })}
            />
          ))}
          {Object.keys(threads).length === 0 && (
            <div style={{ color: 'var(--color-c06)', padding: 3 }}>no messages tonight</div>
          )}
        </div>
      )}

      <button className="btn" data-spot="phone-close" style={{ flex: '0 0 auto' }} onClick={onClose}>
        PUT DOWN
      </button>
    </div>
  )
}
