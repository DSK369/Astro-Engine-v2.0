import { useLanguage } from "../lib/language";
import { translatePlanet, translateRashi, translateNakshatra } from "../lib/i18n";
import "./PlanetaryTable.css";

const COLUMNS = [
  { key: "planet", labelKey: "colPlanet", translate: translatePlanet },
  { key: "rashi", labelKey: "colRashi", translate: translateRashi },
  { key: "degree", labelKey: "colDegree" },
  { key: "house", labelKey: "colHouse" },
  { key: "nakshatra", labelKey: "colNakshatra", translate: translateNakshatra },
  { key: "nakshatraLord", labelKey: "colNakLord", translate: translatePlanet },
  { key: "charan", labelKey: "colCharan" },
  { key: "subLord", labelKey: "colSub", translate: translatePlanet },
  { key: "subSubLord", labelKey: "colSubSub", translate: translatePlanet },
  { key: "subSubSubLord", labelKey: "colSubSubSub", translate: translatePlanet },
];

// Shape here matches core/planets.py + core/houses.py output 1:1 (camelCase
// instead of snake_case) — see docs/API_SPECIFICATION.md's /chart response.
export default function PlanetaryTable({ placements }) {
  const { t, lang } = useLanguage();
  return (
    <div className="planetary-table-wrap">
      <table className="planetary-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>{t(col.labelKey)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {placements.map((p) => (
            <tr key={p.planet} className={p.planet === "Lagna" ? "planetary-table__lagna-row" : ""}>
              {COLUMNS.map((col) => (
                <td key={col.key} data-label={t(col.labelKey)}>
                  {col.key === "planet" ? (
                    <>
                      {translatePlanet(p.planet, lang)}
                      {p.retrograde && <span className="planetary-table__retro"> (R)</span>}
                    </>
                  ) : col.translate ? (
                    col.translate(p[col.key], lang)
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
