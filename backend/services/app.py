# FastAPI wrapper around core/. Exposes POST /chart with the exact
# response shape Astro-Engine-v2.0's frontend already expects (see that
# repo's src/lib/api.js and src/data/mockChartData.js) so switching the
# frontend from mock to real data is just USE_MOCK = false, no component
# changes. POST /horary exposes KP Prasna (horary) charts, merged in from
# the sibling astro-engine-v2 snapshot.
#
# core/ itself is snake_case (Python convention); this file is the one
# place that translates to the camelCase shape the frontend consumes.
#
# Run: venv\Scripts\uvicorn services.app:app --reload --port 8000
import os
from datetime import datetime

import swisseph as swe
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - matches core/jd.py's fallback
    from backports.zoneinfo import ZoneInfo

from core.jd import to_julian_day
from core.planets import get_all_planets, calculate_planet
from core.riseset import day_events, jd_to_local, RISING_MODES
from core.houses import calculate_lagna, assign_houses
from core.cusps import calculate_placidus_cusps, get_placidus_house
from core.significators import compute_significators
from core.ruling_planets import compute_ruling_planets
from core.panchang import compute_panchang
from core.muhurta import (
    compute_hora, compute_abhijit, compute_nishita, compute_trikalam,
    compute_choghadiya, compute_brahma_muhurta, current_of,
)
from core.dasha_tree import build_dasha_snapshot
from core.ayanamsa import set_ayanamsa
from core.horary import find_exact_ascendant_time, get_horary_range
from core.vargas import get_multiple_varga_charts
from core.vargas.formulas import VARGA_FORMULAS

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
    # Moment to evaluate the Dasha chain against. Omit for "now".
    asOf: str | None = None  # "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
    # "standard" = apparent sunrise (matches published almanacs),
    # "hindu" = disc centre without refraction. See core/riseset.py.
    risingMode: str = "standard"
    # Divisional (Varga) charts to compute, e.g. [9, 10] for D9 + D10.
    # Opt-in and empty by default -- Plan 4 §5: D60 in particular is
    # rarely needed and adds 16x the per-planet remapping work for no
    # benefit on the common case.
    vargasRequested: list[int] | None = None


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


DT_FMT = "%Y-%m-%d %H:%M:%S"


def _parse_as_of(raw):
    if not raw:
        return datetime.now()
    for fmt in (DT_FMT, "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return datetime.now()


def _to_camel_period(p):
    # Datetimes are naive local-to-birthplace. They're emitted as plain
    # formatted strings rather than ISO-with-offset so the browser can't
    # re-interpret them in its own timezone.
    return {
        "lord": p["lord"],
        "start": p["start"].strftime(DT_FMT),
        "end": p["end"].strftime(DT_FMT),
        "years": round(p["years"], 6),
    }


def _to_camel_dasha(d):
    return {
        "system": "Vimshottari",
        "asOf": d["asOf"].strftime(DT_FMT),
        "balance": {
            "lord": d["balance"]["lord"],
            "years": round(d["balance"]["years"], 6),
            "y": d["balance"]["y"],
            "m": d["balance"]["m"],
            "d": d["balance"]["d"],
        },
        "timeline": [_to_camel_period(p) for p in d["timeline"]],
        "current": {k: _to_camel_period(v) for k, v in d["current"].items()},
        "branches": {k: [_to_camel_period(p) for p in v]
                     for k, v in d["branches"].items()},
    }


def _hhmmss(dt):
    return dt.strftime("%H:%M:%S") if dt else None


def _to_camel_riseset(d):
    return {
        "date": d["date"],
        "risingMode": d["rising_mode"],
        "sunrise": _hhmmss(d["sunrise"]),
        "sunset": _hhmmss(d["sunset"]),
        "solarNoon": _hhmmss(d["solar_noon"]),
        "moonrise": _hhmmss(d["moonrise"]),
        "moonset": _hhmmss(d["moonset"]),
        "nextSunrise": _hhmmss(d["next_sunrise"]),
        "daySeconds": d["day_seconds"],
        "nightSeconds": d["night_seconds"],
        # Null at high latitudes when the Sun is circumpolar -- the caller
        # must render "does not rise/set" rather than assume a time.
        "circumpolar": d["sunrise"] is None or d["sunset"] is None,
    }


def _to_camel_varga_placement(p):
    return {
        "planet": p["planet"],
        "rashi": p["rashi"],
        "rashiLord": p["rashi_lord"],
        "longitude": p["longitude"],
        "degree": p["degree"],
        "retrograde": p["retrograde"],
        "house": p["house"],
    }


def _to_camel_varga(chart):
    return {
        "dNumber": chart["dNumber"],
        "name": chart["name"],
        "lagna": _to_camel_varga_placement(chart["lagna"]),
        "planets": [_to_camel_varga_placement(p) for p in chart["planets"]],
    }


def _to_camel_ruling(r):
    return {
        "lagnaLord": r["lagna_lord"],
        "lagnaStarLord": r["lagna_star_lord"],
        "rasiLord": r["rasi_lord"],
        "dayLord": r["day_lord"],
        "moonStarLord": r["moon_star_lord"],
    }


def _to_camel_timed_limb(limb, tz, extra_keys):
    # Full "YYYY-MM-DD HH:MM:SS" rather than riseSet's bare HH:MM:SS --
    # unlike sunrise/sunset, a Panchang limb's start/end can genuinely
    # fall on a different calendar date than the query moment (e.g. a
    # Tithi spanning midnight, or occasionally sunrise itself), so the
    # date is part of the answer, not implied context.
    out = {k: limb[k] for k in extra_keys}
    out["start"] = jd_to_local(limb["start_jd"], tz).strftime(DT_FMT)
    out["end"] = jd_to_local(limb["end_jd"], tz).strftime(DT_FMT)
    out["durationSeconds"] = round(limb["duration_seconds"])
    out["remainingSeconds"] = round(limb["remaining_seconds"])
    return out


def _to_camel_panchang(p, tz):
    return {
        "tithi": _to_camel_timed_limb(p["tithi"], tz, ["number", "paksha", "name", "label"]),
        "vara": {
            "index": p["vara"]["index"], "name": p["vara"]["name"], "lord": p["vara"]["lord"],
        },
        "nakshatra": _to_camel_timed_limb(p["nakshatra"], tz, ["name", "lord", "pada"]),
        "yoga": _to_camel_timed_limb(p["yoga"], tz, ["name"]),
        "karana": _to_camel_timed_limb(p["karana"], tz, ["name"]),
    }


def _span(period, extra_keys=()):
    if period is None:
        return None
    out = {k: period[k] for k in extra_keys}
    out["start"] = period["start"].strftime(DT_FMT)
    out["end"] = period["end"].strftime(DT_FMT)
    return out


def _hora_entry(h):
    return {"lord": h["lord"], "start": h["start"].strftime(DT_FMT), "end": h["end"].strftime(DT_FMT)}


def _choghadiya_entry(p):
    return {
        "name": p["name"], "quality": p["quality"],
        "start": p["start"].strftime(DT_FMT), "end": p["end"].strftime(DT_FMT),
    }


def _to_camel_muhurta(day, at_dt):
    # Plan 5 §8/§11: compute unconditionally alongside riseSet, and every
    # entry degrades to None the same way core/riseset.py does when the
    # underlying sunrise/sunset is None (circumpolar dates) rather than
    # raise or fabricate a time.
    horas = compute_hora(day)
    abhijit = compute_abhijit(day)
    nishita = compute_nishita(day)
    trikalam = compute_trikalam(day)
    choghadiya = compute_choghadiya(day)
    brahma = compute_brahma_muhurta(day)

    hora_out = None
    if horas is not None:
        current = current_of(horas, at_dt)
        hora_out = {
            "current": _hora_entry(current) if current else None,
            "day": [_hora_entry(h) for h in horas[:12]],
            "night": [_hora_entry(h) for h in horas[12:]],
        }

    choghadiya_out = None
    if choghadiya is not None:
        current = current_of(choghadiya["day"], at_dt) or current_of(choghadiya["night"], at_dt)
        choghadiya_out = {
            "current": _choghadiya_entry(current) if current else None,
            "day": [_choghadiya_entry(p) for p in choghadiya["day"]],
            "night": [_choghadiya_entry(p) for p in choghadiya["night"]],
        }

    return {
        "hora": hora_out,
        "abhijit": _span(abhijit, ["excludedByWeekday"]),
        "nishita": {"midpoint": nishita["midpoint"].strftime(DT_FMT)} if nishita else None,
        "rahuKalam": _span(trikalam["rahuKalam"]) if trikalam else None,
        "yamaganda": _span(trikalam["yamaganda"]) if trikalam else None,
        "gulikaKalam": _span(trikalam["gulikaKalam"]) if trikalam else None,
        "choghadiya": choghadiya_out,
        "brahmaMuhurta": _span(brahma, ["convention"]),
        # Durmuhurta: not implemented -- see core/muhurta.py's module-level
        # note for why (no citable per-weekday table found yet).
    }


@app.post("/chart")
def post_chart(req: ChartRequest):
    # Validate before touching the ephemeris. A browser date input can
    # emit out-of-range values (e.g. a stray "11111-11-11"), which
    # otherwise surfaces as an unhandled 500 from deep inside strptime.
    try:
        birth_dt = datetime.strptime(f"{req.dob} {req.tob}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid birth date/time: {req.dob!r} {req.tob!r}. "
                   "Expected YYYY-MM-DD and HH:MM:SS.",
        )

    try:
        ZoneInfo(req.location.tz)
    except Exception:
        raise HTTPException(
            status_code=422, detail=f"Unknown timezone: {req.location.tz!r}"
        )

    if not (-90 <= req.location.lat <= 90 and -180 <= req.location.lon <= 180):
        raise HTTPException(
            status_code=422,
            detail=f"Coordinates out of range: {req.location.lat}, {req.location.lon}",
        )

    jd = to_julian_day(req.dob, req.tob, req.location.tz)

    try:
        manual_value = float(req.customAyanamsaValue) if req.customAyanamsaValue else None
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid custom ayanamsa value: {req.customAyanamsaValue!r}",
        )

    try:
        ayan = set_ayanamsa(req.ayanamsa, manual_value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if req.vargasRequested:
        unsupported = [d for d in req.vargasRequested if d not in VARGA_FORMULAS]
        if unsupported:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported Varga(s) requested: {unsupported}. "
                       f"Supported: {sorted(VARGA_FORMULAS)}.",
            )

    # Computed once and threaded through explicitly -- see
    # core/houses.py's docstring for why re-deriving this per-call via
    # swe.get_ayanamsa(jd) or FLG_SIDEREAL is wrong for custom modes.
    ayanamsa_value = ayan["value_func"](jd)

    true_node = req.rahuNode == "true"
    planets_raw = get_all_planets(jd, ayanamsa_value, true_node)

    lagna_raw = calculate_lagna(jd, req.location.lat, req.location.lon, ayanamsa_value)

    all_raw = [lagna_raw] + planets_raw
    all_raw, _house_map = assign_houses(all_raw, lagna_raw["rashi"])

    # Vargas are a pure remapping of the D1 longitudes already computed
    # above -- no new ephemeris calls, unaffected by Placidus/high-latitude
    # concerns below, so computed here regardless of what happens to cusps.
    vargas_raw = (
        get_multiple_varga_charts(all_raw, req.vargasRequested)
        if req.vargasRequested else {}
    )

    # Placidus is undefined above the polar circles -- the ecliptic points
    # its cusps depend on never rise there, and Swiss Ephemeris raises.
    # KP genuinely cannot be computed at those latitudes, but the rest of
    # the chart (planets, whole-sign houses, Dasha, Panchang) still can,
    # so degrade to a warning instead of failing the whole request.
    warnings = []
    try:
        cusps_raw = calculate_placidus_cusps(jd, req.location.lat, req.location.lon, ayanamsa_value)
    except swe.Error:
        cusps_raw = []
        warnings.append(
            "Placidus cusps are undefined above the polar circles "
            f"(latitude {req.location.lat}). KP cusps and significators are "
            "omitted; whole-sign houses and everything else are unaffected."
        )

    if cusps_raw:
        cusp_longitudes = [c["longitude"] for c in cusps_raw]
        for p in all_raw:
            p["placidus_house"] = get_placidus_house(p["longitude"], cusp_longitudes)
        significators_raw = compute_significators(all_raw, cusps_raw)
    else:
        for p in all_raw:
            p["placidus_house"] = None
        significators_raw = []

    moon_raw = next(p for p in all_raw if p["planet"] == "Moon")
    sun_raw = next(p for p in all_raw if p["planet"] == "Sun")

    ruling_raw = compute_ruling_planets(lagna_raw, moon_raw, birth_dt)
    panchang = compute_panchang(jd, ayanamsa_value, sun_raw, moon_raw, birth_dt)

    dasha_raw = build_dasha_snapshot(
        moon_raw["longitude"], moon_raw["nakshatra_lord"], birth_dt, _parse_as_of(req.asOf)
    )

    mode = req.risingMode if req.risingMode in RISING_MODES else "standard"
    day = day_events(req.dob, req.location.lat, req.location.lon, req.location.tz, mode=mode)

    # Plan 1 §11/§58: the Panchang at the birth *moment* and the Panchang
    # prevailing at local *sunrise* are different queries, and a daily
    # almanac quotes the latter. Both are returned rather than conflated.
    panchang_at_sunrise = None
    if day["jd"]["sunrise"]:
        jd_sr = day["jd"]["sunrise"]
        # Reuses the birth-moment ayanamsa_value rather than recomputing
        # value_func(jd_sr): sunrise is within ~24h of birth, and
        # ayanamsa precesses ~50 arcsec/year (~0.14 arcsec/day) even for
        # the built-in modes that do vary by date -- sub-arcsecond and
        # irrelevant at this precision.
        sun_sr = calculate_planet(jd_sr, "Sun", ayanamsa_value)
        moon_sr = calculate_planet(jd_sr, "Moon", ayanamsa_value)
        panchang_at_sunrise = compute_panchang(
            jd_sr, ayanamsa_value, sun_sr, moon_sr, day["sunrise"]
        )

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
        "vargas": {
            "requested": req.vargasRequested or [],
            **{key: _to_camel_varga(chart) for key, chart in vargas_raw.items()},
        },
        "dasha": _to_camel_dasha(dasha_raw),
        "riseSet": _to_camel_riseset(day),
        "muhurta": _to_camel_muhurta(day, birth_dt),
        "panchang": {**_to_camel_panchang(panchang, req.location.tz), "_mock": False},
        "panchangAtSunrise": (
            _to_camel_panchang(panchang_at_sunrise, req.location.tz)
            if panchang_at_sunrise else None
        ),
        "warnings": warnings,
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
    try:
        datetime.strptime(req.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid date: {req.date!r}. Expected YYYY-MM-DD.",
        )

    try:
        ZoneInfo(req.location.tz)
    except Exception:
        raise HTTPException(
            status_code=422, detail=f"Unknown timezone: {req.location.tz!r}"
        )

    try:
        manual_value = float(req.customAyanamsaValue) if req.customAyanamsaValue else None
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid custom ayanamsa value: {req.customAyanamsaValue!r}",
        )

    try:
        ayan = set_ayanamsa(req.ayanamsa, manual_value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Same "computed once, reused across the day" reasoning as /chart's
    # sunrise Panchang: ayanamsa precesses far too slowly for a fixed
    # anchor within the search day to matter. Midday of the search date
    # is an arbitrary but reasonable anchor since no birth/match moment
    # is known yet at this point.
    anchor_jd = to_julian_day(req.date, "12:00:00", req.location.tz)
    ayanamsa_value = ayan["value_func"](anchor_jd)

    matched_dt, lagna_raw = find_exact_ascendant_time(
        req.date, req.location.tz, req.location.lat, req.location.lon,
        req.horaryNumber, ayanamsa_value,
    )

    jd = to_julian_day(
        matched_dt.strftime("%Y-%m-%d"), matched_dt.strftime("%H:%M:%S"), req.location.tz
    )

    true_node = req.rahuNode == "true"
    planets_raw = get_all_planets(jd, ayanamsa_value, true_node)

    all_raw = [lagna_raw] + planets_raw
    all_raw, _house_map = assign_houses(all_raw, lagna_raw["rashi"])

    cusps_raw = calculate_placidus_cusps(jd, req.location.lat, req.location.lon, ayanamsa_value)
    cusp_longitudes = [c["longitude"] for c in cusps_raw]
    for p in all_raw:
        p["placidus_house"] = get_placidus_house(p["longitude"], cusp_longitudes)

    significators_raw = compute_significators(all_raw, cusps_raw)

    moon_raw = next(p for p in all_raw if p["planet"] == "Moon")
    sun_raw = next(p for p in all_raw if p["planet"] == "Sun")

    ruling_raw = compute_ruling_planets(lagna_raw, moon_raw, matched_dt.replace(tzinfo=None))
    panchang = compute_panchang(
        jd, ayanamsa_value, sun_raw, moon_raw, matched_dt.replace(tzinfo=None)
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
        "panchang": {**_to_camel_panchang(panchang, req.location.tz), "_mock": False},
        "summary": {
            "lagnaRashi": lagna_raw["rashi"],
            "moonRashi": moon_raw["rashi"],
            "moonNakshatra": moon_raw["nakshatra"],
            "moonCharan": moon_raw["charan"],
        },
        "_mock": False,
    }
