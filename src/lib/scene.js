export const STAGE = { w: 960, h: 540 }
export const MON = { x: 240, y: 60, w: 480, h: 270 }
export const PHONE = { x: 820, y: 450, w: 88, h: 56 }
export const PANEL = { x: 724, y: 58, w: 208, h: 432 }

const DESK_Y = 332
const LIP_Y = 516

export function resolvePalette() {
  const cs = getComputedStyle(document.documentElement)
  return Array.from({ length: 16 }, (_, i) =>
    cs.getPropertyValue('--color-c' + String(i).padStart(2, '0')).trim()
  )
}

function layer() {
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
  // sparse dots
  const dots = (x, y, w, h, c, sx = 8, sy = 6) => {
    g.fillStyle = c
    for (let yy = 0; yy < h; yy += sy)
      for (let xx = (yy / sy) % 2 ? sx / 2 : 0; xx < w; xx += sx) g.fillRect(x + xx, y + yy, 1, 1)
  }
  return { cv, g, R, dith, dots }
}

// FAR: back wall covered in posters and pinned papers. Darkest, least detail.
function bakeFar(P) {
  const { cv, R, dith, dots } = layer()
  R(0, 0, 960, DESK_Y + 8, P[0])
  dots(0, 0, 960, DESK_Y, P[1], 12, 8)

  // faint warm wash on the wall behind the lamp (right)
  dith(750, 150, 210, DESK_Y - 150, P[1])
  dith(800, 190, 160, DESK_Y - 190, P[5])

  const poster = (x, y, w, h, edge) => {
    R(x, y, w, h, P[1])
    R(x, y, w, 1, P[2])
    R(x, y, 1, h, P[2])
    for (let i = 0; i < Math.floor(h / 14) - 1; i++) R(x + 5, y + 10 + i * 14, w - 14, 1, P[2])
    if (edge) R(x + w - 1, y, 1, h, P[5])
  }
  poster(36, 28, 92, 124)
  poster(148, 64, 72, 92)
  poster(250, 6, 112, 36)
  poster(380, 4, 140, 38)
  poster(540, 10, 84, 32)
  poster(646, 40, 66, 88)
  poster(760, 34, 108, 138, true)
  poster(884, 64, 58, 92, true)
  // small pinned papers
  const paper = (x, y, w, h, pin) => {
    R(x, y, w, h, P[1])
    R(x + 3, y + 5, w - 6, 1, P[2])
    R(x + 3, y + 10, w - 9, 1, P[2])
    if (pin) R(x + Math.floor(w / 2), y - 2, 3, 3, pin)
  }
  paper(58, 172, 44, 52)
  paper(118, 190, 36, 44)
  paper(228, 168, 40, 46)
  paper(742, 190, 38, 46, P[3])
  paper(796, 182, 46, 54, P[3])
  paper(880, 176, 40, 44)
  return cv
}

// MID: desk surface, monitor body, lamp, speaker, shelf. Mid brightness.
function bakeMid(P) {
  const { cv, R, dith, dots } = layer()

  // desk
  R(0, DESK_Y, 960, 540 - DESK_Y, P[1])
  R(0, DESK_Y, 960, 1, P[2])
  R(300, DESK_Y, 360, 1, P[6])
  dots(0, DESK_Y + 4, 960, 540 - DESK_Y - 4, P[5], 12, 5)
  // perspective seams converging toward a point behind the monitor
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    R(Math.round(40 + t * 290), Math.round(540 - t * 204), 2, 2, P[0])
    R(Math.round(920 - t * 290), Math.round(540 - t * 204), 2, 2, P[0])
  }
  // dark falloff outside the light pools
  dith(0, DESK_Y, 250, 208, P[0])
  dith(0, 440, 320, 100, P[0])

  // cold monitor glow widening toward the viewer
  dith(330, DESK_Y + 2, 300, 28, P[2])
  dith(298, DESK_Y + 30, 364, 36, P[2])
  dith(262, DESK_Y + 66, 436, 48, P[2])
  dith(390, DESK_Y + 2, 180, 32, P[6])

  // warm lamp pool on the right, stepped falloff
  dith(756, DESK_Y + 4, 204, 64, P[3])
  dith(716, DESK_Y + 66, 244, 84, P[3])
  dith(684, DESK_Y + 148, 276, 60, P[3])
  dith(788, DESK_Y + 22, 148, 84, P[4])

  // wall shelf with books, left, barely lit
  R(30, 220, 168, 6, P[1])
  R(30, 226, 6, 10, P[1])
  R(190, 226, 6, 10, P[1])
  const books = [
    [40, 190, 12, 30, P[5]],
    [54, 196, 10, 24, P[2]],
    [66, 186, 14, 34, P[5]],
    [82, 194, 10, 26, P[1]],
    [94, 190, 12, 30, P[2]],
    [112, 198, 26, 22, P[5]],
  ]
  for (const [x, y, w, h, c] of books) R(x, y, w, h, c)

  // speaker, left of monitor, right edge rimmed by monitor glow
  R(150, 272, 60, 64, P[0])
  R(154, 276, 52, 56, P[1])
  R(170, 284, 20, 2, P[2])
  R(166, 286, 2, 12, P[2])
  R(192, 286, 2, 12, P[2])
  R(170, 298, 20, 2, P[2])
  R(176, 314, 8, 8, P[2])
  R(208, 274, 2, 60, P[2])

  // monitor: bezel, screen hole, chin, neck, base, hard shadow
  dith(400, 370, 160, 10, P[0])
  R(226, 46, 508, 298, P[0])
  R(238, 58, 484, 274, P[2])
  R(240, 60, 480, 272, P[0])
  R(MON.x, MON.y, MON.w, MON.h, P[0])
  R(700, 336, 4, 4, P[10]) // power led
  R(450, 344, 60, 12, P[0])
  R(454, 344, 4, 12, P[2])
  R(415, 356, 130, 12, P[0])
  R(415, 356, 130, 2, P[2])

  // desk lamp on the right: base, stem, head throwing light down-left
  R(792, 346, 84, 10, P[0])
  R(792, 346, 84, 2, P[2])
  R(828, 262, 8, 86, P[0])
  R(820, 250, 42, 12, P[0])
  R(802, 252, 48, 6, P[0])
  R(796, 258, 56, 8, P[0])
  R(790, 266, 64, 8, P[5])
  R(794, 272, 56, 4, P[12]) // glowing slit under the shade
  dith(770, 276, 100, 26, P[4])
  // light cone in the air, stepped and dithered
  dith(786, 288, 84, 16, P[3])
  dith(760, 304, 136, 16, P[3])
  dith(732, 320, 196, 12, P[3])
  return cv
}

// NEAR: keyboard, mouse, mousepad, mug, papers, pen cup, cables. Brightest.
function bakeNear(P) {
  const { cv, R, dith } = layer()

  // papers, dim on the left, warm-lit on the right
  R(60, 460, 130, 44, P[2])
  R(70, 468, 96, 1, P[1])
  R(70, 476, 104, 1, P[1])
  R(70, 484, 88, 1, P[1])
  R(100, 494, 110, 36, P[2])
  R(110, 502, 80, 1, P[1])
  R(110, 510, 88, 1, P[1])
  R(700, 414, 84, 26, P[4])
  R(708, 420, 60, 1, P[3])
  R(708, 426, 66, 1, P[3])
  R(708, 432, 52, 1, P[3])

  // pen cup, in the monitor glow
  R(256, 382, 32, 36, P[2])
  R(256, 382, 32, 2, P[6])
  R(262, 366, 4, 20, P[14])
  R(270, 362, 4, 24, P[7])
  R(278, 368, 4, 18, P[10])

  // mug with a coffee ring beside it
  R(196, 428, 46, 46, P[13])
  R(196, 428, 46, 4, P[3])
  R(240, 438, 10, 18, P[13])
  R(243, 442, 4, 10, P[1])
  dith(196, 450, 46, 24, P[0])
  ;(() => {
    const cx = 272
    const cy = 500
    for (let a = 0; a < 16; a++) {
      const x = Math.round(cx + Math.cos((a / 16) * Math.PI * 2) * 12)
      const y = Math.round(cy + Math.sin((a / 16) * Math.PI * 2) * 6)
      R(x, y, 2, 1, P[2])
    }
  })()

  // sticky note near the keyboard
  R(654, 408, 30, 22, P[11])
  R(658, 414, 20, 1, P[5])
  R(658, 419, 16, 1, P[5])

  // cables
  for (let i = 0; i < 8; i++) R(545 + i * 14, 368 + i * 8, 14, 3, P[0])
  for (let i = 0; i < 5; i++) R(492, 372 + i * 11, 3, 7, P[0])
  for (let i = 0; i < 5; i++) R(908 + i * 11, 478 + i * 5, 11, 3, P[0])

  // keyboard filling the lower third, keys rimmed by monitor glow
  R(300, 424, 380, 88, P[0])
  R(306, 430, 368, 78, P[2])
  dith(306, 430, 368, 6, P[6])
  for (let ky = 0; ky < 4; ky++)
    for (let kx = 0; kx < 18; kx++) {
      const x = 312 + kx * 20
      const y = 438 + ky * 16
      R(x, y, 16, 12, P[5])
      if (ky < 2 && kx > 2 && kx < 15) R(x, y, 16, 1, P[7])
    }
  R(400, 498, 180, 8, P[5])
  R(400, 498, 180, 1, P[6])

  // mousepad + mouse under the lamp
  R(700, 446, 104, 64, P[5])
  R(700, 446, 104, 2, P[3])
  R(734, 462, 28, 40, P[2])
  R(734, 462, 28, 6, P[6])
  R(758, 468, 4, 28, P[3])
  R(746, 464, 2, 10, P[0])

  // phone resting shadow (the phone itself is drawn per frame)
  R(PHONE.x + 3, PHONE.y + PHONE.h - 3, PHONE.w, 7, P[0])
  return cv
}

// EDGE: desk lip across the very bottom + heavy corner vignette. Frames the shot.
function bakeEdge(P) {
  const { cv, R, dith } = layer()
  R(0, LIP_Y, 960, 540 - LIP_Y, P[0])
  R(0, LIP_Y, 960, 2, P[1])

  dith(0, 0, 960, 18, P[0])
  dith(0, 522, 960, 18, P[0])
  dith(0, 0, 18, 540, P[0])
  dith(942, 0, 18, 540, P[0])
  // heavier corners
  dith(0, 0, 70, 70, P[0])
  dith(2, 2, 70, 70, P[0])
  dith(890, 0, 70, 70, P[0])
  dith(892, 2, 70, 70, P[0])
  dith(0, 470, 70, 70, P[0])
  dith(2, 472, 70, 70, P[0])
  dith(890, 470, 70, 70, P[0])
  dith(892, 472, 70, 70, P[0])
  R(0, 0, 960, 5, P[0])
  R(0, 535, 960, 5, P[0])
  R(0, 0, 5, 540, P[0])
  R(955, 0, 5, 540, P[0])
  return cv
}

export function bakeLayers(P) {
  return [bakeFar(P), bakeMid(P), bakeNear(P), bakeEdge(P)]
}

export function drawPhoneClosed(g, P, dx = 0, dy = 0) {
  const { x, y, w, h } = PHONE
  const px = x + dx
  const py = y + dy
  g.fillStyle = P[0]
  g.fillRect(px, py, w, h)
  g.fillStyle = P[3] // warm rim from the lamp
  g.fillRect(px, py, w, 2)
  g.fillStyle = P[2]
  g.fillRect(px, py, 2, h)
  g.fillStyle = P[5]
  g.fillRect(px + 8, py + 8, 16, 16) // camera bump
  g.fillStyle = P[0]
  g.fillRect(px + 12, py + 12, 8, 8)
  g.fillStyle = P[2]
  for (let i = 0; i < 3; i++) g.fillRect(px + 38 + i * 14, py + h - 10, 8, 2)
}

// t: 0..1 through the pickup. Reverse t for the put-down.
// The phone rises and rotates flat-on by itself - no hand.
export function drawPickup(g, P, t) {
  const f = Math.min(5, Math.floor(t * 6)) // 6 stepped frames
  const fx = [820, 816, 806, 780, 750, 724][f]
  const fy = [450, 436, 392, 300, 170, 58][f]
  const fw = [88, 88, 72, 120, 170, 208][f]
  const fh = [56, 60, 96, 200, 320, 432][f]
  g.fillStyle = P[0]
  g.fillRect(fx, fy, fw, fh)
  g.fillStyle = P[3]
  g.fillRect(fx, fy, fw, 2)
  g.fillStyle = P[2]
  g.fillRect(fx, fy, 2, fh)
  if (f >= 3) {
    // face flipped toward us: dark screen with a glint
    g.fillStyle = P[1]
    g.fillRect(fx + 6, fy + 8, fw - 12, fh - 16)
    g.fillStyle = P[7]
    g.fillRect(fx + 9, fy + 12, 3, Math.max(3, fh - 24))
  } else {
    g.fillStyle = P[5]
    g.fillRect(fx + 8, fy + 8, Math.max(8, Math.round(fw * 0.18)), Math.max(8, Math.round(fh * 0.2)))
  }
}
