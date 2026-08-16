# Plan 4 — Divisional Charts (Vargas)

**Status of this plan:** original, authored for this project — not pasted from an external
source like Plans 1–3. Grounded directly in `astro-engine`'s existing code (`core/astro.py`,
`core/kp.py`, `core/houses.py`) and cross-checked against `research/PyJHora` (cloned locally).

**Update, 16 Aug:** every formula in §3.2 is now execution-verified, not just transcribed —
`research/PyJHora`'s actual code was run (not read and guessed from) against this project's
reference chart, and independently reimplemented and diffed against it, for D1 through D60
plus the composite D81/D108/D144/D150 charts (22 charts, zero mismatches). This also **reverses**
an earlier finding in this plan: D10 and D3's rules, originally drafted from memory then
retracted as "checked and wrong," were retracted based on a check against the wrong reference
function — they were correct all along. See §3.1 for what happened and §3.2 for the full
verified formula set.

**Update, later 16 Aug — the "22 charts, zero mismatches" claim above was itself wrong for D2,
and has now been re-verified properly.** After implementation, a real user reported D2 output
that didn't match reality (see §3.2/§3.3's D2 entries and `Plan 1 Implementation.md` §7 for the
full story). Rather than fix D2 alone and hope the rest were fine, `naturalstupid/PyJHora` was
cloned directly into this environment (`git clone https://github.com/naturalstupid/PyJHora`,
its non-GUI dependencies installed into an isolated venv) and **every one of the 22 non-D1
formulas was re-run against PyJHora's real functions across 240 sampled `(sign, longitude)`
points each — 5,280 checks** (not just the one reference chart's dozen planet positions this
plan's own methodology used originally). Result: **D2 and D30 both had real bugs** (D2: wrong
`chart_method` entirely, scattering across up to 12 signs instead of the correct 2; D30: a
boundary-inclusivity mismatch affecting only the exact integer-degree boundaries). The other 20
matched exactly. Both are now fixed and the full 5,520-check suite (23 charts × 240 points,
including the corrected D2/D30) passes with zero mismatches. Full methodology, the exact root
causes, and the verification script: `Plan 1 Implementation.md` §8.

**Update, still 16 Aug — the D2 *sign* fix above got re-reported as a *house* bug; it wasn't
one.** A user re-checked D2 output and saw planets in house 12 as well as houses 1/2, and
(reasonably) read that as the same class of bug as the original D2 report. It isn't: two signs
occupied does not mean two houses occupied. Investigated fresh (live API testing across 24 birth
times, a third reference codebase (`velteyn/OpenJyotish`) read alongside PyJHora, and published
astrology sources on the D2 chart's own house interpretations) and confirmed house 12 is correct,
expected behavior — see §3.3's new note and `Plan 1 Implementation.md` §10 for the full
investigation.

Roadmap position: **Phase 6** in every snapshot of this project's own `ROADMAP.md`
(`Project_v2/Project/astro-engine/docs/ROADMAP.md`) — status "⏳ Not started" everywhere,
the last unimplemented pillar of the "Horoscope Engine" sketched in Plan 1's own architecture
diagram (`Horoscope: D1, Vargas, Dashas, KP`). D1 (the main chart), Dashas, and KP are all
built; Vargas are the one piece that's genuinely 0% done in every repo, snapshot, and zip
surveyed for this project.

---

## 1. What a divisional chart is, and why it matters

Every planet already has a longitude in the main (D1/Rashi) chart — a position within one of
the 12 signs, each spanning 30°. A **divisional chart** (Varga, from Sanskrit *varga* =
"division") re-derives a *different* sign placement for every planet by subdividing that same
30° into N equal parts and mapping each part to one of the 12 signs by a fixed rule specific
to that division. The planet keeps its D1 longitude for every other purpose — a Varga doesn't
move the planet, it re-interprets which sign it falls in for a specific life domain.

The classical logic (Parashara, *Brihat Parashara Hora Shastra*) is that D1 shows whether
something is promised in general terms, while a planet's *dignity in the relevant Varga*
determines how strongly and specifically it delivers on that promise. A planet strong in D1
but weak in the Varga relevant to a specific question (e.g. D10 for career) is read very
differently from one strong in both — this is a distinct axis of analysis from the KP
significator/sub-lord machinery `core/` already implements, not a replacement for it.

**This is not optional decoration.** Several already-implemented KP techniques implicitly
assume Vargas exist even though the code doesn't compute them yet:

- **Vargottama** — a planet occupying the *same sign* in D1 and D9 is considered
  exceptionally strong. This can't be evaluated at all without D9.
- **Shadbala** and other strength assessments (not yet implemented, but a natural next step
  after this plan) are defined in terms of a planet's dignity across the Shodasavarga (the
  16-chart set), not D1 alone.
- Marriage timing/quality analysis conventionally weighs D9 alongside D1's 7th house —
  Plan 2 §15/§16's marriage-house discussion is incomplete without it.

## 2. The standard divisional charts

Parashara's texts describe up to D-60. In practice, software implementations converge on the
**Shodasavarga** (16 charts) as the standard complete set, sometimes extended to a handful
more. This plan scopes to the 16 below, in the priority order recommended for implementation
(§7), not their D-number order.

| D | Name | Divisions | Life domain | Priority | Formula |
|---|---|---|---|---|---|
| D1 | Rashi | 1 | Physical self, overall life — **already implemented** | done | n/a |
| D9 | Navamsa | 9 | Spouse/marriage, dharma, general fortune, strength refinement (Vargottama) | **1st** | ✅ verified |
| D10 | Dasamsa | 10 | Career, profession, status, achievements | **2nd** | ✅ verified |
| D2 | Hora | 2 | Wealth, family financial resources | 3rd | ✅ verified (table) |
| D3 | Drekkana | 3 | Siblings, courage, initiative | 3rd | ✅ verified |
| D7 | Saptamsha | 7 | Children, progeny, creative legacy | 3rd | ✅ verified |
| D12 | Dwadasamsa | 12 | Parents | 3rd | ✅ verified |
| D4 | Chaturthamsha | 4 | Property, fixed assets, fortune, mother | 4th | ✅ verified |
| D16 | Shodasamsha | 16 | Vehicles, comforts, general luxuries | 4th | ✅ verified |
| D20 | Vimsamsha | 20 | Spiritual practice, religious life | 4th | ✅ verified |
| D24 | Chaturvimshamsha | 24 | Education, learning, knowledge | 4th | ✅ verified |
| D27 | Bhamsha (Saptavimshamsha) | 27 | Strengths and weaknesses generally | 4th | ✅ verified |
| D30 | Trimshamsha | 30 | Misfortunes, health vulnerabilities, evils | 4th | ✅ verified (table) |
| D40 | Khavedamsha | 40 | Auspicious/inauspicious effects, maternal legacy | 5th | ✅ verified |
| D45 | Akshavedamsha | 45 | General life conduct, paternal legacy | 5th | ✅ verified |
| D60 | Shashtiamsha | 60 | Most subtle — past-life karma, fine-grained everything | 5th | ✅ verified |

Also verified (not part of the standard 16, included for completeness): D5 Panchamsa, D6
Shashthamsa, D8 Ashtamsa, D11 Rudramsa, D108 Ashtottaramsa, D144 Dwadas-Dwadasamsa, D150
Nadiamsa. D81 Nava-Navamsa is verified but has a documented naming pitfall — see §3.5.

D9 and D10 are prioritized first because they're what the rest of the KP/Vedic ecosystem
most commonly consults immediately alongside D1 — D9 for Vargottama/marriage, D10 for career
questions, which Plan 2 §14 already flags as a common KP query type.

## 3. Calculation architecture

### 3.1 What changed since the last draft — the real per-chart implementation was found

The previous draft of this plan checked candidate formulas against `research/PyJHora`'s
`drik.dasavarga_from_long()` — a single generic formula parameterized only by division count
N, used elsewhere in that library for quick/approximate divisional positions. Checked that
way, D9 matched (12/12) but D10 and D3 did not (0/12, ~4/36), and the plan concluded those
rules were "genuinely unresolved" and possibly misremembered.

**That conclusion was itself wrong, for a specific, findable reason.** PyJHora has a second,
separate implementation — `horoscope/chart/charts.py`, a 3,650-line module with one function
per divisional chart (`navamsa_chart`, `dasamsa_chart`, `drekkana_chart`, ...) implementing
the actual classical Parasara rules, each with 2–6 selectable named methods
(`chart_method=1`, labeled "Traditional Parasara" in every docstring). `dasavarga_from_long()`
is not what real charts are built from in that library — it's a simplified helper used for a
different purpose. Checking D3/D10 against it was checking the wrong reference, not a real
disagreement about classical astrology.

This was re-verified properly this round, following the same discipline as the ayanamsa
accuracy fix (project README) — check against real running code, not a transcription of it:

- Extracted every default (`chart_method=1`, "Traditional Parasara") formula and lookup table
  from `charts.py`/`const.py`/`utils.py` for D1 through D60, plus the composite charts
  D81/D108/D144/D150.
- Installed PyJHora's non-GUI runtime dependencies (`numpy`, `pytz`, `geocoder`, `geopy`,
  `requests`, `timezonefinder`, `python-dateutil`) into `astro-engine`'s existing Python 3.11
  venv and ran PyJHora's **actual code**, not a transcription of it, against this project's
  standard reference chart (Solapur, 1998-12-20 09:20 IST — the same chart used throughout
  this plan folder).
- Independently reimplemented each extracted formula from scratch in a throwaway script and
  diffed its output against PyJHora's real function output, planet by planet.

**Result: every chart tested matched 100%** — D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12,
D16, D20, D24, D27, D30, D40, D45, D60, D108, D144, D150 (22 charts, several hundred
individual planet-placement comparisons, zero mismatches). D81 needed one extra layer of
checking — see §3.5. **The original odd/even D10 rule and the own/5th/9th-trine D3 rule this
plan drafted from memory, then retracted as "wrong," were correct all along.** They just
needed to be checked against the right code — the earlier retraction is left visible in this
plan's git-less history as the same kind of lesson the ayanamsa bug taught: *which* reference
you verify against matters as much as verifying at all.

### 3.2 Verified formulas — D1 through D60 (`chart_method=1`, "Traditional Parasara")

Shared notation: `sign` = planet's D1 sign (0=Aries…11=Pisces), `lon` = planet's longitude
*within* that sign (0–30°). `f1` = degrees per amsa = `30/N` for division N.
`l = int(lon // f1)` = 0-indexed amsa position. Resulting varga longitude-within-sign is
`d_long = (lon * N) % 30` for every chart below unless stated otherwise. Sign-set constants
used below (from `const.py`, cross-checked against classical definitions):

- Movable (Chara): Aries(0), Cancer(3), Libra(6), Capricorn(9)
- Fixed (Sthira): Taurus(1), Leo(4), Scorpio(7), Aquarius(10)
- Dual (Dwiswabhava): Gemini(2), Virgo(5), Sagittarius(8), Pisces(11)
- Odd: Aries, Gemini, Leo, Libra, Sagittarius, Aquarius (0,2,4,6,8,10) — Even: the other six
- Fire: Aries, Leo, Sagittarius (0,4,8) — Earth: Taurus, Virgo, Capricorn (1,5,9) — Air:
  Gemini, Libra, Aquarius (2,6,10) — Water: Cancer, Scorpio, Pisces (3,7,11)

| D | Formula |
|---|---|
| D1 | No division — Rasi chart itself. |
| D2 Hora | **⚠️ Corrected 16 Aug, root cause confirmed against real PyJHora source** — the table originally given here (§3.3, a 12-sign × 2-half parivritti table) was wrong; see the correction note after this table. The actual "Traditional Parasara" rule (Brihat Parashara Hora Shastra) occupies exactly **two** signs, Leo and Cancer, for every planet regardless of D1 sign: odd sign, first half (0–15°) → Leo, second half → Cancer; even sign, first half → Cancer, second half → Leo. **Root cause, confirmed by reading `hora_chart()`'s actual dispatch code in `naturalstupid/PyJHora`**: for every *other* divisional chart in this table, `chart_method=1` genuinely is both the library's own default *and* literally labeled some form of "Traditional/Parasara" in its docstring — that's why this plan's blanket "chart_method=1 = Traditional Parasara" assumption held everywhere else. D2 is the **one exception**: `D2_CHART_METHOD.PARASARA_UMA_SHAMBU_VARIATION = 1` (a different, legitimate named method — the parivritti table this plan originally transcribed, which really is PyJHora's raw default) vs. `D2_CHART_METHOD.TRADITIONA_PARASARA_WITH_Le_Cn_ONLY = 2` (the one actually matching classical Brihat Parashara Hora Shastra). The original extraction sampled the library's default (method 1) under the blanket assumption, without checking that D2's own docstring numbers "Traditional Parasara" differently from every other chart in this table. |
| D3 Drekkana | `r = (sign + l*4) % 12`, where `l = int(lon // 10)` (0,1,2). Own sign / 5th / 9th from own sign — sign-independent. |
| D4 Chaturthamsa | `r = (sign + l*3) % 12`, where `l = int(lon // 7.5)` (0–3). |
| D5 Panchamsa | `l = int(lon // 6)` (0–4). Odd sign: `r = panchamsa_odd_signs[l]`; Even sign: `r = panchamsa_even_signs[l]` (tables in §3.3). |
| D6 Shashthamsa | `l = int(lon // 5)` (0–5). `r = l % 12` if sign odd; `r = (l+6) % 12` if sign even. |
| D7 Saptamsa | `l = int(lon // (30/7))` (0–6). `r = (sign+l) % 12` if sign odd; `r = (sign+l+6) % 12` if sign even. |
| D8 Ashtamsa | `l = int(lon // 3.75)` (0–7). `r = l % 12` if sign movable; `r = (l+4) % 12` if dual; `r = (l+8) % 12` if fixed. |
| D9 Navamsa | `l = int(lon // (30/9))` (0–8). Seed by element: fire→0(Ar), water→3(Cn), air→6(Li), earth→9(Cp). `r = (seed+l) % 12`. (Mathematically identical to "movable: from self; fixed: from 9th-from-self; dual: from 5th-from-self" — both forms verified to produce the same result.) |
| D10 Dasamsa | `l = int(lon // 3)` (0–9). `r = (sign+l) % 12` if sign odd; `r = (sign+l+8) % 12` if sign even. (= "odd: from own sign; even: from 9th counted from own sign" — the rule this plan originally drafted and later wrongly retracted.) |
| D11 Rudramsa | `l = int(lon // (30/11))` (0–10). `r = (12-sign+l) % 12`. |
| D12 Dwadasamsa | `l = int(lon // 2.5)` (0–11). `r = (sign+l) % 12`. |
| D16 Shodasamsa | `l = int(lon // 1.875)` (0–15). `r = l%12` if movable; `r=(l+4)%12` if fixed; `r=(l+8)%12` if dual. |
| D20 Vimsamsa | `l = int(lon // 1.5)` (0–19). `r = l%12` if movable; `r=(l+4)%12` if **dual**; `r=(l+8)%12` if **fixed**. (Fixed/dual offsets swapped vs. D16 — verified, not a transcription slip.) |
| D24 Chaturvimsamsa | `l = int(lon // 1.25)` (0–23). `r=(4+l)%12` (from Leo) if odd sign; `r=(3+l)%12` (from Cancer) if even sign. |
| D27 Nakshatramsa | `l = int(lon // (30/27))` (0–26). `r=l%12` (from Aries) if fire; `r=(l+3)%12` (from Cancer) if earth; `r=(l+6)%12` (from Libra) if air; `r=(l+9)%12` (from Capricorn) if water. |
| D30 Trimsamsa | Boundary-table lookup, not `l`-based — see the odd/even degree tables in §3.3. Result is an **absolute** sign, not sign-relative. **⚠️ Boundary convention corrected 16 Aug**: every range in `trimsamsa_chart()`'s real source is inclusive on *both* ends (`long >= l_min and long <= l_max`); at an exact shared boundary (5°, 10°, 18°, 25° for both parities), the first-listed (lower) range wins, since PyJHora collects all matches and takes the first in ascending list order — i.e. an exact boundary degree belongs to the range *below* it, not the range starting there. The version of this plan implemented first used lower-inclusive/upper-exclusive ranges instead (the opposite convention), which only differs from the correct one at those exact integer-degree boundaries — caught by direct execution comparison against PyJHora across 240 sampled longitudes per sign parity, not by this code's own internal consistency (it was internally consistent either way). |
| D40 Khavedamsa | `l = int(lon // 0.75)` (0–39). `r=l%12` (from Aries) if odd sign; `r=(l+6)%12` (from Libra) if even sign. |
| D45 Akshavedamsa | `l = int(lon // (30/45))` (0–44). `r=l%12` if movable; `r=(l+4)%12` if fixed; `r=(l+8)%12` if dual. |
| D60 Shashtyamsa | `l = int(lon // 0.5)` (0–59). `r=(sign+l)%12`. |
| D81 Nava-Navamsa | See §3.5 — the "Traditional Parasara" default is **not** nested D9(D9(D1)); it's `parivritti_cyclic(dvf=81)`: amsas simply continue counting forward around the zodiac in strict order, 81 per sign, no reset. |
| D108 Ashtottaramsa | = D12 applied to D9's result (compute D9, then treat its output as a fresh D1 and apply the D12 formula to it). Verified by direct chaining against PyJHora's own D108 output. |
| D144 Dwadas-Dwadasamsa | = D12 applied to D12's result (apply the D12 formula twice in sequence). Verified by direct chaining. |
| D150 Nadiamsa | `l = min(int(lon // 0.2), 149)` (0–149). `r=(sign+l)%12` — uniform, no movable/fixed/dual branching (some non-default D150 methods do branch; the default doesn't). |

### 3.3 Lookup tables

**D2 Hora — ⚠️ this table was wrong, corrected 16 Aug.** The table below (kept struck through
for the record, not deleted) was implemented, shipped, and then reported by a real user: actual
D2 charts only ever occupy two **signs**, which this 12-sign-pair table cannot produce (it
scatters planets across up to 12 different D2 signs depending on their D1 sign).
Live-verified against multiple independent sources (Brihat Parashara Hora Shastra's own stated
rule; cross-checked against desiutils.in/astrology/hora-d2 and others, same methodology as
Plan 5's Trikalam/Choghadiya sourcing): the real "Traditional Parasara" D2 occupies **exactly
two signs, Leo and Cancer**, for every planet regardless of which D1 sign it started in — see
§3.2's corrected D2 row above. Whatever produced this table (misread PyJHora dispatch, wrong
`chart_method`, or a genuine extraction error at the specific 7.5°/22.5° sample points used)
was never re-checked against the classical source text before being marked "✅ verified" in
§2's table — a real gap in the verification this plan otherwise describes doing carefully.
Full story: `Plan 1 Implementation.md` in this folder, §7 (initial fix) and §8 (full
re-verification against real PyJHora execution, which also caught a second bug in D30).

**Houses, not just signs — ⚠️ re-reported 16 Aug, confirmed correct, not a bug (see
`Plan 1 Implementation.md` §10).** Two signs does *not* mean two houses. Houses are still counted
whole-sign from the D2 Lagna (same engine as every other chart, `core/houses.py`'s
`assign_houses()` — no D2-specific override, and neither PyJHora nor `velteyn/OpenJyotish` special-
case it either, confirmed by reading both). Since Cancer and Leo are adjacent signs, the *other*
Hora sign lands at house 2 if the D2 Lagna itself is Cancer, but at house **12** if the D2 Lagna
is Leo — never anything else, but genuinely both of those, roughly 50/50 depending on birth data.
Real-world confirmation: multiple published Hora-chart interpretation articles (indastro.com,
cosmicsquares.com) discuss "Sun in the 12th house of the D2 chart" as a normal, named placement,
explicitly alongside 1st and 2nd — "the other 10 houses remain empty." §10 has the live
verification (24 times of day, same birth date, houses alternating between {1,2} and {1,12}
exactly as predicted) and the citations.

<s>
```
Ar:(0,1)  Ta:(3,2)  Ge:(4,5)  Cn:(7,6)  Le:(8,9)  Vi:(11,10)
Li:(0,1)  Sc:(3,2)  Sg:(4,5)  Cp:(7,6)  Aq:(8,9)  Pi:(11,10)
```
(Repeats every 6 signs — Libra through Pisces mirrors Aries through Virgo exactly. Extracted
directly from PyJHora's own output for boundary longitudes 7.5° and 22.5° in every sign,
rather than hand-derived — the underlying `parivritti_even_reverse` table-construction logic
is more involved than a single closed-form line, and a queried table carries the same
verification weight as a formula while being simpler to transcribe correctly.)
</s>

**D5 Panchamsa** (indexed by `l=0..4`):
```
panchamsa_odd_signs  = [Aries, Aquarius, Sagittarius, Gemini, Libra]     # [0,10,8,2,6]
panchamsa_even_signs = [Taurus, Virgo, Pisces, Capricorn, Scorpio]       # [1,5,11,9,7]
```

**D30 Trimsamsa** (`degree range within the D1 sign → absolute sign`):
```
Odd signs:  0-5°→Aries(Mars)        5-10°→Aquarius(Saturn)   10-18°→Sagittarius(Jupiter)
            18-25°→Gemini(Mercury)  25-30°→Libra(Venus)
Even signs: 0-5°→Taurus(Venus)      5-12°→Virgo(Mercury)     12-20°→Pisces(Jupiter)
            20-25°→Capricorn(Saturn) 25-30°→Scorpio(Mars)
```
(Matches the classical rule that each Trimsamsa segment belongs to the sign *ruled by* the
corresponding non-luminary planet — Mars/Saturn/Jupiter/Mercury/Venus in dignity order.)

### 3.4 Named variants are real, not a bug to silently resolve

Every chart in §3.2 has 2–6 alternate named methods in PyJHora beyond the default — e.g. D10
alone has "start-9th-forward" (default), "start-9th-backward," "start-reverse-9th-backward,"
plus 3 parivritti variants; D2 has 6 total, including Raman's and Kashinatha's distinct
methods. This confirms the open question this plan raised in its previous draft (hypothesis:
"these might be legitimate independently-attested classical variants, not a bug") — they are.
`chart_method=1` ("Traditional Parasara") is what §3.2 documents and what this plan
recommends as the engine's default, matching this project's existing pattern of exposing
named alternatives explicitly rather than picking one silently (`core/ayanamsa.py`'s
KP/Lahiri/Raman/Custom modes) — a `vargaMethod` parameter is a natural place to expose these
later, not required for a first implementation.

### 3.5 A confirmed pitfall: D81's default is not what its name suggests

D81 ("Nava-Navamsa," navamsa-of-navamsa) is the one chart where reading the source code
mattered more than testing output. A quick numeric test against the reference chart's 10
points showed `chart_method=1` agreeing 10/10 with a hand-chained "apply the D9 formula
twice" reimplementation — which looked like confirmation. Reading `charts.py`'s actual
dispatch code directly showed this was coincidental for that specific data: `chart_method=1`
literally calls `__parivritti_cyclic(dvf=81)` — plain continuous 81-fold division, not nested
navamsa. The *only* nested-computation path in the function (an unreachable-by-default
fallback branch) implements the nakshatra/pada-indexed **Kalachakra** Navamsa method applied
twice, not the ordinary fire/water/air/earth-seed D9 formula. **Anyone implementing D81 from
the name alone would guess wrong** — use §3.2's `parivritti_cyclic(dvf=81)` formula for the
default. D144 and D108, by contrast, genuinely are verified-by-chaining nested computations —
D81 is the odd one out, and this is exactly the kind of mismatch a numeric spot-check alone
(without also reading the dispatch code) would have missed.

### 3.6 What a Varga chart does *not* recompute

A Varga chart is a **remapping of already-computed D1 longitudes**, not a fresh ephemeris
calculation. It needs no new Swiss Ephemeris calls, no new ayanamsa handling, and is
unaffected by the accuracy fix documented in this plan folder's README (that fix corrected
the D1 longitudes themselves; every Varga computed from a corrected D1 longitude is
automatically correct downstream). What each Varga chart *does* need, reusing existing
`core/` output per planet:

- The planet's D1 sidereal longitude (already in every `core/planets.py`/`core/houses.py`
  result).
- A Lagna for the Varga itself — classically the same division rule applied to the D1
  Ascendant's longitude, giving the Varga chart its own "1st house" framing.
- House assignment relative to that Varga Lagna (whole-sign, reusing
  `core/houses.py: assign_houses()`'s existing logic unchanged, just fed Varga rashis instead
  of D1 rashis).

## 4. Proposed module layout

```
core/
  vargas/
    __init__.py          — VARGA_REGISTRY: {9: navamsa, 10: dasamsa, ...}, get_varga_chart(planets, lagna, d_number)
    rules.py              — MOVABLE/FIXED/DUAL sign sets, ODD/EVEN sign sets, shared helpers
    d9_navamsa.py
    d10_dasamsa.py
    d2_hora.py
    d3_drekkana.py
    ...                    — one module per chart, or grouped by rule-shape if that proves
                             cleaner once 3-4 are implemented (premature to decide now)
```

`get_varga_chart(all_placements, d_number)` should return the same per-planet shape
`core/houses.py`/`core/planets.py` already produce (`rashi`, `rashi_lord`, `house`, plus
nakshatra/sub-lord fields *if* KP-style analysis of Vargas is wanted — classically Vargas are
usually read by sign and house only, not re-run through the Nakshatra/sub-lord cascade, so
this needs an explicit decision rather than reflexively reusing every D1 field).

## 5. API shape

Extend `POST /chart`'s response with an opt-in `vargas` field rather than always computing
all 16 (D60 in particular is rarely needed and adds 16x the per-planet remapping work for no
benefit on the common case):

```json
{
  "vargas": {
    "requested": [9, 10],
    "D9": { "lagna": {...}, "placements": [...], "houses": {...} },
    "D10": { "lagna": {...}, "placements": [...], "houses": {...} }
  }
}
```

Request side: `ChartRequest` gains `vargasRequested: list[int] | None = None` (default:
none computed, matching this project's existing pattern of not doing unrequested work — see
`riseset.py`'s `day_events()` only running when the endpoint needs it).

## 6. Frontend

A `VargaChart` component reusing `NorthIndianChart`/`SouthIndianChart`'s existing SVG
geometry (`chartGeometry.js`, `southIndianGrid.js`) and the label-overlap fix already built
this session (`planetLabelLayout.js`) — a Varga chart has the exact same 12-house visual
structure as D1, just different planet-to-house data, so no new chart-drawing code should be
needed, only a selector (D1/D9/D10/...) driving which precomputed dataset feeds the existing
components.

## 7. Implementation order

With §3.2's formulas verified end-to-end (not just individually plausible), the ordering
question is no longer "which rule is even correct" — it's "what's highest-value to ship
first," which is what this section originally intended to answer before D10/D3 turned into
an open research question. That question is now closed:

1. **D9 Navamsa** — highest-value single chart (Vargottama, marriage analysis). Formula
   verified (§3.2). Implement and ship first.
2. **D10 Dasamsa** — second most commonly consulted in practice (career questions). Formula
   verified (§3.2) — no longer blocked on any open question. Implement directly from §3.2.
3. **D3, D4, D7, D12** — all verified, no known complications. Implement as a batch.
4. **D2 Hora** — verified, but needs the explicit lookup table (§3.3) plus the even-sign
   degree-reversal rule (§3.2), not just a formula — slightly more implementation surface
   than the others in this tier.
5. **D16, D20, D24, D27, D30** — remaining Shodasavarga members, all verified. D30 needs the
   boundary-table lookup (§3.3), not the `l`-based pattern the others share — give it its own
   code path rather than trying to force it into the shared helper.
6. **D40, D45, D60** — verified, least commonly used; implement last, and consider making
   them genuinely opt-in only (§5) rather than part of any default request.
7. **D81, D108, D144, D150** — verified (with D81's naming pitfall noted, §3.5); lowest
   practical priority — D81/D150 are "most subtle, past-life karma" territory per §2's own
   domain notes — implement only if a specific downstream feature needs them.

## 8. Verification

The verification methodology used to produce §3.2 **is** the test suite this plan recommends
shipping alongside the implementation, not a one-off check done while writing this document:

- `astro-engine`'s existing Python 3.11 venv now has PyJHora's non-GUI runtime dependencies
  installed (`numpy`, `pytz`, `geocoder`, `geopy`, `requests`, `timezonefinder`,
  `python-dateutil` — `PyQt6`/`pyqtgraph` deliberately skipped, GUI-only and not on the import
  path for `drik`/`charts`/`const`/`utils`). `research/PyJHora` can therefore be imported and
  run directly for regression testing, not just read as a reference.
- **Recommended**: turn this round's throwaway verification scripts into a permanent
  `tests/test_vargas_vs_pyjhora.py` — for every implemented chart, compute the reference
  chart's planets through both the new `core/vargas/` code and PyJHora's real function
  (`from jhora.horoscope.chart import charts`), assert sign-for-sign agreement. This is a
  stronger regression test than a hand-written expected-output fixture, because it re-derives
  the expected answer from independent code on every run rather than trusting a frozen
  snapshot that could itself have been transcribed wrong.
- **Vargottama sanity check**: for the reference chart (Solapur, 1998-12-20 09:20 IST), Mars
  is Vargottama (D1 Scorpio = D9 Scorpio) — confirmed this round via both this project's own
  D9 formula and PyJHora's live output. Use this as a standing assertion once D9 ships.
- **Boundary tests**, per Plan 1 §68's pattern: a longitude exactly on an amsa boundary (e.g.
  exactly 3°20'00" into a sign for D9, exactly 5°/10°/18°/25° for D30's odd table) should land
  deterministically on one side, not flicker with floating-point rounding — test at boundary
  − 1", boundary, boundary + 1" for D9, D10, and D30 specifically (D30 because its extracted
  lookup uses inclusive bounds on both ends of adjacent ranges, worth double-checking doesn't
  double-count the exact boundary degree during transcription into `core/`).
