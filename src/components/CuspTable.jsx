import { useLanguage } from "../lib/language";
import { translatePlanet, translateRashi, translateNakshatra } from "../lib/i18n";
import "./PlanetaryTable.css"; // shared dense-table styling

const COLUMNS = [
  { key: "house", labelKey: "colCusp" },
  { key: "rashi", labelKey: "colRashi", translate: translateRashi },
  { key: "degree", labelKey: "colDegree" },
  { key: "nakshatra", labelKey: "colNakshatra", translate: translateNakshatra },
  { key: "nakshatraLord", labelKey: "colNakLord", translate: translatePlanet },
  { key: "subLord", labelKey: "colSub", translate: translatePlanet },
  { key: "subSubLord", labelKey: "colSubSub", translate: translatePlanet },
  { key: "subSubSubLord", labelKey: "colSubSubSub", translate: translatePlanet },
];

// Placidus house cusps — matches core/cusps.py output. KP methodology
// depends on cuspal sub-lords for event timing, distinct from planet
// positions (see PlanetaryTable).
export default function CuspTable({ cusps }) {
  const { t, lang } = useLanguage();
  return (
    <div className="planetary-table-wrap">
      <table className="planetary-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => <th key={col.key}>{t(col.labelKey)}</th>)}
          </tr>
        </thead>
        <tbody>
          {cusps.map((c) => (
            <tr key={c.house}>
              {COLUMNS.map((col) => (
                <td key={col.key} data-label={t(col.labelKey)}>
                  {col.translate ? col.translate(c[col.key], lang) : c[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
