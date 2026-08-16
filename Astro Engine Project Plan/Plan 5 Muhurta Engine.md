# Plan 5 — Muhurta Engine

**Status of this plan:** original, authored for this project — not pasted from an external
source like Plans 1–3. Narrows Plan 1 §25–§35 (which describes *what* the Muhurta layer
should contain) down to a concrete implementation plan grounded in what `astro-engine`
already has (`core/riseset.py`, built this session) and what's verifiable locally.

Roadmap position: this project's own `ROADMAP.md` doesn't list Muhurta as a separate phase —
it falls under Plan 1's Panchanga scope, §25–§35. It's split into its own plan here because
it has a single, clean prerequisite (real sunrise/sunset) that's now satisfied, making it the
most immediately buildable piece of Plan 1's remaining scope. See this plan folder's README,
"Suggested order of work," for how it's sequenced against Plans 4 and 6.

---

## 1. What's already built that this plan depends on

`core/riseset.py` (added this session) provides, for any date/location:

- `sunrise`, `sunset`, `next_sunrise` (local datetimes, `None` if circumpolar)
- `day_seconds`, `night_seconds` — the exact spans every Muhurta calculation below
  subdivides
- `solar_noon` (upper meridian transit) — the anchor for Abhijit (§4)

Every technique in this plan is a **pure function of these values plus the weekday** — none
of them need a fresh Swiss Ephemeris call, and none of them are affected by the accuracy fix
documented in this plan folder's README (that fix corrected sidereal *longitudes*; rise/set
times are a geometric horizon-crossing fact, independent of ayanamsa entirely).

## 2. A methodology note, carried over from Plan 4

Plan 4 (Divisional Charts) set out to write specific rule tables from memory, checked them
against `research/PyJHora`, and found 2 of 3 checked rules wrong. That result applies here
too: **this plan states a technique's structure with confidence only where a real, checkable
source was found locally; where none was found, it says so explicitly instead of presenting
a remembered table as fact.** Concretely, before writing this plan, `research/PyJHora`,
`research/KPAstroDashboard`, `research/VedicAstro`, `research/logicAstroKPCharts`,
`research/Jathakam`, and `research/jyotish-vedic-astrology-app` were all searched for
Choghadiya and Rahu Kalam/Yamaganda/Gulika implementations:

- **Found and verified**: `research/KPAstroDashboard/calculations/hora_calculator.py` has a
  real, complete Hora-sequence table (§3 below cites it directly and checks its internal
  consistency).
- **Not found anywhere**: a checkable Choghadiya or Trikalam (Rahu Kalam/Yamaganda/Gulika)
  segment-index table. `research/jyotish-vedic-astrology-app` has UI pages for both, but they
  call a third-party hosted API (`@roxyapi/ui-react`) rather than compute anything locally —
  no formula to check. §5/§6 below describe the correct *structure* of these techniques (which
  is well-established and not in question) without asserting the specific per-weekday
  segment-index numbers, and say explicitly what must happen before those numbers go in the
  spec.

## 3. Hora (planetary hours)

**Source, verified**: `research/KPAstroDashboard/calculations/hora_calculator.py`,
`_get_hora_rulers_for_day()`. Its table (transcribed exactly, not paraphrased):

```python
hora_rulers = {
    "Sunday":    ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"],
    "Monday":    ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury"],
    "Tuesday":   ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"],
    "Wednesday": ["Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus"],
    "Thursday":  ["Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn"],
    "Friday":    ["Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun"],
    "Saturday":  ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"],
}
```

**Self-consistency check** (worth doing precisely because §2 found memory-based tables can
look plausible and still be wrong — a table transcribed correctly should at least be
internally consistent even before comparing to a second source): every row is the same
7-planet cycle — Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars → (wraps to Sun),
the classical "Chaldean order" — started at a different offset, where each day's starting
planet is that weekday's own ruler (Sunday→Sun, Monday→Moon, Tuesday→Mars, ...). Checked
this holds for all 7 rows; it does.

**Algorithm**:

1. Day is divided into 12 Horas spanning `sunrise → sunset`, each `day_seconds / 12` long.
2. Night is divided into 12 Horas spanning `sunset → next_sunrise`, each `night_seconds / 12`
   long. (Day and night Horas are **different lengths** except at the equinox — this is the
   detail Plan 1 §25 specifically warns against getting wrong: "don't use 1 Hora = exactly 60
   minutes.")
3. The day's 12 Horas cycle through the table's 7-planet row for that weekday, wrapping
   (Hora 8 repeats Hora 1's ruler, etc.) — `hora_rulers[weekday][i % 7]` for `i` in `0..11`.
4. The night's 12 Horas **continue the same cycle** from where the day's 12th Hora left off,
   not restart at the weekday's own ruler — off-by-one here would shift every night Hora
   after the first. Verify this specific continuity point against
   `research/KPAstroDashboard` before shipping, since the file found only covers the
   day-labeling logic in the section read — confirm its night-Hora continuation matches
   before trusting it silently.

## 4. Abhijit Muhurta

Structurally simple and low-risk relative to §5/§6: the day (`sunrise → sunset`, not the
24-hour clock day) is divided into 15 equal Muhurtas; **Abhijit is the 8th** (the one
straddling solar noon). This is a single well-attested rule, not a per-weekday table, so
it's presented directly:

```python
muhurta_length = day_seconds / 15
abhijit_start = sunrise + timedelta(seconds=7 * muhurta_length)
abhijit_end = sunrise + timedelta(seconds=8 * muhurta_length)
```

`solar_noon` (already computed by `riseset.py`) should fall inside this window — a cheap
runtime assertion worth adding, since a violation would indicate either a sunrise/sunset bug
or a Muhurta-count error, not something to silently ignore. Plan 1 §30 notes Abhijit doesn't
apply on Wednesdays in some traditions — flag this as a configurable rule rather than a
universal one, matching this project's existing pattern of exposing named variants explicitly
(`core/ayanamsa.py`) instead of picking one silently.

## 5. Trikalam — Rahu Kalam, Yamaganda, Gulika Kalam

**Structure** (not in question): each is one of 8 equal segments of the daytime span
(`sunrise → sunset`, divided into 8, not 15 — a different granularity from Abhijit's 15, easy
to conflate), with a specific segment index selected per weekday for each of the three. All
three names refer to shadow-planet-ruled "inauspicious" periods, commonly presented together
because they're computed the same way from the same 8-segment division.

**What's missing**: the specific segment-index-per-weekday table for each of the three. §2
found no locally-checkable implementation to verify one against. **Do not implement from a
remembered table** — source it from a citable reference (Plan 1's own reference list already
includes `drikpanchang.com`, which publishes both the methodology and daily values that can
serve as ground truth) and validate by cross-checking computed Rahu Kalam times against that
site's published times for several real dates/locations before trusting the table, the same
way this project's `tests/test_reference_chart.py` (per `Project_v2/Project/astro-engine`'s
docs) locks in the D1 accuracy fix against a real printout.

```python
# Sketch of the shape once the table is sourced — NOT the values themselves.
segment_length = day_seconds / 8
def trikalam_period(weekday, segment_index_table):
    idx = segment_index_table[weekday]   # 0-7, TO BE SOURCED — see above
    start = sunrise + timedelta(seconds=idx * segment_length)
    end = start + timedelta(seconds=segment_length)
    return start, end
```

Gulika Kalam here is the **time-period** sense (one of the 8 daytime segments, like Rahu
Kalam/Yamaganda). This is a different thing from **Gulika the Upagraha** — a calculated
zodiacal longitude treated like a planet in KP/Vedic charts, which `research/PyJHora`
computes (`const.py`'s `_other_upagraha_list` includes `gulika`/`maandi`) but which belongs
in `core/` alongside planets, not in this Muhurta plan. Don't conflate the two when
implementing — they share a name and a common origin (both derived from "which of the 8
segments belongs to Saturn's shadow") but are consumed completely differently downstream.

## 6. Choghadiya

Same situation as §5: structure is well-established (day divided into 8 segments, night into
8 segments, each labeled with one of 8 named qualities — auspicious/inauspicious/neutral —
in a sequence that also depends on weekday), specific table not locally verified. Source and
validate the same way as §5 before implementing, rather than transcribing a remembered
sequence.

## 7. Durmuhurta, Brahma Muhurta, Nishita

Lower-risk than §5/§6 — like Abhijit (§4), these are single relative-position rules rather
than per-weekday tables:

- **Brahma Muhurta**: the 2nd-to-last Muhurta before sunrise, where the night-before's span
  is divided the same way §4 divides the day (`night_seconds / 15`, or per some traditions a
  fixed ~48-minute window ending 96 minutes before sunrise — **these are two different,
  both-cited conventions**; expose as a named choice rather than picking one, per the pattern
  established in §4/§5).
- **Nishita**: the midpoint of `sunset → next_sunrise` (i.e. `sunset + night_seconds/2`) —
  simple enough that Plan 1 §33 already states it correctly ("calculate it relative to sunset
  + next sunrise rather than simply using 00:00").
- **Durmuhurta**: Plan 1 §31 already flags this correctly as potentially *multiple* intervals
  per day depending on tradition — data model should be a list, not a single interval, from
  the start. Specific timing rule not yet sourced; lower priority than §5/§6 since it's less
  commonly consulted in practice.

## 8. API shape

Extend `POST /chart`'s `riseSet` object (or add a sibling `muhurta` object, cleaner given
this is a distinct concern from rise/set itself) once §5/§6's tables are sourced:

```json
{
  "muhurta": {
    "hora": { "current": {"lord": "Mars", "start": "...", "end": "..."}, "day": [...], "night": [...] },
    "abhijit": {"start": "...", "end": "..."},
    "rahuKalam": {"start": "...", "end": "..."},
    "yamaganda": {"start": "...", "end": "..."},
    "gulikaKalam": {"start": "...", "end": "..."},
    "choghadiya": {"day": [...8 segments...], "night": [...8 segments...]},
    "brahmaMuhurta": {"start": "...", "end": "..."},
    "nishita": {"start": "...", "end": "..."},
    "durmuhurta": [{"start": "...", "end": "..."}]
  }
}
```

Compute unconditionally alongside `riseSet` rather than opt-in (unlike Plan 4's Vargas,
Muhurta data is small — a dozen or so timestamp pairs, not a full 9-planet remapped chart —
so there's no meaningful cost to always including it once implemented).

## 9. Frontend

A `MuhurtaPanel` sibling to the existing `SunMoonPanel` (built this session) — same visual
pattern (label/value grid), same i18n approach (`src/lib/i18n.js`), same "does not occur"
handling for circumpolar dates where `riseSet.circumpolar` is true and none of this section
can be computed at all (§1 — everything here derives from `sunrise`/`sunset`, which are
`None` in that case).

## 10. Implementation order

1. **Hora** (§3) — verified source exists, lowest risk, implement first.
2. **Abhijit** (§4) — simple, single rule, no table to source.
3. **Nishita** (§7) — already correctly specified in Plan 1 §33, simple rule.
4. **Trikalam** (§5) — source and validate the segment tables against
   `drikpanchang.com`-published real dates before implementing (see §5's validation note).
5. **Choghadiya** (§6) — same sourcing requirement as Trikalam; do after, since it's a more
   elaborate 8-name sequence with its own weekday-dependent starting rule, more surface area
   for the same class of error already caught twice in Plan 4.
6. **Brahma Muhurta, Durmuhurta** (§7) — lowest priority; resolve which named convention to
   expose for Brahma Muhurta, and source Durmuhurta's specific timing rule, before
   implementing either.

## 11. Verification

- **Real published times, not just internal consistency.** Plan 4's lesson generalizes: an
  internally-consistent table (like Hora's Chaldean-cycle check in §3) is necessary but not
  sufficient — it proves a table wasn't garbled in transcription, not that it's the *correct*
  table. For Trikalam and Choghadiya specifically, cross-check computed times against
  `drikpanchang.com`'s published values for at least 3 real dates/locations (including one
  outside India, to catch any hidden IST-specific assumption) before considering either done.
- **Boundary tests** per Plan 1 §68 / Plan 4 §8's pattern: a moment exactly on a segment
  boundary (e.g. exactly `sunrise + day_seconds/8`) should land deterministically on one
  side.
- **Circumpolar handling**: every technique in this plan must degrade the same way
  `core/riseset.py` and the high-latitude Placidus fix (this plan folder's README) already
  do — return `None`/omit rather than raise or fabricate a time when `sunrise`/`sunset` are
  `None`.
