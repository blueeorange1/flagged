import { useRef } from 'react'

export const DESK = { top: 12, bottom: 194, w: 384 }

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default function Win({
  id,
  title,
  rect,
  z,
  focused,
  badge,
  scale,
  onFocus,
  onMove,
  onMax,
  dim,
  ring,
  pulse,
  children,
}) {
  const drag = useRef(null)

  function onDown(e) {
    onFocus(id)
    if (rect.max) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, ox: rect.x, oy: rect.y }
  }

  function onMoveEvt(e) {
    const d = drag.current
    if (!d) return
    // Pointer deltas arrive in screen pixels; the stage is scaled up, so
    // divide by the scale to convert back into stage pixels.
    const nx = d.ox + (e.clientX - d.sx) / scale
    const ny = d.oy + (e.clientY - d.sy) / scale
    onMove(id, clamp(nx, 0, DESK.w - rect.w), clamp(ny, DESK.top, DESK.bottom - rect.h))
  }

  function onUp(e) {
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const box = rect.max
    ? { left: 1, top: DESK.top + 1, width: DESK.w - 2, height: DESK.bottom - DESK.top - 2 }
    : { left: rect.x, top: rect.y, width: rect.w, height: rect.h }

  return (
    <div
      className={'win' + (focused ? ' win-focused' : '') + (ring ? ' win-ring' : '')}
      style={{
        ...box,
        zIndex: z,
        filter: dim ? 'brightness(0.4)' : undefined,
        pointerEvents: dim ? 'none' : undefined,
      }}
      onPointerDown={() => onFocus(id)}
    >
      <div
        className="win-bar"
        onPointerDown={onDown}
        onPointerMove={onMoveEvt}
        onPointerUp={onUp}
        onDoubleClick={() => onMax(id)}
      >
        <span style={{ flex: 1 }}>{title}</span>
        {badge > 0 && (
          <span className={pulse ? 'pulse-badge' : ''} style={{ color: 'var(--color-c12)' }}>
            !
          </span>
        )}
        <span
          style={{ cursor: 'pointer', padding: '0 1px' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            onMax(id)
          }}
        >
          {rect.max ? '-' : '+'}
        </span>
      </div>
      <div className="win-body">{children}</div>
    </div>
  )
}
