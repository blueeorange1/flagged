import { useEffect, useRef } from 'react'
import { STAGE, PHONE, bakeLayers, resolvePalette, drawPhoneClosed, drawPickup } from '../lib/scene.js'
import { sfx } from '../lib/audio.js'

const LIFT_MS = 1200
const DROP_MS = 600
const BUZZ_CYCLE = 300
const BUZZ_ON = 190

export default function Scene({ phoneState, phoneT, buzzSeq, buzzLevel, unread, onPhone, locked }) {
  const canvasRef = useRef(null)
  const roomRef = useRef(null)
  const palRef = useRef(null)
  const buzzRef = useRef(null)
  const sigRef = useRef('')
  const propsRef = useRef({})
  propsRef.current = { phoneState, phoneT }

  useEffect(() => {
    if (buzzSeq > 0 && phoneState === 'closed') {
      const n = Math.max(1, Math.min(4, buzzLevel || 1))
      buzzRef.current = { start: performance.now(), n }
      for (let i = 0; i < n; i++) setTimeout(() => sfx.buzz(n), i * BUZZ_CYCLE)
      if (n >= 3) sfx.rumble(n)
      setTimeout(() => sfx.ding(), BUZZ_ON)
    }
  }, [buzzSeq])

  useEffect(() => {
    if (phoneState !== 'closed') buzzRef.current = null
  }, [phoneState])

  useEffect(() => {
    palRef.current = resolvePalette()
    roomRef.current = bakeLayers(palRef.current)
    sigRef.current = ''
    let raf
    function frame(now) {
      raf = requestAnimationFrame(frame)
      const cv = canvasRef.current
      if (!cv || !roomRef.current) return
      const P = palRef.current
      const { phoneState: st, phoneT: t0 } = propsRef.current

      let sig = st
      let dx = 0
      let dy = 0
      let glow = 0
      if (st === 'closed') {
        const b = buzzRef.current
        if (b) {
          const t = now - b.start
          const cycle = Math.floor(t / BUZZ_CYCLE)
          if (cycle >= b.n) buzzRef.current = null
          else {
            const ph = t - cycle * BUZZ_CYCLE
            if (ph < BUZZ_ON) {
              const amp = b.n
              const f = Math.floor(ph / 48) % 4
              dx = [amp, -amp, amp, 0][f]
              dy = [0, amp, -amp, 0][f]
              glow = b.n
              sig = 'buzz' + b.n + '-' + cycle + '-' + f
            }
          }
        }
      } else if (st === 'lift') {
        sig = 'lift' + Math.min(5, Math.floor(((now - t0) / LIFT_MS) * 6))
      } else if (st === 'drop') {
        sig = 'drop' + Math.min(5, Math.floor(((now - t0) / DROP_MS) * 6))
      }
      if (sig === sigRef.current) return
      sigRef.current = sig

      const g = cv.getContext('2d')
      for (const l of roomRef.current) g.drawImage(l, 0, 0)
      if (st === 'closed') drawPhoneClosed(g, P, dx, dy, glow)
      else if (st === 'lift') drawPickup(g, P, Math.min(1, (now - t0) / LIFT_MS))
      else if (st === 'drop') drawPickup(g, P, Math.max(0.01, 1 - (now - t0) / DROP_MS))
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <canvas
        id="room"
        ref={canvasRef}
        width={STAGE.w}
        height={STAGE.h}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      {phoneState === 'closed' && (
        <div
          id="phonehot"
          data-spot="win-relay"
          onClick={locked ? undefined : onPhone}
          style={{
            position: 'absolute',
            left: PHONE.x - 4,
            top: PHONE.y - 6,
            width: PHONE.w + 10,
            height: PHONE.h + 12,
            cursor: locked ? 'default' : 'pointer',
            zIndex: 500,
          }}
        />
      )}
      {phoneState === 'closed' && unread > 0 && (
        <div
          className="pulse-chip"
          style={{
            position: 'absolute',
            left: PHONE.x + PHONE.w - 6,
            top: PHONE.y - 8,
            background: 'var(--color-c12)',
            color: 'var(--color-c00)',
            padding: '0 2px',
            zIndex: 510,
          }}
        >
          {unread}
        </div>
      )}
    </>
  )
}
