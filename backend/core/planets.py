import swisseph as swe
from core.astro import get_rashi, get_nakshatra, get_charan
from core.utils import decimal_to_dms
from core.kp import get_sub_lord
from core.kp import compute_kp_levels

FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
AYAN_OFFSET = -0.1

PLANETS = {
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


def calculate_planet(jd, name):
    result = swe.calc_ut(jd, PLANETS[name], FLAGS)

    lon = (result[0][0] + AYAN_OFFSET) % 360
    lat = result[0][1]
    speed = result[0][3]

    rashi, rashi_lord = get_rashi(lon)
    nak, nak_lord = get_nakshatra(lon)
    charan = get_charan(lon)

    sub, sub_sub, sub_sub_sub = compute_kp_levels(lon, nak_lord)

    return {
        "planet": name,
        "longitude": lon,
        "degree": decimal_to_dms(lon),
        "latitude": lat,
        "speed": speed,
        "retrograde": speed < 0,

        "rashi": rashi,
        "rashi_lord": rashi_lord,
        "nakshatra": nak,
        "nakshatra_lord": nak_lord,
        "charan": charan,

        "sub_lord": sub,
        "sub_sub_lord": sub_sub,
        "sub_sub_sub_lord": sub_sub_sub
    }


def calculate_rahu_ketu(jd, true_node=False):
    node = swe.TRUE_NODE if true_node else swe.MEAN_NODE
    result = swe.calc_ut(jd, node, FLAGS)

    rahu_lon = (result[0][0] + AYAN_OFFSET) % 360
    speed = result[0][3]

    ketu_lon = (rahu_lon + 180) % 360

    def build(name, lon, sp):
        rashi, rashi_lord = get_rashi(lon)
        nak, nak_lord = get_nakshatra(lon)
        charan = get_charan(lon)

        sub, sub_sub, sub_sub_sub = compute_kp_levels(lon, nak_lord)

        return {
            "planet": name,
            "longitude": lon,
            "degree": decimal_to_dms(lon),
            "latitude": 0,
            "speed": sp,
            "retrograde": True,

            "rashi": rashi,
            "rashi_lord": rashi_lord,
            "nakshatra": nak,
            "nakshatra_lord": nak_lord,
            "charan": charan,

            "sub_lord": sub,
            "sub_sub_lord": sub_sub,
            "sub_sub_sub_lord": sub_sub_sub
        }

    return build("Rahu", rahu_lon, speed), build("Ketu", ketu_lon, -speed)


def get_all_planets(jd, true_node=False):
    res = [calculate_planet(jd, p) for p in PLANETS]
    r, k = calculate_rahu_ketu(jd, true_node)
    res.extend([r, k])
    return res