# Gochara — गोचर

Planetary transit timeline visualizer. Plots the sidereal geocentric
longitude of all 12 bodies (Sun → Pluto + Rahu/Ketu) against time, with
zodiac-aware Y-axis bands and a zoomable time axis spanning minutes to
40+ years.

**Calculations are real** — Swiss Ephemeris via `pyswisseph`, using the
exact same approach as the sibling [`astro-engine`](https://github.com/DSK369/astro-engine)
project: tropical longitude minus a caller-supplied ayanamsa (not
`FLG_SIDEREAL` — see `backend/ayanamsa.py` for why), with KP / Lahiri /
Raman / Fagan-Bradley / Custom-KP (23°44'18") modes and Mean/True node
choice for Rahu/Ketu.

## How it works

- **`backend/`** is a small FastAPI app. `POST /api/ephemeris` takes a
  time range + timezone + calculation settings, evenly samples it at up
  to 3000 points, and for each sample calls Swiss Ephemeris once per
  active planet — returning arrays of `{times, series, retro}` (epoch
  ms, sidereal longitude per planet, retrograde flag per planet). No
  chart/DB/state — every request is a fresh calculation.
- **`frontend/`** is a dependency-free static page (no build step, no
  npm). `app.js` fetches from `/api/ephemeris`, draws the bands/curves/
  grid/crosshair on a `<canvas>`, and re-fetches (debounced) whenever
  you zoom, pan, or change a setting.
- The FastAPI process serves **both** the API and the static frontend
  from one port — there's no separate frontend dev server to run.
- Ephemeris data files are **not duplicated** — the backend points at
  `../astro-engine/ephemeris` (falls back to Swiss Ephemeris's built-in
  lower-precision Moshier model if that folder isn't found).

## Features

- **Y axis granularity**: Rashi (12 × 30°), Nakshatra (27 × 13°20'),
  Nakshatra-Charan (108 × 3°20') — bilingual band labels (EN / हिंदी)
- **X axis**: continuous timeline; scroll-wheel zoom + drag pan from
  ~30 minutes up to 45 years; tick labels adapt (minutes → hours →
  dates → months → years); quick-span presets (1 day … 40 years)
- **Calendar gridlines**: toggle vertical Date/Month/Year lines to
  read off exact calendar boundaries
- **Crosshair**: always-on hover crosshair showing the exact X (time)
  and Y (zodiac position) value under the cursor, independent of
  whether a curve is nearby
- **Location aware**: city autocomplete sets the IANA timezone used for
  the time axis and all displayed timestamps (geocentric longitudes
  themselves don't depend on location — only local time display does)
- **Retrograde**: computed from real planetary speed; retrograde
  stretches render dashed and are flagged in the hover tooltip
- **Tooltip**: nearest curve shows planet, local time, degree (DMS in
  rashi), rashi, nakshatra, and charan
- UI styled on the Linear design spec from `awesome-design-md`

## Setup & run

**Prerequisites**: Python 3.9+, and Swiss Ephemeris data files
somewhere the backend can find them (see "How it works" above — by
default it looks for `../astro-engine/ephemeris` relative to this repo).

### Using astro-engine's existing environment (simplest, if you have it cloned as a sibling folder)

```
cd gochara
..\astro-engine\venv\Scripts\python.exe -m uvicorn backend.main:app --port 8100
```

### Standalone (fresh environment, no astro-engine needed)

```
cd gochara
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python -m uvicorn backend.main:app --port 8100
```

Without an `ephemeris/` folder available, Swiss Ephemeris falls back to
its built-in Moshier model automatically — the app still runs, just at
lower precision than the full DE431-based data files.

Then open **http://localhost:8100** — that single process serves both
the UI and the API.

### API endpoints

- `GET /api/meta` — supported planet list, ayanamsa modes, max sample points
- `POST /api/ephemeris` — body: `{start, end, timezone, points, ayanamsa_mode, node_type, planets}` (see `backend/main.py`'s `EphemerisRequest` for full field docs/defaults) → `{ayanamsa, ayanamsaValueAtStart, times, series, retro}`

### Troubleshooting

- **`No time zone found with key ...`** — Windows Python lacks a
  built-in IANA timezone database; `pip install tzdata` (already in
  `requirements.txt`, but call this out since it's the most common
  first-run error).
- **Port 8100 already in use** — pass a different `--port` to uvicorn
  and open that port instead.
- **Curves look flat/wrong** — check the `ayanamsa_mode`/`node_type`
  selectors in the sidebar; different ayanamsa modes shift all
  longitudes by a constant, and Mean vs True node noticeably changes
  Rahu/Ketu's path.

## Layout

```
backend/
  main.py        FastAPI app: /api/ephemeris, /api/meta + static frontend
  ephemeris.py   swisseph time-series sampler (same math as astro-engine)
  ayanamsa.py    ayanamsa modes (mirrors astro-engine/core/ayanamsa.py)
frontend/
  index.html     single-page UI
  app.js         canvas renderer, zoom/pan, crosshair, gridlines, i18n
  astro-data.js  rashi/nakshatra/planet tables (EN/HI) + helpers
  cities.js      city → lat/lon/tz lookup (mirrors astro-engine's dataset)
  style.css      Linear-spec dark theme
```
