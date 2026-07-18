// Ported directly from the Python backend (core/astro.py, core/kp.py,
// core/utils.py) so mock data in the UI is derived the same way the real
// API eventually will derive it, not just invented. Keep this in sync if
// the backend tables ever change.

export const RASHIS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const RASHI_LORDS = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const NAKSHATRA_LORD_CYCLE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const NAKSHATRA_LORDS = [...NAKSHATRA_LORD_CYCLE, ...NAKSHATRA_LORD_CYCLE, ...NAKSHATRA_LORD_CYCLE];

export const BASE_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
export const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const TOTAL = 120;
const NAKSHATRA_SIZE = 360 / 27;

export function getRashi(longitude) {
  const index = Math.floor((longitude % 360) / 30);
  const rashi = RASHIS[index];
  return { rashi, rashiLord: RASHI_LORDS[rashi] };
}

export function getNakshatra(longitude) {
  const lon = longitude % 360;
  const nakIndex = Math.floor(lon / NAKSHATRA_SIZE);
  return { nakshatra: NAKSHATRAS[nakIndex], nakshatraLord: NAKSHATRA_LORDS[nakIndex] };
}

export function getCharan(longitude) {
  const lon = longitude % 360;
  const nakFraction = (lon % NAKSHATRA_SIZE) / NAKSHATRA_SIZE;
  return Math.floor(nakFraction * 4) + 1;
}

function getKpSequence(lord) {
  const idx = BASE_SEQUENCE.indexOf(lord);
  return [...BASE_SEQUENCE.slice(idx), ...BASE_SEQUENCE.slice(0, idx)];
}

function getLordFromValue(value, sequence) {
  let cumulative = 0;
  for (const lord of sequence) {
    const years = DASHA_YEARS[lord];
    if (cumulative <= value && value < cumulative + years) {
      return { lord, cumulative, years };
    }
    cumulative += years;
  }
  const last = sequence[sequence.length - 1];
  return { lord: last, cumulative, years: DASHA_YEARS[last] };
}

// KP sub-lord cascade: sub, sub-sub, sub-sub-sub. Same recursive
// proportional split as core/kp.py: compute_kp_levels.
export function computeKpLevels(longitude, nakshatraLord) {
  const lon = longitude % 360;
  const nakIndex = Math.floor(lon / NAKSHATRA_SIZE);
  const nakStart = nakIndex * NAKSHATRA_SIZE;
  const offset = lon - nakStart;

  const level1Value = (offset / NAKSHATRA_SIZE) * TOTAL;
  const seq1 = getKpSequence(nakshatraLord);
  const { lord: sub, cumulative: cum1, years: yrs1 } = getLordFromValue(level1Value, seq1);

  const level2Value = ((level1Value - cum1) / yrs1) * TOTAL;
  const seq2 = getKpSequence(sub);
  const { lord: subSub, cumulative: cum2, years: yrs2 } = getLordFromValue(level2Value, seq2);

  const level3Value = ((level2Value - cum2) / yrs2) * TOTAL;
  const seq3 = getKpSequence(subSub);
  const { lord: subSubSub } = getLordFromValue(level3Value, seq3);

  return { subLord: sub, subSubLord: subSub, subSubSubLord: subSubSub };
}

// Sign-relative DMS string, matches core/utils.py: decimal_to_dms
export function decimalToDms(decimalDegree) {
  const lon = ((decimalDegree % 360) + 360) % 360;
  const degreeInSign = lon % 30;
  const degrees = Math.floor(degreeInSign);
  const minutesFull = (degreeInSign - degrees) * 60;
  const minutes = Math.floor(minutesFull);
  const seconds = (minutesFull - minutes) * 60;
  return `${String(degrees).padStart(2, "0")}° ${String(minutes).padStart(2, "0")}' ${seconds.toFixed(2).padStart(5, "0")}"`;
}

// Whole-sign house assignment, matches core/houses.py: assign_houses
export function getHouseForRashi(rashi, lagnaRashi) {
  const lagnaIndex = RASHIS.indexOf(lagnaRashi);
  const rashiIndex = RASHIS.indexOf(rashi);
  return ((rashiIndex - lagnaIndex + 12) % 12) + 1;
}

// Derives the full planet-row shape (matches core/planets.py /
// core/houses.py output dict) from just a longitude + lagna rashi.
export function deriveFullPlacement(planetName, longitude, lagnaRashi, retrograde = false) {
  const { rashi, rashiLord } = getRashi(longitude);
  const { nakshatra, nakshatraLord } = getNakshatra(longitude);
  const charan = getCharan(longitude);
  const { subLord, subSubLord, subSubSubLord } = computeKpLevels(longitude, nakshatraLord);
  return {
    planet: planetName,
    longitude,
    degree: decimalToDms(longitude),
    retrograde,
    rashi,
    rashiLord,
    nakshatra,
    nakshatraLord,
    charan,
    subLord,
    subSubLord,
    subSubSubLord,
    house: getHouseForRashi(rashi, lagnaRashi),
  };
}

// Derives a cusp row (matches core/cusps.py output) from a Placidus
// cusp longitude. The Placidus cusp *math* itself (swe.houses) can't be
// ported to the frontend without a full astronomy library — this just
// derives rashi/nakshatra/sub-lord from an already-known longitude, same
// as deriveFullPlacement does for planets.
export function deriveCusp(house, longitude) {
  const { rashi, rashiLord } = getRashi(longitude);
  const { nakshatra, nakshatraLord } = getNakshatra(longitude);
  const charan = getCharan(longitude);
  const { subLord, subSubLord, subSubSubLord } = computeKpLevels(longitude, nakshatraLord);
  return {
    house, longitude, degree: decimalToDms(longitude),
    rashi, rashiLord, nakshatra, nakshatraLord, charan,
    subLord, subSubLord, subSubSubLord,
  };
}

// Which Placidus house a longitude falls in, given the 12 cusp start
// longitudes (matches core/significators.py: assign_placidus_houses).
export function getPlacidusHouse(longitude, cuspLongitudes) {
  for (let i = 0; i < 12; i++) {
    const start = cuspLongitudes[i];
    const end = cuspLongitudes[(i + 1) % 12];
    const span = ((end - start) % 360 + 360) % 360;
    const offset = ((longitude - start) % 360 + 360) % 360;
    if (offset < span) return i + 1;
  }
  return null;
}

// KP 4-step significators per house — matches core/significators.py:
// calculate_significators exactly (same 4-group breakdown).
export function computeSignificators(placements, cusps) {
  return cusps.map((cusp) => {
    const houseNum = cusp.house;
    const owner = cusp.rashiLord;

    const occupants = placements
      .filter((p) => p.placidusHouse === houseNum)
      .map((p) => p.planet);

    const occupantStars = [...new Set(
      placements
        .filter((p) => occupants.includes(p.nakshatraLord) && !occupants.includes(p.planet))
        .map((p) => p.planet)
    )].sort();

    const ownerPlacement = placements.find((p) => p.planet === owner);
    const ownerStarLord = ownerPlacement ? ownerPlacement.nakshatraLord : null;

    const ownerStars = [...new Set(
      placements
        .filter((p) => ownerPlacement && p.nakshatraLord === owner && p.planet !== owner)
        .map((p) => p.planet)
    )].sort();

    return {
      house: houseNum,
      cuspRashi: cusp.rashi,
      owner,
      ownerStarLord,
      stepAStarOfOccupants: occupantStars,
      stepBOccupants: occupants,
      stepCStarOfOwner: ownerStars,
      stepDOwner: owner ? [owner] : [],
    };
  });
}

// Traditional 5 Ruling Planets — matches core/ruling_planets.py exactly.
const WEEKDAY_LORDS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export function getDayLord(birthDate) {
  return WEEKDAY_LORDS[birthDate.getDay()];
}

export function computeRulingPlanets(lagna, moon, birthDate) {
  return {
    lagnaLord: lagna.rashiLord,
    lagnaStarLord: lagna.nakshatraLord,
    rasiLord: moon.rashiLord,
    dayLord: getDayLord(birthDate),
    moonStarLord: moon.nakshatraLord,
  };
}
