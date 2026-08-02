---
name: artpass
description: The locked visual and audio spec for FLAGGED - stage size, Resurrect 16 palette, Silkscreen type, procedural avatars, CRT overlay, Web Audio. Use when writing or reviewing any CSS, rendering, or sound code.
---

# Art pass

The look is non-negotiable. Anything that breaks a rule below is a bug.

## Stage and scene

The stage is 960x540 (16:9), scaled with a NON-integer
`--stage-scale = min(vw/960, vh/540)` so the scene fills the viewport
edge to edge, `image-rendering: pixelated`. Do NOT revert to a fixed
integer scale or a centered island.

It is a dark bedroom desk at night: monitor dominant and centered, desk
running off both side edges, poster wall behind, lamp on the right,
keyboard filling the lower third.

- The scene is baked ONCE into FOUR depth-layer offscreen canvases in
  `src/lib/scene.js` (`bakeLayers` -> [far, mid, near, edge]):
  - FAR: wall, posters, pinned papers - darkest, lowest contrast.
  - MID: desk surface, monitor bezel + neck, lamp, shelf, speaker,
    cold monitor-glow trapezoid, warm lamp pool.
  - NEAR: keyboard, mousepad + mouse, mug, pen cup, papers, cables,
    phone shadow - brightest, most detail.
  - EDGE: desk lip across the very bottom + stepped dither vignette on
    all four corners. Framing layer, blitted last of the statics.
  `src/components/Scene.jsx` blits the four caches back to front each
  dirty frame (signature-skip when nothing changed), then draws only
  what moves: the face-down phone, buzz offsets, the pickup frames.
- There is NO hand. Pickup is 6 stepped frames of the phone itself
  rising and rotating flat-on (`drawPickup`), ending on the `PANEL`
  rect so the DOM phone face swaps in seamlessly.
- Never rebuild the room as live CSS 3D transforms with many children,
  never animate box-shadow, and never lay a repeating-conic-gradient or
  large tiled gradient over the full frame. Dithering lives in the baked
  canvases only.
- The camera dolly is a transform on the single `#camera` wrapper
  (`will-change: transform; backface-visibility: hidden`,
  transform-origin 810px 320px), animated with `steps()` so it
  composites instead of repainting.
- The monitor UI is the `#monitor` div at (240,60), 480x270. All window
  layout inside it is authored at 480x270 whole pixels (`DESK` in
  `Win.jsx`: usable area y 12..248). Windows drag AND resize (7x7
  bottom-right handle, min 120x70), clamped inside the bezel; render
  order in App.jsx is FIXED with z-index from `zorder` - reordering DOM
  nodes on focus drops pointer capture mid-drag. The CRT overlay
  (`#crt`) and flicker layer (`#monflick`) live INSIDE `#monitor` and
  must never cover the desk or the room.
- The phone (RELAY) rests face down on the desk at the rect exported as
  `PHONE`; its lifted DOM face is `#phone-panel` at the `PANEL` rect.
  Layout constants come from `src/lib/scene.js` - do not hardcode copies.
- Tutorial spotlight = 2px pulsing `.spot-box` outline PLUS an SVG
  scrim (`.spot-scrim`, evenodd path with holes over every lit target
  and the hint strip), 2px connector segments, 12px stepped chevron.
  The scrim renders only when it has holes (no first-frame flash).
- Canvas code resolves the palette from the CSS variables at runtime
  (`resolvePalette`), so the palette stays defined in exactly one place.
- Perf budget: 16.7ms/frame. Measured 2026-08 at avg 16.67ms / max
  16.8ms with the monitor UI live. Anything that pushes a static element
  into the per-frame path is a bug.

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
