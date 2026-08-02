export const STAGE = { w: 640, h: 360 }
export const MON = { x: 96, y: 42, w: 384, h: 216 }
export const PHONE = { x: 516, y: 296, w: 70, h: 44 }
export const PANEL = { x: 482, y: 40, w: 154, h: 300 }

export function resolvePalette() {
  const cs = getComputedStyle(document.documentElement)
  return Array.from({ length: 16 }, (_, i) =>
    cs.getPropertyValue('--color-c' + String(i).padStart(2, '0')).trim()
  )
}

export function bakeRoom(P) {
  const cv = document.createElement('canvas')
  cv.width = STAGE.w
  cv.height = STAGE.h
  const g = cv.getContext('2d')
  const R = (x, y, w, h, c) => {
    g.fillStyle = c
    g.fillRect(x, y, w, h)
  }
  // 50% checker of 2x2 cells
  const dith = (x, y, w, h, c) => {
    g.fillStyle = c
    for (let yy = 0; yy < h; yy += 2)
      for (let xx = yy % 4 === 0 ? 0 : 2; xx < w; xx += 4) g.fillRect(x + xx, y + yy, 2, 2)
  }
  // 25% sparse dots
  const dots = (x, y, w, h, c, sx = 8, sy = 6) => {
    g.fillStyle = c
    for (let yy = 0; yy < h; yy += sy)
      for (let xx = (yy / sy) % 2 ? sx / 2 : 0; xx < w; xx += sx) g.fillRect(x + xx, y + yy, 1, 1)
  }

  const horizon = 278

  // back wall + fabric texture
  R(0, 0, 640, horizon, P[1])
  dots(0, 0, 640, horizon, P[5])
  dots(3, 3, 640, horizon, P[0], 16, 10)

  // warm lamp pool, upper left, stepped falloff
  dith(0, 0, 300, 40, P[3])
  dith(0, 0, 240, 90, P[3])
  dith(0, 0, 170, 140, P[3])
  dith(0, 0, 90, 190, P[3])
  dith(6, 4, 120, 60, P[4])
  dith(6, 4, 60, 110, P[4])

  // side divider, left, angled top edge for depth
  for (let x = 0; x < 88; x += 4) {
    const top = Math.round(x * 0.55)
    R(x, top, 4, horizon - top, P[5])
    R(x, top, 4, 2, P[6])
  }
  dots(0, 60, 88, horizon - 60, P[2])
  R(86, 48, 2, horizon - 48, P[0])
  // pinned notes on divider
  R(18, 96, 26, 22, P[4])
  R(20, 98, 22, 2, P[2])
  R(20, 104, 16, 1, P[2])
  R(20, 108, 19, 1, P[2])
  R(29, 94, 3, 3, P[14])
  R(30, 150, 22, 28, P[7])
  R(32, 156, 16, 1, P[2])
  R(32, 161, 13, 1, P[2])
  R(32, 166, 15, 1, P[2])
  R(39, 148, 3, 3, P[13])

  // pinned notes on back wall, right of monitor
  R(540, 70, 30, 24, P[11])
  R(544, 76, 20, 1, P[5])
  R(544, 81, 14, 1, P[5])
  R(553, 68, 3, 3, P[14])
  R(548, 120, 24, 30, P[7])
  R(551, 126, 16, 1, P[2])
  R(551, 131, 18, 1, P[2])
  R(551, 136, 12, 1, P[2])
  R(558, 118, 3, 3, P[13])
  R(520, 180, 34, 20, P[4])
  R(524, 186, 24, 1, P[2])
  R(524, 191, 18, 1, P[2])
  R(535, 178, 3, 3, P[14])

  // desk
  R(0, horizon, 640, 360 - horizon, P[1])
  R(0, horizon, 640, 2, P[6])
  R(0, horizon + 2, 640, 2, P[2])
  dots(0, horizon + 6, 640, 360 - horizon - 6, P[5], 10, 4)
  // lamp pool on desk, left
  dith(0, horizon + 2, 150, 82, P[3])
  dith(0, horizon + 2, 80, 82, P[4])
  // monitor glow on desk, cold, widening toward viewer
  dith(150, horizon + 4, 300, 20, P[2])
  dith(130, horizon + 24, 340, 26, P[2])
  dith(110, horizon + 50, 380, 32, P[2])
  dith(220, horizon + 6, 160, 40, P[6])

  // hard shadows on desk (monitor, keyboard, phone area lit later)
  R(120, horizon + 14, 370, 8, P[0])
  R(196, 342, 216, 6, P[0])

  // monitor: bezel, screen hole, neck, base
  R(82, 28, 412, 248, P[0])
  R(86, 32, 404, 240, P[2])
  R(88, 34, 400, 236, P[0])
  // screen backing (DOM sits exactly on MON rect)
  R(MON.x, MON.y, MON.w, MON.h, P[0])
  R(468, 268, 3, 3, P[10]) // power led
  R(268, 276, 40, 12, P[0])
  R(270, 276, 4, 12, P[2])
  R(240, 288, 96, 8, P[0])
  R(240, 288, 96, 2, P[2])

  // cables: monitor to desk edge, stepped
  for (let i = 0; i < 9; i++) R(336 + i * 8, 292 + i * 7, 8, 3, P[0])
  for (let i = 0; i < 5; i++) R(200 - i * 10, 336 + i * 4, 10, 3, P[0])

  // keyboard
  R(196, 312, 216, 30, P[0])
  R(198, 314, 212, 26, P[2])
  for (let ky = 0; ky < 3; ky++)
    for (let kx = 0; kx < 19; kx++) R(202 + kx * 11, 317 + ky * 7, 8, 4, P[5])
  R(258, 338, 90, 3, P[5]) // space bar
  dith(198, 314, 212, 6, P[6])

  // mousepad + mouse
  R(428, 306, 62, 40, P[5])
  R(428, 306, 62, 2, P[2])
  R(446, 316, 18, 26, P[2])
  R(446, 316, 18, 4, P[6])
  R(454, 318, 2, 6, P[0])

  // papers, left of keyboard
  R(96, 300, 74, 26, P[7])
  R(104, 296, 66, 22, P[8])
  R(110, 301, 44, 1, P[2])
  R(110, 305, 50, 1, P[2])
  R(110, 309, 38, 1, P[2])
  R(150, 322, 34, 14, P[11])
  R(154, 326, 22, 1, P[5])

  // coffee ring + mug
  g.fillStyle = P[3]
  const cx = 120,
    cy = 338
  for (let a = 0; a < 16; a++) {
    const x = Math.round(cx + Math.cos((a / 16) * Math.PI * 2) * 9)
    const y = Math.round(cy + Math.sin((a / 16) * Math.PI * 2) * 5)
    g.fillRect(x, y, 2, 1)
  }
  R(52, 306, 26, 26, P[13])
  R(52, 306, 26, 4, P[3])
  R(76, 312, 6, 10, P[13])
  R(78, 314, 2, 6, P[1])

  // pen cup
  R(160, 260, 24, 22, P[2])
  R(160, 260, 24, 2, P[6])
  R(164, 246, 3, 16, P[14])
  R(170, 242, 3, 20, P[7])
  R(176, 248, 3, 14, P[10])

  // phone resting shadow (phone itself is drawn per frame)
  R(PHONE.x + 3, PHONE.y + PHONE.h - 3, PHONE.w, 6, P[0])

  // baked vignette: stepped dark bands at frame edges
  dith(0, 0, 640, 14, P[0])
  dith(0, 346, 640, 14, P[0])
  dith(0, 0, 14, 360, P[0])
  dith(626, 0, 14, 360, P[0])
  R(0, 0, 640, 4, P[0])
  R(0, 356, 640, 4, P[0])
  R(0, 0, 4, 360, P[0])
  R(636, 0, 4, 360, P[0])

  return cv
}

export function drawPhoneClosed(g, P, dx = 0, dy = 0) {
  const { x, y, w, h } = PHONE
  const px = x + dx
  const py = y + dy
  g.fillStyle = P[0]
  g.fillRect(px, py, w, h)
  g.fillStyle = P[2]
  g.fillRect(px, py, w, 2)
  g.fillRect(px, py, 2, h)
  g.fillStyle = P[5]
  g.fillRect(px + 6, py + 6, 12, 12) // camera bump
  g.fillStyle = P[0]
  g.fillRect(px + 9, py + 9, 6, 6)
  g.fillStyle = P[2]
  for (let i = 0; i < 3; i++) g.fillRect(px + 30 + i * 12, py + h - 8, 6, 2)
}

// t: 0..1 through the pickup. Reverse t for the put-down.
export function drawPickup(g, P, t) {
  const f = Math.min(5, Math.floor(t * 6)) // 6 stepped frames
  // hand slides in from lower right
  const hx = [620, 560, 540, 552, 560, 580][f]
  const hy = [352, 330, 316, 260, 190, 150][f]
  if (f <= 1) drawPhoneClosed(g, P, f === 1 ? -1 : 0, f === 1 ? -2 : 0)
  if (f >= 2) {
    // phone lifting, rotating to portrait, growing toward the panel rect
    const fw = [0, 0, 60, 40, 60, 120][f]
    const fh = [0, 0, 34, 64, 110, 220][f]
    const fx = [0, 0, 522, 540, 528, 498][f]
    const fy = [0, 0, 280, 236, 160, 70][f]
    g.fillStyle = P[0]
    g.fillRect(fx, fy, fw, fh)
    g.fillStyle = P[2]
    g.fillRect(fx, fy, fw, 2)
    g.fillRect(fx, fy, 2, fh)
    if (f >= 3) {
      // face flipping toward us: dark screen with a glint
      g.fillStyle = P[1]
      g.fillRect(fx + 4, fy + 6, fw - 8, fh - 12)
      g.fillStyle = P[7]
      g.fillRect(fx + 6, fy + 8, 2, Math.max(2, fh - 16))
    }
  }
  // blocky hand
  g.fillStyle = P[4]
  g.fillRect(hx, hy, 26, 36)
  g.fillRect(hx - 6, hy + 8, 8, 20)
  g.fillStyle = P[3]
  g.fillRect(hx, hy, 26, 4)
  for (let i = 0; i < 3; i++) g.fillRect(hx + 2 + i * 8, hy - 4, 6, 6)
}
