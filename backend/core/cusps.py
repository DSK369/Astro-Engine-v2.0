import swisseph as swe
from core.astro import get_rashi, get_nakshatra, get_charan
from core.utils import decimal_to_dms
from core.kp import compute_kp_levels

# SAME OFFSET as houses.py / planets.py, kept consistent so cusps line up
# with planet/lagna longitudes computed elsewhere in core/.
AYAN_OFFSET = -0.1


def calculate_placidus_cusps(jd, latitude, longitude):
    houses, _ascmc = swe.houses(jd, latitude, longitude, b'P')
    ayanamsa = swe.get_ayanamsa(jd)

    cusps = []
    for i in range(12):
        tropical = houses[i]
        sidereal = (tropical - ayanamsa + AYAN_OFFSET) % 360

        rashi, rashi_lord = get_rashi(sidereal)
        nakshatra, nak_lord = get_nakshatra(sidereal)
        charan = get_charan(sidereal)
        sub, sub_sub, sub_sub_sub = compute_kp_levels(sidereal, nak_lord)

        cusps.append({
            "house": i + 1,
            "longitude": sidereal,
            "degree": decimal_to_dms(sidereal),

            "rashi": rashi,
            "rashi_lord": rashi_lord,
            "nakshatra": nakshatra,
            "nakshatra_lord": nak_lord,
            "charan": charan,

            "sub_lord": sub,
            "sub_sub_lord": sub_sub,
            "sub_sub_sub_lord": sub_sub_sub,
        })

    return cusps


def get_placidus_house(longitude, cusp_longitudes):
    """Which Placidus house a longitude falls in, given the 12 cusp start
    longitudes. Matches lib/vedicTables.js: getPlacidusHouse exactly."""
    for i in range(12):
        start = cusp_longitudes[i]
        end = cusp_longitudes[(i + 1) % 12]
        span = (end - start) % 360
        offset = (longitude - start) % 360
        if offset < span:
            return i + 1
    return None
