---
name: ship
description: Build, verify no API key is committed, push, then verify the live Vercel deploy by playing a case. Use when the user says "ship it", "deploy", "push to prod", or before a demo.
---

# Ship

Ship FLAGGED to production and verify it on the live URL. Never report success
from localhost.

## 1. Build

Run `npm run build`. If it fails, stop and fix the build before anything else.

## 2. Key check

The Anthropic API key is user-entered and lives in localStorage only. It must
never reach the repo. Search tracked files for `sk-ant`, `ANTHROPIC_API_KEY`,
and any `.env` that is not ignored. If anything turns up, stop, tell the user,
and do not push.

## 3. Push

Commit and push to `origin master`.

## 4. Verify live

Deploy with `vercel --prod` if the push does not auto-deploy, then open
https://flagged-sooty.vercel.app in a browser. Wait for the new build, not a
cached one.

## 5. Play one case

On the live URL, with the AI disabled so the baked fallback content is used:

- The stage renders and the pixel art is crisp, not smeared.
- One request loads, and both approve and hold respond.
- The verdict and score update.
- The console is free of errors.

## 6. Report

State what shipped and list anything broken. If something is broken, say so
plainly rather than describing the deploy as successful.
