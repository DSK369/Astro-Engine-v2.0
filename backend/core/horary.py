"""
KP horary (Prasna) chart: given a horary number 1-249, find the moment the
ascendant enters that number's sub-lord zone, then build a full chart for
that moment exactly like a birth chart.

Reuses the same building blocks as core/houses.py (calculate_lagna) and
core/cusps.py (calculate_placidus_cusps) so a horary chart and a natal
chart go through identical downstream code -- KP levels, houses,
significators, ruling planets all work unmodified on the result.
"""
import swisseph as swe
from datetime import datetime

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from core.data.kp_horary_249 import KP_249_TABLE
from core.houses import calculate_lagna

# SAME OFFSET as houses.py / planets.py / cusps.py, kept consistent so the
# fast ascendant-only search loop below lines up with the full chart build.
AYAN_OFFSET = -0.1


def get_horary_range(horary_number):
    """Row for a horary number (1-249): dict with from_deg/to_deg/sign/
    sign_lord/nakshatra/nakshatra_lord/sub_lord. from_deg/to_deg are
    absolute sidereal longitude, 0 = 0 deg Aries."""
    if not 1 <= horary_number <= 249:
        raise ValueError("Horary number must be between 1 and 249")
    kp_no, from_deg, to_deg, sign, sign_lord, nakshatra, nak_lord, sub_lord = \
        KP_249_TABLE[horary_number - 1]
    return {
        "kp_number": kp_no, "from_deg": from_deg, "to_deg": to_deg,
        "sign": sign, "sign_lord": sign_lord, "nakshatra": nakshatra,
        "nakshatra_lord": nak_lord, "sub_lord": sub_lord,
    }


def get_kp_number_for_longitude(longitude):
    """Reverse lookup: which of the 249 KP numbers a longitude falls in."""
    lon = longitude % 360.0
    for kp_no, from_deg, to_deg, *_ in KP_249_TABLE:
        if from_deg <= lon < to_deg:
            return kp_no
    return 249  # 360.0 exactly


def _fast_ascendant_longitude(jd, latitude, longitude):
    """Lightweight ascendant-only computation for the search loop -- skips
    nakshatra/KP-level lookups that calculate_lagna() does, since those
    aren't needed until a candidate moment is found."""
    houses, ascmc = swe.houses(jd, latitude, longitude)
    ayanamsa = swe.get_ayanamsa(jd)
    return (ascmc[0] - ayanamsa + AYAN_OFFSET) % 360


def _jd_to_local_datetime(jd, timezone_str):
    y, m, d, hour = swe.revjul(jd)
    h = int(hour)
    minute_f = (hour - h) * 60
    minute = int(minute_f)
    second = (minute_f - minute) * 60
    utc_dt = datetime(y, m, d, h, minute, int(second), tzinfo=ZoneInfo("UTC"))
    return utc_dt.astimezone(ZoneInfo(timezone_str))


def find_exact_ascendant_time(date_str, timezone_str, latitude, longitude, horary_number):
    """
    Search the given local calendar day for the moment the ascendant enters
    the sidereal zone belonging to `horary_number`, using an adaptive step
    (coarse when far from the target, finer as it converges -- same
    approach VedicAstro's horary_chart.py uses, adapted to this engine's
    conventions). Requires set_ayanamsa(...) to already have been called by
    the caller (mirrors every other core/ module: ayanamsa mode is a
    process-wide swisseph setting, not a per-call argument here).

    Returns (matched_local_datetime, lagna_dict) where lagna_dict is the
    same shape core.houses.calculate_lagna() returns (rashi, nakshatra,
    sub_lord chain, etc), computed at the matched moment.
    """
    target = get_horary_range(horary_number)

    # Window is local midnight -> next local midnight, expressed as the UTC
    # instants they actually fall on (NOT UTC midnight of the same calendar
    # day -- for any non-zero UTC offset those are different moments, e.g.
    # 2024-02-05 00:00 IST is 2024-02-04 18:30 UTC).
    local_dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo(timezone_str))
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    utc_hour = utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600
    jd_start = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_hour)
    jd_end = jd_start + 1.0

    mid_deg = (target["from_deg"] + target["to_deg"]) / 2.0

    jd = jd_start
    matched_jd = None
    while jd <= jd_end:
        asc = _fast_ascendant_longitude(jd, latitude, longitude)
        diff = asc - mid_deg
        # ascendant moves ~1 deg every 4 minutes; adapt step to distance
        diff_abs = abs(diff) if abs(diff) <= 180 else 360 - abs(diff)
        if diff_abs > 10:
            step_seconds = 240
        elif diff_abs > 1.0:
            step_seconds = 20
        elif diff_abs > 0.05:
            step_seconds = 1
        else:
            step_seconds = 0.05

        if target["from_deg"] <= asc < target["to_deg"]:
            matched_jd = jd
            break

        jd += step_seconds / 86400.0

    if matched_jd is None:
        raise ValueError(
            f"No moment found on {date_str} where the ascendant enters "
            f"KP horary number {horary_number}'s zone at this location."
        )

    matched_local_dt = _jd_to_local_datetime(matched_jd, timezone_str)
    lagna = calculate_lagna(matched_jd, latitude, longitude)

    if lagna["sub_lord"] != target["sub_lord"]:
        raise AssertionError(
            f"Horary search converged but sub-lord mismatch: expected "
            f"{target['sub_lord']}, got {lagna['sub_lord']}. This usually "
            f"means the ayanamsa mode active when this function was called "
            f"doesn't match the one the 249-table was built for (KP)."
        )

    return matched_local_dt, lagna
