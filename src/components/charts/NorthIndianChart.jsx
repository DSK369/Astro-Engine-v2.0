import { useState } from "react";
import {
  getHouseLayout,
  getPlanetLabelMetrics,
  getSkeletonLines,
} from "../../lib/chartGeometry";
import { RASHIS } from "../../lib/vedicTables";
import "./charts.css";

const SIZE = 400;
const PADDING = 24;

const PLANET_ABBR = {
  Lagna: "As", Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
  Uranus: "Ur", Neptune: "Ne", Pluto: "Pl",
};

function groupByHouse(placements) {
  return placements.reduce((grouped, placement) => {
    const house = placement.house;
    if (!grouped[house]) grouped[house] = [];
    grouped[house].push(placement);
    return grouped;
  }, {});
}

function getRashiNumberForHouse(houseNum, lagnaRashi) {
  const lagnaIndex = RASHIS.indexOf(lagnaRashi);
  return ((lagnaIndex + houseNum - 1) % 12) + 1;
}

function compactDegree(degree) {
  const [wholeDegrees] = String(degree ?? "").match(/\d+/) ?? [];
  return wholeDegrees ? `${wholeDegrees.padStart(2, "0")}°` : "";
}

function PlanetDetail({ placement, onClose }) {
  if (!placement) return null;

  return (
    <aside className="chart-detail" aria-live="polite">
      <div>
        <p className="chart-detail__eyebrow">House {placement.house}</p>
        <h3>{placement.planet}</h3>
      </div>
      <dl className="chart-detail__facts">
        <div><dt>Sign</dt><dd>{placement.rashi}</dd></div>
        <div><dt>Degree</dt><dd>{placement.degree}</dd></div>
        <div><dt>Nakshatra</dt><dd>{placement.nakshatra}</dd></div>
        <div><dt>Status</dt><dd>{placement.retrograde ? "Retrograde" : "Direct"}</dd></div>
      </dl>
      <button type="button" className="chart-detail__close" onClick={onClose} aria-label="Close planet details">
        Close
      </button>
    </aside>
  );
}

// Each SVG label is positioned from a candidate sampled inside an inset version
// of its assigned house polygon. This keeps multi-planet labels bounded by the
// same geometry that draws the chart rather than relying on arbitrary offsets.
export default function NorthIndianChart({ placements = [] }) {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const layout = getHouseLayout(SIZE);
  const lines = getSkeletonLines(SIZE);
  const grouped = groupByHouse(placements);
  const total = SIZE + PADDING * 2;
  const lagnaRashi = placements.find((placement) => placement.planet === "Lagna")?.rashi;
  const selected = placements.find((placement) => placement.planet === selectedPlanet) ?? null;
  const selectedHouse = selected?.house;

  return (
    <div className="kundli-chart">
      <svg
        viewBox={`0 0 ${total} ${total}`}
        className="astro-chart astro-chart--north"
        role="img"
        aria-label="Interactive North Indian style birth chart"
      >
        <g transform={`translate(${PADDING}, ${PADDING})`}>
          <rect x="0" y="0" width={SIZE} height={SIZE} className="astro-chart__bg" rx="3" />
          {Object.entries(layout).map(([house, houseLayout]) => (
            <polygon
              key={`house-${house}`}
              points={houseLayout.pointsAttr}
              className={`astro-chart__house${Number(house) === selectedHouse ? " astro-chart__house--selected" : ""}`}
            />
          ))}
          {lines.map((line, index) => (
            <line key={index} {...line} className="astro-chart__line" />
          ))}

          {Object.entries(layout).map(([house, houseLayout]) => {
            const houseNum = Number(house);
            const occupants = grouped[houseNum] ?? [];
            const metrics = getPlanetLabelMetrics(occupants.length);
            const slots = houseLayout.planetSlots(occupants.length, metrics);
            const rashiNumber = lagnaRashi ? getRashiNumberForHouse(houseNum, lagnaRashi) : houseNum;

            return (
              <g key={house}>
                <text
                  x={houseLayout.labelX}
                  y={houseLayout.labelY}
                  className="astro-chart__house-number"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {rashiNumber}
                </text>
                {occupants.map((placement, index) => {
                  const [x, y] = slots[index] ?? [houseLayout.labelX, houseLayout.labelY];
                  const isSelected = placement.planet === selectedPlanet;
                  return (
                    <g
                      key={placement.planet}
                      className={`astro-chart__planet-label${isSelected ? " astro-chart__planet-label--selected" : ""}`}
                      role="button"
                      tabIndex="0"
                      aria-label={`Show ${placement.planet} details`}
                      onClick={() => setSelectedPlanet(placement.planet)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedPlanet(placement.planet);
                        }
                      }}
                    >
                      <rect
                        x={x - metrics.width / 2}
                        y={y - metrics.height / 2}
                        width={metrics.width}
                        height={metrics.height}
                        rx="3"
                      />
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: metrics.fontSize }}>
                        {PLANET_ABBR[placement.planet] ?? placement.planet.slice(0, 2)}
                        {metrics.showDegree ? ` ${compactDegree(placement.degree)}` : ""}
                        {placement.retrograde ? " R" : ""}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
      <PlanetDetail placement={selected} onClose={() => setSelectedPlanet(null)} />
    </div>
  );
}
