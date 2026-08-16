# Muhurta engine: Hora, Abhijit, Nishita, Trikalam (Rahu Kalam / Yamaganda /
# Gulika Kalam), Choghadiya, Brahma Muhurta, Durmuhurta.
#
# Every technique here is a pure function of core/riseset.py's sunrise/
# sunset/next_sunrise plus the weekday -- see Plan 5 in the project plan
# folder for sourcing notes on each table. None of it needs a fresh Swiss
# Ephemeris call, and none of it is affected by the ayanamsa accuracy fix
# (rise/set times are geometric horizon-crossing facts, independent of
# ayanamsa). All functions return None (or omit list entries) when the
# underlying sunrise/sunset is None -- the circumpolar case -- rather than
# fabricate a time, matching core/riseset.py's own convention.

from datetime import timedelta

# Hora ruler cycle (§3): source, verified --
# research/KPAstroDashboard/calculations/hora_calculator.py's
# _get_hora_rulers_for_day(), transcribed exactly. Internally checked: all
# seven rows are the same Chaldean-order 7-planet cycle (Sun > Venus >
# Mercury > Moon > Saturn > Jupiter > Mars > wraps to Sun), each starting
# on that weekday's own ruler.
HORA_RULERS = {
    "Sunday":    ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"],
    "Monday":    ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury"],
    "Tuesday":   ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"],
    "Wednesday": ["Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus"],
    "Thursday":  ["Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn"],
    "Friday":    ["Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun"],
    "Saturday":  ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"],
}


def _segments(start, end, count):
    """`count` equal-length (start, end) pairs spanning [start, end)."""
    length = (end - start).total_seconds() / count
    return [
        (start + timedelta(seconds=i * length), start + timedelta(seconds=(i + 1) * length))
        for i in range(count)
    ]


def current_of(periods, at):
    """The period whose [start, end) contains `at`, or None."""
    for p in periods:
        if p["start"] <= at < p["end"]:
            return p
    return None


def compute_hora(day):
    """12 day Horas (sunrise->sunset) + 12 night Horas (sunset->next
    sunrise). Day and night Horas are different lengths except at the
    equinox -- Plan 1 §25 warns explicitly against assuming a fixed
    60-minute Hora. The night's cycle continues from the day's 12th Hora
    rather than restarting at the weekday's own ruler (i % 7 over all 24
    segments, not two independent 0..11 loops)."""
    sunrise, sunset, next_sunrise = day["sunrise"], day["sunset"], day["next_sunrise"]
    if not (sunrise and sunset and next_sunrise):
        return None
    cycle = HORA_RULERS[sunrise.strftime("%A")]
    spans = _segments(sunrise, sunset, 12) + _segments(sunset, next_sunrise, 12)
    return [{"lord": cycle[i % 7], "start": s, "end": e} for i, (s, e) in enumerate(spans)]


def compute_abhijit(day):
    """Day (sunrise->sunset) divided into 15 equal Muhurtas; Abhijit is
    the 8th (straddling solar noon)."""
    sunrise, sunset = day["sunrise"], day["sunset"]
    if not (sunrise and sunset):
        return None
    start, end = _segments(sunrise, sunset, 15)[7]
    solar_noon = day.get("solar_noon")
    if solar_noon is not None:
        # Cheap sanity check (Plan 5 §4): a violation means a sunrise/
        # sunset or Muhurta-count bug, not bad user input, so this is an
        # internal invariant rather than something to report as a warning.
        assert start <= solar_noon <= end, (
            "Abhijit window does not contain solar noon -- "
            "sunrise/sunset or Muhurta-count bug"
        )
    return {
        "start": start,
        "end": end,
        # Plan 1 §30: some traditions exclude Wednesday. Exposed as a flag
        # rather than dropped silently, matching this project's existing
        # pattern of naming variant conventions explicitly instead of
        # picking one for the caller (core/ayanamsa.py's named modes).
        "excludedByWeekday": sunrise.strftime("%A") == "Wednesday",
    }


def compute_nishita(day):
    """Midpoint of sunset -> next_sunrise (Plan 1 §33: relative to
    sunset/next-sunrise, not the 00:00 civil clock). Only the anchor
    moment is sourced/specified by Plan 1 -- no window width was found
    locally to justify inventing one, so this returns a point, not a
    start/end span, unlike the other Muhurta entries here."""
    sunset, next_sunrise = day["sunset"], day["next_sunrise"]
    if not (sunset and next_sunrise):
        return None
    return {"midpoint": sunset + (next_sunrise - sunset) / 2}


# ---------------------------------------------------------------------------
# Trikalam -- Rahu Kalam, Yamaganda, Gulika Kalam (§5).
#
# Plan 5 explicitly flagged this table as unverified locally ("do not
# implement from a remembered table -- source it from a citable reference
# ... and validate by cross-checking computed times against that site's
# published times"). Sourced from drikpanchang.com (the reference Plan 1
# itself names) and live-validated 16 Aug 2026 against three independent
# real dates/locations -- Delhi and Ujjain (India) plus New York City
# (outside India, DST-observing, to rule out a hidden IST-specific bug):
# every computed Rahu Kalam/Yamaganda/Gulika Kalam window matched
# drikpanchang's published time to within a minute (the residual is
# rounding -- drikpanchang publishes to the minute, this engine computes
# to sub-second precision).
#
# Segment index (0-6, within the 8-fold division of sunrise->sunset) per
# weekday, for each of the three periods:
TRIKALAM_SEGMENTS = {
    "Sunday":    {"rahuKalam": 7, "yamaganda": 4, "gulikaKalam": 6},
    "Monday":    {"rahuKalam": 1, "yamaganda": 3, "gulikaKalam": 5},
    "Tuesday":   {"rahuKalam": 6, "yamaganda": 2, "gulikaKalam": 4},
    "Wednesday": {"rahuKalam": 4, "yamaganda": 1, "gulikaKalam": 3},
    "Thursday":  {"rahuKalam": 5, "yamaganda": 0, "gulikaKalam": 2},
    "Friday":    {"rahuKalam": 3, "yamaganda": 6, "gulikaKalam": 1},
    "Saturday":  {"rahuKalam": 2, "yamaganda": 5, "gulikaKalam": 0},
}


def compute_trikalam(day):
    """Rahu Kalam, Yamaganda, and Gulika Kalam -- each one of 8 equal
    segments of sunrise->sunset, segment chosen per weekday (§5). Gulika
    here is the time-period sense, not the Upagraha (calculated
    longitude) of the same name -- see §5's note on not conflating them."""
    sunrise, sunset = day["sunrise"], day["sunset"]
    if not (sunrise and sunset):
        return None
    spans = _segments(sunrise, sunset, 8)
    segment_of = TRIKALAM_SEGMENTS[sunrise.strftime("%A")]
    return {
        name: {"start": spans[idx][0], "end": spans[idx][1]}
        for name, idx in segment_of.items()
    }


# ---------------------------------------------------------------------------
# Choghadiya (§6).
#
# Also flagged unverified by Plan 5 ("source and validate ... rather than
# transcribing a remembered sequence"). Live-validated 16-22 Aug 2026
# against drikpanchang.com's full day+night Choghadiya tables for Delhi:
# fetched the complete 8-name day and night sequence for Sunday and
# Monday, and the day/night starting name alone for the other five
# weekdays (sufficient once the within-sequence stepping rule was
# confirmed). Every one of the 14 (7 weekdays x day/night) starting
# points, and both full 16-entry Sun/Mon sequences, matched exactly.
#
# Two distinct rules fall out of that live data, both used below:
#   - Within a single day's 8 periods, the 7-name cycle advances forward
#     (+1) each period, wrapping (period 8 repeats period 1).
#   - Within a single night's 8 periods, it advances *backward* (-2) each
#     period instead -- confirmed independently for both Sunday and
#     Monday's night sequences, not assumed from the day's rule.
#   - Both the day-start and night-start index advance by the same +3
#     (mod 7) from one weekday to the next, with night-start always
#     exactly 2 positions behind that day's day-start. Confirmed across
#     all 7 weekdays via drikpanchang's own starting-period data, not
#     derived by pattern-matching only 1-2 days.
# The table below is written out explicitly (matching how HORA_RULERS and
# TRIKALAM_SEGMENTS are transcribed) rather than left as the arithmetic
# that generated it, so it can be read and audited on its own.
CHOGHADIYA_CYCLE = ["Udvega", "Chara", "Labha", "Amrita", "Kala", "Shubha", "Roga"]

CHOGHADIYA_QUALITY = {
    "Amrita": "auspicious", "Shubha": "auspicious", "Labha": "auspicious",
    "Chara": "neutral",
    "Udvega": "inauspicious", "Kala": "inauspicious", "Roga": "inauspicious",
}

CHOGHADIYA_DAY_START = {
    "Sunday": "Udvega", "Monday": "Amrita", "Tuesday": "Roga", "Wednesday": "Labha",
    "Thursday": "Shubha", "Friday": "Chara", "Saturday": "Kala",
}

CHOGHADIYA_NIGHT_START = {
    "Sunday": "Shubha", "Monday": "Chara", "Tuesday": "Kala", "Wednesday": "Udvega",
    "Thursday": "Amrita", "Friday": "Roga", "Saturday": "Labha",
}


def _choghadiya_period(name, start, end):
    return {"name": name, "quality": CHOGHADIYA_QUALITY[name], "start": start, "end": end}


def compute_choghadiya(day):
    """8 day periods (sunrise->sunset, cycle stepping +1) and 8 night
    periods (sunset->next_sunrise, cycle stepping -2), each drawn from the
    same 7-name cycle with a weekday-dependent starting point."""
    sunrise, sunset, next_sunrise = day["sunrise"], day["sunset"], day["next_sunrise"]
    if not (sunrise and sunset and next_sunrise):
        return None
    weekday = sunrise.strftime("%A")
    cycle = CHOGHADIYA_CYCLE
    day_start = cycle.index(CHOGHADIYA_DAY_START[weekday])
    night_start = cycle.index(CHOGHADIYA_NIGHT_START[weekday])

    day_periods = [
        _choghadiya_period(cycle[(day_start + i) % 7], s, e)
        for i, (s, e) in enumerate(_segments(sunrise, sunset, 8))
    ]
    night_periods = [
        _choghadiya_period(cycle[(night_start - 2 * i) % 7], s, e)
        for i, (s, e) in enumerate(_segments(sunset, next_sunrise, 8))
    ]
    return {"day": day_periods, "night": night_periods}


# ---------------------------------------------------------------------------
# Brahma Muhurta (§7).
#
# Two both-cited conventions, per Plan 5 §7 -- exposed as a named choice
# rather than picking one, matching this project's existing pattern
# (core/ayanamsa.py's named modes):
#   "night_fifteenths" (default) -- night_seconds/15 per Muhurta, Brahma is
#     the 2nd-to-last (matches how §4 divides the day for Abhijit), scales
#     with actual night length.
#   "fixed_96_48" -- a fixed 48-minute window from 96 to 48 minutes before
#     sunrise regardless of season or latitude; the "simplified formula"
#     widely published for a generic day.
# Anchored on `next_sunrise` (not `sunrise`) using sunset->next_sunrise as
# "the night" -- the same pairing compute_nishita already uses in this
# module, since Brahma Muhurta and Nishita both fall in the night *after*
# the queried date's sunset, ending at the *following* sunrise.
def compute_brahma_muhurta(day, convention="night_fifteenths"):
    sunset, next_sunrise = day["sunset"], day["next_sunrise"]
    if not (sunset and next_sunrise):
        return None
    if convention == "fixed_96_48":
        start = next_sunrise - timedelta(minutes=96)
        end = next_sunrise - timedelta(minutes=48)
    else:
        unit = (next_sunrise - sunset).total_seconds() / 15
        start = next_sunrise - timedelta(seconds=2 * unit)
        end = next_sunrise - timedelta(seconds=unit)
    return {"start": start, "end": end, "convention": convention}


# ---------------------------------------------------------------------------
# Durmuhurta (§7): NOT implemented. Plan 1 §31 and Plan 5 §7 both flag it
# as needing a specific weekday-dependent muhurta-index table (the day
# divided into 30 muhurtas total, 2 of which -- 1 on some weekdays -- are
# Durmuhurta), and Plan 5 explicitly marks it lower priority than Trikalam/
# Choghadiya. A live web search for a citable per-weekday table (the same
# validation bar met for Trikalam/Choghadiya above) did not turn up one
# precise enough to transcribe with confidence, so -- per this project's
# established rule (Plan 4/5's repeated lesson: don't implement from a
# remembered or under-sourced table) -- it stays unimplemented rather than
# guessed. Revisit once a citable table is found.
