import "./PlanetaryTable.css";

const COLUMNS = [
  { key: "planet", label: "Planet" },
  { key: "rashi", label: "Rashi" },
  { key: "degree", label: "Degree" },
  { key: "house", label: "House" },
  { key: "nakshatra", label: "Nakshatra" },
  { key: "nakshatraLord", label: "Nak. Lord" },
  { key: "charan", label: "Charan" },
  { key: "subLord", label: "Sub" },
  { key: "subSubLord", label: "Sub-Sub" },
  { key: "subSubSubLord", label: "Sub-Sub-Sub" },
];

// Shape here matches core/planets.py + core/houses.py output 1:1 (camelCase
// instead of snake_case) — see docs/API_SPECIFICATION.md's /chart response.
export default function PlanetaryTable({ placements }) {
  return (
    <div className="planetary-table-wrap">
      <table className="planetary-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {placements.map((p) => (
            <tr key={p.planet} className={p.planet === "Lagna" ? "planetary-table__lagna-row" : ""}>
              {COLUMNS.map((col) => (
                <td key={col.key} data-label={col.label}>
                  {col.key === "planet" ? (
                    <>
                      {p.planet}
                      {p.retrograde && <span className="planetary-table__retro"> (R)</span>}
                    </>
                  ) : (
                    p[col.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
