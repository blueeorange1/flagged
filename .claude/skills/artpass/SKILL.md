---
name: artpass
description: The locked visual and audio spec for FLAGGED - stage size, Resurrect 16 palette, Silkscreen type, procedural avatars, CRT overlay, Web Audio. Use when writing or reviewing any CSS, rendering, or sound code.
---

# Art pass

The look is non-negotiable. Anything that breaks a rule below is a bug.

## Stage

A 384x216 stage scaled 3x to 1152x648. All layout is authored at 384x216;
the scale is applied once at the root, never per element. Every scaled
surface sets `image-rendering: pixelated`. Positions and sizes are whole
numbers at 1x so nothing lands on a half pixel.

## Palette

The 16 colors of Resurrect 16, defined once as CSS variables:

```css
--c00: #2e222f; --c01: #3e3546; --c02: #625565; --c03: #966c6c;
--c04: #ab947a; --c05: #694f62; --c06: #7f708a; --c07: #9babb2;
--c08: #c7dcd0; --c09: #ffffff; --c10: #6e2727; --c11: #b33831;
--c12: #ea4f36; --c13: #f57d4a; --c14: #ae2334; --c15: #e83b3b;
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
