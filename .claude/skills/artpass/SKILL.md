---
name: artpass
description: The locked visual and audio spec for FLAGGED - stage size, Resurrect 16 palette, Silkscreen type, procedural avatars, CRT overlay, Web Audio. Use when writing or reviewing any CSS, rendering, or sound code.
---

# Art pass

The look is non-negotiable. Anything that breaks a rule below is a bug.

## Stage and scene

The stage is 640x360, CSS-scaled 2x with `image-rendering: pixelated`.
It shows a first-person cubicle: back wall, angled divider, desk, and a
monitor. Do NOT revert to the old flat 384x216 desktop.

- The room is drawn ONCE to an offscreen canvas in `src/lib/scene.js`
  (`bakeRoom`): walls, divider, desk, clutter, monitor bezel, lamp pool,
  monitor glow, dither, vignette, and all shadows are BAKED there.
  `src/components/Scene.jsx` blits that cache each frame and draws only
  what moves: the face-down phone, the buzz offsets, the pickup hand.
- Never rebuild the room as live CSS 3D transforms with many children,
  never animate box-shadow, and never lay a repeating-conic-gradient or
  large tiled gradient over the full frame. Dithering lives in the baked
  canvas only.
- The camera dolly is a transform on the single `#camera` wrapper
  (`will-change: transform; backface-visibility: hidden`), animated with
  `steps()` so it composites instead of repainting.
- The monitor UI is the `#monitor` div at (96,42), 384x216. All window
  layout inside it is still authored at 384x216 whole pixels. The CRT
  scanline/vignette overlay (`#crt`) and the flicker layer (`#monflick`)
  live INSIDE `#monitor` and must never cover the desk or the room.
- The phone (RELAY) rests face down on the desk at the rect exported as
  `PHONE`; its lifted DOM face is `#phone-panel` at the `PANEL` rect.
  Layout constants come from `src/lib/scene.js` - do not hardcode copies.
- Canvas code resolves the palette from the CSS variables at runtime
  (`resolvePalette`), so the palette stays defined in exactly one place.

Positions and sizes are whole numbers at 1x so nothing lands on a half
pixel.

## Palette

The 16 colors of Resurrect 16, defined once as CSS variables:

```css
--color-c00: #2e222f; --color-c01: #3e3546; --color-c02: #625565;
--color-c03: #966c6c; --color-c04: #ab947a; --color-c05: #694f62;
--color-c06: #7f708a; --color-c07: #9babb2; --color-c08: #c7dcd0;
--color-c09: #ffffff; --color-c10: #6daa2c; --color-c11: #d5e04b;
--color-c12: #fbff86; --color-c13: #b33831; --color-c14: #ea4f36;
--color-c15: #f57d4a;
```

No color may appear anywhere except as `var(--cNN)`. No hex literals in
components, no `rgba()`, no opacity used to invent an in-between shade.

## Type

Silkscreen only, at 7px or 14px. No other size, ever - 10px and 12px are
not options. Line height is a whole pixel multiple. No letter-spacing
tricks, no faux bold, no text shadow.

## Hard limits

- `border-radius: 0` everywhere. No rounded corners on anything.
- No `blur()`, no `backdrop-filter`, no soft shadows.
- No transition or animation step longer than 100ms. Prefer instant state
  changes and stepped keyframes over easing.

## Avatars

Faces are procedural 16x16 grids, never image files. Each avatar is an
array of 16 strings of 16 characters, where each character is a palette
index literal that maps to `--cNN`. Generate the grid deterministically
from a seed so the same character always renders identically. Draw to a
16x16 canvas or a grid of divs and scale up with pixelated rendering.

## CRT overlay

Scanlines and a vignette sit above the stage as a single overlay layer
with `pointer-events: none`. Scanlines are a repeating 1px gradient
aligned to the 1x pixel grid so they do not shimmer. The vignette is a
stepped gradient in palette colors, not a blur. The overlay never
intercepts clicks and never sits between interactive elements.

## Audio

Web Audio oscillators only. No audio files, no libraries. Square and
triangle waves, short envelopes, tuned to a small set of pitches so the
beeps feel like one instrument. Every sound must be mutable, and audio
context creation must be triggered by a user gesture.
