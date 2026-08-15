import { getHouseLayout, getSkeletonLines } from "../../lib/chartGeometry";
import { RASHIS } from "../../lib/vedicTables";
import { fitLabelBlock } from "../../lib/labelFit";
import { useLanguage } from "../../lib/language";
import { planetAbbr, retroMark } from "../../lib/i18n";
import "./charts.css";

const SIZE = 400;
const PADDING = 20;

function planetLabel(p, lang) {
  return `${planetAbbr(p.planet, lang)}${p.retrograde ? retroMark(lang) : ""}`;
}

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
  const { lang } = useLanguage();
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

        {Object.entries(layout).map(([house, { contentPoly, center }]) => {
          const houseNum = Number(house);
          const occupants = grouped[houseNum] || [];
          const rashiNumber = lagnaRashi ? getRashiNumberForHouse(houseNum, lagnaRashi) : houseNum;
          const labels = occupants.map((p) => planetLabel(p, lang));
          const fit = fitLabelBlock(contentPoly, center, String(rashiNumber), labels);

          return (
            <g key={house}>
              <text
                x={fit.headerX}
                y={fit.headerY}
                textAnchor="middle"
                style={{ fontSize: fit.fontSize }}
                className="astro-chart__house-number"
              >
                {rashiNumber}
              </text>
              {occupants.map((p, i) => (
                <text
                  key={p.planet}
                  x={fit.positions[i].x}
                  y={fit.positions[i].y}
                  textAnchor="middle"
                  style={{ fontSize: fit.fontSize }}
                  className={`astro-chart__planet${p.retrograde ? " astro-chart__planet--retro" : ""}${p.planet === "Lagna" ? " astro-chart__planet--lagna" : ""}`}
                >
                  {planetLabel(p, lang)}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
