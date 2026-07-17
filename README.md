# wheel_spinner

A mobile-first "Wheel of Names" style spinner built with Next.js — with a twist: a hidden
panel lets you secretly rig the outcome. 🤫

## Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Features

- Enter names in the text field, one per line (defaults to 8 sample names on first visit)
- **Shuffle** and **Sort** buttons reorder the list
- Tap the wheel to spin (~4–5 s animation), winner pops up with confetti
- Remove the winner from the wheel straight from the winner popup
- Names and settings persist in `localStorage`

## The secret part 🤫

Tap the **bottom-right corner of the screen 10 times in a row** (within ~2.5 s between
taps). A hidden panel opens where you can, per name:

- 🎯 **Wins the next spin** — the wheel is guaranteed to land on this name on the next
  spin, after which the force automatically switches itself off
- 🚫 **Never wins** — the wheel will never land on this name (stays on until you turn it off)

The winner is decided *before* the animation starts and the wheel simply animates to that
segment (with a random offset inside it), so a rigged spin is indistinguishable from a fair
one. A name can't be 🎯 and 🚫 at the same time — enabling one disables the other. If every
name is banned, bans are ignored so the wheel never gets stuck. Rig settings survive page
reloads and are matched case-insensitively, so `eric` and `Eric` are the same person.

**Panic button:** tap the **bottom-left corner 5 times in a row** to silently wipe all
cheat settings (bans and forced winner) without opening the panel — no visual feedback,
no trace.

## Install as an app (Android)

The app ships a web manifest and launcher icons, so Chrome on Android can install it as a
standalone app: open the site (must be served over **HTTPS**, e.g. deployed on Vercel) →
Chrome menu (⋮) → **Add to Home screen** → **Install**. It launches full-screen with the
wheel icon, no browser UI.

Icons live in `public/icons/` and `app/apple-icon.png`; regenerate them with
`node scripts/generate-icons.mjs` (no image dependencies needed).

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Wheel, confetti: plain `<canvas>`, no extra dependencies
