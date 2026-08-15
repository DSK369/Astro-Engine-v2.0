import { useLanguage } from "../lib/language";
import "./SunMoonPanel.css";

// Local sunrise/sunset/moonrise/moonset for the birth date and place.
// These are the inputs the Muhurta layer (Hora, Choghadiya, Rahu Kalam,
// Abhijit …) will be built on, so they are surfaced now rather than kept
// internal.

function hours(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function SunMoonPanel({ riseSet }) {
  const { t } = useLanguage();
  if (!riseSet) return null;

  const dash = t("doesNotOccur");
  const items = [
    { label: t("sunSunrise"), value: riseSet.sunrise },
    { label: t("sunSolarNoon"), value: riseSet.solarNoon },
    { label: t("sunSunset"), value: riseSet.sunset },
    { label: t("moonMoonrise"), value: riseSet.moonrise },
    { label: t("moonMoonset"), value: riseSet.moonset },
    { label: t("dayLength"), value: hours(riseSet.daySeconds) },
    { label: t("nightLength"), value: hours(riseSet.nightSeconds) },
  ];

  return (
    <div className="sunmoon">
      {riseSet.circumpolar && (
        <p className="sunmoon__notice" role="note">{t("circumpolarNote")}</p>
      )}
      <div className="sunmoon__grid">
        {items.map((item) => (
          <div className="sunmoon__item" key={item.label}>
            <span className="sunmoon__label">{item.label}</span>
            <span className={`sunmoon__value${item.value ? "" : " sunmoon__value--absent"}`}>
              {item.value || dash}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
