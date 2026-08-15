# Traditional 5 Ruling Planets. Ported from lib/vedicTables.js:
# computeRulingPlanets — see core/significators.py's header for why the
# JS/Python versions match field-for-field.

# Python's datetime.weekday(): 0=Monday .. 6=Sunday (unlike JS's
# Date.getDay() where 0=Sunday). Index accordingly.
WEEKDAY_LORDS = ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Sun"]


def get_day_lord(birth_dt):
    return WEEKDAY_LORDS[birth_dt.weekday()]


def compute_ruling_planets(lagna, moon, birth_dt):
    return {
        "lagna_lord": lagna["rashi_lord"],
        "lagna_star_lord": lagna["nakshatra_lord"],
        "rasi_lord": moon["rashi_lord"],
        "day_lord": get_day_lord(birth_dt),
        "moon_star_lord": moon["nakshatra_lord"],
    }
