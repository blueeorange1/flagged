let ctx = null
let muted = false

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(v) {
  muted = v
}

export function isMuted() {
  return muted
}

function tone(freq, dur, type = 'square', gain = 0.05, delay = 0) {
  if (muted) return
  const a = ac()
  const t0 = a.currentTime + delay
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005)
  g.gain.setValueAtTime(gain, t0 + dur - 0.01)
  g.gain.linearRampToValueAtTime(0, t0 + dur)
  osc.connect(g)
  g.connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export const sfx = {
  blip: () => tone(1400, 0.012, 'square', 0.018),
  click: () => tone(440, 0.03, 'square', 0.035),
  open: () => {
    tone(330, 0.03, 'square', 0.04)
    tone(495, 0.04, 'square', 0.035, 0.03)
  },
  msg: () => {
    tone(660, 0.04, 'triangle', 0.05)
    tone(880, 0.05, 'triangle', 0.045, 0.05)
  },
  approve: () => {
    tone(523, 0.05, 'square', 0.05)
    tone(659, 0.05, 'square', 0.05, 0.05)
    tone(784, 0.09, 'square', 0.05, 0.1)
  },
  hold: () => {
    tone(392, 0.06, 'square', 0.05)
    tone(294, 0.1, 'square', 0.05, 0.06)
  },
  right: () => {
    tone(784, 0.05, 'triangle', 0.05)
    tone(1047, 0.11, 'triangle', 0.05, 0.05)
  },
  wrong: () => {
    tone(196, 0.09, 'square', 0.06)
    tone(147, 0.16, 'square', 0.06, 0.09)
  },
  alert: () => {
    tone(880, 0.05, 'square', 0.05)
    tone(587, 0.05, 'square', 0.05, 0.07)
    tone(880, 0.05, 'square', 0.05, 0.14)
  },
  buzz: (i = 1) => {
    tone(64, 0.06, 'square', 0.02 + i * 0.012)
    tone(58, 0.06, 'square', 0.02 + i * 0.012, 0.07)
    tone(64, 0.06, 'square', 0.02 + i * 0.012, 0.14)
  },
  rumble: (i = 3) => {
    tone(38, 0.3 + i * 0.06, 'triangle', 0.03 + i * 0.008)
    tone(29, 0.34 + i * 0.06, 'triangle', 0.025 + i * 0.008)
  },
  ding: () => {
    tone(988, 0.05, 'triangle', 0.05)
    tone(1319, 0.09, 'triangle', 0.045, 0.06)
  },
  klaxon: () => {
    for (let i = 0; i < 5; i++) {
      const t = i * 0.62
      tone(784, 0.28, 'sawtooth', 0.08, t)
      tone(523, 0.3, 'sawtooth', 0.08, t + 0.3)
    }
    tone(47, 3.2, 'sawtooth', 0.04)
    tone(35, 3.2, 'square', 0.03, 0.04)
  },
  day: () => {
    tone(392, 0.06, 'triangle', 0.045)
    tone(523, 0.06, 'triangle', 0.045, 0.06)
    tone(659, 0.06, 'triangle', 0.045, 0.12)
    tone(784, 0.14, 'triangle', 0.045, 0.18)
  },
}
