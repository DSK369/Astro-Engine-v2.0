import { useLanguage } from "../lib/language";
import { translatePlanet } from "../lib/i18n";
import "./DashaPanel.css";

// Vimshottari Dasha — the five-level chain active right now, plus the
// full Mahadasha timeline.
//
// Backend sends datetimes as plain "YYYY-MM-DD HH:MM:SS" strings that are
// local to the birthplace, deliberately without a timezone offset. They
// are sliced here rather than passed through `new Date()`, which would
// re-interpret them in the browser's own zone and shift every boundary.
const LEVELS = [
  ["mahadasha", "dashaMahadasha"],
  ["antardasha", "dashaAntardasha"],
  ["pratyantardasha", "dashaPratyantardasha"],
  ["sookshma", "dashaSookshma"],
  ["prana", "dashaPrana"],
];

const datePart = (s) => (s ? s.slice(0, 10) : "—");
const timePart = (s) => (s ? s.slice(11, 16) : "");

// Prana periods run to hours, so showing only a date would collapse the
// whole level to one repeated value. Show the clock time once periods
// get short enough for it to mean something.
function span(p, withTime) {
  const fmt = (s) => (withTime ? `${datePart(s)} ${timePart(s)}` : datePart(s));
  return `${fmt(p.start)} → ${fmt(p.end)}`;
}

export default function DashaPanel({ dasha }) {
  const { t, lang } = useLanguage();
  if (!dasha) return null;

  const { balance, current, timeline } = dasha;

  return (
    <div className="dasha">
      <div className="dasha__meta">
        <span>
          {t("dashaBalanceAtBirth")}:{" "}
          <strong>
            {translatePlanet(balance.lord, lang)} {balance.y}y {balance.m}m {balance.d}d
          </strong>
        </span>
        <span className="dasha__asof">
          {t("dashaRunningOn")} {datePart(dasha.asOf)}
        </span>
      </div>

      <h3 className="dasha__subhead">{t("dashaCurrentChain")}</h3>
      <ol className="dasha__chain">
        {LEVELS.map(([key, labelKey], i) => {
          const p = current[key];
          if (!p) return null;
          return (
            <li className="dasha__level" key={key} style={{ "--depth": i }}>
              <span className="dasha__level-name">{t(labelKey)}</span>
              <span className="dasha__level-lord">{translatePlanet(p.lord, lang)}</span>
              <span className="dasha__level-span">{span(p, i >= 2)}</span>
            </li>
          );
        })}
      </ol>

      <h3 className="dasha__subhead">{t("dashaTimeline")}</h3>
      <div className="dasha__table-wrap">
        <table className="dasha__table">
          <thead>
            <tr>
              <th>{t("dashaLord")}</th>
              <th>{t("dashaStart")}</th>
              <th>{t("dashaEnd")}</th>
              <th>{t("dashaYears")}</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((p) => (
              <tr
                key={`${p.lord}-${p.start}`}
                className={p.lord === current.mahadasha.lord && p.start === current.mahadasha.start
                  ? "dasha__row--current"
                  : ""}
              >
                <td data-label={t("dashaLord")}>{translatePlanet(p.lord, lang)}</td>
                <td data-label={t("dashaStart")}>{datePart(p.start)}</td>
                <td data-label={t("dashaEnd")}>{datePart(p.end)}</td>
                <td data-label={t("dashaYears")}>{p.years.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
