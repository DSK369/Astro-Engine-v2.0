# Astro Engine v2.0

A Vedic & KP astrology birth chart calculator — birth data input with
location autocomplete, North/South Indian chart display, Ruling Planets,
planetary/cuspal tables, and KP 4-step significators.

**Live demo**: https://dsk369.github.io/Astro-Engine-v2.0/

## About this repo

This is a standalone frontend demo. It runs on validated mock data (a real
sample chart, cross-checked against professional KP software output) —
there's no live backend API behind it yet. See `src/lib/api.js` for the
mock/swap point if that changes later.

## Run locally

```
npm install
npm run dev
```

## Build

```
npm run build
```

Deploys automatically to GitHub Pages on push to `main` via
`.github/workflows/deploy.yml`.
