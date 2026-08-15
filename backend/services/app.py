# FastAPI wrapper around core/. Exposes POST /chart with the exact
# response shape Astro-Engine-v2.0's frontend already expects (see that
# repo's src/lib/api.js and src/data/mockChartData.js) so switching the
# frontend from mock to real data is just USE_MOCK = false, no component
# changes.
#
# core/ itself is snake_case (Python convention); this file is the one
# place that translates to the camelCase shape the frontend consumes.
#
# Run: venv\Scripts\uvicorn services.app:app --reload --port 8000
import os
from datetime import datetime

import swisseph as swe
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.jd import to_julian_day
from core.planets import get_all_planets
from core.houses import calculate_lagna, assign_houses
from core.cusps import calculate_placidus_cusps, get_placidus_house
from core.significators import compute_significators
from core.ruling_planets import compute_ruling_planets
from core.panchang import compute_panchang
from core.ayanamsa import set_ayanamsa
from core.horary import find_exact_ascendant_time, get_horary_range

EPHE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ephemeris")
swe.set_ephe_path(EPHE_PATH)

app = FastAPI(title="Astro Engine API")

# The Vite dev server's port drifts (5173/5174/5175...) whenever one is
# already taken, so localhost stays wildcarded; the deployed frontend
# origin is pinned explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://dsk369\.github\.io$|^http://localhost:\d+$|^http://127\.0\.0\.1:\d+$",
    allow_methods=["*"],
    allow_headers=["*"],
)


class LocationIn(BaseModel):
    city: str | None = None
    state: str | None = None
    country: str | None = None
    lat: float
    lon: float
    tz: str
    label: str | None = None


class ChartRequest(BaseModel):
    firstName: str | None = None
    fatherName: str | None = None
    lastName: str | None = None
    dob: str  # "YYYY-MM-DD"
    tob: str  # "HH:MM:SS"
    location: LocationIn
    ayanamsa: str = "KP"
    customAyanamsaValue: str | float | None = None
    chartStyle: str | None = None
    rahuNode: str = "mean"  # "mean" | "true"
    houseSystem: str | None = None


class HoraryRequest(BaseModel):
    horaryNumber: int  # 1-249
    date: str  # "YYYY-MM-DD" -- the day to search for the matching ascendant moment
    location: LocationIn
    ayanamsa: str = "KP"
    customAyanamsaValue: str | float | None = None
    rahuNode: str = "mean"  # "mean" | "true"


def _to_camel_placement(p):
    return {
        "planet": p["planet"],
        "longitude": p["longitude"],
        "degree": p["degree"],
        "retrograde": p["retrograde"],
        "rashi": p["rashi"],
        "rashiLord": p["rashi_lord"],
        "nakshatra": p["nakshatra"],
        "nakshatraLord": p["nakshatra_lord"],
        "charan": p["charan"],
        "subLord": p["sub_lord"],
        "subSubLord": p["sub_sub_lord"],
        "subSubSubLord": p["sub_sub_sub_lord"],
        "house": p["house"],
    }


def _to_camel_cusp(c):
    return {
        "house": c["house"],
        "longitude": c["longitude"],
        "degree": c["degree"],
        "rashi": c["rashi"],
        "rashiLord": c["rashi_lord"],
        "nakshatra": c["nakshatra"],
        "nakshatraLord": c["nakshatra_lord"],
        "charan": c["charan"],
        "subLord": c["sub_lord"],
        "subSubLord": c["sub_sub_lord"],
        "subSubSubLord": c["sub_sub_sub_lord"],
    }


def _to_camel_significator(s):
    return {
        "house": s["house"],
        "cuspRashi": s["cusp_rashi"],
        "owner": s["owner"],
        "ownerStarLord": s["owner_star_lord"],
        "stepAStarOfOccupants": s["step_a_star_of_occupants"],
        "stepBOccupants": s["step_b_occupants"],
        "stepCStarOfOwner": s["step_c_star_of_owner"],
        "stepDOwner": s["step_d_owner"],
    }


def _to_camel_ruling(r):
    return {
        "lagnaLord": r["lagna_lord"],
        "lagnaStarLord": r["lagna_star_lord"],
        "rasiLord": r["rasi_lord"],
        "dayLord": r["day_lord"],
        "moonStarLord": r["moon_star_lord"],
    }


@app.post("/chart")
def post_chart(req: ChartRequest):
    jd = to_julian_day(req.dob, req.tob, req.location.tz)

    manual_value = float(req.customAyanamsaValue) if req.customAyanamsaValue else None
    set_ayanamsa(req.ayanamsa, manual_value)

    true_node = req.rahuNode == "true"
    planets_raw = get_all_planets(jd, true_node)

    lagna_raw = calculate_lagna(jd, req.location.lat, req.location.lon)

    all_raw = [lagna_raw] + planets_raw
    all_raw, _house_map = assign_houses(all_raw, lagna_raw["rashi"])

    cusps_raw = calculate_placidus_cusps(jd, req.location.lat, req.location.lon)
    cusp_longitudes = [c["longitude"] for c in cusps_raw]
    for p in all_raw:
        p["placidus_house"] = get_placidus_house(p["longitude"], cusp_longitudes)

    significators_raw = compute_significators(all_raw, cusps_raw)

    moon_raw = next(p for p in all_raw if p["planet"] == "Moon")
    sun_raw = next(p for p in all_raw if p["planet"] == "Sun")

    birth_dt = datetime.strptime(f"{req.dob} {req.tob}", "%Y-%m-%d %H:%M:%S")
    ruling_raw = compute_ruling_planets(lagna_raw, moon_raw, birth_dt)
    panchang = compute_panchang(sun_raw["longitude"], moon_raw["longitude"], moon_raw["nakshatra"], birth_dt)

    all_placements = [_to_camel_placement(p) for p in all_raw]
    lagna_out = all_placements[0]
    planets_out = all_placements[1:]

    return {
        "lagna": lagna_out,
        "planets": planets_out,
        "allPlacements": all_placements,
        "cusps": [_to_camel_cusp(c) for c in cusps_raw],
        "significators": [_to_camel_significator(s) for s in significators_raw],
        "rulingPlanets": _to_camel_ruling(ruling_raw),
        "panchang": {**panchang, "_mock": False},
        "summary": {
            "lagnaRashi": lagna_raw["rashi"],
            "moonRashi": moon_raw["rashi"],
            "moonNakshatra": moon_raw["nakshatra"],
            "moonCharan": moon_raw["charan"],
        },
        "_mock": False,
    }


@app.post("/horary")
def post_horary(req: HoraryRequest):
    """
    KP Prasna (horary) chart: finds the moment on `date` when the ascendant
    enters horary number `horaryNumber`'s KP sub-lord zone, then runs that
    moment through the exact same downstream pipeline as /chart (planets,
    houses, cusps, significators, ruling planets) -- a horary chart and a
    natal chart differ only in how the "birth" moment was chosen.
    """
    manual_value = float(req.customAyanamsaValue) if req.customAyanamsaValue else None
    set_ayanamsa(req.ayanamsa, manual_value)

    matched_dt, lagna_raw = find_exact_ascendant_time(
        req.date, req.location.tz, req.location.lat, req.location.lon, req.horaryNumber
    )

    jd = to_julian_day(
        matched_dt.strftime("%Y-%m-%d"), matched_dt.strftime("%H:%M:%S"), req.location.tz
    )

    true_node = req.rahuNode == "true"
    planets_raw = get_all_planets(jd, true_node)

    all_raw = [lagna_raw] + planets_raw
    all_raw, _house_map = assign_houses(all_raw, lagna_raw["rashi"])

    cusps_raw = calculate_placidus_cusps(jd, req.location.lat, req.location.lon)
    cusp_longitudes = [c["longitude"] for c in cusps_raw]
    for p in all_raw:
        p["placidus_house"] = get_placidus_house(p["longitude"], cusp_longitudes)

    significators_raw = compute_significators(all_raw, cusps_raw)

    moon_raw = next(p for p in all_raw if p["planet"] == "Moon")
    sun_raw = next(p for p in all_raw if p["planet"] == "Sun")

    ruling_raw = compute_ruling_planets(lagna_raw, moon_raw, matched_dt.replace(tzinfo=None))
    panchang = compute_panchang(
        sun_raw["longitude"], moon_raw["longitude"], moon_raw["nakshatra"],
        matched_dt.replace(tzinfo=None)
    )

    all_placements = [_to_camel_placement(p) for p in all_raw]
    lagna_out = all_placements[0]
    planets_out = all_placements[1:]

    horary_range = get_horary_range(req.horaryNumber)

    return {
        "horaryNumber": req.horaryNumber,
        "matchedDateTime": matched_dt.isoformat(),
        "horaryZone": {
            "fromDeg": horary_range["from_deg"],
            "toDeg": horary_range["to_deg"],
            "sign": horary_range["sign"],
            "nakshatra": horary_range["nakshatra"],
            "subLord": horary_range["sub_lord"],
        },
        "lagna": lagna_out,
        "planets": planets_out,
        "allPlacements": all_placements,
        "cusps": [_to_camel_cusp(c) for c in cusps_raw],
        "significators": [_to_camel_significator(s) for s in significators_raw],
        "rulingPlanets": _to_camel_ruling(ruling_raw),
        "panchang": {**panchang, "_mock": False},
        "summary": {
            "lagnaRashi": lagna_raw["rashi"],
            "moonRashi": moon_raw["rashi"],
            "moonNakshatra": moon_raw["nakshatra"],
            "moonCharan": moon_raw["charan"],
        },
        "_mock": False,
    }
