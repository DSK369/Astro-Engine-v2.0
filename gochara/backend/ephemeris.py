"""Time-series sampling of sidereal geocentric longitudes.

Calculation is identical to astro-engine/core/planets.py: tropical
position from swisseph, minus a caller-supplied ayanamsa — NOT
FLG_SIDEREAL, which would route through swisseph's internal ayanamsa
lookup and hit the SIDM_USER precession-drift pitfall documented there.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

import swisseph as swe

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED

BODIES = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
}

# Rahu/Ketu are derived from the lunar node, not in BODIES.
ALL_PLANETS = list(BODIES.keys()) + ["Rahu", "Ketu"]

NODE_TYPES = {"MEAN": swe.MEAN_NODE, "TRUE": swe.TRUE_NODE}


def to_julian_day(dt_str, timezone_str):
    """Local 'YYYY-MM-DDTHH:MM[:SS]' + IANA tz -> UT Julian day."""
    local_dt = datetime.fromisoformat(dt_str)
    local_dt = local_dt.replace(tzinfo=ZoneInfo(timezone_str))
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    hour = utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600
    return swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, hour)


def jd_to_epoch_ms(jd):
    # JD 2440587.5 == 1970-01-01T00:00Z
    return round((jd - 2440587.5) * 86400000)


def sample_ephemeris(jd_start, jd_end, points, ayanamsa_func, planets, node_type="MEAN"):
    """Evenly sample [jd_start, jd_end] at `points` steps.

    Returns (times_ms, series, retro):
      times_ms  — epoch milliseconds UTC per sample
      series    — {planet: [sidereal longitude 0..360, ...]}
      retro     — {planet: [0|1, ...]} (nodes are always 1)
    """
    node_type = node_type.upper()
    if node_type not in NODE_TYPES:
        raise ValueError(f"Unsupported node_type: {node_type!r}")
    node_id = NODE_TYPES[node_type]

    unknown = [p for p in planets if p not in ALL_PLANETS]
    if unknown:
        raise ValueError(f"Unknown planets: {unknown}")

    step = (jd_end - jd_start) / max(points - 1, 1)
    times = []
    series = {p: [] for p in planets}
    retro = {p: [] for p in planets}
    want_nodes = "Rahu" in planets or "Ketu" in planets

    for i in range(points):
        jd = jd_start + i * step
        ayan = ayanamsa_func(jd)
        times.append(jd_to_epoch_ms(jd))

        for name in planets:
            if name in ("Rahu", "Ketu"):
                continue
            result = swe.calc_ut(jd, BODIES[name], FLAGS)
            lon = (result[0][0] - ayan) % 360
            series[name].append(round(lon, 4))
            retro[name].append(1 if result[0][3] < 0 else 0)

        if want_nodes:
            result = swe.calc_ut(jd, node_id, FLAGS)
            rahu_lon = (result[0][0] - ayan) % 360
            if "Rahu" in planets:
                series["Rahu"].append(round(rahu_lon, 4))
                retro["Rahu"].append(1)
            if "Ketu" in planets:
                series["Ketu"].append(round((rahu_lon + 180) % 360, 4))
                retro["Ketu"].append(1)

    return times, series, retro
