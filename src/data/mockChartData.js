// Mock chart data — the backend has no HTTP API yet (see
// docs/API_SPECIFICATION.md, "proposed, not implemented"), so this UI
// renders against fixture data with the exact same shape `core/`
// already produces. Swapping this for `lib/api.js` real calls later
// should not require touching any component.
//
// Unlike the previous version of this file, these are REAL longitudes —
// pulled from an actual `core/` run (CUSTOM_KP ayanamsa, Solapur,
// 1998-12-20 09:20 IST — the same sample chart `main.py` uses) and cross
// -checked against a real Kismat KP-software printout for this exact
// chart (see docs/PROJECT_CONTEXT.md). Every derived field (rashi,
// nakshatra, sub-lords, house, significators) is computed through the
// same logic as the Python backend, via lib/vedicTables.js.

import {
  deriveFullPlacement,
  deriveCusp,
  getRashi,
  getPlacidusHouse,
  computeSignificators,
  computeRulingPlanets,
  RASHIS,
} from "../lib/vedicTables";

const BIRTH_DATE = new Date(1998, 11, 20, 9, 20, 0); // months are 0-indexed

const LAGNA_LONGITUDE = 279.3521146934702; // Capricorn

const PLANET_LONGITUDES = [
  { name: "Sun", longitude: 244.20478393872477 },
  { name: "Moon", longitude: 258.03466806348615 },
  { name: "Mercury", longitude: 222.6707408059527 },
  { name: "Venus", longitude: 256.6907828411193 },
  { name: "Mars", longitude: 168.51372783578017 },
  { name: "Jupiter", longitude: 326.5409809329896 },
  { name: "Saturn", longitude: 3.0131226621156713, retrograde: true },
  { name: "Rahu", longitude: 121.18494843230529, retrograde: true },
  { name: "Ketu", longitude: 301.1849484323053, retrograde: true },
];

const CUSP_LONGITUDES = [
  279.3521146934702, 314.68258663173964, 349.75763426404336, 20.56260827510366,
  47.194663907502424, 72.30182587732922, 99.35211469347023, 134.68258663173972,
  169.75763426404336, 200.56260827510366, 227.19466390750242, 252.3018258773292,
];

// Lagna's own house is always 1 by definition.
const lagnaRashi = getRashi(LAGNA_LONGITUDE).rashi;
export const LAGNA = { ...deriveFullPlacement("Lagna", LAGNA_LONGITUDE, lagnaRashi), house: 1 };

export const PLANETS = PLANET_LONGITUDES.map(({ name, longitude, retrograde }) =>
  deriveFullPlacement(name, longitude, lagnaRashi, !!retrograde)
);

export const ALL_PLACEMENTS = [LAGNA, ...PLANETS];

export const CUSPS = CUSP_LONGITUDES.map((lon, i) => deriveCusp(i + 1, lon));

// Placidus house differs from the Whole-Sign `house` field above — used
// specifically for significators, same distinction core/significators.py
// draws.
const placementsWithPlacidusHouse = ALL_PLACEMENTS.map((p) => ({
  ...p,
  placidusHouse: getPlacidusHouse(p.longitude, CUSP_LONGITUDES),
}));

export const SIGNIFICATORS = computeSignificators(placementsWithPlacidusHouse, CUSPS);

const moon = PLANETS.find((p) => p.planet === "Moon");

export const RULING_PLANETS = computeRulingPlanets(LAGNA, moon, BIRTH_DATE);

// Only used when USE_MOCK is flipped on in lib/api.js (the real backend
// is live by default). These specific values are real, though — read
// directly off the printed horoscope report for this exact chart, not
// invented, and cross-checked against a live /chart response for the same
// birth data. Nakshatra matches Moon's derived value above, confirming
// consistency. Start/end are omitted here (unlike the real API's
// boundary-solved timing) since this fixture predates that feature and a
// static mock has no live Julian Day to solve against; PanchangDetails
// simply shows no "Ends" line when a limb has no `end`.
export const MOCK_PANCHANG = {
  tithi: { number: 2, paksha: "Shukla", name: "Dwitiya", label: "Shukla 2 (Dwitiya)" },
  vara: { index: 1, name: "Sunday", lord: "Sun" },
  nakshatra: { name: moon.nakshatra, lord: moon.nakshatraLord, pada: moon.charan },
  yoga: { name: "Vriddhi" },
  karana: { name: "Balava" },
  _mock: true,
};

export const SUMMARY = {
  lagnaRashi: LAGNA.rashi,
  moonRashi: moon.rashi,
  moonNakshatra: moon.nakshatra,
  moonCharan: moon.charan,
};

export { RASHIS };
