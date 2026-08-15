// Thin API client. Right now it resolves to fixture data (see
// data/mockChartData.js) because the backend has no HTTP layer yet
// (docs/API_SPECIFICATION.md is a proposal, not a live contract).
//
// Swap point: once FastAPI endpoints exist, replace the body of
// `fetchChart` with a real `fetch(...)` call matching the shape in
// API_SPECIFICATION.md — every component that calls `fetchChart` stays
// unchanged, since it only depends on this function's return shape.

import {
  ALL_PLACEMENTS, LAGNA, PLANETS, CUSPS, SIGNIFICATORS, RULING_PLANETS,
  MOCK_PANCHANG, SUMMARY,
} from "../data/mockChartData";

const USE_MOCK = false; // real FastAPI backend (astro-engine) running locally
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function fetchChart(birthData) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300)); // simulate latency
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

  const res = await fetch(`${API_BASE}/chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(birthData),
  });
  if (!res.ok) {
    throw new Error(`Chart request failed: ${res.status}`);
  }
  return res.json();
}
