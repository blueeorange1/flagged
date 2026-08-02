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
const TIMER_SECONDS = 90

const DEFAULT_WINS = {
  relay: { x: 1, y: 13, w: 190, h: 88, max: false },
  inbox: { x: 193, y: 13, w: 190, h: 88, max: false },
  ledger: { x: 1, y: 103, w: 190, h: 88, max: false },
  sentry: { x: 193, y: 103, w: 190, h: 88, max: false },
}

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

function connectSegs(a, b) {
  if (b.x + b.w / 2 < a.x + a.w / 2) [a, b] = [b, a]
  const ax = a.x + a.w
  const ay = Math.round(a.y + a.h / 2)
  const bx = b.x
  const by = Math.round(b.y + b.h / 2)
  if (ax < bx - 2) {
    const mid = Math.round((ax + bx) / 2)
    return [
      { left: ax, top: ay, width: mid - ax, height: 1 },
      { left: mid, top: Math.min(ay, by), width: 1, height: Math.abs(by - ay) + 1 },
      { left: mid, top: by, width: bx - mid, height: 1 },
    ]
  }
  const cx = Math.round((a.x + a.w / 2 + b.x + b.w / 2) / 2)
  const [t, m] = a.y < b.y ? [a, b] : [b, a]
  return [{ left: cx, top: t.y + t.h, width: 1, height: Math.max(1, m.y - t.y - t.h) }]
}

function SpotOverlay({ spots, arrow, connect, scale }) {
  const [rects, setRects] = useState({})
  const key = [...new Set([...spots, ...(arrow ? [arrow] : []), ...(connect || [])])].join(',')

  useEffect(() => {
    const wanted = key ? key.split(',') : []
    for (const id of wanted) {
      if (id.startsWith('win-')) continue
      const el = document.querySelector('[data-spot="' + id + '"]')
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
    function measure() {
      const stage = document.getElementById('stage')
      if (!stage) return
      const sr = stage.getBoundingClientRect()
      const out = {}
      for (const id of wanted) {
        const el = document.querySelector('[data-spot="' + id + '"]')
        if (!el) continue
        const r = el.getBoundingClientRect()
        let { left, top, right, bottom } = r
        const win = el.closest('.win')
        if (win && !id.startsWith('win-')) {
          const wr = win.getBoundingClientRect()
          left = Math.max(left, wr.left)
          top = Math.max(top, wr.top)
          right = Math.min(right, wr.right)
          bottom = Math.min(bottom, wr.bottom)
          if (right <= left || bottom <= top) continue
        }
        out[id] = {
          x: Math.round((left - sr.left) / scale),
          y: Math.round((top - sr.top) / scale),
          w: Math.round((right - left) / scale),
          h: Math.round((bottom - top) / scale),
        }
      }
      setRects((old) => (JSON.stringify(old) === JSON.stringify(out) ? old : out))
    }
    measure()
    const iv = setInterval(measure, 120)
    return () => clearInterval(iv)
  }, [key, scale])

  const ar = arrow ? rects[arrow] : null
  const above = ar && ar.y >= 26
  const ca = connect ? rects[connect[0]] : null
  const cb = connect ? rects[connect[1]] : null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 750 }}>
      {spots.map((id) =>
        rects[id] ? (
          <div
            key={id}
            className="spot-box"
            style={{ left: rects[id].x, top: rects[id].y, width: rects[id].w, height: rects[id].h }}
          />
        ) : null
      )}
      {ca && cb && connectSegs(ca, cb).map((s, i) => <div key={i} className="spot-line" style={s} />)}
      {ar && (
        <div
          className={above ? 'chev' : 'chev chev-up'}
          style={{ left: ar.x + Math.round(ar.w / 2) - 4, top: above ? ar.y - 11 : ar.y + ar.h + 3 }}
        >
          {(above ? [7, 5, 3, 1] : [1, 3, 5, 7]).map((w, i) => (
            <div key={i} style={{ width: w, height: 2, background: 'var(--color-c12)', margin: '0 auto' }} />
          ))}
        </div>
      )}
    </div>
  )
}

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

  const [hintStep, setHintStep] = useState(0)
  const [flash, setFlash] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [tutSkip, setTutSkip] = useState(false)
  const [inboxHinted, setInboxHinted] = useState(false)
  const [skipAsk, setSkipAsk] = useState(false)
  const [typedN, setTypedN] = useState(0)
  const [ready, setReady] = useState(false)
  const [review, setReview] = useState(null)
  const hintHist = useRef([])

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
    setHintStep(0)
    setFlash(null)
    setReview(null)
    hintHist.current = []
  }, [cur])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 3200)
    return () => clearTimeout(t)
  }, [flash])

  const hintObj = hintLine()
  const liveHint = hintObj ? hintObj.text : null

  useEffect(() => {
    if (liveHint && review === null && hintHist.current[hintHist.current.length - 1] !== liveHint)
      hintHist.current.push(liveHint)
  }, [liveHint, review])

  const hintText = review !== null ? hintHist.current[review] : liveHint

  useEffect(() => {
    setTypedN(0)
    setReady(false)
    if (!hintText) return
    const iv = setInterval(() => {
      setTypedN((n) => {
        if (n >= hintText.length) {
          clearInterval(iv)
          return n
        }
        if ((n + 1) % 3 === 0) sfx.blip()
        return n + 1
      })
    }, 28)
    return () => clearInterval(iv)
  }, [hintText])

  const typedDone = !!hintText && typedN >= hintText.length

  useEffect(() => {
    if (!typedDone) return
    const t = setTimeout(() => setReady(true), 700)
    return () => clearTimeout(t)
  }, [typedDone, hintText])

  function completeLine() {
    if (hintText) setTypedN(hintText.length)
  }

  function stripClick() {
    if (!hintText) return
    if (!typedDone) {
      completeLine()
      return
    }
    if (!ready) return
    if (review !== null) {
      sfx.click()
      setReview(review + 1 >= hintHist.current.length ? null : review + 1)
      return
    }
    if (hintObj && hintObj.adv === 'click') {
      sfx.click()
      setHintStep((h) => h + 1)
    }
  }

  function hintBack() {
    const at = review === null ? hintHist.current.length - 1 : review
    if (at <= 0) return
    sfx.click()
    setReview(at - 1)
  }

  useEffect(() => {
    setTimeLeft(phase === 'play' && day >= 2 ? TIMER_SECONDS : null)
  }, [cur, phase, day])

  const timerOn = timeLeft !== null
  useEffect(() => {
    if (!timerOn || phase !== 'play' || showRules || showSettings) return
    const iv = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : t)), 1000)
    return () => clearInterval(iv)
  }, [timerOn, phase, showRules, showSettings])

  useEffect(() => {
    if (timeLeft === 15) sfx.alert()
    if (timeLeft === 0) decide('hold', true)
  }, [timeLeft])

  const playing = phase === 'play'
  useEffect(() => {
    if (playing && cur) sfx.msg()
  }, [cur, playing])

  function startShift() {
    sfx.click()
    setPhase('play')
  }

  function focus(id) {
    opened.current.add(id)
    setZorder((z) => (z[z.length - 1] === id ? z : [...z.filter((x) => x !== id), id]))
    if (!inboxHinted && id === 'inbox' && phase === 'play' && cur && !cur.tut && cur.surface === 'inbox')
      setInboxHinted(true)
    if (tutSkip || phase !== 'play' || !cur || !cur.tut) return
    const wants =
      (cur.tut === 'fraud' && ((hintStep === 0 && id === 'ledger') || (hintStep === 2 && id === 'sentry'))) ||
      (cur.tut === 'legit' && hintStep === 0 && id === 'sentry') ||
      (cur.tut === 'ask' && hintStep === 4 && id === 'sentry')
    if (!wants) return
    if (!typedDone) {
      completeLine()
      return
    }
    if (!ready || review !== null) return
    sfx.open()
    setHintStep((h) => h + 1)
  }

  const move = useCallback((id, x, y) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], x, y } }))
  }, [])

  const toggleMax = useCallback((id) => {
    sfx.click()
    setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max } }))
  }, [])

  async function send(text) {
    const askTut = !tutSkip && cur.tut === 'ask'
    if (askTut) setHintStep((h) => (h < 3 ? 3 : h))
    setFlash(null)
    setReview(null)
    setChat((c) => [...c, { from: 'me', text }])
    setBusy(true)
    const res = await aiReply(cur, chat, text)
    setBusy(false)
    sfx.msg()
    setChat((c) => [...c, { from: 'them', text: res.reply, leaked: res.contradictionLeaked }])
    if (askTut) setHintStep((h) => (h < 4 ? 4 : h))
  }

  function decide(decision, expired = false) {
    if (phase !== 'play') return
    const c = cur
    if (!tutSkip && c.tut === 'fraud' && decision === 'approve') {
      setFlash('Blocked. That wires $6,200 to whoever is really in ' + c.evidence.ipCity + '. Press HOLD.')
      sfx.wrong()
      return
    }
    if (!tutSkip && c.tut === 'legit' && decision === 'hold') {
      setFlash('Blocked. This one is real. Holding it stops a real person working. Press APPROVE.')
      sfx.wrong()
      return
    }
    if (!tutSkip && c.tut === 'ask' && !chat.some((m) => m.from === 'me')) {
      setFlash('Ask them first. Tap a question in RELAY.')
      sfx.wrong()
      return
    }
    if (!inboxHinted && !c.tut && day <= 2 && c.surface === 'inbox') setInboxHinted(true)
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
      expired,
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
    sfx.click()
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
    setTutSkip(false)
    setSkipAsk(false)
    setInboxHinted(false)
    setReview(null)
    hintHist.current = []
    setPhase('brief')
  }

  function hintLine() {
    if (tutSkip || phase !== 'play' || !cur) return null
    if (!cur.tut) {
      if (!inboxHinted && day <= 2 && cur.surface === 'inbox')
        return {
          text: 'This one came by email. Open INBOX.',
          adv: 'action',
          spots: ['win-inbox'],
          arrow: 'win-inbox',
          lit: null,
        }
      return null
    }
    if (day !== 1) return null
    if (cur.tut === 'fraud') {
      return [
        { text: 'A payment is waiting in LEDGER. Click LEDGER.', adv: 'action', arrow: 'win-ledger', lit: ['ledger'] },
        { text: 'Read the memo. He says he is in Bellhaven.', adv: 'click', spots: ['memo'], arrow: 'memo', lit: ['ledger'] },
        { text: 'Is he really there? Click SENTRY.', adv: 'action', arrow: 'win-sentry', lit: ['ledger', 'sentry'] },
        { text: 'LOCATION says Vasska minutes after Bellhaven. Impossible travel.', adv: 'click', spots: ['memo', 'sentry-loc'], connect: ['memo', 'sentry-loc'], lit: ['ledger', 'sentry'] },
        { text: 'Nobody moves that fast. This is fraud. Press HOLD.', adv: 'none', spots: ['hold'], arrow: 'hold', lit: [] },
      ][hintStep]
    }
    if (cur.tut === 'legit') {
      return [
        { text: 'Not every request is an attack. Click SENTRY.', adv: 'action', arrow: 'win-sentry', lit: ['sentry'] },
        { text: 'Same city, same device, known vendor. This is real.', adv: 'click', spots: ['sentry-loc', 'sentry-dev'], lit: ['sentry'] },
        { text: 'Blocking real work costs money too. Press APPROVE.', adv: 'none', spots: ['approve'], arrow: 'approve', lit: [] },
      ][hintStep]
    }
    if (cur.tut === 'ask') {
      if (hintStep <= 3) {
        return [
          { text: 'You cannot tell from the paperwork alone. Ask them directly.', adv: 'click', arrow: 'win-relay', lit: ['relay'] },
          { text: 'Real people answer consistently. Liars have to make things up.', adv: 'click', lit: ['relay'] },
          { text: 'Ask where they are.', adv: 'none', spots: ['suggest-0'], arrow: 'suggest-0', lit: ['relay'] },
          { text: 'Wait for the reply.', adv: 'none', lit: ['relay'] },
        ][hintStep]
      }
      const q = (chat.find((m) => m.from === 'me') || { text: '' }).text.toLowerCase()
      const dev = q.includes('device')
      const generic = !dev && !q.includes('city') && !q.includes('where')
      if (hintStep === 4) {
        return {
          text: generic
            ? 'Read their answer. Then click SENTRY.'
            : dev
              ? 'They said LAP-8812. Now look at SENTRY.'
              : 'They said Bellhaven. Now look at SENTRY.',
          adv: 'action',
          spots: ['reply-last'],
          arrow: 'reply-last',
          lit: ['relay', 'sentry'],
        }
      }
      const line = dev ? 'sentry-dev' : 'sentry-loc'
      return {
        text: generic
          ? 'Their story does not match SENTRY. Press HOLD.'
          : dev
            ? 'SENTRY shows UNK-5521. They just lied to you. Press HOLD.'
            : 'SENTRY says Vasska. They just lied to you. Press HOLD.',
        adv: 'none',
        spots: generic ? ['reply-last', 'hold'] : ['reply-last', line, 'hold'],
        connect: generic ? undefined : ['reply-last', line],
        arrow: 'hold',
        lit: ['relay', 'sentry'],
      }
    }
    return null
  }

  const suggest = tutSkip || !cur || cur.tut !== 'ask' || hintStep >= 2
  const hlFirst = !tutSkip && cur && cur.tut === 'ask' && hintStep === 2

  const panes = {
    relay: {
      title: 'RELAY',
      node: (
        <Relay c={cur} chat={chat} onSend={send} busy={busy} aiOn={aiOn} suggest={suggest} hlFirst={hlFirst} />
      ),
    },
    inbox: { title: 'INBOX', node: <Inbox c={cur} archive={archive} /> },
    ledger: {
      title: 'LEDGER',
      node: (
        <Ledger
          c={cur}
          balance={balance}
          personal={personal}
          history={history}
          day={day}
          live={phase === 'play'}
        />
      ),
    },
    sentry: { title: 'SENTRY', node: <Sentry c={cur} /> },
  }

  const focused = zorder[zorder.length - 1]
  const hintAt = review === null ? hintHist.current.length - 1 : review
  const showContinue = ready && (review !== null || (hintObj && hintObj.adv === 'click'))
  const tutActive = day === 1 && !tutSkip && phase === 'play' && cur && cur.tut
  const spotCfg = review === null && !flash ? hintObj : null
  const lit = spotCfg && spotCfg.lit ? spotCfg.lit : null

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
            background: 'var(--color-c00)',
            borderBottom: '1px solid var(--color-c05)',
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
          {tutActive &&
            (skipAsk ? (
              <>
                <span style={{ color: 'var(--color-c14)' }}>SKIP?</span>
                <button
                  className="btn"
                  onClick={() => {
                    sfx.click()
                    setTutSkip(true)
                    setSkipAsk(false)
                    setReview(null)
                  }}
                >
                  Y
                </button>
                <button className="btn" onClick={() => { sfx.click(); setSkipAsk(false) }}>
                  N
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => { sfx.click(); setSkipAsk(true) }}>
                SKIP TUT
              </button>
            ))}
          <button className="btn" onClick={() => { sfx.click(); setShowRules(true) }}>
            ?
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
            pulse={phase === 'play'}
            dim={lit !== null && !lit.includes(id)}
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
            background: 'var(--color-c00)',
            borderTop: '1px solid var(--color-c05)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 3px',
            zIndex: 700,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {flash ? (
              <div style={{ color: 'var(--color-c14)' }}>{flash}</div>
            ) : hintText ? (
              <div
                id="hintstrip"
                onClick={stripClick}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  minHeight: 18,
                }}
              >
                {hintAt > 0 && (
                  <button
                    className="btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      hintBack()
                    }}
                  >
                    BACK
                  </button>
                )}
                <div style={{ color: review !== null ? 'var(--color-c07)' : 'var(--color-c11)', flex: 1 }}>
                  {hintText.slice(0, typedN)}
                </div>
                {showContinue && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      background: 'var(--color-c00)',
                      paddingLeft: 2,
                      color: 'var(--color-c12)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    CLICK TO CONTINUE<span className="blink">_</span>
                  </span>
                )}
              </div>
            ) : (
              <>
                <div style={{ color: 'var(--color-c06)' }}>
                  CASE {idx + 1}/{game.days[day].length} - VIA {cur.surface.toUpperCase()}
                  {cur.target === 'personal' ? ' - TARGETS YOU' : ''}
                </div>
                <div style={{ color: 'var(--color-c09)' }}>{cur.content.ask}</div>
              </>
            )}
          </div>
          {timeLeft !== null && (
            <span
              className="t14"
              style={{ color: timeLeft <= 15 ? 'var(--color-c14)' : 'var(--color-c07)' }}
            >
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          )}
          <button
            className="btn btn-ok t14"
            data-spot="approve"
            style={{ padding: '2px 5px' }}
            disabled={phase !== 'play'}
            onClick={() => decide('approve')}
          >
            APPROVE
          </button>
          <button
            className="btn btn-no t14"
            data-spot="hold"
            style={{ padding: '2px 5px' }}
            disabled={phase !== 'play'}
            onClick={() => decide('hold')}
          >
            HOLD
          </button>
        </div>

        {spotCfg && (spotCfg.spots || spotCfg.arrow) && (
          <SpotOverlay
            spots={spotCfg.spots || []}
            arrow={spotCfg.arrow}
            connect={spotCfg.connect}
            scale={scale}
          />
        )}

        {phase === 'brief' && <Brief day={day} onStart={startShift} />}
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
