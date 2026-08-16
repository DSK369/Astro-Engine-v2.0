# Astro Engine — Project Plan

Planning documents for the Astro Engine astrology platform, plus a record of what is
already built as of **16 Aug 2026**.

## The plans

| # | Document | Scope | State |
|---|---|---|---|
| 1 | [Plan 1 Astro Engine.md](./Plan%201%20Astro%20Engine.md) | Full Panchanga engine specification — 77 sections, astronomy core through festival/eclipse engines, plus a 5-phase roadmap | Complete |
| 2 | [Plan 2 Implementation of KP System.md](./Plan%202%20Implementation%20of%20KP%20System.md) | KP (Krishnamurti Paddhati) — 31 features, sub-lord theory, significators, ruling planets, horary | Complete |
| 3 | [Plan 3 Applying Dashas In detail all types Depth 5.md](./Plan%203%20Applying%20Dashas%20In%20detail%20all%20types%20Depth%205.md) | Dasha application to 5 levels, all systems | ⚠️ **Truncated** — source was cut off mid-section 6 by a message size limit |
| 4 | [Plan 4 Divisional Charts (Vargas).md](./Plan%204%20Divisional%20Charts%20(Vargas).md) | D1–D60 divisional charts — the last unimplemented pillar of the "Horoscope Engine" | Complete — **re-verified 16 Aug by cloning the real `naturalstupid/PyJHora` repo into this environment and diffing all 23 charts against its actual execution, 5,520 checks, zero mismatches.** The original "22 charts, zero mismatches" claim had in fact missed two real bugs (D2, D30), caught by a user report and then run to ground against primary source rather than patched blindly — see `Plan 1 Implementation.md` §7–§8. |
| 5 | [Plan 5 Muhurta Engine.md](./Plan%205%20Muhurta%20Engine.md) | Hora, Choghadiya, Trikalam (Rahu Kalam/Yamaganda/Gulika), Abhijit, Durmuhurta, Brahma Muhurta, Nishita | Complete |
| 6 | [Plan 6 Integrate KP Horary and Gochara Transit.md](./Plan%206%20Integrate%20KP%20Horary%20and%20Gochara%20Transit.md) | Merge two already-built sibling features (KP Horary, Gochara transit visualizer) into the main line | Complete — verified end-to-end 16 Aug, both the backend and (previously missing) frontend halves. See `Plan 1 Implementation.md` §12. |

**Also in this folder**: [Plan 1 Implementation.md](./Plan%201%20Implementation.md) — a
session-by-session implementation log (distinct from the specs above), tracking what was
actually built, every file touched, every verification run, and every dead end hit along the
way. Covers 16 Aug 2026: items 6-10 above (Panchanga end times, Muhurta, Vargas, KP Horary/
Gochara, and item 10's Phase 3 Calendar) — all verified end-to-end, not just implemented.

---

## ⚠️ Critical finding, fixed 16 Aug — the engine was silently ~6 arcminutes off

While researching Plans 4–6, a sibling snapshot of this project was found locally
(`Project_v2/Project/astro-engine/`, not on GitHub) with a full `docs/` folder — including
`DECISIONS.md`, an Architecture Decision Record log — documenting that a `-0.1°`
`AYAN_OFFSET` present in `core/houses.py`, `core/planets.py`, and `core/cusps.py` **was
root-caused and deliberately removed** after being cross-checked against a real Kismat
KP-software printout at full arcsecond precision. That fix never made it into the GitHub
`astro-engine` repo this whole session's work was built on — every chart computed today,
including everything documented above, carried it.

**Independently re-verified before touching anything** (see below) rather than trusting the
docs at face value — good thing, too, since reproducing it surfaced two *additional*, deeper
bugs the docs' own ADR had also diagnosed:

1. **`AYAN_OFFSET = -0.1`** added to every longitude after the ayanamsa correction. Not a
   calibration — the offset itself was the bug.
2. **`swe.set_sid_mode(swe.SIDM_USER, value)`** called with 2 args instead of the required 3
   (`mode, t0, ayan_t0`) for `CUSTOM_KP`/`CUSTOM_MANUAL` modes — `value` was silently read as
   `t0` (a reference Julian day), not the ayanamsa.
3. **`FLG_SIDEREAL` + `SIDM_USER`** for planet longitudes hits the same reference-epoch
   precession drift as calling `swe.get_ayanamsa(jd)` directly, even without doing so
   explicitly — discovered when fixing bug 2 alone still left every planet off by ~2.5°.
   The real fix (matching the sibling snapshot exactly): compute **tropical** longitude
   (`FLG_SWIEPH | FLG_SPEED`, no sidereal flag) and subtract an explicitly-threaded
   `ayanamsa_value` parameter everywhere, never re-derived per-call.

**Live-API verification, reference chart (Solapur, 1998-12-20 09:20 IST), `CUSTOM_KP` mode —
exactly the ADR's own test:**

| Body | Before (with bug) | After (fixed) | Kismat printout | Error before | Error after |
|---|---|---|---|---|---|
| Lagna | 09°21'08" | 09°27'08" | 09°27'11" | ~363" | **−3"** |
| Sun | 04°12'17" | 04°18'17" | 04°18'18" | ~361" | **−1"** |
| Moon | 18°02'05" | 18°08'05" | 18°07'57" | ~352" | **+8"** |
| Mercury | 12°40'15" | 12°46'15" | 12°46'20" | ~365" | **−5"** |
| Venus | 16°41'27" | 16°47'27" | 16°47'31" | ~364" | **−4"** |
| Mars | 18°30'49" | 18°36'49" | 18°36'51" | ~362" | **−2"** |
| Jupiter | 26°32'28" | 26°38'28" | 26°38'21" | ~353" | **+7"** |
| Saturn | 03°00'47" | 03°06'47" | 03°06'44" | ~357" | **+3"** |

Every body: ~6 arcminute error → **single-digit arcseconds**. The one previously-known
downstream symptom — **Moon's KP sub-lord computed as Mars instead of the correct Rahu** —
is confirmed fixed on the live API (the sub-lord boundary sits close enough to Moon's
position that the ~6' error flipped it to the wrong side).

Fixed in `core/ayanamsa.py`, `core/houses.py`, `core/planets.py`, `core/cusps.py`,
`services/app.py` (threads the ayanamsa value through explicitly instead of letting each
function re-derive it), and `main.py`. Full regression: **23/23 checks** — the arcsecond
comparison above, the Moon sub-lord assertion, and all 13 checks from the pre-fix suite
(Dasha, rise/set, high-latitude handling, `CUSTOM_MANUAL` mode, `risingMode`, `asOf`, true
node) still passing unchanged.

**Not yet done:** the default ayanamsa mode is still `"KP"` (built-in `SIDM_KRISHNAMURTI`)
in both `main.py` and the frontend's `BirthDataForm.jsx` — only `CUSTOM_KP` was what got
validated against the real printout. `SIDM_KRISHNAMURTI` is a legitimate standard model, not
a bug, but switching the default to match what's actually been verified is a product
decision, not a correctness fix, so it wasn't changed unprompted. Worth deciding deliberately.

---

## What already exists

Two repositories, both cloned locally under `try/1/`.

### `astro-engine` — backend (private repo, Python + Swiss Ephemeris)

Runs on a **Python 3.11** venv specifically: `pyswisseph` ships no prebuilt wheel for 3.12+,
and building from source needs the MSVC C++ toolchain. Ephemeris data files
(`sepl_18.se1`, `semo_18.se1`, covering 1800–2399) live in `ephemeris/`, which is gitignored.

| Module | Provides | Added |
|---|---|---|
| `core/jd.py` | Julian Day, IANA timezone → UTC | pre-existing |
| `core/ayanamsa.py` | KP, Lahiri, Raman, Fagan-Bradley, Custom KP, Custom manual | pre-existing |
| `core/planets.py` | Swiss Ephemeris sidereal positions, retrograde, Rahu/Ketu (mean + true) | pre-existing (true-node option added 15 Aug) |
| `core/astro.py` | Rashi, Nakshatra, Charan lookups | pre-existing |
| `core/houses.py` | Lagna, whole-sign house assignment | whole-sign forced for `swe.houses` (see below, 16 Aug) |
| `core/kp.py` | Sub / Sub-Sub / Sub-Sub-Sub lord cascade | pre-existing |
| `core/dasha.py` | Vimshottari **MD → AD → PD → Sookshma → Prana** (main.py's console-only splitter) | pre-existing, left untouched |
| `core/dasha_tree.py` | **Corrected** 5-level snapshot for the API — fixes a real bug in `dasha.py`'s sub-period math (below) | 16 Aug |
| `core/utils.py` | Sign-relative DMS formatting | whole-number seconds w/ carry (15 Aug) |
| `core/cusps.py` | Placidus/KP house cusps + Placidus house assignment | 15 Aug |
| `core/significators.py` | KP 4-step significators per house | 15 Aug |
| `core/ruling_planets.py` | Ruling Planets | 15 Aug |
| `core/panchang.py` | Panchang — five limbs, each with a Newton's-method-solved start/end/duration/remaining (§57) | 15 Aug, timing added 16 Aug |
| `core/riseset.py` | **Sunrise / sunset / moonrise / moonset**, day/night length, solar noon; standard vs. Hindu rising modes | 16 Aug |
| `core/muhurta.py` | Hora, Abhijit, Nishita, Trikalam (Rahu Kalam/Yamaganda/Gulika), Choghadiya, Brahma Muhurta | 16 Aug |
| `core/vargas/` | Divisional charts — all 23 verified formulas from Plan 4 §3.2 (D2-D12, D16, D20, D24, D27, D30, D40, D45, D60, D81, D108, D144, D150) | 16 Aug |
| `core/horary.py` | KP Prasna (Horary) — 249-number sub-lord table, adaptive ascendant-time search | pre-existing, merged from `astro-engine-v2` before this log's first entry |
| `core/calendar.py` | Lunar/solar calendar (Plan 1 Phase 3) — Amanta/Purnimanta month, Adhika Masa, solar month, Sankranti, Ritu, Ayana | 16 Aug, verified against real drikpanchang.com data and wired into `services/app.py` — see `Plan 1 Implementation.md` §13 |
| `services/app.py` | FastAPI `POST /chart` — CORS, input validation, Dasha, rise/set, Muhurta, Vargas (opt-in), dual Panchang, high-latitude degradation; `POST /horary` — KP Prasna chart, same downstream pipeline as `/chart` | 15–16 Aug |

Verified against a reference chart (Solapur, 1998-12-20 09:20 IST) cross-checked with
professional KP software. **Updated 16 Aug** after the accuracy fix below — Lagna and all
tested bodies now agree within **single-digit arcseconds** in `CUSTOM_KP` mode (was 17–27",
itself an understatement of the true error since that comparison used the default `KP` mode,
which doesn't trigger two of the three bugs described below).

**Bug fixed 16 Aug — first-Mahadasha sub-periods.** `core/dasha.py`'s `generate_antardasha()`
takes `(lord, years, start)` and assumes `years`/`start` describe the parent's *full* span.
That's true for every Mahadasha except the first, which is partial — the native is born
partway through it. Feeding it the birth *balance* instead of the true 20-year span silently
compressed all 9 Antardashas and mis-reported which one was running at birth. Worked example
(Moon in Venus's star, born 1998-12-20): correct Antardashas are Venus 3.333y / Sun 1.0y /
Moon 1.667y / Mars 1.167y → cumulative 7.167y, so birth (7.045y into the Mahadasha) falls in
**Mars AD**. The old splitter reported **Venus AD** starting exactly at birth instead.
`core/dasha_tree.py` tracks each Mahadasha's true span separately from its birth-clipped
visible span and always subdivides the true one; verified against the hand-computed values
above plus an automated check that every level's 9 children are contiguous and sum exactly
to their parent. `core/dasha.py` itself is untouched — `main.py` still uses it as-is.

**Bug fixed 16 Aug — unhandled 500s.** The endpoint had zero input validation: a malformed
date (e.g. `11111-11-11`, plausible from a stray browser input) crashed 5 stack frames deep
in `strptime` with a raw 500. Now validated up front — bad date/time, unknown IANA timezone,
out-of-range coordinates, and unknown ayanamsa all return **422 with a message** instead.

**Bug fixed 16 Aug — high-latitude 500.** Placidus cusps are mathematically undefined above
the polar circles (the ecliptic points they depend on never cross the horizon there); Swiss
Ephemeris raises `swisseph.Error` and the whole request failed. Two changes: (1)
`calculate_lagna()` now requests whole-sign (`'W'`) instead of the implicit Placidus default
when computing the Ascendant — verified the Ascendant angle itself is bit-identical
(0.000000000 arcsecond delta) across five house systems tested, so this is free; (2) when
Placidus cusps still fail, the response degrades gracefully — KP cusps/significators come
back empty with an explanatory entry in a new `warnings` array, while planets, whole-sign
houses, Dasha and Panchang are computed normally. Tested at Tromsø (69.65°N) on the summer
solstice, where the Sun is genuinely circumpolar.

Full regression suite (22 checks: 9 on the unchanged reference chart, 10 at the Tromsø edge
case, 3 on `risingMode`/`asOf`/southern-hemisphere) passes.

### `Astro-Engine-v2.0` — frontend (public repo, React + Vite)

Was running on fixture data; now consumes the real API (`USE_MOCK = false`,
`VITE_API_BASE_URL` in `.env.local`). 15 Aug: chart label geometry rewritten so no label can
escape its house, English/Hindi i18n across the whole UI including chart glyphs, whole-number
DMS seconds. 16 Aug: new `DashaPanel` (nested 5-level chain + Mahadasha timeline table) and
`SunMoonPanel` (sunrise/solar noon/sunset/moonrise/moonset/day-length/night-length, with a
circumpolar notice), the birth-moment-vs-sunrise Panchang split rendered as two labeled
sub-panels, and an `app-warnings` banner for engine-reported limitations (e.g. the polar-cusp
case above) — distinct from the existing mock-data notice, since the chart did render. Later
16 Aug: `PanchangDetails` updated for each limb's new start/end shape (shows an "Ends HH:MM"
line per limb), and a new `MuhurtaPanel` sibling to `SunMoonPanel` (current Hora, current
Choghadiya with its auspicious/neutral/inauspicious quality, Abhijit, Rahu Kalam/Yamaganda/
Gulika Kalam, Nishita, Brahma Muhurta), same circumpolar-notice pattern. Still later 16 Aug:
`BirthDataForm` gained a Varga multi-select (all 23 supported D-numbers, opt-in, none selected
by default), and a new Divisional Chart section renders whichever ones were requested through
a D-number dropdown — reusing `NorthIndianChart`/`SouthIndianChart` completely unchanged, per
Plan 4 §6's expectation that no new chart-drawing code would be needed. All new UI text
carries Hindi translations. Deployed to GitHub Pages from branch `14-Aug-2026`.

**Local-only:** the live GitHub Pages site still serves mock data — static hosting cannot
run the Python backend.

---

## Other local assets discovered 16 Aug (not on GitHub, not previously known to this plan)

Scattered across `try/1/` outside the two repos this plan originally tracked. Each grounds
one of Plans 4–6 directly, so they're recorded here rather than lost again.

| Location | What it is | Relevant to |
|---|---|---|
| `astro-engine-v2/core/horary.py` + `core/data/kp_horary_249.py` | A **complete, working KP Horary (Prasna) system** — 249-number sub-lord table, cross-validated to sub-arcsecond precision against two independent implementations (VedicAstro, PyJHora), plus an adaptive-step ascendant-time search. Never merged into the GitHub repo. | Plan 6 |
| `Project_v2/Project/gochara/` | Local working copy of **`github.com/DSK369/Astro-Engine-Gochar`** (confirmed via `git remote -v`) — a complete, documented, standalone FastAPI + canvas transit-timeline visualizer, sibling to `astro-engine`. **Merged in 16 Aug** as `Astro-Engine-v2.0/gochara/` (cloned fresh from the public GitHub repo rather than copied from this local snapshot, since the snapshot's own state wasn't re-checked — see `Plan 1 Implementation.md` §12.1). | Plan 6 — done |
| `Project_v2/Project/astro-engine/` | A **more advanced sibling snapshot** of the same backend: `core/engine.py` (a `compute_chart()` unifying function neither GitHub repo has), CLI argparse instead of a hardcoded dict, `services/api.py`, and **46 pytest tests**. Source of the accuracy fix above. | The accuracy fix; a better architectural reference generally |
| `Project_v2/Project/astro-engine/docs/` | 18 planning/process docs — `ROADMAP.md`, `TODO.md`, `KNOWN_LIMITATIONS.md`, `DECISIONS.md` (ADR log), `ARCHITECTURE.md`, `API_SPECIFICATION.md`, `DATABASE_DESIGN.md`, `SECURITY.md`, `TEST_PLAN.md`, `CHANGELOG.md`, `PROJECT_CONTEXT.md`, etc. Exactly the doc set the frontend's own code comments reference (`docs/API_SPECIFICATION.md`, `docs/KNOWN_LIMITATIONS.md`) but that don't exist in either GitHub repo. | All of Plans 4–6; worth reading in full before further work |
| `research/KPAstroDashboard/` | A full desktop app (PySide/Qt) with `calculations/hora_calculator.py`, `transit_calculator.py`, `aspect_calculator.py`, `planetary_strength_calculator.py`, and a `yogas/` package (positive/negative/neutral). | Plan 5 (Hora sequence table), future Yoga/strength work |
| `research/PyJHora/`, `research/VedicAstro/`, `research/Jathakam/`, `research/logicAstroKPCharts/`, etc. | ~8 cloned reference implementations in Python/Java/C# — the sources Plan 1's citations point at, now available locally instead of just linked. | Cross-verification per Plan 1 §69 |
| `Project_v2/Project/astro-engine_*.zip` (4 files) | Dated zip snapshots (`preClaude`, `vedic_v1.0`, `KP_v1.0`, `v1.6`) — informal version history outside git. | Historical reference only |

**The practical implication:** the GitHub `astro-engine` repo is not the most advanced version
of this codebase — `Project_v2/Project/astro-engine/` is, and it diverged with no merge path
back. Before starting Plan 4/5/6 implementation work, reconciling these two (at minimum:
pulling `core/engine.py`, the 46 tests, and the CLI argparse pattern into the GitHub repo) is
worth doing deliberately rather than continuing to develop the GitHub copy in ignorance of a
better local one.

---

## Gap analysis — plans vs. implementation

### Plan 1 (Panchanga) — rise/set foundation now in place

Plan 1's opening instruction is: *do **not** design the engine as simply Tithi / Nakshatra /
Yoga / Karana / Vara.* `core/panchang.py` still computes only those five, but the blocker
Plan 1 itself identifies as prerequisite to everything past that — real sunrise/sunset — is
now built (`core/riseset.py`, 16 Aug), along with the §58 sunrise-vs-point-in-time
distinction Plan 1 calls out explicitly. Verified against published almanac times (London
summer solstice sunrise/sunset match to the minute) and against a circumpolar location where
the Sun genuinely doesn't rise, returning `null` rather than a fabricated time.

Done since, later 16 Aug:

- **Per-limb end times** (§10/§15/§57) — each of Tithi/Nakshatra/Yoga/Karana now carries its
  own boundary-solved `start`/`end`/`durationSeconds`/`remainingSeconds`.
- **Muhurta engine** (§25–§35) — Hora, Abhijit, Nishita, Rahu Kalam, Yamaganda, Gulika Kalam,
  Choghadiya, Brahma Muhurta. Durmuhurta is the one piece of §25–§35 still not built (no
  citable per-weekday table sourced yet — see "Suggested order of work" above).

Still missing:

- Lunar/solar calendar (Paksha beyond the tithi label, Amanta/Purnimanta, Adhika/Kshaya
  Masa, Sankranti, Ritu, Ayana), special yogas, Tara Bala/Panchaka/Gandanta, festival
  engine, eclipse engine, regional profiles, monthly API, caching.

Location sensitivity (Plan 1 §3, previously flagged as a correctness bug — `compute_panchang`
took no coordinates) is now resolved indirectly: sunrise/sunset are fully location-aware, and
`panchangAtSunrise` is computed from the Sun/Moon position *at that local sunrise instant*,
so the result already varies correctly by place. The birth-moment Panchang (`panchang`) is
unaffected by location by design — it depends only on the moment, matching how Tithi/Yoga/
Karana are astronomically defined.

### Plan 2 (KP) — most complete

Of the twelve "learn first" concepts in Plan 2 §31, the engine already implements: house
cusps (Placidus), nakshatras, star lords, sub-lords, cusp sub-lords, house signification,
significators, ruling planets, and Vimshottari Dasha — plus KP ayanamsa, retrograde
handling, and mean/true nodes.

Not yet built in the GitHub repo, but see the "Other local assets" section below before
assuming so: **KP Horary/Prashna** (§20) is already fully built in `astro-engine-v2`, just
never merged — see Plan 6. **Transit** (§24) likewise already exists as the working
`Astro-Engine-Gochar` sibling app — also Plan 6. Genuinely not built anywhere yet:
**birth-time rectification** (§21) and the event-specific analysis layer (§14–§19) that
turns significators into answers about marriage, career, property and so on.

⚠️ **One discrepancy to reconcile.** Plan 2 §8 lists the Ruling Planets as *Ascendant Star
Lord, Ascendant Sub-Lord, Moon Star Lord, Moon Sub-Lord, Day Lord*. The implemented
`compute_ruling_planets()` returns *Lagna Lord, Lagna Star Lord, Rasi Lord, Day Lord, Moon
Star Lord* — it matches the validated Kismat printout used as the reference, but it carries
the two **sign lords** where the plan calls for the two **Sub-Lords**. Both variants are used
in practice; decide which is authoritative before building rectification or horary on top,
since both techniques lean heavily on the RP set.

### Plan 3 (Dashas) — Vimshottari now live, and corrected

`core/dasha.py` implements all five levels — Mahadasha, Antardasha, Pratyantardasha,
Sookshma, Prana — the "Depth 5" the plan's title asks for, at least for Vimshottari. It's
now exposed through `POST /chart` (`dasha` field: balance at birth, the active 5-level
chain, the full Mahadasha timeline, and sibling periods at every level) and rendered in the
UI as a nested `DashaPanel`. Along the way a real bug surfaced and was fixed in the
sub-period math for the first (birth-partial) Mahadasha — see the backend changelog above.

Plan 3's own content is still incomplete — truncated mid-Sookshma by the source message's
size limit, before it reached Prana Dasha or any system besides Vimshottari (Ashtottari,
Yogini, Chara, Kalachakra, etc.). That gap is in the *document*, not the implementation:
Prana is implemented and live in the API; the other Dasha systems are not implemented
anywhere and aren't described in the plan yet either. Re-send the rest of Plan 3 to close
the documentation gap.

---

## Suggested order of work

1. ~~**Expose Dashas**~~ — done 16 Aug, plus a real correctness bug found and fixed along
   the way.
2. ~~**Sunrise / sunset**~~ — done 16 Aug (`core/riseset.py`), including moonrise/moonset,
   day/night length, solar noon, and a configurable rising convention.
3. ~~**Tithi-at-sunrise vs point-in-time**~~ — done 16 Aug (`panchang` vs `panchangAtSunrise`
   in the API response, both rendered in the UI).
4. ~~**Ayanamsa/offset accuracy fix**~~ — done 16 Aug, see the critical-finding section above.
   Not originally on this list; surfaced while researching Plans 4–6 and fixed immediately
   rather than deferred, since it silently affected every chart computed all session.
5. ~~**Reconcile with `Project_v2/Project/astro-engine`**~~ — done 16 Aug (commits
   `71810ac` KP Horary merge, `7f74a41` accuracy-fixes-and-modules merge, `80b5f0d` archive of
   the now-redundant `Project_v2`/`astro-engine-v2` scratch copies), *before* this correction
   was written. This list previously said "not yet done" — stale; the git log (`71810ac`,
   `7f74a41`, both 16 Aug 02:42–03:01) shows otherwise. Corrected in place rather than left
   wrong, since the whole point of this list is to reflect what's actually true.
6. ~~**Panchanga end times**~~ — done 16 Aug. Each of Tithi/Nakshatra/Yoga/Karana now solves
   its own start/end via Newton's-method boundary search on the real Sun/Moon speed at each
   iterate (not an assumed fixed duration) — converges to sub-microarcsecond angular error in
   every case tested. `durationSeconds`/`remainingSeconds` included per §57. Verified against
   the reference chart (values match the pre-existing validated mock data exactly: Shukla 2/
   Dwitiya, Vriddhi, Balava) and by re-deriving the Sun/Moon angle at each solved boundary and
   confirming it lands on the exact segment edge.
7. ~~**Muhurta engine (Plan 5)**~~ — done 16 Aug for everything except Durmuhurta.
   Hora/Abhijit/Nishita built from the already-sourced/simple rules in Plan 5 §3/§4/§7.
   Trikalam and Choghadiya — the two tables Plan 5 explicitly flagged as unverified locally —
   were sourced from drikpanchang.com and live-validated: Trikalam against 3 real dates/
   locations (Delhi, Ujjain, and New York City outside India to rule out an IST-specific bug),
   matching published times to the minute; Choghadiya against drikpanchang's full day+night
   sequence for 2 weekdays plus the starting period for the remaining 5, which also surfaced a
   real rule Plan 5 didn't anticipate — the night sequence steps *backward* through the
   7-name cycle (-2 per period) while the day sequence steps forward (+1), confirmed
   independently for two different weekdays before being trusted. Durmuhurta stays
   unimplemented, per Plan 5's own priority call — no citable per-weekday table turned up.
   Brahma Muhurta exposes both conventions Plan 5 named (`night_fifteenths` default,
   `fixed_96_48`) rather than picking one. New `core/muhurta.py`; wired into `POST /chart`'s
   `muhurta` field (unconditional, degrades to `null` at circumpolar latitudes exactly like
   `riseSet`); new frontend `MuhurtaPanel`.
8. ~~**Extract and verify divisional-chart formulas (Plan 4 §3)**~~ — done 16 Aug. All 22
   charts execution-verified against real `research/PyJHora` output (not transcribed from
   memory or read-and-guessed) — see Plan 4's own changelog note. This also reversed an
   earlier finding in Plan 4: the D10 and D3 rules that were drafted from memory then
   retracted as "checked and wrong" turned out to be correct — the retraction had checked
   against the wrong PyJHora function.
   ~~**Implementing** Plan 4's `core/vargas/` module~~ — also done 16 Aug, all 23 formulas
   (the 16 Shodasavarga plus D5/D6/D8/D11/D81/D108/D144/D150), not just D9 first as originally
   scoped — transcribing the rest directly from Plan 4 §3.2's already-verified table cost
   little extra once the module shape existed. New `core/vargas/` package (`rules.py` for the
   shared sign-set helpers, `formulas.py` for the 23 per-chart formulas, `__init__.py` for
   `get_varga_chart()`/`get_multiple_varga_charts()`); wired into `POST /chart` as an opt-in
   `vargasRequested: list[int]` field per Plan 4 §5; new frontend Varga selector + chart
   display reusing the existing North/South Indian chart SVG components unchanged, per Plan 4
   §6. Verified: every formula's boundary behaves deterministically at ±1 arcsecond (D9/D10/
   D30 spot-checked); all 23 charts run cleanly end-to-end for the reference chart with valid
   12-planet output and 1-12 house numbers.
   **One correction to Plan 4 itself, found during this verification**: §8's Vargottama sanity
   check ("Mars is Vargottama (D1 Scorpio = D9 Scorpio)" for the reference chart) does not
   hold against this engine's actual output — Mars's D1 sign is Virgo, not Scorpio (confirmed
   two ways: this session's live computation, and the independently-validated Mars longitude
   already in `mockChartData.js`, both agreeing at ~168.6°). The D9 *formula* itself checks out
   independently: applying Plan 4 §3.2's own alternate description ("dual sign: from 5th-from-
   self") by hand to Virgo/18.61° lands on Gemini, exactly matching this implementation's
   output — so the formula is right and the specific Vargottama example in §8 is the part
   that's wrong, most likely computed against a different chart than the one named. Left as a
   documentation-only note rather than silently altering the formula to force a match.
9. ~~**Merge the two already-built sibling features (Plan 6)**~~ — done, later 16 Aug. KP
   Horary's backend was already merged in an earlier session; this round added the missing
   frontend (`HoraryForm`/`HoraryResultHeader`, a natal/horary mode toggle, reusing every
   existing chart-display component unchanged per Plan 6 §3.5). Gochara/transit was previously
   marked blocked (sibling app not present in this environment) — re-checked and found the repo
   is actually public (`github.com/DSK369/Astro-Engine-Gochar`), cloned, merged into
   `Astro-Engine-v2.0/gochara/` as Plan 6's recommended Option A (separate process, header
   link), one real path-mismatch bug found and fixed (`EPHE_PATH` assumed a sibling-repo layout
   this project doesn't have — would have silently degraded to lower-precision Moshier ephemeris
   without it). Both verified end-to-end live, not just started and assumed working — see
   `Plan 1 Implementation.md` §12.
10. ~~**Phase 3 (Calendar)**~~ — done, 16 Aug. `backend/core/calendar.py`: lunar month (Amanta/
    Purnimanta), Adhika Masa, solar month, Sankranti, Ritu, Ayana. Algorithm sourced from real
    PyJHora execution (`lunar_month()`, fetched and read directly), then cross-checked against
    real `drikpanchang.com` data across multiple dates — including a real historical Adhika Masa
    occurrence (2001-10-15, Ashwin) that this project's own code found by scanning for the
    condition and which was then independently confirmed, and a deliberately-chosen Krishna
    Paksha date to exercise the Amanta/Purnimanta divergence branch specifically. Wired into
    `POST /chart`'s `calendar` field and a new frontend panel, verified end-to-end in the
    browser. Kshaya Masa and a PyJHora refinement (`is_nija_month`) are deliberately not
    implemented — see `Plan 1 Implementation.md` §13.4. **Phases 4–5** (special yogas/Tara Bala/
    Panchaka, festival/eclipse engines) not yet started.
11. Complete Plan 3's document (Prana Dasha section, the other Dasha systems), then implement
    whichever of those systems get prioritized — none exist yet beyond Vimshottari.
12. Resolve the Plan 2 Ruling Planets discrepancy (sign lords vs. sub-lords) before building
    birth-time rectification on top of Plan 6's merged Horary system, since rectification
    leans heavily on the RP set.

Throughout, Plan 1 §67–§69 apply: boundary tests at ±1 arcsecond around every angular
transition, and cross-verification against PyJHora and Drik Panchanga. PyJHora's own
history shows Karana and Tithi end-time bugs surviving in released code, so independent
comparison should be in place from the start rather than added later — the Dasha sub-period
bug found this session is exactly that category of mistake, caught only because the
sub-periods were checked against hand-computed classical arithmetic rather than assumed
correct because the code looked reasonable.
