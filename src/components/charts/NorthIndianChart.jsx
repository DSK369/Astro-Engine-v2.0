import { getHouseLayout, getSkeletonLines } from "../../lib/chartGeometry";
import { RASHIS } from "../../lib/vedicTables";
import "./charts.css";

const SIZE = 400;
const PADDING = 20;

const PLANET_ABBR = {
  Lagna: "As", Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

function groupByHouse(placements) {
  const grouped = {};
  for (const p of placements) {
    if (!grouped[p.house]) grouped[p.house] = [];
    grouped[p.house].push(p);
  }
  return grouped;
}

// Real KP/Vedic software prints the RASHI number (1=Aries..12=Pisces) in
// each box, not a sequential "house 1, house 2..." label — the box that
// happens to hold the Lagna's rashi number is what makes it "house 1"
// positionally. Verified against a real Kismat printout: Lagna in
// Capricorn (rashi 10) shows "10" in the house-1 box. See
// docs/PROJECT_CONTEXT.md for the full derivation.
function getRashiNumberForHouse(houseNum, lagnaRashi) {
  const lagnaIndex = RASHIS.indexOf(lagnaRashi);
  return ((lagnaIndex + houseNum - 1) % 12) + 1;
}

export default function NorthIndianChart({ placements = [] }) {
  const layout = getHouseLayout(SIZE);
  const lines = getSkeletonLines(SIZE);
  const grouped = groupByHouse(placements);
  const total = SIZE + PADDING * 2;
  const lagnaRashi = placements.find((p) => p.planet === "Lagna")?.rashi;

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      className="astro-chart"
      role="img"
      aria-label="North Indian style birth chart"
    >
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        <rect x="0" y="0" width={SIZE} height={SIZE} className="astro-chart__bg" rx="4" />
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="astro-chart__line" />
        ))}

        {Object.entries(layout).map(([house, { labelX, labelY, planetsY }]) => {
          const houseNum = Number(house);
          const occupants = grouped[houseNum] || [];
          const rashiNumber = lagnaRashi ? getRashiNumberForHouse(houseNum, lagnaRashi) : houseNum;
          return (
            <g key={house}>
              <text x={labelX} y={labelY} className="astro-chart__house-number" textAnchor="middle">
                {rashiNumber}
              </text>
              {occupants.map((p, i) => (
                <text
                  key={p.planet}
                  x={labelX}
                  y={planetsY + i * 15}
                  textAnchor="middle"
                  className={`astro-chart__planet${p.retrograde ? " astro-chart__planet--retro" : ""}${p.planet === "Lagna" ? " astro-chart__planet--lagna" : ""}`}
                >
                  {PLANET_ABBR[p.planet] || p.planet.slice(0, 2)}
                  {p.retrograde ? "(R)" : ""}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
