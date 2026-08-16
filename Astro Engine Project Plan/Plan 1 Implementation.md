# Plan 1 — Implementation Log

**What this document is:** a session-by-session implementation log — distinct from Plans 1–6,
which are *specifications* (what the engine should do). This tracks what was actually built,
every file touched, every verification run, and every dead end or mistake hit along the way,
in enough detail that a future session (or a human reviewer) can retrace the exact path without
re-deriving it. "Plan 1" here numbers this as the first log in that series, not a re-use of
"Plan 1 Astro Engine.md"'s own numbering.

**Session covered:** 16 Aug 2026, continuing directly from the state described in this folder's
`README.md` as of its last update. Implements items 6, 7, and 8 of the README's "Suggested
order of work" — Panchanga per-limb end times, the Muhurta engine, and divisional charts
(Vargas) — end to end: backend logic, verification, API wiring, and frontend UI for all three.

**Result committed as:** `7f1a6b10a7e5c66aa17a7ce02626d3bc2eeb2d97` on branch `15-Aug-2026-v3`
of the `Astro-Engine-v2.0` repo, 16 Aug 2026 19:37 IST. 15 files changed, 1192 insertions(+),
37 deletions(-).

---

## 0. Starting state and how it was established

Before writing any code, the actual current state of the repo was re-derived from primary
sources rather than trusted from this folder's `README.md` at face value — the README itself
turned out to be stale on one point (see §0.1). Steps taken, in order:

1. `ls` at `try/1/` — confirmed only two things exist in this environment: the
   `Astro Engine Project Plan/` folder (this one) and `Astro-Engine-v2.0/` (frontend + backend
   in one repo, `backend/` subfolder). **Important environment fact**: the `research/`,
   `Project_v2/`, and `astro-engine-v2/` directories this plan folder's other documents
   reference throughout do **not exist** in this environment — they were used in whatever
   session(s) produced the already-committed accuracy fixes and Plan 4's PyJHora verification,
   but are not present here. This matters for §3's Vargas work: it could not be independently
   re-verified against live PyJHora execution here, only against the plan's own documented
   formulas plus manual cross-checks (see §3.3).
2. `git log --format="%h %ad %s" --date=format:"%Y-%m-%d %H:%M"` inside `Astro-Engine-v2.0` —
   found the four most recent commits (`80b5f0d`, `7f74a41`, `71810ac`, `641968a`) were all
   timestamped 16 Aug 2026, 02:42–03:23, i.e. **already done before this session started**.
3. `find backend/core -maxdepth 1 -type f` — confirmed exactly what existed already:
   `jd.py`, `ayanamsa.py`, `planets.py`, `astro.py`, `houses.py`, `kp.py`, `dasha.py`,
   `dasha_tree.py`, `utils.py`, `cusps.py`, `significators.py`, `ruling_planets.py`,
   `panchang.py`, `riseset.py`, `horary.py` — no `muhurta.py`, no `vargas/`, no `gochara`
   anything.

### 0.1 A correction found in this folder's own README

The README's "Suggested order of work" §5 said "Reconcile with `Project_v2/Project/
astro-engine`... **Not yet done**." The git log from step 2 above contradicts this directly —
`7f74a41` ("Merge root astro-engine's accuracy fixes and new modules into backend/") and
`71810ac` ("Merge astro-engine-v2's KP Horary engine into backend/") are exactly that
reconciliation, and they predate this session. The README was corrected in place (see that
file's own §5 entry) rather than left wrong, and this log preserves the fact that it was found
via git history, not asserted from memory.

**Lesson applied throughout the rest of this session**: a planning document's claims about
"what's done" are a hypothesis to check against primary sources (git log, live code, live
computation), not a fact to build on unchecked. This came up again in §3.4.

---

## 1. Panchang per-limb end times

**Spec source:** `Plan 1 Astro Engine.md` §10 (Tithi), §15 (Nakshatra), §16 (Yoga), §18–19
(Karana), §57 (uniform timing interface: `name`/`start`/`end`/`durationSeconds`/
`remainingSeconds`).

**Files read before writing code:**
- `Plan 1 Astro Engine.md` lines 386–585 (§10–§16, the boundary-solving spec) and 1490–1670
  (§55–§59, the response-shape spec) — read via targeted `Read` calls at those line ranges
  after a `Grep` for `^# \d+\.` found every section's line number.
- `Astro-Engine-v2.0/backend/core/panchang.py` (the pre-existing 75-line version — name-lookup
  only, no timing).
- `Astro-Engine-v2.0/backend/core/riseset.py` (to find `jd_to_local`, reused for converting
  solved boundary JDs to local time strings).
- `Astro-Engine-v2.0/backend/core/planets.py` (to find `calculate_planet`, reused inside the
  boundary solver to re-evaluate Sun/Moon at each Newton iterate).
- `Astro-Engine-v2.0/backend/services/app.py` (to find every call site of `compute_panchang`
  that would need updating for the signature change).

**Files written/modified:**
- `Astro-Engine-v2.0/backend/core/panchang.py` — rewritten. Added `_positions()`,
  `_solve_boundary()` (Newton's-method boundary search using the real Sun/Moon speed at each
  iterate, not an assumed fixed rate), `_timing()`, and changed `compute_panchang()`'s
  signature from `(sun_lon, moon_lon, moon_nakshatra, birth_dt)` to
  `(jd, ayanamsa_value, sun_raw, moon_raw, local_dt)` so the solver can re-evaluate planet
  positions at arbitrary nearby JDs.
- `Astro-Engine-v2.0/backend/services/app.py` — three call sites updated for the new
  signature: `post_chart`'s birth-moment Panchang, `post_chart`'s sunrise Panchang
  (`panchang_at_sunrise`), and `post_horary`'s Panchang. Added `_to_camel_timed_limb()` and
  `_to_camel_panchang()` to convert the new `start_jd`/`end_jd` fields to local
  `"YYYY-MM-DD HH:MM:SS"` strings (full date included, not just time — a limb's boundary can
  land on a different calendar date than the query moment). Added `jd_to_local` to the
  `core.riseset` import line.

**Algorithm (the actual novel part):** for each limb, the defining angle and its rate are:

| Limb | Angle | Rate |
|---|---|---|
| Tithi | `(moon_lon - sun_lon) % 360` | `moon_speed - sun_speed` |
| Nakshatra | `moon_lon % 360` | `moon_speed` |
| Yoga | `(sun_lon + moon_lon) % 360` | `sun_speed + moon_speed` |
| Karana | same as Tithi, finer 6° grid | same as Tithi |

`_solve_boundary(jd_guess, ayanamsa_value, kind, target_deg)` iterates
`jd += diff / rate` (diff = shortest signed angular distance to `target_deg`, wrapped
correctly through 0°/360°) up to 50 times or until `diff < 1e-7°`. Both Sun and Moon are
always prograde geocentrically, so `rate` is always positive and the search never stalls.

**Verification path:**
1. Scratchpad script (`verify_panchang_timing.py`) computing the reference chart (Solapur,
   1998-12-20 09:20 IST, `CUSTOM_KP`), asserting the birth moment falls within each solved
   `[start, end)`, then **re-evaluating Sun/Moon at each solved `end_jd`** and checking the
   angle actually sits on the exact segment boundary. Result: **0.000001–0.000097 arcsecond**
   error across Tithi/Nakshatra/Yoga/Karana — sub-microarcsecond convergence.
2. Cross-check against already-validated data: the computed Tithi/Yoga/Karana labels
   (`Shukla 2 (Dwitiya)`, `Vriddhi`, `Balava`) matched `mockChartData.js`'s `MOCK_PANCHANG`
   exactly — that fixture is documented there as "read directly off the printed horoscope
   report for this exact chart," an independent source.
3. Live API test: started uvicorn on a throwaway port (8123), `curl`'d `/chart`, confirmed
   `panchang` and `panchangAtSunrise` both carry the new per-limb shape with no server errors
   in the log.

**No failures in this section** — the one thing worth flagging is that it required touching
three separate call sites in `app.py` for one signature change, which is exactly the kind of
edit `grep`-ing for the old call pattern before starting caught in one pass rather than three.

**Frontend:**
- `src/components/PanchangDetails.jsx` — reads `panchang.tithi.label` /
  `panchang.vara.name` / `panchang.nakshatra.name` / `panchang.yoga.name` /
  `panchang.karana.name` (objects, not bare strings, as before) and adds an "Ends HH:MM" line
  per limb via a new `endClock()` helper.
- `src/components/PanchangDetails.css` — added `.panchang__end` (small muted subtext).
- `src/data/mockChartData.js` — `MOCK_PANCHANG` restructured to the new nested-object shape so
  the (currently unused, `USE_MOCK = false`) mock path stays consistent.
- `src/lib/i18n.js` — added `panchangEnds` (en: "Ends", hi: "समाप्ति").

---

## 2. Muhurta engine

**Spec source:** `Plan 5 Muhurta Engine.md`, in full (235 lines, read whole — small enough not
to need targeted excerpting).

**New file:** `Astro-Engine-v2.0/backend/core/muhurta.py`.

**Files modified:** `Astro-Engine-v2.0/backend/services/app.py` (import, `_to_camel_muhurta()`
+ helpers `_span()`/`_hora_entry()`/`_choghadiya_entry()`, wired into `post_chart`'s response
as `muhurta`, unconditional and degrading to `null` at circumpolar latitudes).

### 2.1 Hora, Abhijit, Nishita — no web research needed

Plan 5 §3 already cites a locally-checkable source (`research/KPAstroDashboard/calculations/
hora_calculator.py`, not present in this environment but its table was already transcribed
into the plan document) and states the Hora rulers table directly. Abhijit (§4) and Nishita
(§7) are single stated rules, not tables. Implemented directly from the plan text.

**Verification:** scratchpad script (`verify_muhurta.py`) against the reference chart —
asserted all 24 Horas are contiguous (`horas[i]["end"] == horas[i+1]["start"]`), the first
Hora starts exactly at `sunrise`, the last ends exactly at `next_sunrise`, Sunday's first Hora
lord is Sun (matches the table), the 13th (first night) Hora is Jupiter — `cycle[12 % 7] =
cycle[5]` — confirming the night continues the day's cycle rather than restarting. Abhijit's
window was asserted to contain `solar_noon` (the sanity check Plan 5 §4 itself suggests).
Nishita's midpoint was asserted to fall strictly between `sunset` and `next_sunrise`.
**All passed on first implementation** — no iteration needed here.

### 2.2 Trikalam (Rahu Kalam / Yamaganda / Gulika Kalam) — the real research work

Plan 5 §5 explicitly says: *"do not implement from a remembered table — source it from a
citable reference... and validate by cross-checking computed times against that site's
published times."* This was followed literally, and it took several attempts to get a
trustworthy source:

1. **First `WebSearch`** (`"Rahu Kalam Yamaganda Gulika Kalam weekday segment number table..."`)
   — returned a partial, single-technique answer (Rahu Kalam's segment-per-weekday only:
   "2nd on Monday, 7th on Tuesday, 5th on Wednesday, 6th on Thursday, 4th on Friday, 3rd on
   Saturday, 8th on Sunday"). Useful but incomplete — no Yamaganda/Gulika Kalam numbers yet.
2. **Second `WebSearch`** aimed at drikpanchang specifically — surfaced a direct URL:
   `https://www.drikpanchang.com/tutorials/panchang-utilities/rahu-kalam.html`.
3. **`WebFetch` of that URL — a dead end.** The page only said "Yamardha (1/8th part of the
   daytime) method... is the most popular one" with no actual table; it referred elsewhere on
   the site instead of stating the numbers. Logged as a failure and moved on rather than
   guessing from the partial text.
4. **Third `WebSearch`** for a full Gulika Kalam/Yamaganda table across all weekdays —
   returned an aggregated answer from multiple scraped blog posts that **contradicted itself
   internally**: e.g. it labeled Sunday's Yamaganda (12:00 PM–1:30 PM) as "(4th Muhurat)" while
   the same response labeled Monday's Yamaganda (10:30 AM–12 PM) also as "(4th Muhurat)" — but
   10:30–12:00 and 12:00–1:30 cannot both be the 4th of 8 equal 90-minute segments starting at
   6:00 AM (they're segments 4 and 5 respectively). This internal contradiction was caught by
   just re-deriving the segment boundaries by hand from the stated clock times, not by trusting
   the "(Nth Muhurat)" labels the search result attached — those labels turned out to be noise
   from inconsistent source blogs, while the underlying clock times were fine.
5. **`WebFetch` of a single clean source**
   (`gokshetra.com/rahu-kalam-yamagandam-gulika-timings-days-panchangam/`) — one self-contained
   table with all three periods for all seven weekdays, extracted cleanly. Converted to segment
   indices by hand (e.g. Monday Rahu Kalam 7:30–9:00 AM = segment 2 of the 6:00 AM–6:00 PM
   generic day). Cross-checked against step 1's partial Rahu-Kalam-only answer —
   **identical** on all seven values, which is what gave enough confidence to proceed to live
   validation rather than requiring a fourth source.
6. **Live validation, real dates, real locations** (not the generic 6 AM–6 PM table — the
   actual computed sunrise/sunset for real coordinates on `POST /chart`'s `2026-08-16`
   reference date):
   - `WebFetch` of `prokerala.com`'s live Rahu Kalam page for Ujjain: published `17:18–18:54`.
     This engine's own `day_events()` for Ujjain's approximate coordinates gave
     `17:21:55–18:58:52` — **off by ~4 minutes each end**, traced to a rising-convention
     difference (this engine's "standard" mode already applies atmospheric refraction +
     solar disc semi-diameter, which lengthens the day by almost exactly the ~7–9 minute total
     gap observed; ProKerala's page didn't specify its convention). Logged as explained, not
     ignored, since a silent 4-minute-off Rahu Kalam window would be a real defect if
     unexplained.
   - `WebFetch` of `drikpanchang.com`'s actual daily Panchang page for **Delhi**, 16 Aug 2026 —
     published Rahu Kalam `17:21–19:00`, Yamaganda `12:25–14:04`, Gulika Kalam `15:42–17:21`.
     This engine's computation for Delhi's real coordinates: `17:21:18–18:59:57`,
     `12:25:18–14:03:58`, `15:42:38–17:21:18` — **matches to the minute on all three**, which
     is the level of agreement drikpanchang's own minute-rounded publication allows for.
   - `WebFetch` of `drikpanchang.com` for **New York City** (outside India, DST-observing, per
     Plan 5 §11's specific advice to test a non-India location to catch a hidden IST
     assumption) — published `18:09–19:53`, `13:00–14:43`, `16:26–18:09`; this engine gave
     `18:09:30–19:52:41`, `12:59:56–14:43:07`, `16:26:19–18:09:30` — again matching to the
     minute, and confirming no hidden timezone-specific bug.

**Result:** `TRIKALAM_SEGMENTS` dict in `core/muhurta.py`, one segment-index triple per
weekday, with the full sourcing/validation narrative above kept as a comment in the code
itself (not just this log) so a future reader doesn't have to re-derive why those specific
numbers are trustworthy.

### 2.3 Choghadiya — research work, plus a real rule the plan hadn't anticipated

Plan 5 §6 flags this the same way as Trikalam. Research path:

1. **`WebSearch`** for the calculation method and weekday starting sequence — got the correct
   7-name cycle (`Udveg, Chal, Labh, Amrit, Kaal, Shubh, Rog`) and a **day-start table** that
   turned out right, but no night-start table or within-sequence stepping rule yet.
2. **`WebFetch` of `drikpanchang.com`'s Choghadiya tutorial page** (parallel attempt, same
   pattern as Trikalam's step 3) — **404 Not Found**. Logged and moved on immediately rather
   than retrying variations of a dead URL.
3. **`WebFetch` of `choghadiyatoday.com/how-to-calculate-choghadiya`** — returned both a
   day-start table AND a night-start table, with an explicit claim that they're
   "independent" (i.e., night doesn't continue the day's cycle). This was the source used to
   form an initial hypothesis.
4. **Live validation immediately surfaced that step 3's table was wrong for Monday.**
   `WebFetch` of `drikpanchang.com`'s actual Choghadiya table for Sunday, 16 Aug 2026, Delhi —
   confirmed the day cycle order and Sunday's day-start (`Udvega`) exactly. But the **second**
   live fetch, for Monday 17 Aug 2026, showed the day starting with **Amrita**, not the
   **Char** that step 3's table had claimed for Monday. This is exactly the class of error
   Plan 5 §2 warns about generally ("a remembered/scraped table can look plausible and still
   be wrong") — caught here specifically because live validation was done for a *second*
   weekday rather than stopping after Sunday matched.
5. **Discarded step 3's table entirely** and instead pulled **five more live single-value
   fetches** from `drikpanchang.com` (18–22 Aug 2026 = Tue–Sat) asking only for each day's
   first day-period and first night-period name — cheap, since by this point the within-day
   stepping rule (see next point) was already confirmed from two full sequences, so only the
   *starting* value per remaining weekday was needed, not full 16-entry sequences each.
6. **From the two full live sequences (Sun, Mon) actually fetched**, two rules fell out that
   Plan 5 itself hadn't stated (it only asserted the structure, not these specifics):
   - Within one day's 8 periods, the cycle steps **forward** (+1) each period.
   - Within one **night's** 8 periods, the cycle steps **backward** (-2) each period —
     confirmed independently for both Sunday's and Monday's fetched night sequences before
     being trusted as a general rule, not assumed from a single example.
   - Both day-start and night-start advance by the same **+3 (mod 7)** from one weekday to the
     next, with night-start always exactly 2 positions behind that weekday's day-start —
     confirmed across all 7 fetched weekday starting-points, i.e. checked against every data
     point gathered, not just the 2 that had full sequences.

**Result:** `CHOGHADIYA_CYCLE`/`CHOGHADIYA_DAY_START`/`CHOGHADIYA_NIGHT_START` in
`core/muhurta.py`, written as explicit per-weekday tables (matching the codebase's existing
style for `HORA_RULERS`) even though a closed-form `(3 * weekday_index) % 7` arithmetic
generated them — explicit tables are more auditable by a future reader than embedded
arithmetic, per the same reasoning `TRIKALAM_SEGMENTS` uses.

**Verification:** scratchpad script (`verify_trikalam_choghadiya.py`) — regenerated Sunday's
and Monday's full day+night sequences from the implementation and asserted them equal, element
by element, to the literal sequences fetched from drikpanchang.com. Also asserted full
contiguity (every period's `end` equals the next period's `start`) and that the first
day-period starts exactly at `sunrise`, last ends at `sunset`, etc.

### 2.4 Brahma Muhurta, Nishita anchor, Durmuhurta

- **Brahma Muhurta**: Plan 5 §7 names two live-cited conventions
  (`night_fifteenths`: the night divided into 15 equal parts, Brahma Muhurta is the 2nd-to-last;
  `fixed_96_48`: a fixed 96-to-48-minutes-before-sunrise window). A `WebSearch` for the
  calculation method found a third formula in circulation (`night/4` start, `night/8` duration)
  from one additional site, but this was **deliberately not added** as a third option — Plan 5
  only named two, and adding an under-corroborated third risked exactly the "remembered table"
  problem this whole exercise was designed to avoid. Both of the plan's two named conventions
  are implemented; `compute_brahma_muhurta(day, convention=...)` takes either.
- **Anchoring choice**: implemented anchored on `next_sunrise` (i.e. "tonight," sunset → next
  sunrise), the same pairing `compute_nishita()` already uses in the same file, rather than
  needing a *previous* day's sunset (which `core/riseset.py`'s `day_events()` doesn't return).
  This was a design decision made explicit in the code comment, not left implicit.
- **Durmuhurta: not implemented.** A `WebSearch` (`"Durmuhurta timing calculation weekday
  table..."`) found the general structure (day divided into 30 muhurtas, 2 of them — 1 on some
  weekdays — are Durmuhurta) but no citable per-weekday index table. A follow-up `WebFetch` of
  `bhaktibharat.org/learn-panchangam/durmuhurtham` confirmed the 30-muhurta structure but
  explicitly stated the page didn't contain the per-weekday breakdown either. A further
  `WebFetch` of `drikpanchang.com`'s general muhurat page for 16 Aug 2026 found **no mention of
  Dur Muhurat at all** on that page (it only lists auspicious muhurtas). Per Plan 5's own
  explicit priority call ("lower priority... specific timing rule not yet sourced") and this
  session's working rule (don't implement from an under-sourced table), Durmuhurta was left
  unimplemented, with the search attempts and their outcomes documented directly in
  `core/muhurta.py`'s module-level comment so a future session doesn't have to re-run the same
  three searches to rediscover this is still an open item.

### 2.5 API and frontend

`services/app.py`'s `_to_camel_muhurta()` builds the full response object (`hora`, `abhijit`,
`nishita`, `rahuKalam`, `yamaganda`, `gulikaKalam`, `choghadiya`, `brahmaMuhurta`), computed
unconditionally per Plan 5 §8 ("no meaningful cost to always including it") and verified to
degrade every field to `null` (not raise) at Tromsø on the summer solstice — the existing
circumpolar test case.

New frontend files: `src/components/MuhurtaPanel.jsx`, `src/components/MuhurtaPanel.css`
(sibling to `SunMoonPanel`, same visual/i18n pattern). Modified: `src/App.jsx` (new section),
`src/lib/i18n.js` (`sectionMuhurta`, `muhurta*` keys, en + hi).

---

## 3. Divisional charts (Vargas)

**Spec source:** `Plan 4 Divisional Charts (Vargas).md`, in full (346 lines).

**New package:** `Astro-Engine-v2.0/backend/core/vargas/` —
- `rules.py` — `MOVABLE`/`FIXED`/`DUAL`, `ODD`/`EVEN`, `FIRE`/`EARTH`/`AIR`/`WATER` sign sets;
  `triplicity()`, `element()`, `d_long()` (the shared `(lon * N) % 30` within-new-sign formula).
- `formulas.py` — one function per chart, `d2_hora` through `d150_nadiamsa` (23 functions),
  plus `VARGA_FORMULAS`/`VARGA_NAMES` lookup dicts.
- `__init__.py` — `get_varga_chart(all_placements, d_number)` and
  `get_multiple_varga_charts(all_placements, d_numbers)`.

**Modified:** `services/app.py` — `vargasRequested: list[int] | None = None` added to
`ChartRequest`; 422 validation for unsupported D-numbers; `_to_camel_varga_placement()`/
`_to_camel_varga()`; computed unconditionally-if-requested (opt-in, empty by default per
Plan 4 §5) right after `assign_houses()` since Vargas need only the already-computed D1
longitudes, nothing Placidus/high-latitude-related.

### 3.1 Why this was fast to implement (and why that's a risk to watch)

Plan 4 §3.2 already states every formula in closed form, with an explicit changelog note that
they were execution-verified against real `research/PyJHora` output for the reference chart
(22 charts, several hundred comparisons, zero mismatches) in whatever session produced that
plan document. **That verification could not be reproduced in this environment** (§0 — no
`research/` directory here), so this implementation is a faithful transcription of an already-
verified table, not an independent re-verification from scratch. This is explicitly weaker
than the Muhurta work in §2, where live validation against a real third-party source was
possible and done. The gap was partially closed by the manual cross-checks in §3.2 below, and
fully surfaced by the discrepancy found in §3.4 — which is exactly the kind of error this
weaker verification path was at risk of missing silently.

### 3.2 Manual formula cross-checks performed

For every "seed + l" style formula (D9, D10 shown here as examples), Plan 4 §3.2 gives two
equivalent descriptions: a closed-form one (used for the code) and a classical alternate
description in words. Both were hand-traced for at least one real reference-chart planet and
checked for agreement, rather than only trusting the closed form:

- **D9 for Mars** (D1 = Virgo, 18.6137° within sign): closed form gives
  `l = int(18.6137 // 3.3333) = 5`, element(Virgo) = earth → seed = 9 (Capricorn),
  `r = (9+5) % 12 = 2` = Gemini. Classical alternate ("dual: from 5th-from-self"): Virgo is
  dual; 5th-from-Virgo = Capricorn; counting the 6th Navamsa (`l=5`, 0-indexed) from Capricorn
  forward (Capricorn→Aquarius→Pisces→Aries→Taurus→**Gemini**) lands on Gemini. **Match.**
- **D10 for Mars** (same D1 position, Virgo is an even sign): closed form gives `l = int(18.6137
  // 3) = 6`, `r = (5+6+8) % 12 = 7` = Scorpio. Classical alternate ("even: from 9th counted
  from own sign"): 9th-from-Virgo = Taurus; counting the 7th Dasamsa (`l=6`) from Taurus forward
  lands on **Scorpio**. **Match.**

### 3.3 Boundary tests

Per Plan 4 §8's own recommendation, D9/D10/D30 were tested at `boundary − 1 arcsecond`,
exactly on the boundary, and `boundary + 1 arcsecond`, confirming deterministic (non-flickering)
behavior:

| Test | −1as | exact | +1as |
|---|---|---|---|
| D9, Aries at 3°20′00″ | sign 0 (Aries) | sign 1 (Taurus) | sign 1 (Taurus) |
| D10, Aries at 3°00′00″ | sign 0 | sign 1 | sign 1 |
| D30, Aries at 5°00′00″ | sign 0 (Aries) | sign 10 (Aquarius) | sign 10 (Aquarius) |

All three land cleanly on one side with no ambiguity at the exact boundary.

### 3.4 A real discrepancy found in Plan 4 itself

Plan 4 §8 states a specific sanity check to use once D9 ships: *"Mars is Vargottama (D1
Scorpio = D9 Scorpio)"* for the reference chart. This was run as the first verification step
for the whole Vargas package — **and it failed**: this engine computes Mars's D1 sign as
**Virgo** (168.6137°), not Scorpio, and D9 as **Gemini**, not Scorpio — no Vargottama at all.

This was not treated as "my code is probably wrong" and silently patched to force a match.
Instead:
1. Cross-checked Mars's D1 longitude against `mockChartData.js`'s independently-validated
   `PLANET_LONGITUDES` (`Mars: 168.51372783578017`) — same sign (Virgo), off by only ~0.1° from
   this session's fresh computation, consistent with the two having been computed at
   very slightly different times/ayanamsa-fix states, not a sign-level disagreement.
2. Ran the §3.2 manual cross-check above — the D9 *formula* independently reproduces Gemini
   via Plan 4's own alternate classical description, using Virgo as the input. So the formula
   is internally consistent and correct; it's the specific *example* in §8 that doesn't hold
   against this engine's actual output.
3. Concluded the most likely explanation is that §8's example was computed against a different
   chart than "Solapur, 1998-12-20 09:20 IST," or transcribed with an error, at whatever point
   Plan 4 was originally authored — not a defect in this implementation.

**Documented in place** in `README.md`'s "Suggested order of work" §8 entry, in this log, and
left as a note rather than altering the code to manufacture a Vargottama result that wouldn't
actually be correct.

### 3.5 End-to-end verification

Scratchpad script (`verify_vargas.py`): ran every one of the 23 formulas against the full
reference chart, asserting each produces exactly 12 planet placements plus a Lagna, and that
every house number falls in 1–12. Then a full-shape live API test requesting **all 23** via
`vargasRequested` in one `POST /chart` call — asserted all 23 keys (`D2`...`D150`) present,
each with 12 planets and a valid Lagna house.

### 3.6 Frontend

`src/components/BirthDataForm.jsx` — new `VARGA_OPTIONS` (all 23, D9/D10 first per Plan 4's
own priority order) feeding a multi-`<select>`, opt-in/empty by default. `src/App.jsx` — new
"Divisional Chart" section: a D-number dropdown (populated from whatever was actually
requested) feeding the **same** `NorthIndianChart`/`SouthIndianChart` components D1 already
uses, unmodified, per Plan 4 §6's expectation that no new chart-drawing code would be needed —
confirmed true; the Varga placement shape (`rashi`/`rashiLord`/`house`/`retrograde`/`planet`)
matches D1's `allPlacements` shape exactly, so no adapter code was needed either.

---

## 4. Operational issues hit this session (environment-level, not astrology-level)

These aren't about the plan's content — they're friction specific to this machine/environment
that cost real time and are worth a future session knowing about up front.

### 4.1 `uvicorn --reload` silently serving stale code

**Symptom:** after creating `core/vargas/rules.py`, then `formulas.py`, then `__init__.py`,
then editing `app.py` five more times in quick succession, a live `POST /chart` request with
`vargasRequested` set came back **200 OK with no `vargas` key at all** — not an error, just
silently missing the feature that had just been written.

**Diagnosis:** checked the running `uvicorn --reload` process's log
(`WatchFiles detected changes in...`) and found **only one** reload event, triggered by the
very first file (`rules.py`) — none of the later file creations or `app.py` edits triggered a
second reload, even though they happened well after the first and are exactly the kind of
change `--reload` exists to catch.

**Root cause (inferred, not confirmed against WatchFiles' own source):** this repo lives under
a **OneDrive-synced path** (`...\OneDrive - NSQUARE XPERTS LLP\...`). OneDrive's placeholder/
virtual-filesystem sync layer is a known source of missed filesystem-change-notification
events for OS-level file watchers, particularly under a rapid burst of edits — plausible given
the timing (multiple file writes within the same few seconds).

**Fix applied:** killed both the reloader and worker process (`Stop-Process` on the PIDs found
via `netstat -ano | grep :8000`), then started a **fresh `uvicorn` without `--reload`**, and
adopted "restart manually after any backend edit, then re-verify with a live request" as the
working pattern for the rest of the session. Confirmed the fix by re-running the exact same
`vargasRequested` test — this time got the correct `vargas` key with real data.

**Persisted to memory** (`project_astro_engine_backend_reload.md`, outside the repo, in this
Claude Code installation's per-project memory folder) so a future session doesn't lose the
same time rediscovering it.

### 4.2 Windows-path vs. git-bash-path mismatches

The Bash tool here runs Git Bash (MSYS2), which maps `/tmp/...` to some internal location, but
the project's own Python venv (`backend/venv/Scripts/python.exe`) is a **native Windows**
executable that doesn't understand `/tmp/...` as a path at all. Concretely: `curl -o
/tmp/foo.json` (git-bash) followed by `python.exe -c "open('/tmp/foo.json')"` (native Windows)
raised `FileNotFoundError` even though `ls /tmp/foo.json` (git-bash) showed the file existed —
each tool was resolving the path against a different filesystem view.

**Fix applied:** switched to writing scratch interchange files under the Windows-style
scratchpad path (`C:\Users\DHANRA~1\AppData\Local\Temp\claude\...\scratchpad\`) for anything
that would be read by both a git-bash command and a native Windows executable in the same
sequence, rather than `/tmp`.

### 4.3 A false-alarm mojibake investigation

A `json.dumps(..., indent=2)` print of a Varga chart response showed degree strings as
`"25\u00c2\u00b0 04' 09\""` — which decodes to `"25Â° 04' 09""`, the classic UTF-8-decoded-as-
Latin-1 mojibake pattern for the degree sign. This looked like a real encoding bug in the new
`core/vargas/__init__.py` code (which calls the same `decimal_to_dms()` every other module
already uses successfully).

**Investigated rather than dismissed or blindly "fixed":** re-opened the same JSON file with
an explicit `encoding="utf-8"` file handle and checked the actual character's code point —
`0xb0`, the real U+00B0 degree sign, correctly encoded. The mojibake was **only in how that one
`python -c` invocation's `print()` rendered to the git-bash terminal's console codepage**, not
in the underlying API response bytes. No code change was needed; logged here so a similarly
alarming-looking print in a future session isn't mistaken for a real bug without the same
byte-level check.

### 4.4 No browser-automation tool available for the "run and show me" request

`chromium-cli` (the tool the project's `run` skill recommends first) is not installed in this
environment. Adapted by writing a direct Node.js Playwright script instead of the tool-based
one-liner the skill describes — full flow (fill form → pick location from the local
`searchCities()` autocomplete → submit → screenshot each new section → switch the Varga
dropdown and re-screenshot) worked cleanly with **zero browser console errors**. Scripts:
`drive_app.mjs`, `drive_d10.mjs`, both in this session's scratchpad directory (not part of the
repo — throwaway verification tooling, not shipped).

---

## 5. Full file manifest

All paths relative to `Astro-Engine-v2.0/` unless noted.

### Backend — new
- `backend/core/muhurta.py`
- `backend/core/vargas/__init__.py`
- `backend/core/vargas/rules.py`
- `backend/core/vargas/formulas.py`
- `backend/core/calendar.py` (§13 — Phase 3, wired into `services/app.py` and verified)

### Backend — modified
- `backend/core/panchang.py` (boundary-solving rewrite)
- `backend/services/app.py` (Panchang timing wiring, Muhurta wiring, Vargas wiring —
  `ChartRequest.vargasRequested`, camelCase converters, response fields; §13's `calendar` field
  and `_to_camel_calendar()`)

### Frontend — new
- `src/components/MuhurtaPanel.jsx`
- `src/components/MuhurtaPanel.css`
- `src/components/HoraryForm.jsx` (§12.2)
- `src/components/HoraryResultHeader.jsx` (§12.2)
- `src/components/CalendarPanel.jsx` / `.css` (§13)

### Frontend — modified
- `src/components/PanchangDetails.jsx` / `.css`
- `src/components/BirthDataForm.jsx` / `.css`
- `src/App.jsx` (§12.1's transit link + §12.2's mode toggle/Horary result rendering)
- `src/App.css` (§12.1/§12.2's new header-actions and mode-toggle styles)
- `src/data/mockChartData.js`
- `src/lib/i18n.js` (§12.1/§12.2's `transitTimelineLink`/`mode*`/`horary*` keys)
- `src/lib/api.js` (§12.2's `fetchHorary()`)

### Gochara — new, merged in from an external repo (§12.1)
- `gochara/` (whole folder) — `backend/main.py` (patched `EPHE_PATH`, see §12.1),
  `backend/ayanamsa.py`, `backend/ephemeris.py`, `backend/__init__.py`, `frontend/*`,
  `README.md`, `requirements.txt`, `.gitignore` — all but `main.py` copied unchanged from
  `github.com/DSK369/Astro-Engine-Gochar`.

### Project plan folder — modified
- `README.md` (§"Suggested order of work" items 5-8 corrected/updated; module table; frontend
  section; Plan 1 gap-analysis section)
- `Plan 4 Divisional Charts (Vargas).md` (D2 house-numbering clarification, §10's findings)

### This file
- `Plan 1 Implementation.md` (this document)

### Outside the repo (Claude Code memory, not shipped)
- `project_astro_engine_backend_reload.md` + `MEMORY.md` index entry, in this installation's
  per-project memory folder — the `--reload`/OneDrive finding from §4.1.

### Scratchpad (throwaway, not part of either repo)
`verify_panchang_timing.py`, `verify_muhurta.py`, `verify_trikalam_choghadiya.py`,
`verify_vargas.py`, `drive_app.mjs`, `drive_d10.mjs`, `drive_d2.mjs`, plus §12's
`check_header.mjs`/`check_gochara.mjs`/`check_horary.mjs` Playwright drivers — every
verification script referenced above, all under this session's temp scratchpad directory, not
committed anywhere.

### Gochara source clone (§12.1, throwaway — since deleted)
`C:\gochara_tmp` — shallow clone of `https://github.com/DSK369/Astro-Engine-Gochar`, used only
as the copy source for `gochara/` inside the repo (§12.1). Deleted immediately after copying —
redundant once the files it provided are safely inside the repo and git-trackable there.

### PyJHora clone + verification venv (§8, throwaway, not part of either repo -- since deleted)
`C:\pjh_tmp\repo` — shallow clone of `https://github.com/naturalstupid/PyJHora`.
`C:\pjh_tmp\verify_venv` — isolated Python 3.11 venv with PyJHora's non-GUI dependencies.
`C:\pjh_tmp\verify_all_vargas.py` — the 5,520-check driver script (§8.3). Deliberately placed
at a short path outside the usual session scratchpad (§8.1's `git clone` path-length failure).
**Deleted at the end of this session** (582MB, confirmed by the user not worth keeping) — the
findings above are the permanent record; re-running the comparison from scratch would mean
re-cloning per §8.1's exact steps.

---

## 6. How to reproduce the verification

```bash
# Backend server (from Astro-Engine-v2.0/backend/, after any edit -- see SS4.1, don't trust --reload)
venv\Scripts\python.exe -m uvicorn services.app:app --port 8000

# Reference-chart smoke test (Solapur, 1998-12-20 09:20 IST, CUSTOM_KP)
curl -X POST http://127.0.0.1:8000/chart -H "Content-Type: application/json" -d '{
  "dob": "1998-12-20", "tob": "09:20:00",
  "location": {"lat": 17.6599, "lon": 75.9064, "tz": "Asia/Kolkata"},
  "ayanamsa": "CUSTOM_KP",
  "vargasRequested": [9, 10]
}'

# Circumpolar degrade test (Tromso, summer solstice -- muhurta/riseSet should all go null,
# not error)
curl -X POST http://127.0.0.1:8000/chart -H "Content-Type: application/json" -d '{
  "dob": "2026-06-21", "tob": "12:00:00",
  "location": {"lat": 69.65, "lon": 18.96, "tz": "Europe/Oslo"},
  "ayanamsa": "CUSTOM_KP"
}'

# Frontend (from Astro-Engine-v2.0/)
npm run dev -- --port 5180
```

No permanent pytest suite exists yet for any of this session's work — every verification
above was a throwaway scratchpad script, re-run manually. Turning the boundary/contiguity/
cross-source assertions in SS1-3 above into a real `tests/` suite (mirroring Plan 4 SS8's own
recommendation for `tests/test_vargas_vs_pyjhora.py`, adapted since `research/PyJHora` isn't
available here) is a natural next step, not yet done.

---

## 7. Post-shipment fix: D2 Hora was wrong

**Reported by the user**, after using the shipped feature: real D2 (Hora) charts should only
ever place planets in house 1 or house 2. The implementation in SS3 — Plan 4 SS3.2/SS3.3's
12-sign-pair "parivritti" table, transcribed faithfully from the plan document — did not do
this; it scattered planets across up to 12 different D2 signs depending on which D1 sign each
one started in.

**This was not assumed to be a misreading of the user's report and cross-checked before
touching code.** Ran `WebSearch` for the classical D2 rule (`"Hora chart D2 calculation rule
odd sign even sign Leo Cancer Sun Moon Hora classical Parashara"`) — every source agreed: the
Brihat Parashara Hora Shastra rule occupies **exactly two signs, Leo (Sun's Hora) and Cancer
(Moon's Hora)**, for every planet, full stop, regardless of D1 sign. Odd sign: first half
(0-15 deg) -> Leo, second half -> Cancer. Even sign: reversed. Followed up with a `WebFetch` of
`desiutils.in/astrology/hora-d2` specifically to confirm the *house-numbering* convention too
(not just the sign rule): houses are counted whole-sign from a D2 Lagna computed by applying
the same Hora rule to the D1 Ascendant — so with a Cancer Hora Lagna, Cancer is house 1 and Leo
(the only other possible sign) is house 2; with a Leo Hora Lagna, Leo is house 1 and Cancer
becomes house 12, not house 2. (This second fact matters: "always house 1 or 2" isn't a
universal law independent of the Lagna, it's what happens to be true for whichever chart the
user checked — for the reference chart used throughout this project, the D2 Lagna is Cancer,
so it does come out 1-and-2.)

**Fix**: `core/vargas/formulas.py`'s `d2_hora()` rewritten to the classical two-sign rule,
replacing the 12-sign-pair table entirely (12 lines -> 6). **Verified**: (1) exhaustively
across all 12 D1 signs and boundary/mid/edge longitudes, asserted every result is Leo(4) or
Cancer(3), nothing else; (2) live reference-chart API request — Lagna lands in Cancer/house 1,
every one of the 12 planets lands in Cancer/house 1 or Leo/house 2, matching the user's report
exactly; (3) browser screenshot (Playwright driver, same pattern as the "run and show me"
session) — visually confirms all 13 placements (Lagna + 12 planets) crowded into exactly two
adjacent chart boxes, nothing else occupied.

**Documentation corrected in place, not just the code**: Plan 4 SS3.2's D2 row and SS3.3's D2
table both updated with a struck-through original + explanation (matching how this project
already handles found errors — see the Vargottama correction in SS3.4 above); this folder's
`README.md` Plan 4 status line updated to stop asserting "22 formulas, zero mismatches" as
settled fact, since that specific claim is exactly what turned out false for D2.

**What this means for the other 21 formulas**: the SS3.2 manual cross-checks in this log (D9,
D10) checked a formula's closed form against Plan 4's *own alternate description* of the same
rule — which would not have caught this D2-style error, since a wrong table and a wrong
"equivalent" description transcribed from the same flawed source could easily agree with each
other while both being wrong. D2 was only caught because a real user checked real output
against real domain knowledge, not because this session's own verification process would have
found it unprompted. This gap was closed properly in SS8 below rather than left open.

---

## 8. Full re-verification against real PyJHora execution

SS7's fix satisfied the immediate bug report, but left an uncomfortable question open: the
other 21 formulas carried the same "verified" label that had just been shown false for D2, and
this session's own manual cross-checks (SS3.2) were demonstrably not strong enough to have
caught it. The user's next instruction was explicit: *refer to the actual JHora git repo, not
just this plan's transcription of it.* That was done properly this time, not worked around.

### 8.1 Getting the real source into this environment

`research/PyJHora` (what the original Plan 4 work used) does not exist in this environment
(SS0). Rather than treat that as a hard blocker, the real upstream repository was located and
cloned directly:

- `WebSearch` for `"PyJHora github repository naturalstupid"` found the canonical repo:
  `https://github.com/naturalstupid/PyJHora`.
- `git clone --depth 1` **failed the first time** at a path nested under this session's own
  long scratchpad directory — `fatal: cannot write keep file '...pack-....keep': Filename too
  long`, a Windows `MAX_PATH` (260 character) limit hit by combining the already-long
  scratchpad path with git's own internal pack-file naming. Retried at a short path
  (`C:\pjh_tmp\repo`) instead — worked immediately. (Filed here as a concrete instance of the
  path-length class of problem this project's environment tends to hit, alongside SS4.2's
  git-bash/Windows path split.)
- Installed the library's stated non-GUI dependencies (`numpy`, `pytz`, `geocoder`, `geopy`,
  `requests`, `timezonefinder`, `python-dateutil`) into a **fresh, isolated venv**
  (`C:\pjh_tmp\verify_venv`) rather than the project's real `backend/venv` — this is throwaway
  verification tooling, not a runtime dependency of the shipped product, and shouldn't leak into
  `requirements.txt`. `python-dateutil` had to be added after an initial `ModuleNotFoundError`
  on `from dateutil import relativedelta` inside `jhora/utils.py` — not listed as a top-level
  requirement in every place Plan 4 originally cited it, but genuinely needed transitively.
  `PyQt6`/`pyqtgraph` skipped (GUI-only, not on `charts.py`'s import path, confirmed by the
  import succeeding without them).

### 8.2 Reading the real dispatch code found the exact root cause of the D2 bug

Before running anything, `charts.py`'s `hora_chart()` function and its docstring were read
directly:

```
@param chart_method:
    1=> Parasara hora with parivritti & even side reversal (Uma Shambu) here it is PVR method
    2=> Traditional Parasara (Only Le & Cn)
    ...
```

and `const.py`:

```python
class D2_CHART_METHOD(IntEnum):
    PARASARA_UMA_SHAMBU_VARIATION = 1
    TRADITIONA_PARASARA_WITH_Le_Cn_ONLY = 2
    ...
d2_chart_method_default = D2_CHART_METHOD.PARASARA_UMA_SHAMBU_VARIATION
```

This is the exact, confirmed mechanism behind SS7's bug, not just a plausible guess: **D2 is
the one chart in the whole set where the library's own numeric default (method 1) is *not* the
method literally labeled "Traditional Parasara."** Checked this against every other chart's own
`const.py` enum (`D3_CHART_METHOD` through `D150_CHART_METHOD`, all read directly) — for every
one of them, method 1 both is the library default *and* is named some form of "Traditional/
Parasara." Plan 4's original methodology ("chart_method=1 = Traditional Parasara") was a
reasonable, almost-always-correct shortcut that happened to break on precisely the one chart it
was applied to first and most confidently. `_hora_traditional_parasara_chart()` (the real
method-2 implementation) was then read line by line and hand-traced — it is exactly the
Leo/Cancer two-sign rule SS7 had already independently arrived at via web search, confirming
that fix from a second, independent angle.

### 8.3 Systematic execution comparison, not spot checks

Rather than repeat SS3.2's weaker pattern (hand-tracing one or two planets), a driver script
(`verify_all_vargas.py`) was written to **execute PyJHora's real chart functions** — not read
them, run them — across a dense synthetic grid: all 12 D1 signs times 20 longitude values per
sign chosen to cover early/mid/late-in-sign and every plan-documented boundary (0, 1, 2.5, 3,
5, 7.5, 10, 12, 15, 18, 20, 22.5, 25, 27.5, 29, 29.99, plus values just off each boundary) — 240
points per chart. For each of the 23 non-D1 charts, called the matching PyJHora function with
the chart_method identified in SS8.2 as the real "Traditional Parasara" one for that specific
chart (2 for D2, 1 for every other), and independently called this project's own
`core/vargas/formulas.py` function with the identical input, diffing the resulting sign.

**5,520 total checks (23 charts x 240 points). First run: 48 mismatches, all in D30, zero
everywhere else** — meaning the D2 fix and every other previously-"verified" formula held up
under real execution, and exactly one further real bug was found.

### 8.4 The D30 bug: a boundary-inclusivity mismatch, found by testing exact boundaries at scale

D30's mismatches all landed on the exact integer-degree boundaries this plan's own tables use
(5°, 10°, 18°, 20°, 25°) — e.g. at Aries 5.0deg exactly, this implementation said Aquarius,
PyJHora said Aries. Read `trimsamsa_chart()`'s real source directly rather than guessing from
the pattern of mismatches:

```python
odd = [(0,5,0),(5,10,10),(10,18,8),(18,25,2),(25,30,6)]
...
r = [ rasi%12 for (l_min,l_max,rasi) in odd if (long >= l_min and long <= l_max) ]
...
dp.append([planet,[r[0],d_long]])
```

Every range is inclusive on **both** ends. At a shared boundary two ranges both match; `r[0]`
takes whichever is listed first in ascending order, so the boundary degree belongs to the
range *below* it. This project's implementation had used lower-inclusive/upper-exclusive
ranges (the opposite convention) — internally consistent (SS3.3's original boundary test for D9/
D10/D30 confirmed no *flickering*, which it didn't), but on the wrong side of the line
specifically at those exact degrees, which only surfaced by comparing against the real function
at exactly those points rather than trusting internal consistency as sufficient.

**Fix**: `d30_trimsamsa()` rewritten to `lo <= lon <= hi`, scanned in ascending order,
return-on-first-match — a direct, simpler transliteration of PyJHora's own list-comprehension-
plus-`r[0]` logic. **Re-ran the full 5,520-check suite: zero mismatches, all 23 charts.**

### 8.5 What this closes and what it doesn't

- Every chart in `core/vargas/formulas.py` is now verified against **real execution** of the
  actual upstream library, not a re-reading of Plan 4's transcription of it — closing the gap
  SS7 identified as still open.
- This is still bounded by the same caveat Plan 4 itself always carried: it validates *this
  project's chosen convention* ("Traditional Parasara," `chart_method=1`/`2` per chart as
  identified above) against PyJHora's implementation of that same named convention — not
  against a second, fully independent Vedic astrology library, and not against a printed
  reference chart from a professional astrologer the way the ayanamsa accuracy fix (this
  folder's README) was. PyJHora itself could theoretically have a bug in a rarely-exercised
  code path that both implementations now share. Lower risk than before, not zero.
- The isolated verification venv and cloned repo (`C:\pjh_tmp\`) were outside both project
  repos and the usual scratchpad — throwaway, not committed anywhere. Deleted at the end of
  this session (user confirmed; 582MB, not worth keeping given the findings are fully recorded
  here). Re-verifying anything further against PyJHora means re-cloning per §8.1.

---

## 10. Second D2 report: house 12 appearing — investigated, confirmed correct, not a bug

**Reported by the user again**, same feature: "the D2 chart calculations are incorrect it is
supposed to have all planets in house 1 or house 2." At first glance this looked like the same
class of bug as §7 — except §7's own fix was already live (`d2_hora()` was already restricted to
Leo/Cancer only; confirmed by re-reading `core/vargas/formulas.py` fresh before touching
anything). So the sign rule wasn't the problem this time. The user's phrasing was actually a
verbatim echo of a claim *this project's own documentation* had asserted (Plan 4 §3.3, "actual
D2 charts only ever land planets in house 1 or house 2") — traced that claim back to §7 above,
where it was written as a general rule but immediately followed by a caveat one paragraph later
that contradicts the general version ("with a Leo Hora Lagna... Cancer becomes house 12, not
house 2... 'always house 1 or 2' isn't a universal law"). The plan's own §3.3 wording didn't
carry that caveat forward — a documentation inconsistency, not a code bug, but one that plausibly
caused (or at least reinforced) this second report.

**Investigated from first principles before touching any code:**

1. **Math check.** Houses are assigned whole-sign from the D2 Lagna (`core/vargas/__init__.py`'s
   `get_varga_chart()` calls the same generic `assign_houses()` in `core/houses.py` used for
   every other chart — no D2-specific branch exists). Cancer (index 3) and Leo (index 4) are
   adjacent in the natural zodiac. If the D2 Lagna's own Hora is Cancer, whole-sign counting puts
   Leo at house 2. If the D2 Lagna's own Hora is Leo, the *same* counting puts Cancer at house
   12 (11 signs forward from Leo, wrapping). Worked this out sign-by-sign for all 12 possible D1
   Lagna signs × first-half/second-half — exactly half land each way.

2. **Live verification against the running backend**, not just theory: called `POST /chart` with
   `vargasRequested: [2]` for the same birth date (1998-12-20, Solapur) at 24 different times of
   day, spanning the full 24h (so the D1 Ascendant — and therefore the D2 Lagna's own Hora —
   sweeps through both possibilities). Result: **every single response's D2 house set was either
   exactly `{1, 2}` or exactly `{1, 12}`, never anything else, never 3-11** — matching the math
   exactly. Sample:
   ```
   tob=00:00  D2 Lagna rashi=Cancer  houses={1, 2}
   tob=02:00  D2 Lagna rashi=Leo     houses={1, 12}
   tob=04:00  D2 Lagna rashi=Cancer  houses={1, 2}
   tob=06:00  D2 Lagna rashi=Leo     houses={1, 12}
   ...
   ```
   (Full 24-point run in this session's transcript; pattern held for all of them.)

3. **Independent domain confirmation** (`WebSearch`/`WebFetch`, same methodology as §7's original
   sourcing): searched for how real Hora-chart interpretation content describes house placements.
   Found `indastro.com`'s dedicated "Sun in D2 Chart Result" page, which covers **exactly three
   house placements for the Sun: 1st, 2nd, and 12th** — confirmed by re-fetching the page and
   asking specifically for verbatim headings, which returned `"Sun in 1st house in D2 Hora
   Chart"`, `"Sun in 2nd house in D2 Hora Chart"`, and `"Sun in 12th house in D2 Chart"`, nothing
   else. A second search independently returned (via `cosmicsquares.com` and others): "Hora/D2
   chart has three houses where the 1st house represents self-awareness for finance, 2nd house
   represents savings & wealth, 12th house indicates loss or investment... the other 10 houses
   remain empty." Two independent sources, unprompted, both landing on exactly the same
   three-house set {1, 2, 12} this project's math predicted and the live API reproduced.

4. **A third reference codebase, not just PyJHora.** The user pointed at
   `github.com/velteyn/OpenJyotish` specifically for this question. Read its
   `src/jhora/charts/varga.py` (via `WebFetch` against the raw file, same non-clone approach as
   convenient for a single-file check): it computes divisional-chart **sign** positions only —
   `VargaPosition` has no house/bhava field at all, and no D2-specific house logic exists
   anywhere in the file. Same shape of finding as re-reading PyJHora's own `divisional_chart()` /
   `hora_chart()` in §8.2: **no Vedic astrology library in this project's reference set computes
   a special-cased house number for D2** — every one of them (this project included) leaves house
   numbering to the same generic whole-sign-from-lagna engine used for every other chart, which is
   exactly what produces the {1, 2, 12} result.

**Conclusion: not a bug.** `core/vargas/__init__.py` and `core/houses.py` are unchanged — no code
was touched for this report. The fix here was documentation: Plan 4 §3.3's D2 note previously
asserted "only ever house 1 or house 2" as an unqualified rule; that wording is corrected in place
(this folder's `Plan 4 Divisional Charts (Vargas).md`) to state the actual invariant — two
**signs**, which surfaces as house 1 plus either house 2 or house 12 depending on the D2 Lagna —
with this section's citations attached so a third report of the same non-bug doesn't require
re-deriving the whole argument from scratch.

---

## 12. Item 9: KP Horary frontend, and Gochara/transit integration (unblocked)

Continuing the README's "Suggested order of work," picking up at item 9 — merging the two
already-built sibling features per Plan 6. §11 (old numbering) had flagged Gochara as blocked
because `Astro-Engine-Gochar` wasn't present in this environment. Re-checked rather than left
that way: same move as §8.1's PyJHora clone — checked whether the repo is public.

### 12.1 Gochara — unblocked, cloned, merged in, verified end-to-end

`https://github.com/DSK369/Astro-Engine-Gochar` **is public** (`GET
api.github.com/repos/DSK369/Astro-Engine-Gochar` → `"private": false`, 28 KB — confirmed before
cloning, same due-diligence step as §8.1). Cloned with `git clone --depth 1` to `C:\gochara_tmp`
(short path, avoiding the `MAX_PATH` failure class §8.1 already hit once), then copied
`backend/`, `frontend/`, `README.md`, `requirements.txt`, `.gitignore` into a new
`Astro-Engine-v2.0/gochara/` folder — inside the repo this session works in, not a sibling repo,
matching how `backend/` itself was folded into `Astro-Engine-v2.0` (README.md's own note: "one-
repo deployment").

**Plan 6 §2's accuracy claim re-checked, not trusted blindly**: read `gochara/backend/ayanamsa.py`
and `ephemeris.py` directly. Confirmed correct as the plan stated — 3-argument
`swe.set_sid_mode(swe.SIDM_USER, 0, value)`, tropical longitude (`FLG_SWIEPH | FLG_SPEED`, no
`FLG_SIDEREAL`) with manual ayanamsa subtraction, matching this session's own accuracy-fix
pattern (README.md's "Critical finding" section). No changes needed to either file.

**One real integration bug found and fixed**: `gochara/backend/main.py`'s `EPHE_PATH` assumed
Gochara sits as a sibling folder next to one literally named `astro-engine`
(`os.path.join(os.path.dirname(ROOT), "astro-engine", "ephemeris")`) — true for the standalone
repo's own layout, false here, where Gochara now lives *inside* `Astro-Engine-v2.0/gochara/` and
the ephemeris files are at `Astro-Engine-v2.0/backend/ephemeris/` (a sibling of `gochara/`, not
of a folder named `astro-engine`). Left unpatched, this would have **silently degraded** to
swisseph's lower-precision Moshier model — no crash, no error, just quietly wrong (Plan 6 §5 had
flagged exactly this failure mode as the one worth checking post-integration). Fixed: `EPHE_PATH
= os.path.join(os.path.dirname(ROOT), "backend", "ephemeris")`. **Verified, not assumed**: a
direct Python check computing the same path `main.py`'s own code computes confirmed
`os.path.isdir(EPHE_PATH)` is `True` and lists `['semo_18.se1', 'sepl_18.se1']` — the real
ephemeris files, not a missing-path fallback.

**Deployment**: Option A from Plan 6 §4 (separate process, no shared-API port), as the plan
itself recommended — "deployable in under an hour, no code changes [besides the path fix just
described], just running a second process and adding a link." No new Python dependencies:
checked `fastapi`/`uvicorn`/`swisseph`/`tzdata` all already importable from the existing
`backend/venv` (same interpreter re-used, `python -m uvicorn backend.main:app --port 8100
--app-dir gochara`). Launched as a background process.

**Verification, live not assumed:**
- `GET /api/meta` → 200, lists all 12 planets, 6 ayanamsa modes.
- `POST /api/ephemeris` for the reference chart's date (1998-12-20, 5-point sample) → Sun
  longitude 244.9° at 1998-12-20T00:00 UTC-anchored sample matches this session's own reference
  chart data (Sun 04°18' within Sagittarius = 240+4.9 = 244.9°, README.md's own accuracy table).
- Playwright: navigated to `http://127.0.0.1:8100` directly, screenshotted — a full year-long
  transit timeline actually rendered (12 planet curves, Rashi Y-axis, month gridlines), title
  "Gochara — Planetary Transit Timeline", zero console errors.
- Playwright: navigated to the main app (`localhost:5180`), confirmed the new header link's
  `href` resolves to `http://127.0.0.1:8100` and clicking it is a plain new-tab link (no SPA
  routing needed) — screenshotted the header showing "Transit Timeline ↗" next to the language
  toggle, zero console errors.

**Frontend wiring**: `src/App.jsx` (new `GOCHARA_URL` constant, `import.meta.env.VITE_GOCHARA_URL`
with the same fallback-default pattern `api.js` already uses for `VITE_API_BASE_URL`; header
`<a target="_blank">` link), `src/App.css` (`.app-header__actions` wrapping the link + the
existing language-toggle button, `.app-header__transit-link` sharing the toggle's visual style),
`src/lib/i18n.js` (`transitTimelineLink`, en + hi).

**Files touched**: `Astro-Engine-v2.0/gochara/` (new — `backend/main.py` patched per above,
`backend/ayanamsa.py`/`backend/ephemeris.py`/`frontend/*` copied unchanged), `src/App.jsx`,
`src/App.css`, `src/lib/i18n.js`.

### 12.2 KP Horary — backend already done, frontend added

Re-checked before assuming: `grep`ping `services/app.py` showed `POST /horary` and
`core/horary.py` already exist — the commit history (`71810ac "Merge astro-engine-v2's KP Horary
engine into backend/"`) confirms this was completed in an earlier session, before this log's
first entry. Read `core/horary.py` directly to confirm Plan 6 §3's accuracy-port requirements
were actually applied, not just claimed: `_fast_ascendant_longitude()` and
`find_exact_ascendant_time()` both take an explicit `ayanamsa_value` parameter, no `AYAN_OFFSET`
anywhere — matches the fixed `core/houses.py: calculate_lagna()` signature exactly. Nothing to
port; the backend half of item 9's Horary work was already correct and complete.

**What was actually missing**: the frontend. Plan 6 §3.5 explicitly calls for "a horary entry
form... reusing `BirthDataForm`'s location autocomplete and the existing chart-display
components" — grepping the frontend `src/` tree for "horary" (case-insensitive) returned zero
matches before this session's work. Built:

- `src/components/HoraryForm.jsx` (new) — horary number (1-249, validated client-side before
  submit), date, `LocationAutocomplete` (same component `BirthDataForm` uses), ayanamsa select
  (imports `AYANAMSA_OPTIONS` from `BirthDataForm.jsx` rather than duplicating the list), Rahu/
  Ketu node radio. Reuses `BirthDataForm.css`'s classes directly (`.birth-form`, `.birth-form__row`,
  etc.) rather than writing new CSS, since the visual design is identical.
- `src/components/HoraryResultHeader.jsx` (new) — horary number, matched moment, KP zone (sign/
  nakshatra/sub-lord/degree range) as a label-value strip. Reuses `BirthDetailsHeader.css`
  unchanged (same `.birth-header`/`.birth-header__item` layout) rather than writing new CSS,
  since a horary chart's "identity" strip and a birth chart's are visually the same shape.
- `src/lib/api.js` — new `fetchHorary()`, same shape as the existing `fetchChart()`.
- `src/App.jsx` — a `mode` state (`"natal" | "horary"`) with a tab-style toggle above the form;
  the horary result branch reuses `ResultsSummary`, `RulingPlanetsStrip`, `PanchangDetails`,
  `PlanetaryTable`, `CuspTable`, `SignificatorTable`, and both `NorthIndianChart`/
  `SouthIndianChart` **completely unchanged** — exactly what Plan 6 §3.5 predicted, since
  `/horary`'s response shape (confirmed by reading `post_horary()` in `services/app.py`) is the
  same `lagna`/`planets`/`allPlacements`/`cusps`/`significators`/`rulingPlanets`/`panchang`/
  `summary` shape `/chart` returns, plus `horaryNumber`/`matchedDateTime`/`horaryZone`. No Dasha,
  rise/set, Muhurta, or Vargas panels are shown for Horary — a Prasna chart doesn't have those
  concepts (no birth to compute a Dasha balance from, etc.), so those sections are simply omitted
  rather than shown empty.
- `src/App.css` (`.mode-toggle`), `src/lib/i18n.js` (all `horary*`/`mode*` keys, en + hi).

**Verification, live not assumed**: Playwright driver switched to Horary mode, filled horary
number `1`, date `2026-08-16`, location `Solapur` (via the real autocomplete, not a stubbed
value), submitted. Real backend response rendered: matched moment `16/08/2026, 22:03:22`, zone
sign Aries, zone nakshatra Ashwini, zone sub-lord Ketu (the ported `find_exact_ascendant_time`'s
own internal self-check — asserting the resulting Lagna's sub-lord matches the target row's sub-
lord — passed, since no exception was raised), full chart/Panchang/cusps/significators tables all
populated with real (non-mock) data. Screenshotted (full page) — zero console errors, zero
failed requests.

**Files touched**: `src/components/HoraryForm.jsx` (new), `src/components/HoraryResultHeader.jsx`
(new), `src/lib/api.js`, `src/App.jsx`, `src/App.css`, `src/lib/i18n.js`.

### 12.3 Item 9 status

Both halves of Plan 6 are now complete and verified end-to-end: KP Horary (backend pre-existing,
frontend added this session) and Gochara (previously blocked, unblocked by finding the repo is
public, integrated as Option A, one real path-mismatch bug found and fixed). README.md's
"Suggested order of work" item 9 can be marked done.

---

## 13. Phase 3 (Calendar) — built, verified against real published data, shipped

Per `README.md`'s order-of-work item 10 / `Plan 1 Astro Engine.md` §76 Phase 3: Paksha, Amanta,
Purnimanta, lunar month, Adhika Masa, Kshaya Masa, solar month, Sankranti, Ritu, Ayana.

**Status: code written, cross-checked against real drikpanchang.com data across multiple dates
and the highest-risk branches (Krishna-Paksha Purnimanta divergence, a real historical Adhika
Masa), wired into `services/app.py`'s `POST /chart` response and a new frontend panel, and
verified end-to-end in the browser with zero console errors.** §13.1/§13.2 below (sourcing and
building the algorithm) were written mid-flight, before verification ran, and are left as
originally written rather than retouched — they're still an accurate record of the reasoning.
§13.3 has been updated in place with the actual verification results, since that's where the
"not yet done" list lived and it's no longer accurate to leave it saying that.

### 13.1 Sourcing the lunar-month algorithm — not drafted from memory

Given this project has already been burned twice by drafting a Panchang-adjacent rule from
memory and marking it "verified" without checking a primary source (D2, §7; D30, §8), the lunar-
month/Adhika-Masa logic was sourced from real PyJHora code before writing any of this project's
own version, not after. `WebFetch` against PyJHora's own Panchanga README came back thin ("the
documentation describes function signatures... not implementation details" — an honest gap, not
a wrong answer). Followed up with a direct `WebFetch` of the raw source,
`raw.githubusercontent.com/naturalstupid/PyJHora/main/src/jhora/panchanga/drik.py`, asking for
the exact `lunar_month()` function body. Got it verbatim:

```python
def lunar_month(jd, place):
    ti = tithi(jd, place)[0]
    critical = sunrise(jd, place)[2]
    last_new_moon = new_moon(critical, ti, -1)
    next_new_moon = new_moon(critical, ti, +1)
    this_solar_month = raasi(last_new_moon,place)[0]
    next_solar_month = raasi(next_new_moon,place)[0]
    is_leap_month = (this_solar_month == next_solar_month)
    _lunar_month = (this_solar_month+1)%12
    is_nija_month = False
    if not is_leap_month:
        pm,pa,_ = lunar_month(jd-30, place)
        is_nija_month = (pm==_lunar_month and pa)
    return [int(_lunar_month), is_leap_month, is_nija_month]
```

**Read for meaning, not just copied**: this is the Amanta system (month = Amavasya to Amavasya) —
`last_new_moon`/`next_new_moon` are the Amavasyas bracketing `jd`, and `raasi(..., place)[0]` at
each is the Sun's sidereal rashi at that exact instant (Sun and Moon share longitude exactly at a
new moon, so it doesn't matter whether the underlying `raasi()` helper is nominally a Moon-rashi
function). `is_leap_month = (this_solar_month == next_solar_month)` is the classical Adhika Masa
definition made concrete: if the Sun stayed in the same rashi across an entire synodic month, no
Sankranti happened inside it, which is exactly what makes a lunar month "extra." Sanity-checked
the offset arithmetic by hand: Sun in Pisces (rashi 11) at the starting Amavasya gives
`(11+1)%12 = 0`, and index 0 should be Chaitra — matches the classical fact that Chaitra's
starting Amavasya falls while the Sun is still in Meena (Pisces), just before Mesha Sankranti.
`is_nija_month` (a refinement for a rarer edge case, likely Kshaya-Masa-adjacent) was **not**
ported — the fetch that returned this function body only got that far before truncating, and
guessing at what it's for rather than reading it directly would repeat exactly the mistake this
project has already been burned by twice. Documented as a known omission (§13.4), not silently
dropped.

### 13.2 Building the two systems this project actually needs

PyJHora's `lunar_month()` only returns the Amanta month. This project's own `core/calendar.py`
(new) reimplements that Amanta logic using this project's existing building blocks rather than
porting PyJHora's helper functions 1:1 — `find_new_moon()` (new) plays the role of PyJHora's
`new_moon()`, built the same way `core/panchang.py`'s boundary solver already works (Newton's-
method refinement using the real Moon/Sun angular rate at each iterate, not an assumed-fixed
one), just with a coarser initial guess first (average synodic rate, 29.530588 days/360°) since
the target is up to ~29.5 days away rather than the ≤1 day gap Panchang's own limb-boundary
searches start from.

**Purnimanta is not in PyJHora's fetched function at all** — derived here from the standard,
well-known classical relationship between the two systems rather than from a second primary-
source lookup (this one didn't need one: it's a definitional relationship, not an empirical rule
like Trikalam/Choghadiya were). Both systems agree during Shukla Paksha (the fortnight right
after an Amavasya): Amanta calls it the start of a new month, Purnimanta calls it the second half
of the month that's about to end at the next Purnima — same month, same name either way. They
disagree only during Krishna Paksha, which Amanta still counts as part of the *ending* month
(since Amanta months run Amavasya-to-Amavasya) while Purnimanta already counts it as part of the
*upcoming* month (since Purnimanta months run Purnima-to-Purnima, and this Krishna Paksha is the
first half of the one that will end at the next Purnima). So: in Shukla Paksha, Purnimanta name =
Amanta name, computed once. In Krishna Paksha, Purnimanta's name and Adhika status are evaluated
fresh, anchored just past the upcoming Amavasya (`next_new_moon_jd + 0.5` days, safely inside the
next Amanta month rather than sitting exactly on the boundary) — not assumed to inherit the
current Amanta month's Adhika flag, since the two months' Sankranti histories are independent.

**Sankranti**: a new, separate Newton's-method solver (`_solve_solar_angle`) targeting the Sun's
absolute sidereal longitude directly (not the Sun/Moon differential Panchang's own solver uses) —
simpler than the Tithi/Nakshatra/Yoga cases since the Sun's rate is nearly constant
(~0.95-1.02°/day, no wide swings the way Moon's rate has), so convergence needs no rate-based
tuning beyond what's already there.

**Ritu/Ayana**: no boundary-solving needed — both are direct lookups from the already-computed
solar month/rashi. Ritu: the standard six-season, two-solar-months-each mapping starting from
Mesha. Ayana: Uttarayana = Sun in Capricorn through Gemini (sidereal), matching the Makar
Sankranti convention Indian civil/religious practice actually uses (not the tropical solstice,
which would give different boundary dates under a sidereal ayanamsa).

### 13.3 What's built, and what the verification pass actually found

Built: `core/calendar.py` (new) — `find_new_moon()`, `_amanta_month_at()`,
`compute_lunar_month()` (Amanta + Purnimanta + Adhika flags for both), `compute_sankranti()`,
`compute_solar_month()`, `compute_ritu()`, `compute_ayana()`, `compute_calendar()` (the bundling
entry point). Wired into `services/app.py` (`compute_calendar()` called right after
`compute_panchang()`, reusing its `sun_raw["longitude"]` and `panchang["tithi"]["paksha"]` rather
than recomputing either; new `_to_camel_calendar()`; new `"calendar"` field on `POST /chart`'s
response). Frontend: new `src/components/CalendarPanel.jsx`/`.css` (reuses `SunMoonPanel.css`'s
grid-of-cards classes rather than writing a parallel set), wired into `App.jsx` right after the
Muhurta section, new `sectionCalendar`/`calendar*`/`ritu_*`/`ayana_*` i18n keys (en + hi).

**Verification — real published data, not just internal consistency, same bar as §2's Trikalam/
Choghadiya work:**

1. **Reference chart plausibility, then real cross-check.** Ran `compute_calendar()` for the
   reference chart (Solapur, 1998-12-20 09:20 IST, `CUSTOM_KP`) — output was Amanta=Purnimanta=
   Pausha (plausible for December, not some wildly wrong month), Ritu=Hemant, Ayana=Dakshinayana,
   next Sankranti Sagittarius→Capricorn on 1999-01-14. Cross-checked the Sankranti date directly:
   fetched `drikpanchang.com`'s own Makar Sankranti 1999 page (New Delhi) — **05:13 PM IST**. This
   project's own output under the reference chart's usual `CUSTOM_KP` ayanamsa was **02:35 PM
   IST**, a ~2.6-hour gap too large to hand-wave. Diagnosed rather than assumed a bug: re-ran
   under `LAHIRI` (drikpanchang's own default ayanamsa) instead — **05:02 PM IST**, within **~10
   minutes** of the published value. The ~2.6-hour gap was entirely explained by comparing
   different ayanamsa modes (Custom KP's ~23°44' vs. Lahiri's ~23°51', a difference of a few
   arcminutes that translates to hours at the Sun's ~1°/day rate), not a bug in
   `_solve_solar_angle`/`compute_sankranti` — confirmed by matching the comparison's ayanamsa
   rather than by adjusting the code.
2. **Amanta lunar month**, fetched directly from `drikpanchang.com`'s day-Panchang page (not
   inferred from a general search): 1998-12-20 → "Pausha - Amanta" — **matches exactly**.
   1999-01-10 (a Krishna Paksha date, deliberately chosen to be far from a month boundary) →
   "Pausha - Amanta" — **matches exactly**.
3. **Purnimanta — both branches of the paksha-dependent logic (§13.2) checked, not just the
   trivial one.** 1998-12-20 (Shukla Paksha) → drikpanchang: "Pausha - Purnimanta", same as
   Amanta — matches, and confirms the Shukla-Paksha branch (Purnimanta = Amanta, no extra
   computation). 1999-01-10 (Krishna Paksha) → drikpanchang: "Magha - Purnimanta" — **differs
   from Amanta's "Pausha," exactly as the classical relationship in §13.2 predicts**, and matches
   this project's own computed output exactly. This was the specific branch most likely to hide a
   bug (it's this project's own derivation, not a direct PyJHora port — §13.4's caveat) and it
   held up under a real, deliberately-chosen adversarial test case.
4. **Adhika Masa — the highest-risk branch, tested against a real historical occurrence, not a
   synthetic date.** Rather than trust a `WebSearch`-synthesized claim ("1999 Phalguna Adhik
   Maas, March 26 – April 24"), this project's own code was used to *find* a candidate: scanned
   the 15th of every month from 1997–2002 through `compute_calendar()` looking for
   `isAdhika == True`, which surfaced **2001-10-15, Amanta Ashwin**. Verified independently:
   `drikpanchang.com`'s day-Panchang for 2001-10-15 reads **"Ashwina (Adhik) - Amanta"** and
   **"Ashwina (Adhik) - Purnimanta"** — both systems, both marked Adhik, matching this project's
   finding exactly. Worth recording precisely because it also caught the earlier `WebSearch`
   answer being wrong **twice** in one query (wrong month/year for 1999, and wrong — "no Adhika
   in 2001" — when 2001 in fact had one): a live illustration of why this project's methodology
   insists on a direct primary-source `WebFetch` rather than trusting a search engine's own
   synthesized summary, in an entry that is itself part of the record of that methodology.
5. **Ritu/Ayana**: cross-checked directly against drikpanchang's own displayed fields for
   1998-12-20 — "Drik Ritu: Hemant (Prewinter)" and "Drik Ayana: Dakshinayana," both matching
   this project's output exactly. Lower-risk than the above (deterministic lookups from an
   already-verified solar month, no boundary-solving involved), but checked rather than assumed.
6. **End-to-end browser verification**: submitted the reference chart through the real UI
   (Playwright), scrolled to the new Calendar section — renders all six fields (Amanta month,
   Purnimanta month, solar month, Ritu, Ayana, next Sankranti) with the exact values verified
   above, zero console errors, zero failed requests. Full-page screenshot taken.

**Net result**: every sub-feature Phase 3 was scoped to cover (except the two explicitly-deferred
gaps in §13.4) is now verified against real, independently-published data across multiple dates
and — for the two branches most likely to hide a bug (Krishna-Paksha Purnimanta divergence,
Adhika Masa detection) — specifically chosen adversarial test cases, not just the easy default
case. README.md's order-of-work item 10 can be marked as Phase 3 done (Phases 4–5 remain open).

### 13.4 Known gaps, called out in advance rather than discovered later

- **Kshaya Masa** (deficit month — two Sankrantis inside one synodic month) is **not
  implemented**. Astronomically rare (on the order of once every couple of decades), and no
  citable per-case rule has been sourced yet — same honest-scoping call already made for
  Durmuhurta (§2.5). `core/calendar.py`'s module docstring states this explicitly rather than
  leaving it to be discovered as a silent gap.
- **`is_nija_month`** from PyJHora's fetched function was not ported (§13.1) — the fetch didn't
  surface what it's for, and guessing wasn't an option this project can afford twice in the same
  area (D2, D30). Left out; may matter for Adhika Masa edge cases (the WebFetch summary
  speculated "Kshaya-Masa-adjacent" but that's exactly the kind of unverified paraphrase this
  project's own methodology says not to trust — flagged as a guess, not a fact).
- **Purnimanta's derivation (§13.2) was never checked against PyJHora's own Purnimanta code
  specifically** — only the Amanta function was fetched (§13.1); Purnimanta is this project's own
  derivation from a well-known classical definitional relationship. §13.3 point 3 has since
  cross-checked its *output* against real drikpanchang data on both the agreeing (Shukla Paksha)
  and diverging (Krishna Paksha) cases and it matched exactly, which is meaningfully more
  confidence than at the time this bullet was first written — but it's still an independently
  derived formula validated by its results, not a second primary-source code reading. Worth a
  second look if PyJHora turns out to have its own Purnimanta function that disagrees.

---

## 14. What's next

Per the project plan folder's `README.md`, "Suggested order of work":

- **Item 9**: done (§12) — both KP Horary (frontend added) and Gochara/transit (unblocked,
  integrated as Option A) are complete and verified end-to-end.
- **Item 10, Phase 3 (Calendar)**: done (§13) — Amanta/Purnimanta lunar month, Adhika Masa,
  solar month, Sankranti, Ritu, Ayana all built, cross-checked against real drikpanchang.com
  data (including a real historical Adhika Masa occurrence, found by the code itself and then
  independently confirmed), wired into `services/app.py` and a new frontend panel, verified
  end-to-end in the browser. Kshaya Masa and PyJHora's `is_nija_month` remain deliberately
  unimplemented (§13.4).
- **Item 10, Phases 4-5** (special yogas/Tara Bala/Panchaka, festival/eclipse engines) not yet
  started. Each carries the same table-sourcing risk Trikalam/Choghadiya (§2) and the D2/D30
  bugs (§7/§8) already demonstrated for this kind of work — budget real verification time against
  a primary source for each table, not just Phase 3's own scope.
- **Items 11-12** remain open: completing Plan 3's document and implementing non-Vimshottari
  Dasha systems, and resolving the Plan 2 Ruling Planets discrepancy (sign lords vs. sub-lords)
  before any birth-time-rectification work.
- **Vargas formulas**: no longer an open item — §8 closed it. A permanent
  `tests/test_vargas_vs_pyjhora.py` (§6's own suggestion, previously deferred) is now a much
  smaller lift than it would have been before this session, since `verify_all_vargas.py`
  already is that test in throwaway form — turning it into a real pytest file (with PyJHora
  pinned as a dev-only dependency, not a runtime one) is the natural remaining step, not yet
  done.
