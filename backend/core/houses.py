import swisseph as swe
from core.astro import get_rashi, get_nakshatra, get_charan
from core.utils import decimal_to_dms
from core.kp import compute_kp_levels

# SAME OFFSET
AYAN_OFFSET = -0.1


def calculate_lagna(jd, latitude, longitude):
    houses, ascmc = swe.houses(jd, latitude, longitude)

    asc_tropical = ascmc[0]

    ayanamsa = swe.get_ayanamsa(jd)

    asc_sidereal = (asc_tropical - ayanamsa) % 360

    # APPLY OFFSET
    asc_sidereal = (asc_sidereal + AYAN_OFFSET) % 360

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