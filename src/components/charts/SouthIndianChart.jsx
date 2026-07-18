import { getSignCellMap } from "../../lib/southIndianGrid";
import "./charts.css";

const SIZE = 400;
const PADDING = 20;
const CELL = SIZE / 4;

const PLANET_ABBR = {
  Lagna: "As", Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

const RASHI_ABBR = {
  Aries: "Ar", Taurus: "Ta", Gemini: "Ge", Cancer: "Cn", Leo: "Le", Virgo: "Vi",
  Libra: "Li", Scorpio: "Sc", Sagittarius: "Sg", Capricorn: "Cp", Aquarius: "Aq", Pisces: "Pi",
};

// The 12 outer cells of the 4x4 grid (row, col), skipping the empty
// center 2x2 block.
const OUTER_CELLS = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    const isCenter = r > 0 && r < 3 && c > 0 && c < 3;
    if (!isCenter) OUTER_CELLS.push([r, c]);
  }
}

function groupByRashi(placements) {
  const grouped = {};
  for (const p of placements) {
    if (!grouped[p.rashi]) grouped[p.rashi] = [];
    grouped[p.rashi].push(p);
  }
  return grouped;
}

export default function SouthIndianChart({ placements = [] }) {
  const signCells = getSignCellMap();
  const grouped = groupByRashi(placements);
  const lagna = placements.find((p) => p.planet === "Lagna");
  const total = SIZE + PADDING * 2;

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      className="astro-chart"
      role="img"
      aria-label="South Indian style birth chart"
    >
      <g transform={`translate(${PADDING}, ${PADDING})`}>
        <rect x="0" y="0" width={SIZE} height={SIZE} className="astro-chart__bg" rx="4" />

        {OUTER_CELLS.map(([r, c]) => (
          <rect
            key={`${r}-${c}`}
            x={c * CELL}
            y={r * CELL}
            width={CELL}
            height={CELL}
            className="astro-chart__line"
            fill="none"
          />
        ))}

        {Object.entries(signCells).map(([rashi, { row, col }]) => {
          const cx = col * CELL + CELL / 2;
          const topY = row * CELL + 18;
          const occupants = grouped[rashi] || [];
          const isLagnaSign = lagna?.rashi === rashi;
          return (
            <g key={rashi}>
              <text x={col * CELL + 6} y={row * CELL + 14} className="astro-chart__sign-label">
                {RASHI_ABBR[rashi]}
              </text>
              {isLagnaSign && (
                <text x={cx} y={topY} textAnchor="middle" className="astro-chart__planet astro-chart__planet--lagna">
                  Asc
                </text>
              )}
              {occupants.map((p, i) => (
                <text
                  key={p.planet}
                  x={cx}
                  y={topY + (isLagnaSign ? 15 : 0) + i * 15 + 15}
                  textAnchor="middle"
                  className={`astro-chart__planet${p.retrograde ? " astro-chart__planet--retro" : ""}`}
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
