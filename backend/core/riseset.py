# Sunrise / sunset / moonrise / moonset, and the day & night spans built
# from them.
#
# This is the layer the rest of the Panchanga work depends on: the
# traditional daily Panchanga reports the elements prevailing at *local
# sunrise*, and every Muhurta (Hora, Choghadiya, Rahu Kalam, Yamaganda,
# Gulika, Abhijit, Durmuhurta, Brahma, Nishita) is a subdivision of the
# sunrise→sunset or sunset→sunrise span. None of that is computable
# without real rise/set times for the specific latitude and longitude.
#
# Rising convention
# -----------------
# Two conventions are in circulation and they do not agree:
#
#   "standard" (default) — apparent sunrise: upper limb of the disc,
#       with atmospheric refraction. This is what published almanacs
#       (including Drik Panchang) show, so it is the one to use when
#       cross-checking against them.
#
#   "hindu" — SE_BIT_HINDU_RISING: centre of the disc, no refraction.
#       Specified by several classical texts and offered by PyJHora.
#
# The difference is on the order of a couple of minutes, which is enough
# to move a Tithi-at-sunrise reading across a boundary on the right day,
# so it is exposed as a parameter rather than silently chosen.

from datetime import datetime, timedelta

import swisseph as swe

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - matches core/jd.py's fallback
    from backports.zoneinfo import ZoneInfo

RISING_MODES = {
    "standard": 0,
    "hindu": swe.BIT_HINDU_RISING,
}

_UTC = ZoneInfo("UTC")


def jd_to_local(jd_ut, tz):
    """Julian Day (UT) → naive datetime in the given IANA zone."""
    year, month, day, hour = swe.revjul(jd_ut)
    utc = datetime(year, month, day, tzinfo=_UTC) + timedelta(hours=hour)
    return utc.astimezone(ZoneInfo(tz)).replace(tzinfo=None)


def local_to_jd(local_dt, tz):
    """Naive local datetime → Julian Day (UT)."""
    aware = local_dt.replace(tzinfo=ZoneInfo(tz))
    utc = aware.astimezone(_UTC)
    hour = utc.hour + utc.minute / 60 + utc.second / 3600 + utc.microsecond / 3.6e9
    return swe.julday(utc.year, utc.month, utc.day, hour)


def _event(jd_start, body, which, lat, lon, alt, mode):
    """Next rise/set of `body` at or after jd_start, or None.

    Returns None when the body is circumpolar for that date — at high
    latitudes the Sun genuinely may not rise or set, and callers must
    cope with that rather than receive a fabricated time.
    """
    flag = RISING_MODES.get(mode, 0)
    # geopos is (longitude, latitude, altitude) — longitude first.
    result, tret = swe.rise_trans(
        jd_start, body, which | flag, (lon, lat, alt), 0.0, 0.0, swe.FLG_SWIEPH
    )
    if result != 0:
        return None
    return tret[0]


def day_events(date_str, lat, lon, tz, alt=0.0, mode="standard"):
    """Sun/Moon rise & set for one local calendar date, plus day/night spans.

    Every value is a naive datetime local to the given zone, or None if
    the event does not occur that day.
    """
    midnight = datetime.strptime(date_str, "%Y-%m-%d")
    jd_midnight = local_to_jd(midnight, tz)

    jd_sunrise = _event(jd_midnight, swe.SUN, swe.CALC_RISE, lat, lon, alt, mode)
    # Search sunset from sunrise so the pair belongs to the same day.
    jd_sunset = _event(jd_sunrise or jd_midnight, swe.SUN, swe.CALC_SET, lat, lon, alt, mode)
    # Night runs to the *following* sunrise, so search on from sunset.
    jd_next_sunrise = _event(jd_sunset, swe.SUN, swe.CALC_RISE, lat, lon, alt, mode) if jd_sunset else None

    jd_moonrise = _event(jd_midnight, swe.MOON, swe.CALC_RISE, lat, lon, alt, mode)
    jd_moonset = _event(jd_midnight, swe.MOON, swe.CALC_SET, lat, lon, alt, mode)

    # Solar noon (upper meridian transit) — the anchor for Abhijit and
    # the Madhyahna window.
    jd_noon = _event(jd_sunrise or jd_midnight, swe.SUN, swe.CALC_MTRANSIT, lat, lon, alt, mode)

    to_local = (lambda jd: jd_to_local(jd, tz) if jd else None)

    sunrise = to_local(jd_sunrise)
    sunset = to_local(jd_sunset)
    next_sunrise = to_local(jd_next_sunrise)

    day_seconds = (sunset - sunrise).total_seconds() if sunrise and sunset else None
    night_seconds = (next_sunrise - sunset).total_seconds() if sunset and next_sunrise else None

    return {
        "date": date_str,
        "rising_mode": mode,
        "sunrise": sunrise,
        "sunset": sunset,
        "next_sunrise": next_sunrise,
        "solar_noon": to_local(jd_noon),
        "moonrise": to_local(jd_moonrise),
        "moonset": to_local(jd_moonset),
        "day_seconds": day_seconds,
        "night_seconds": night_seconds,
        # JDs kept so callers (Panchanga at sunrise, Muhurta boundaries)
        # can compute without a lossy round-trip through local strings.
        "jd": {
            "sunrise": jd_sunrise,
            "sunset": jd_sunset,
            "next_sunrise": jd_next_sunrise,
        },
    }
