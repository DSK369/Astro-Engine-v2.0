# Vimshottari Dasha snapshot builder — the 5-level chain (Mahadasha →
# Antardasha → Pratyantardasha → Sookshma → Prana) active at a given
# moment, plus the sibling periods at each level so a UI can show context.
#
# Why this exists alongside core/dasha.py
# ---------------------------------------
# core/dasha.py's generate_antardasha(lord, years, start) assumes `years`
# is the parent's FULL length and `start` its true beginning. That holds
# for every Mahadasha except the first one, which is a partial period —
# the native is born partway through it. Feeding the first MD's *balance*
# into that splitter proportions all 9 Antardashas across the balance
# instead of across the full Mahadasha, which both shrinks every
# sub-period and wrongly reports the birth-moment Antardasha as the
# Mahadasha lord's own.
#
# Worked example (Moon 258.03°, Venus star, born 1998-12-20):
#   Venus MD = 20y, balance at birth 12.955y, so 7.045y already elapsed.
#   Correct ADs run Venus 3.333 / Sun 1.0 / Moon 1.667 / Mars 1.167 ...
#   Cumulative 7.167y at the end of Mars, so birth falls inside MARS.
#   The old splitter instead reported Venus AD starting at birth.
#
# So this module tracks each Mahadasha's TRUE span (which for the first
# one begins before birth) separately from its VISIBLE span (clipped to
# birth), and always subdivides the true span.
#
# core/dasha.py is left untouched — main.py still uses it.

from datetime import timedelta

from core.dasha import (
    DASHA_YEARS,
    TOTAL,
    get_sequence,
    years_to_days,
    calculate_mahadasha_balance,
    convert_years_to_ymd,
)


def _subdivide(parent_lord, parent_start, parent_years):
    """The 9 sub-periods of a period, proportioned by Vimshottari years.

    parent_start/parent_years must describe the period's TRUE span, not a
    span already clipped to the birth moment.
    """
    periods = []
    cursor = parent_start
    for lord in get_sequence(parent_lord):
        years = parent_years * DASHA_YEARS[lord] / TOTAL
        end = cursor + timedelta(days=years_to_days(years))
        periods.append({"lord": lord, "start": cursor, "end": end, "years": years})
        cursor = end
    return periods


def build_mahadasha_timeline(moon_longitude, moon_nak_lord, birth_dt):
    """Mahadashas from birth onward, one full Vimshottari cycle.

    Each entry carries both its visible span (start/end, clipped to birth
    for the first) and its true span (true_start/full_years) so that
    sub-periods can be derived correctly.
    """
    lord, balance_years = calculate_mahadasha_balance(moon_longitude, moon_nak_lord)

    full_years = DASHA_YEARS[lord]
    elapsed_years = full_years - balance_years
    true_start = birth_dt - timedelta(days=years_to_days(elapsed_years))
    true_end = true_start + timedelta(days=years_to_days(full_years))

    timeline = [{
        "lord": lord,
        "start": birth_dt,      # visible: the native's life begins here
        "end": true_end,
        "years": balance_years,  # visible remainder
        "true_start": true_start,
        "full_years": full_years,
        "partial": True,
    }]

    cursor = true_end
    for next_lord in get_sequence(lord)[1:]:
        years = DASHA_YEARS[next_lord]
        end = cursor + timedelta(days=years_to_days(years))
        timeline.append({
            "lord": next_lord,
            "start": cursor,
            "end": end,
            "years": years,
            "true_start": cursor,
            "full_years": years,
            "partial": False,
        })
        cursor = end

    return timeline, balance_years


def _active(periods, moment):
    for p in periods:
        if p["start"] <= moment < p["end"]:
            return p
    return None


def build_dasha_snapshot(moon_longitude, moon_nak_lord, birth_dt, as_of):
    """Full 5-level Dasha state at `as_of`.

    Returns the Mahadasha timeline, the active chain at every level, and
    the sibling periods surrounding each active one.
    """
    timeline, balance_years = build_mahadasha_timeline(
        moon_longitude, moon_nak_lord, birth_dt
    )

    # Clamp: before birth there is no chain; past the cycle, hold the last.
    moment = max(as_of, birth_dt)

    md = _active(timeline, moment) or timeline[-1]

    # Subdivide the TRUE span at every level. Below Mahadasha each period
    # is already complete within its parent, so start/years are true.
    antardashas = _subdivide(md["lord"], md["true_start"], md["full_years"])
    ad = _active(antardashas, moment) or antardashas[-1]

    pratyantardashas = _subdivide(ad["lord"], ad["start"], ad["years"])
    pd = _active(pratyantardashas, moment) or pratyantardashas[-1]

    sookshmas = _subdivide(pd["lord"], pd["start"], pd["years"])
    sd = _active(sookshmas, moment) or sookshmas[-1]

    pranas = _subdivide(sd["lord"], sd["start"], sd["years"])
    pn = _active(pranas, moment) or pranas[-1]

    y, m, d = convert_years_to_ymd(balance_years)

    return {
        "timeline": timeline,
        "balance": {"lord": timeline[0]["lord"], "years": balance_years,
                    "y": y, "m": m, "d": d},
        "current": {
            "mahadasha": md,
            "antardasha": ad,
            "pratyantardasha": pd,
            "sookshma": sd,
            "prana": pn,
        },
        "branches": {
            "antardashas": antardashas,
            "pratyantardashas": pratyantardashas,
            "sookshmas": sookshmas,
            "pranas": pranas,
        },
        "asOf": moment,
    }
