import { useCallback, useEffect, useRef, useState } from 'react'
import Win, { DESK } from './components/Win.jsx'
import { Relay, Inbox, Ledger, Sentry } from './components/Panes.jsx'
import { Brief, Result, DayEnd, GameOver, RuleBook, Settings } from './components/Overlays.jsx'
import { generateGame } from './lib/generator.js'
import { firedRules } from './lib/rules.js'
import { aiReply, hasKey } from './lib/ai.js'
import { opening } from './lib/dialogue.js'
import { logEvent } from './lib/telemetry.js'
import { sfx, setMuted } from './lib/audio.js'

const START_BALANCE = 340000
const START_PERSONAL = 12400
const BREACH_COST = 18000

const DEFAULT_WINS = {
  relay: { x: 1, y: 13, w: 190, h: 88, max: false },
  inbox: { x: 193, y: 13, w: 190, h: 88, max: false },
  ledger: { x: 1, y: 103, w: 190, h: 88, max: false },
  sentry: { x: 193, y: 103, w: 190, h: 88, max: false },
}

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

export default function App() {
  const [scale, setScale] = useState(3)
  const [game, setGame] = useState(() => generateGame())
  const [day, setDay] = useState(1)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('brief')

  const [balance, setBalance] = useState(START_BALANCE)
  const [personal, setPersonal] = useState(START_PERSONAL)
  const [right, setRight] = useState(0)
  const [total, setTotal] = useState(0)
  const [dayStats, setDayStats] = useState({ right: 0, total: 0, obeyed: 0 })
  const [obeyedAll, setObeyedAll] = useState(0)

  const [chat, setChat] = useState([])
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState([])
  const [archive, setArchive] = useState([])
  const [result, setResult] = useState(null)

  const [wins, setWins] = useState(DEFAULT_WINS)
  const [zorder, setZorder] = useState(['ledger', 'inbox', 'sentry', 'relay'])
  const [showRules, setShowRules] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [aiOn, setAiOn] = useState(hasKey())
  const [muted, setMutedState] = useState(false)

  const opened = useRef(new Set())
  const startedAt = useRef(Date.now())

  const cur = game.days[day][idx]
  const accuracy = total === 0 ? 100 : Math.round((right / total) * 100)

  useEffect(() => {
    function fit() {
      const s = Math.min(window.innerWidth / 384, window.innerHeight / 216)
      setScale(Math.max(1, Math.min(3, Math.floor(s))))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (!cur) return
    const first =
      cur.surface === 'relay' ? cur.content.text : opening(cur)
    setChat([{ from: 'them', text: first }])
    opened.current = new Set()
    startedAt.current = Date.now()
  }, [cur])

  const focus = useCallback((id) => {
    opened.current.add(id)
    setZorder((z) => (z[z.length - 1] === id ? z : [...z.filter((x) => x !== id), id]))
  }, [])

  const move = useCallback((id, x, y) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], x, y } }))
  }, [])

  const toggleMax = useCallback((id) => {
    sfx.click()
    setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max } }))
  }, [])

  async function send(text) {
    setChat((c) => [...c, { from: 'me', text }])
    setBusy(true)
    const res = await aiReply(cur, chat, text)
    setBusy(false)
    sfx.msg()
    setChat((c) => [...c, { from: 'them', text: res.reply, leaked: res.contradictionLeaked }])
  }

  function decide(decision) {
    if (phase !== 'play') return
    const c = cur
    const shouldApprove = c.truth === 'legit'
    const correct = (decision === 'approve') === shouldApprove
    const questioned = chat.some((m) => m.from === 'me')
    const obeyed =
      decision === 'approve' && c.content.markers.includes('invokes_authority')

    let loss = 0
    let dataLost = false
    let complaint = false

    if (!correct && decision === 'approve') {
      if (c.content.kind === 'access') {
        loss = BREACH_COST
        dataLost = true
      } else {
        loss = c.content.amount
      }
      if (c.target === 'personal') setPersonal((p) => Math.max(0, p - loss))
      else setBalance((b) => Math.max(0, b - loss))
    }
    if (!correct && decision === 'hold') complaint = true

    logEvent({
      incident_type: c.isTwist ? 'twist_authority' : c.surface,
      tactic: c.tactic,
      truth_type: c.truth,
      decision,
      correct,
      ms_to_decide: Date.now() - startedAt.current,
      evidence_windows_opened: opened.current.size,
      questioned_sender: questioned,
      obeyed_authority: obeyed,
      day,
    })

    setTotal((t) => t + 1)
    if (correct) setRight((r) => r + 1)
    setDayStats((s) => ({
      right: s.right + (correct ? 1 : 0),
      total: s.total + 1,
      obeyed: s.obeyed + (obeyed && !correct ? 1 : 0),
    }))
    if (obeyed && !correct) setObeyedAll((o) => o + 1)

    setHistory((h) => [
      ...h,
      { id: c.id, decision, payee: c.content.payee, amount: c.content.amount },
    ])
    if (c.surface === 'inbox')
      setArchive((a) => [...a, { id: c.id, subject: c.content.subject }])

    setResult({
      decision,
      correct,
      truth: c.truth,
      tactic: c.tactic,
      target: c.target,
      loss,
      dataLost,
      complaint,
      firedLabels: firedRules(c, day).map((r) => r.label),
    })

    sfx[decision === 'approve' ? 'approve' : 'hold']()
    setTimeout(() => sfx[correct ? 'right' : 'wrong'](), 160)
    setPhase('result')
  }

  function next() {
    if (idx + 1 < game.days[day].length) {
      setIdx(idx + 1)
      setPhase('play')
    } else {
      setPhase('dayend')
    }
  }

  function nextDay() {
    if (day === 6) {
      setPhase('over')
      return
    }
    setDay(day + 1)
    setIdx(0)
    setDayStats({ right: 0, total: 0, obeyed: 0 })
    setPhase('brief')
    sfx.day()
  }

  function restart() {
    setGame(generateGame())
    setDay(1)
    setIdx(0)
    setBalance(START_BALANCE)
    setPersonal(START_PERSONAL)
    setRight(0)
    setTotal(0)
    setDayStats({ right: 0, total: 0, obeyed: 0 })
    setObeyedAll(0)
    setHistory([])
    setArchive([])
    setPhase('brief')
  }

  const panes = {
    relay: {
      title: 'RELAY',
      node: <Relay c={cur} chat={chat} onSend={send} busy={busy} aiOn={aiOn} />,
    },
    inbox: { title: 'INBOX', node: <Inbox c={cur} archive={archive} /> },
    ledger: {
      title: 'LEDGER',
      node: (
        <Ledger c={cur} balance={balance} personal={personal} history={history} day={day} />
      ),
    },
    sentry: { title: 'SENTRY', node: <Sentry c={cur} /> },
  }

  const focused = zorder[zorder.length - 1]

  return (
    <div id="screen">
      <div id="stage" style={{ '--stage-scale': scale }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 384,
            height: 12,
            background: 'var(--color-c01)',
            borderBottom: '1px solid var(--color-c02)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '0 2px',
            whiteSpace: 'nowrap',
            zIndex: 700,
          }}
        >
          <span style={{ color: 'var(--color-c12)' }}>FLAGGED</span>
          <span style={{ color: 'var(--color-c06)' }}>D{day}</span>
          <span style={{ color: 'var(--color-c08)' }}>CO {money(balance)}</span>
          {day >= 4 && (
            <span style={{ color: 'var(--color-c15)' }}>ME {money(personal)}</span>
          )}
          <span style={{ color: accuracy >= 80 ? 'var(--color-c10)' : 'var(--color-c14)' }}>
            {accuracy}%
          </span>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => { sfx.click(); setShowRules(true) }}>
            RULES
          </button>
          <button className="btn" onClick={() => { sfx.click(); setShowSettings(true) }}>
            SET
          </button>
          <button
            className="btn"
            onClick={() => {
              const m = !muted
              setMutedState(m)
              setMuted(m)
              if (!m) sfx.click()
            }}
          >
            {muted ? 'OFF' : 'SND'}
          </button>
        </div>

        {zorder.map((id, i) => (
          <Win
            key={id}
            id={id}
            title={panes[id].title}
            rect={wins[id]}
            z={10 + i}
            focused={focused === id}
            badge={cur && cur.surface === id ? 1 : 0}
            scale={scale}
            onFocus={focus}
            onMove={move}
            onMax={toggleMax}
          >
            {panes[id].node}
          </Win>
        ))}

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: DESK.bottom,
            width: 384,
            height: 216 - DESK.bottom,
            background: 'var(--color-c01)',
            borderTop: '1px solid var(--color-c02)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 3px',
            zIndex: 700,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--color-c06)' }}>
              CASE {idx + 1}/{game.days[day].length} - VIA {cur.surface.toUpperCase()}
              {cur.target === 'personal' ? ' - TARGETS YOU' : ''}
            </div>
            <div style={{ color: 'var(--color-c09)' }}>{cur.content.ask}</div>
          </div>
          <button
            className="btn btn-ok t14"
            style={{ padding: '2px 5px' }}
            disabled={phase !== 'play'}
            onClick={() => decide('approve')}
          >
            APPROVE
          </button>
          <button
            className="btn btn-no t14"
            style={{ padding: '2px 5px' }}
            disabled={phase !== 'play'}
            onClick={() => decide('hold')}
          >
            HOLD
          </button>
        </div>

        {phase === 'brief' && <Brief day={day} onStart={() => setPhase('play')} />}
        {phase === 'result' && <Result result={result} onNext={next} />}
        {phase === 'dayend' && (
          <DayEnd
            day={day}
            stats={dayStats}
            balance={balance}
            personal={personal}
            accuracy={accuracy}
            onNext={nextDay}
          />
        )}
        {phase === 'over' && (
          <GameOver
            balance={balance}
            personal={personal}
            accuracy={accuracy}
            obeyed={obeyedAll}
            onRestart={restart}
          />
        )}
        {showRules && <RuleBook day={day} onClose={() => setShowRules(false)} />}
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} onSaved={() => setAiOn(hasKey())} />
        )}

        <div id="crt" />
      </div>
    </div>
  )
}
