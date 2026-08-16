"""Gochara API — planetary transit timeline server.

Serves both the JSON ephemeris API and the static frontend from one
process. Run from the project root (or with --app-dir pointing here):

    python -m uvicorn backend.main:app --port 8100
"""

import mimetypes
import os
from typing import List, Optional

# Windows registers .js as text/plain in the registry, which Python's
# mimetypes (and therefore StaticFiles) picks up — browsers then refuse
# to execute ES modules. Force the correct type before mounting.
mimetypes.add_type("application/javascript", ".js")

import swisseph as swe
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.ayanamsa import set_ayanamsa, list_ayanamsa_modes
from backend.ephemeris import (
    ALL_PLANETS,
    sample_ephemeris,
    to_julian_day,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Reuse astro-engine's Swiss Ephemeris data files (~100MB, no point
# duplicating them). If that path is missing, swisseph falls back to its
# built-in Moshier model — lower precision but still functional.
#
# Upstream (github.com/DSK369/Astro-Engine-Gochar) assumes this app sits
# as a sibling folder next to one named "astro-engine". In this project
# it's merged in as Astro-Engine-v2.0/gochara/, and the backend + its
# ephemeris/ live at Astro-Engine-v2.0/backend/ — a sibling of *this*
# folder, not of a folder literally named "astro-engine". Path adjusted
# accordingly; see Plan 1 Implementation.md for the merge record.
EPHE_PATH = os.path.join(os.path.dirname(ROOT), "backend", "ephemeris")
if os.path.isdir(EPHE_PATH):
    swe.set_ephe_path(EPHE_PATH)

MAX_POINTS = 3000

app = FastAPI(title="Gochara API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local dev tool; tighten before deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


class EphemerisRequest(BaseModel):
    start: str  # local datetime "YYYY-MM-DDTHH:MM"
    end: str
    timezone: str
    points: int = Field(default=1200, ge=2, le=MAX_POINTS)
    ayanamsa_mode: str = "CUSTOM_KP"
    manual_ayanamsa: Optional[float] = None
    node_type: str = "MEAN"
    planets: Optional[List[str]] = None  # None => all 12


@app.get("/api/meta")
def meta():
    return {
        "status": "ok",
        "planets": ALL_PLANETS,
        "ayanamsa_modes": list_ayanamsa_modes(),
        "max_points": MAX_POINTS,
    }


@app.post("/api/ephemeris")
def ephemeris(req: EphemerisRequest):
    try:
        jd_start = to_julian_day(req.start, req.timezone)
        jd_end = to_julian_day(req.end, req.timezone)
        if jd_end <= jd_start:
            raise ValueError("end must be after start")

        ayan = set_ayanamsa(req.ayanamsa_mode, req.manual_ayanamsa)
        planets = req.planets or ALL_PLANETS

        times, series, retro = sample_ephemeris(
            jd_start, jd_end, req.points, ayan["value_func"], planets, req.node_type
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "ayanamsa": ayan["name"],
        "ayanamsaValueAtStart": round(ayan["value_func"](jd_start), 6),
        "times": times,
        "series": series,
        "retro": retro,
    }


# Static frontend — mounted last so /api/* wins.
app.mount(
    "/",
    StaticFiles(directory=os.path.join(ROOT, "frontend"), html=True),
    name="frontend",
)
