export const PALETTE = [
  '#2e222f', '#3e3546', '#625565', '#966c6c',
  '#ab947a', '#694f62', '#7f708a', '#9babb2',
  '#c7dcd0', '#ffffff', '#6daa2c', '#d5e04b',
  '#fbff86', '#b33831', '#ea4f36', '#f57d4a',
]

const HEX = '0123456789abcdef'

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rngFrom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SKINS = [3, 4, 8, 15]
const HAIRS = [0, 1, 5, 13, 15, 10, 2]
const SHIRTS = [2, 5, 6, 11, 14, 7, 13]

export function avatarGrid(seed) {
  const rng = rngFrom(hash(String(seed)))
  const skin = SKINS[Math.floor(rng() * SKINS.length)]
  const hair = HAIRS[Math.floor(rng() * HAIRS.length)]
  const shirt = SHIRTS[Math.floor(rng() * SHIRTS.length)]
  const style = Math.floor(rng() * 4)
  const glasses = rng() < 0.3
  const eye = skin === 8 ? 0 : 0

  const g = []
  for (let y = 0; y < 16; y++) g.push(new Array(16).fill('.'))

  const set = (x, y, v) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = HEX[v]
  }

  for (let y = 3; y <= 11; y++) for (let x = 4; x <= 11; x++) set(x, y, skin)
  set(4, 3, '.')
  set(11, 3, '.')
  set(4, 11, '.')
  set(11, 11, '.')

  for (let x = 4; x <= 11; x++) set(x, 2, hair)
  for (let x = 4; x <= 11; x++) set(x, 3, hair)
  if (style === 0) {
    set(3, 3, hair)
    set(12, 3, hair)
    set(3, 4, hair)
    set(12, 4, hair)
  } else if (style === 1) {
    for (let y = 3; y <= 9; y++) {
      set(3, y, hair)
      set(12, y, hair)
    }
  } else if (style === 2) {
    for (let x = 3; x <= 12; x++) set(x, 2, hair)
    set(3, 3, hair)
    set(12, 3, hair)
    set(4, 4, hair)
    set(11, 4, hair)
  } else {
    set(5, 1, hair)
    set(7, 1, hair)
    set(9, 1, hair)
    set(3, 3, hair)
    set(12, 3, hair)
  }

  set(6, 7, eye)
  set(9, 7, eye)
  if (glasses) {
    set(5, 7, 7)
    set(7, 7, 7)
    set(8, 7, 7)
    set(10, 7, 7)
    set(6, 6, 7)
    set(9, 6, 7)
  }

  set(7, 9, 5)
  set(8, 9, 5)

  for (let y = 12; y <= 15; y++) for (let x = 3; x <= 12; x++) set(x, y, shirt)
  set(7, 12, skin)
  set(8, 12, skin)
  set(3, 12, '.')
  set(12, 12, '.')

  return g.map((row) => row.join(''))
}

export function drawAvatar(canvas, seed) {
  const grid = avatarGrid(seed)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 16, 16)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = grid[y][x]
      if (ch === '.') continue
      ctx.fillStyle = PALETTE[HEX.indexOf(ch)]
      ctx.fillRect(x, y, 1, 1)
    }
  }
}
