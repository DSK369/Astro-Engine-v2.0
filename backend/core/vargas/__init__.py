# Divisional charts (Vargas): remaps already-computed D1 sidereal
# longitudes into a different sign per planet, using the verified
# formulas in formulas.py. No new Swiss Ephemeris calls, no ayanamsa
# handling -- see Plan 4 (project plan folder) §3.6.

from core.astro import RASHIS, RASHI_LORDS
from core.houses import assign_houses
from core.utils import decimal_to_dms
from core.vargas.formulas import VARGA_FORMULAS, VARGA_NAMES
from core.vargas.rules import d_long


def get_varga_chart(all_placements, d_number):
    """Remap every placement (Lagna + planets) through the D`d_number`
    Varga formula. `all_placements` is the same list core/houses.py's
    assign_houses() already consumes -- each dict needs at least
    `planet`, `longitude` (absolute sidereal, 0-360), and `retrograde`.

    Returns {"dNumber", "name", "lagna": {...}, "planets": [...],
    "houses": {rashi: house}}. Each placement carries rashi/rashi_lord/
    house/longitude(within the new sign)/retrograde only -- classically
    Vargas are read by sign and house, not re-run through the Nakshatra/
    sub-lord cascade (that's a D1-longitude concept), per Plan 4 §4's
    explicit call on this.
    """
    if d_number not in VARGA_FORMULAS:
        raise ValueError(f"Unsupported Varga: D{d_number}")

    formula = VARGA_FORMULAS[d_number]

    remapped = []
    for p in all_placements:
        sign = int(p["longitude"] // 30)
        lon = p["longitude"] % 30
        rashi = RASHIS[formula(sign, lon)]
        new_lon = d_long(lon, d_number)
        remapped.append({
            "planet": p["planet"],
            "rashi": rashi,
            "rashi_lord": RASHI_LORDS[rashi],
            "longitude": new_lon,
            "degree": decimal_to_dms(new_lon),
            "retrograde": p["retrograde"],
        })

    lagna_rashi = next(item["rashi"] for item in remapped if item["planet"] == "Lagna")
    remapped, house_map = assign_houses(remapped, lagna_rashi)

    lagna_out = next(item for item in remapped if item["planet"] == "Lagna")
    planets_out = [item for item in remapped if item["planet"] != "Lagna"]

    return {
        "dNumber": d_number,
        "name": VARGA_NAMES[d_number],
        "lagna": lagna_out,
        "planets": planets_out,
        "houses": house_map,
    }


def get_multiple_varga_charts(all_placements, d_numbers):
    return {f"D{n}": get_varga_chart(all_placements, n) for n in d_numbers}
