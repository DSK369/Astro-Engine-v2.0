import { getSignCellMap } from "../../lib/southIndianGrid";
import { fitLabelBlock } from "../../lib/labelFit";
import { useLanguage } from "../../lib/language";
import { planetAbbr, rashiAbbr, retroMark, ascLabel } from "../../lib/i18n";
import "./charts.css";

const SIZE = 400;
const PADDING = 20;
const CELL = SIZE / 4;

// Content area of a cell: inset so the block clears the cell border and
// the sign abbreviation printed in the cell's top-left corner.
const CELL_INSET = 4;
const SIGN_LABEL_BAND = 16;

function cellPolygon(row, col) {
  const x0 = col * CELL + CELL_INSET;
  const x1 = (col + 1) * CELL - CELL_INSET;
  const y0 = row * CELL + SIGN_LABEL_BAND;
  const y1 = (row + 1) * CELL - CELL_INSET;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

function planetLabel(p, lang) {
  return `${planetAbbr(p.planet, lang)}${p.retrograde ? retroMark(lang) : ""}`;
}

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
  const { lang } = useLanguage();
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
          const occupants = grouped[rashi] || [];
          const isLagnaSign = lagna?.rashi === rashi;
          const poly = cellPolygon(row, col);
          const center = [(poly[0][0] + poly[1][0]) / 2, (poly[0][1] + poly[2][1]) / 2];
          const labels = occupants.map((p) => planetLabel(p, lang));
          const fit = fitLabelBlock(poly, center, isLagnaSign ? ascLabel(lang) : null, labels);

          return (
            <g key={rashi}>
              <text x={col * CELL + 6} y={row * CELL + 14} className="astro-chart__sign-label">
                {rashiAbbr(rashi, lang)}
              </text>
              {isLagnaSign && (
                <text
                  x={fit.headerX}
                  y={fit.headerY}
                  textAnchor="middle"
                  style={{ fontSize: fit.fontSize }}
                  className="astro-chart__planet astro-chart__planet--lagna"
                >
                  {ascLabel(lang)}
                </text>
              )}
              {occupants.map((p, i) => (
                <text
                  key={p.planet}
                  x={fit.positions[i].x}
                  y={fit.positions[i].y}
                  textAnchor="middle"
                  style={{ fontSize: fit.fontSize }}
                  className={`astro-chart__planet${p.retrograde ? " astro-chart__planet--retro" : ""}`}
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
