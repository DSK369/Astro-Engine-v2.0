import swisseph as swe
from core.astro import get_rashi, get_nakshatra, get_charan
from core.utils import decimal_to_dms
from core.kp import compute_kp_levels


def calculate_lagna(jd, latitude, longitude, ayanamsa_value):
    """
    `ayanamsa_value` must be passed in explicitly (from core.ayanamsa's
    `value_func(jd)`), not re-derived here via `swe.get_ayanamsa(jd)`.
    For SIDM_USER-based custom modes (CUSTOM_KP / CUSTOM_MANUAL),
    `swe.get_ayanamsa(jd)` — and swisseph's own FLG_SIDEREAL longitudes —
    precess from whatever reference epoch `set_sid_mode` was given
    instead of returning the fixed value the caller configured, drifting
    by tens of degrees at dates far from that epoch. Accepting the value
    explicitly sidesteps that pitfall entirely.

    Previously this function added a `-0.1°` "offset" after the ayanamsa
    correction. Re-validated against a real Kismat KP-software printout
    (Dhanraj, 1998-12-20 09:20 IST, Solapur) at full arcsecond precision:
    with the offset removed AND the ayanamsa bug above fixed, Lagna
    matches the printout to within 4 arcseconds (was off by ~363
    arcseconds / 6 arcmin with the offset present). The offset was not a
    calibration; it was compensating for the ayanamsa bug in the wrong
    direction and by the wrong amount. See Plan 4 in the project plan
    folder for the full comparison table.
    """
    # Whole-sign ('W') is requested rather than the default Placidus
    # because Placidus is undefined above the polar circles and makes
    # swe.houses raise there. Only ascmc[0] (the Ascendant) is read here,
    # and that value is the ecliptic/horizon intersection — identical
    # under every house system — so this changes nothing except that the
    # Lagna now also resolves at high latitudes.
    houses, ascmc = swe.houses(jd, latitude, longitude, b'W')

    asc_tropical = ascmc[0]

    asc_sidereal = (asc_tropical - ayanamsa_value) % 360

    rashi, rashi_lord = get_rashi(asc_sidereal)
    nakshatra, nak_lord = get_nakshatra(asc_sidereal)
    charan = get_charan(asc_sidereal)

    # 🔥 KP LEVELS ADDED
    sub, sub_sub, sub_sub_sub = compute_kp_levels(asc_sidereal, nak_lord)

    return {
        "planet": "Lagna",
        "longitude": asc_sidereal,
        "degree": decimal_to_dms(asc_sidereal),
        "latitude": 0,
        "speed": 0,
        "retrograde": False,

        "rashi": rashi,
        "rashi_lord": rashi_lord,
        "nakshatra": nakshatra,
        "nakshatra_lord": nak_lord,
        "charan": charan,

        "sub_lord": sub,
        "sub_sub_lord": sub_sub,
        "sub_sub_sub_lord": sub_sub_sub
    }


def assign_houses(planets, lagna_rashi):
    from core.astro import RASHIS

    lagna_index = RASHIS.index(lagna_rashi)

    house_map = {}

    for i in range(12):
        house_number = i + 1
        rashi_index = (lagna_index + i) % 12
        house_map[RASHIS[rashi_index]] = house_number

    for p in planets:
        p["house"] = house_map[p["rashi"]]

    return planets, house_map