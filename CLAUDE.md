# FLAGGED

Pixel-art security game. You are at your laptop late at night handling
accounts for a small company. Approve or hold incoming requests.
One-day hackathon build. Judges and players are teenagers.

## Environment
Windows, cmd.exe. Never use bash-only syntax. Node 24. Branch is master.

## Stack
Vite + React + Tailwind v4. No TypeScript. Deployed on Vercel at
https://flagged-sooty.vercel.app
NEVER demo on localhost - always verify on the live Vercel URL.

## Rules
- MINIMAL COMMENTS. Only for non-obvious math. No JSDoc, no banners.
- Never commit an Anthropic API key. User-entered, localStorage only.
- No new dependencies without asking.
- Rules are DATA, not if-statements.
- Zero border-radius, zero blur, no transition over 100ms.
- Colors only from the 16 palette CSS variables.
- Everything must work with the AI disabled (baked fallback content).
- All in-game brands are fictional. Never name a real product.
- Telemetry contains NO personal data. Ever.

## Commands
npm run dev / npm run build / vercel --prod
