// Thin API client — talks to the FastAPI backend (api_server.py).
// Set USE_MOCK = true temporarily to run UI without backend.

import {
  ALL_PLACEMENTS, LAGNA, PLANETS, CUSPS, SIGNIFICATORS, RULING_PLANETS,
  MOCK_PANCHANG, SUMMARY,
} from "../data/mockChartData";

const USE_MOCK = false;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function normalizePlacement(placement) {
  return {
    ...placement,
    rashiLord: placement.rashiLord ?? placement.rashi_lord,
    nakshatraLord: placement.nakshatraLord ?? placement.nakshatra_lord,
    subLord: placement.subLord ?? placement.sub_lord,
    subSubLord: placement.subSubLord ?? placement.sub_sub_lord,
    subSubSubLord: placement.subSubSubLord ?? placement.sub_sub_sub_lord,
    placidusHouse: placement.placidusHouse ?? placement.placidus_house,
  };
}

function normalizeSignificator(significator) {
  return {
    ...significator,
    cuspRashi: significator.cuspRashi ?? significator.cusp_rashi,
    ownerStarLord: significator.ownerStarLord ?? significator.owner_star_lord,
    stepAStarOfOccupants:
      significator.stepAStarOfOccupants ?? significator.step_a_star_of_occupants ?? [],
    stepBOccupants: significator.stepBOccupants ?? significator.step_b_occupants ?? [],
    stepCStarOfOwner:
      significator.stepCStarOfOwner ?? significator.step_c_star_of_owner ?? [],
    stepDOwner: significator.stepDOwner ?? significator.step_d_owner ?? [],
  };
}

/** Normalize backend response to the shape all components expect */
function normalizeResponse(data) {
  // Flatten panchang.tithi object → string, matching mock shape
  const panchang = {
    tithi:      data.panchang?.tithi?.label ?? data.panchang?.tithi ?? "",
    var:        data.panchang?.var ?? "",
    nakshatra:  data.panchang?.nakshatra ?? "",
    yog:        data.panchang?.yog ?? "",
    karana:     data.panchang?.karana ?? "",
    _mock:      false,
  };

  // Normalize rulingPlanets — backend uses snake_case
  const rulingPlanets = data.rulingPlanets
    ? {
        lagnaLord:     data.rulingPlanets.lagna_lord     ?? data.rulingPlanets.lagnaLord,
        lagnaStarLord: data.rulingPlanets.lagna_star_lord ?? data.rulingPlanets.lagnaStarLord,
        rasiLord:      data.rulingPlanets.rasi_lord       ?? data.rulingPlanets.rasiLord,
        dayLord:       data.rulingPlanets.day_lord        ?? data.rulingPlanets.dayLord,
        moonStarLord:  data.rulingPlanets.moon_star_lord  ?? data.rulingPlanets.moonStarLord,
      }
    : data.rulingPlanets;

  return {
    ...data,
    lagna: data.lagna ? normalizePlacement(data.lagna) : data.lagna,
    planets: Array.isArray(data.planets) ? data.planets.map(normalizePlacement) : [],
    allPlacements: Array.isArray(data.allPlacements)
      ? data.allPlacements.map(normalizePlacement)
      : [],
    cusps: Array.isArray(data.cusps) ? data.cusps.map(normalizePlacement) : [],
    significators: Array.isArray(data.significators)
      ? data.significators.map(normalizeSignificator)
      : [],
    panchang,
    rulingPlanets,
  };
}

export async function fetchChart(formData) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      lagna: LAGNA,
      planets: PLANETS,
      allPlacements: ALL_PLACEMENTS,
      cusps: CUSPS,
      significators: SIGNIFICATORS,
      rulingPlanets: RULING_PLANETS,
      panchang: MOCK_PANCHANG,
      summary: SUMMARY,
      _mock: true,
    };
  }

  // Map BirthDataForm fields → backend API fields
  const payload = {
    date:          formData.dob,
    time:          formData.tob.length === 5 ? formData.tob + ":00" : formData.tob,
    timezone:      formData.location?.timezone ?? formData.location?.tz ?? "Asia/Kolkata",
    latitude:      formData.location?.lat,
    longitude:     formData.location?.lon,
    name:          [formData.firstName, formData.fatherName, formData.lastName]
                     .filter(Boolean).join(" ") || null,
    locationLabel: formData.location?.label ?? null,
    chartStyle:    formData.chartStyle ?? "north",
    ayanamsaMode:  formData.ayanamsa ?? "CUSTOM_KP",
    manualAyanamsa: formData.customAyanamsaValue
                     ? parseFloat(formData.customAyanamsaValue)
                     : undefined,
    nodeType:      formData.rahuNode === "true" ? "TRUE" : "MEAN",
  };

  const res = await fetch(`${API_BASE}/chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Chart request failed: ${res.status}`);
  }

  const data = await res.json();
  return normalizeResponse(data);
}
