import "./PlanetaryTable.css"; // shared dense-table styling

const COLUMNS = [
  { key: "house", label: "Cusp" },
  { key: "rashi", label: "Rashi" },
  { key: "degree", label: "Degree" },
  { key: "nakshatra", label: "Nakshatra" },
  { key: "nakshatraLord", label: "Nak. Lord" },
  { key: "subLord", label: "Sub" },
  { key: "subSubLord", label: "Sub-Sub" },
  { key: "subSubSubLord", label: "Sub-Sub-Sub" },
];

// Placidus house cusps — matches core/cusps.py output. KP methodology
// depends on cuspal sub-lords for event timing, distinct from planet
// positions (see PlanetaryTable).
export default function CuspTable({ cusps }) {
  return (
    <div className="planetary-table-wrap">
      <table className="planetary-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {cusps.map((c) => (
            <tr key={c.house}>
              {COLUMNS.map((col) => (
                <td key={col.key} data-label={col.label}>{c[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
