// South Indian chart: unlike North Indian, signs are FIXED to grid cells
// and houses rotate with the Lagna. Standard 4x4 grid, 12 outer cells used
// (center 2x2 is empty/used for a title), signs placed clockwise from
// Pisces at top-left, Aries at (row 0, col 1).

export const RASHIS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// [row, col] for each rashi index (0=Aries .. 11=Pisces), on a 4x4 grid.
const GRID_CLOCKWISE = [
  [0, 0], [0, 1], [0, 2], [0, 3],
  [1, 3], [2, 3], [3, 3], [3, 2],
  [3, 1], [3, 0], [2, 0], [1, 0],
];
// Position 0 above = Pisces' cell; Aries sits one step clockwise from it.
const PISCES_INDEX = 11;

export function getSignCellMap() {
  // rashi name -> {row, col}
  const map = {};
  for (let i = 0; i < 12; i++) {
    const rashiIndex = (PISCES_INDEX + 1 + i) % 12; // Aries, Taurus, ...
    const [row, col] = GRID_CLOCKWISE[i];
    map[RASHIS[rashiIndex]] = { row, col };
  }
  return map;
}

export function getHouseForRashi(rashi, lagnaRashi) {
  const lagnaIdx = RASHIS.indexOf(lagnaRashi);
  const rashiIdx = RASHIS.indexOf(rashi);
  return ((rashiIdx - lagnaIdx + 12) % 12) + 1;
}
