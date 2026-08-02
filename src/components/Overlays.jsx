import { useState } from 'react'
import debriefs from '../data/debriefs.json' with { type: 'json' }
import briefs from '../data/briefs.json' with { type: 'json' }
import { RULES, rulesForDay } from '../lib/rules.js'
import { getKey, setKey } from '../lib/ai.js'

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

function Modal({ title, children, w = 320 }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 800,
        background: 'rgba(46,34,47,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: w,
          maxHeight: 340,
          overflowY: 'auto',
          background: 'var(--color-c01)',
          border: '1px solid var(--color-c07)',
          padding: 4,
        }}
      >
        <div style={{ color: 'var(--color-c12)', marginBottom: 3 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

export function Brief({ day, onStart }) {
  const b = briefs[String(day)]
  const newRules = RULES.filter((r) => r.unlockedOnDay === day)
  return (
    <Modal title={'DAY ' + day + ' - ' + b.title}>
      {b.lines.map((l, i) => (
        <div key={i} style={{ color: 'var(--color-c08)', marginBottom: 3 }}>
          {l}
        </div>
      ))}
      {newRules.length > 0 && (
        <>
          <div style={{ color: 'var(--color-c11)', marginTop: 3 }}>NEW RULES</div>
          {newRules.map((r) => (
            <div key={r.id} style={{ color: 'var(--color-c07)' }}>
              - {r.label}: {r.description}
            </div>
          ))}
        </>
      )}
      <button className="btn btn-ok" style={{ marginTop: 4 }} onClick={onStart}>
        {day === 1 ? 'CLOCK IN' : 'START SHIFT'}
      </button>
    </Modal>
  )
}

export function Result({ result, onNext }) {
  const card = result.correct
    ? null
    : result.codeAsk
      ? debriefs.code_readback
      : debriefs[result.tactic] || debriefs.none

  return (
    <Modal title={result.expired ? 'TIME RAN OUT' : result.correct ? 'GOOD CALL' : 'THAT ONE COST YOU'}>
      <div style={{ color: result.correct ? 'var(--color-c10)' : 'var(--color-c14)', marginBottom: 3 }}>
        {result.expired
          ? 'It sat on your desk until it expired. Expired requests are held.'
          : 'You ' + (result.decision === 'approve' ? 'APPROVED' : 'HELD') + ' it.'}{' '}
        It was {result.truth === 'legit' ? 'legitimate' : result.truth.replace(/_/g, ' ')}.
      </div>

      {result.loss > 0 && (
        <div style={{ color: 'var(--color-c14)' }}>
          {result.target === 'personal' ? 'Your account' : 'Meridian'} lost {money(result.loss)}.
        </div>
      )}
      {result.dataLost && <div style={{ color: 'var(--color-c14)' }}>Credentials handed over. Access revoked and reset.</div>}
      {result.complaint && (
        <div style={{ color: 'var(--color-c15)' }}>Complaint filed. Real work sat blocked.</div>
      )}

      {result.firedLabels.length > 0 && (
        <div style={{ color: 'var(--color-c11)', marginTop: 3 }}>
          FLAGS: {result.firedLabels.join(', ')}
        </div>
      )}
      {result.firedLabels.length === 0 && result.truth !== 'legit' && (
        <div style={{ color: 'var(--color-c11)', marginTop: 3 }}>
          No rule caught this one. The tell was in the message.
        </div>
      )}

      {card && (
        <div style={{ marginTop: 4, borderTop: '1px solid var(--color-c02)', paddingTop: 3 }}>
          <div style={{ color: 'var(--color-c12)' }}>{card.title}</div>
          <div style={{ color: 'var(--color-c08)', marginTop: 2 }}>{card.whatHappened}</div>
          <div style={{ color: 'var(--color-c07)', marginTop: 2 }}>{card.realWorld}</div>
          <div style={{ color: 'var(--color-c11)', marginTop: 2 }}>TELL: {card.tell}</div>
          <div style={{ color: 'var(--color-c12)', marginTop: 2 }}>{card.nextTime}</div>
        </div>
      )}

      <button className="btn" style={{ marginTop: 4 }} onClick={onNext}>
        CONTINUE
      </button>
    </Modal>
  )
}

export function DayEnd({ day, stats, balance, personal, accuracy, onNext }) {
  const last = day === 6
  return (
    <Modal title={'END OF DAY ' + day}>
      <div style={{ color: 'var(--color-c08)' }}>
        {stats.right} of {stats.total} calls correct tonight.
      </div>
      <div style={{ color: 'var(--color-c07)', marginTop: 2 }}>Company: {money(balance)}</div>
      <div style={{ color: 'var(--color-c07)' }}>Personal: {money(personal)}</div>
      <div style={{ color: 'var(--color-c07)' }}>Accuracy: {accuracy}%</div>
      {stats.obeyed > 0 && (
        <div style={{ color: 'var(--color-c14)', marginTop: 3 }}>
          You did what you were told without checking {stats.obeyed} time
          {stats.obeyed > 1 ? 's' : ''}.
        </div>
      )}
      <button className="btn btn-ok" style={{ marginTop: 4 }} onClick={onNext}>
        {last ? 'SEE RESULTS' : 'CLOCK IN FOR DAY ' + (day + 1)}
      </button>
    </Modal>
  )
}

export function GameOver({ balance, personal, accuracy, obeyed, onRestart }) {
  const grade =
    accuracy >= 90 && balance >= 320000
      ? 'YOU HELD THE LINE'
      : accuracy >= 70
        ? 'YOU MOSTLY HELD'
        : 'THEY GOT THROUGH'
  return (
    <Modal title="SIX NIGHTS LATER">
      <div className="t14" style={{ color: 'var(--color-c12)', marginBottom: 4 }}>
        {grade}
      </div>
      <div style={{ color: 'var(--color-c07)' }}>Company balance: {money(balance)}</div>
      <div style={{ color: 'var(--color-c07)' }}>Your account: {money(personal)}</div>
      <div style={{ color: 'var(--color-c07)' }}>Accuracy: {accuracy}%</div>
      <div style={{ color: obeyed ? 'var(--color-c14)' : 'var(--color-c10)', marginTop: 3 }}>
        {obeyed
          ? 'You obeyed authority without verifying ' + obeyed + ' time(s). That is the one they count on.'
          : 'You never took an order at face value. That is the whole job.'}
      </div>
      <button className="btn btn-ok" style={{ marginTop: 4 }} onClick={onRestart}>
        NEW SHIFT
      </button>
    </Modal>
  )
}

const HOW_TO_PLAY = [
  'Requests arrive on your phone, in INBOX or in LEDGER. The flashing spot has the case.',
  'SENTRY is the truth: every login, device and city.',
  'Not sure? Pick up the phone and message the sender. Tap a suggested question or type your own.',
  'APPROVE sends it. HOLD blocks it. Wrong either way costs you.',
]

export function RuleBook({ day, onClose }) {
  const active = rulesForDay(day)
  return (
    <Modal title="HELP">
      <div style={{ color: 'var(--color-c11)' }}>HOW TO PLAY</div>
      {HOW_TO_PLAY.map((l, i) => (
        <div key={i} style={{ color: 'var(--color-c08)', marginBottom: 2 }}>
          - {l}
        </div>
      ))}
      <div style={{ color: 'var(--color-c11)', marginTop: 3 }}>ACTIVE RULES</div>
      {active.length === 0 && (
        <div style={{ color: 'var(--color-c06)' }}>
          Nothing automated yet. Tonight it is just you and the log.
        </div>
      )}
      {active.map((r) => (
        <div key={r.id} style={{ marginBottom: 3 }}>
          <div style={{ color: 'var(--color-c11)' }}>{r.label}</div>
          <div style={{ color: 'var(--color-c07)' }}>{r.description}</div>
        </div>
      ))}
      {RULES.filter((r) => r.unlockedOnDay > day).length > 0 && (
        <div style={{ color: 'var(--color-c02)', marginTop: 3 }}>
          {RULES.filter((r) => r.unlockedOnDay > day).length} more unlock on later nights.
        </div>
      )}
      <button className="btn" style={{ marginTop: 4 }} onClick={onClose}>
        CLOSE
      </button>
    </Modal>
  )
}

export function Settings({ onClose, onSaved }) {
  const [val, setVal] = useState(getKey())
  return (
    <Modal title="SETTINGS">
      <div style={{ color: 'var(--color-c08)' }}>
        Optional: paste your own Anthropic API key to override the built-in one. Leave it
        empty and everything still works.
      </div>
      <div style={{ color: 'var(--color-c06)', marginTop: 3 }}>
        The key is stored in this browser only and used only to answer sender chat.
      </div>
      <input
        style={{ width: '100%', marginTop: 3 }}
        type="password"
        value={val}
        placeholder="sk-ant-..."
        onChange={(e) => setVal(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
        <button
          className="btn btn-ok"
          onClick={() => {
            setKey(val.trim())
            onSaved()
            onClose()
          }}
        >
          SAVE
        </button>
        <button
          className="btn"
          onClick={() => {
            setKey('')
            setVal('')
            onSaved()
          }}
        >
          CLEAR
        </button>
        <button className="btn" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </Modal>
  )
}
