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
  const card = result.codeAsk
    ? debriefs.code_readback
    : result.correct
      ? null
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
      {result.codeAsk && (
        <div style={{ color: result.gaveCode ? 'var(--color-c14)' : 'var(--color-c10)', marginTop: 3 }}>
          {result.gaveCode
            ? 'While you worked, you read your sign-in code out to a stranger. They emptied ' +
              money(result.codeLoss) +
              ' from your own account.'
            : 'While you worked, someone tried to talk your sign-in code out of you. You did not give it up.'}
        </div>
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

const TACTIC_LABEL = {
  authority_pressure: 'RANK PULLING',
  manufactured_urgency: 'THE FAKE CLOCK',
  secrecy_isolation: 'KEEP IT QUIET',
  irreversible_payment: 'NO TAKE-BACKS',
  trusted_contact_impersonation: 'WEARING A FRIEND',
  too_good_to_be_true: 'FREE MONEY',
  credential_harvesting: 'HAND OVER THE KEYS',
}

const TACTIC_INFO = {
  authority_pressure: {
    is: 'Someone leans on a title - your boss, a director, the fraud desk - so that checking them feels like insubordination.',
    stop: 'A title is just a word typed into a message. Verify the person on a number or account you already had, and let them be annoyed.',
  },
  manufactured_urgency: {
    is: 'A deadline that only exists inside their message. Wire it in ten minutes. The account closes tonight. Now, now, now.',
    stop: 'Real emergencies survive a five minute check. If the clock is the loudest part of the request, the clock is the attack.',
  },
  secrecy_isolation: {
    is: 'You are told to keep it between us. Do not loop in the team. Do not mention it to your parents.',
    stop: 'Secrecy exists to keep you away from the one person who would spot it in a second. Tell that person anyway.',
  },
  irreversible_payment: {
    is: 'They steer the money into a form nobody can pull back: gift cards, crypto, a wire to a brand new account.',
    stop: 'Ask why it has to be that exact way. Normal payments can be reversed. The ones that cannot are chosen for that reason.',
  },
  trusted_contact_impersonation: {
    is: 'The name on the message is someone you know, but the number, the device or the city is one you have never seen.',
    stop: 'Reach the real person on the contact you already have saved. Never reply down the new channel to ask if it is really them.',
  },
  too_good_to_be_true: {
    is: 'A refund you never asked for, a prize you never entered, an overpayment they need you to send back.',
    stop: 'Money that nobody owes you is bait. Their side of it is fake and reverses later; the part you send back is real and gone.',
  },
  credential_harvesting: {
    is: 'They ask straight out for a password or a sign-in code, or push you onto a page that asks for one.',
    stop: 'No real company, bank or helpdesk will ever ask you to hand over a code or password. Say no and open the site yourself.',
  },
}

const secs = (ms) => Math.round(ms / 1000)

// every line below is read off this run's own decisions, never a canned tip
function patternLine(evs) {
  const missed = evs.filter((e) => !e.correct)
  const approved = missed.filter((e) => e.decision === 'approve')
  const held = missed.filter((e) => e.decision === 'hold')

  if (approved.length && approved.every((e) => e.obeyed_authority))
    return 'Every one you got wrong, you approved because someone senior told you to. Rank is the cheapest thing in the world to fake.'

  const blind = approved.filter((e) => e.evidence_windows_opened <= 1)
  if (approved.length && blind.length >= Math.ceil(approved.length * 0.6))
    return (
      'You approved ' +
      blind.length +
      ' of these without opening the evidence. You took their word for it, and their word was the whole attack.'
    )

  if (approved.length >= 2 && approved.every((e) => !e.questioned_sender))
    return 'You never asked one of them a single question before saying yes. They were counting on exactly that.'

  const fast = approved.filter((e) => e.ms_to_decide < 25000)
  if (approved.length && fast.length >= Math.ceil(approved.length * 0.6)) {
    const avg = secs(fast.reduce((n, e) => n + e.ms_to_decide, 0) / fast.length)
    return (
      'You spent about ' +
      avg +
      ' seconds on the ones you got wrong. You moved at their speed instead of your own.'
    )
  }

  if (held.length > approved.length)
    return (
      'You blocked ' +
      held.length +
      ' real request' +
      (held.length > 1 ? 's' : '') +
      ' here. Being suspicious is not the same as checking - the log would have cleared them.'
    )

  if (approved.length === 1 && missed.length === 1) {
    const e = approved[0]
    return (
      'One got past you, on night ' +
      e.day +
      ', after ' +
      secs(e.ms_to_decide) +
      ' seconds and ' +
      e.evidence_windows_opened +
      ' window' +
      (e.evidence_windows_opened === 1 ? '' : 's') +
      ' of evidence.'
    )
  }

  return (
    'You lost ' +
    missed.length +
    ' of ' +
    evs.length +
    ' against this one, and it caught you a different way each time.'
  )
}

export function EndOfRun({ bankrupt, balance, personal, accuracy, log, onRestart }) {
  const attacks = log.filter((e) => TACTIC_LABEL[e.tactic])
  const groups = {}
  for (const e of attacks) (groups[e.tactic] = groups[e.tactic] || []).push(e)
  const rows = Object.entries(groups)
    .map(([t, evs]) => ({
      tactic: t,
      evs,
      seen: evs.length,
      right: evs.filter((e) => e.correct).length,
    }))
    .sort((a, b) => a.right / a.seen - b.right / b.seen || b.seen - a.seen)

  const worst = rows.find((r) => r.right < r.seen)
  const gaveCode = log.some((e) => e.gave_away_code === true)

  return (
    <Modal
      title={bankrupt ? (bankrupt.who === 'company' ? 'THE LIGHTS WENT OUT' : 'CLEANED OUT') : 'SIX NIGHTS LATER'}
      w={360}
    >
      {bankrupt ? (
        <div style={{ color: 'var(--color-c14)', marginBottom: 3 }}>
          {bankrupt.who === 'company'
            ? `Meridian ran out of money on Day ${bankrupt.day}. There was no Day ${bankrupt.day + 1}.`
            : `Your own account hit zero on Day ${bankrupt.day}. You went home. There was no Day ${bankrupt.day + 1}.`}
        </div>
      ) : (
        <div style={{ color: 'var(--color-c08)', marginBottom: 3 }}>
          You worked all six nights and the company is still standing.
        </div>
      )}
      <div style={{ color: 'var(--color-c07)' }}>Company balance: {money(balance)}</div>
      <div style={{ color: 'var(--color-c07)' }}>Your account: {money(personal)}</div>
      <div style={{ color: 'var(--color-c07)' }}>Accuracy: {accuracy}%</div>

      {gaveCode && (
        <div style={{ marginTop: 4, background: 'var(--color-c13)', color: 'var(--color-c09)', padding: 2 }}>
          You read a sign-in code out to a stranger. Nothing else on this screen cost you as much.
          A code is the last lock on your own account, and no real company, bank or helpdesk will
          ever ask you to say one out loud.
        </div>
      )}

      <div style={{ color: 'var(--color-c11)', marginTop: 4 }}>WHAT THEY TRIED ON YOU</div>
      {rows.length === 0 && (
        <div style={{ color: 'var(--color-c06)' }}>No attacks reached a verdict this run.</div>
      )}
      {rows.map((r) => (
        <div key={r.tactic} style={{ marginBottom: 3 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <span style={{ flex: 1, minWidth: 0, color: 'var(--color-c08)' }}>
              {TACTIC_LABEL[r.tactic]}
            </span>
            <span style={{ color: 'var(--color-c06)' }}>seen {r.seen}</span>
            <span
              style={{
                width: 46,
                textAlign: 'right',
                color: r.right === r.seen ? 'var(--color-c10)' : 'var(--color-c14)',
              }}
            >
              {r.right}/{r.seen} right
            </span>
          </div>
          <div style={{ color: 'var(--color-c07)', paddingLeft: 6 }}>
            {TACTIC_INFO[r.tactic].is}
          </div>
          <div style={{ color: 'var(--color-c10)', paddingLeft: 6 }}>
            HOW TO STOP IT: {TACTIC_INFO[r.tactic].stop}
          </div>
        </div>
      ))}

      {worst ? (
        <div style={{ marginTop: 4, borderTop: '1px solid var(--color-c02)', paddingTop: 3 }}>
          <div style={{ color: 'var(--color-c12)' }}>
            WORST AGAINST: {TACTIC_LABEL[worst.tactic]}
          </div>
          <div style={{ color: 'var(--color-c08)', marginTop: 2 }}>{patternLine(worst.evs)}</div>
        </div>
      ) : (
        rows.length > 0 && (
          <div style={{ color: 'var(--color-c10)', marginTop: 4 }}>
            You beat all seven. Not one of them got a verdict out of you it did not deserve.
          </div>
        )
      )}

      <div style={{ color: 'var(--color-c11)', marginTop: 4 }}>
        These seven are not made up for the game. They are the whole toolkit: pull rank, start a
        clock, swear you to secrecy, wear a face you trust, take money that cannot come back,
        promise something free, ask for your login. Every scam that will ever reach your phone is
        some mix of those. You have now seen all seven with the answers in front of you.
      </div>

      <button className="btn btn-ok" style={{ marginTop: 4 }} onClick={onRestart}>
        PLAY AGAIN
      </button>
    </Modal>
  )
}

const HOW_TO_PLAY = [
  'Most cases sit on the monitor, in INBOX or LEDGER. Some arrive as a message and the phone buzzes.',
  'You cannot use the phone and the monitor at once. PUT DOWN (or Esc) to get back to the screen.',
  'SENTRY is the truth: every login, device and city.',
  'If someone messaged you, read it before you decide. Tap a suggested question or type your own.',
  'APPROVE sends it. HOLD blocks it. Wrong either way costs you.',
  'Nobody legitimate will ever ask you to read back a verification code.',
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
