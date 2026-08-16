import { useLanguage } from "../lib/language";
import "./SunMoonPanel.css";
import "./CalendarPanel.css";

// Lunar/solar calendar (Plan 1 Astro Engine.md Phase 3): Amanta/
// Purnimanta lunar month + Adhika Masa, solar month, Ritu, Ayana, next
// Sankranti. See backend/core/calendar.py and Plan 1 Implementation.md
// §13 for what's verified and what's deliberately not implemented
// (Kshaya Masa).

export default function CalendarPanel({ calendar }) {
  const { t } = useLanguage();
  if (!calendar) return null;

  const { amanta, purnimanta } = calendar.lunarMonth;

  const monthLabel = (m) => (m.isAdhika ? `${m.name} (${t("calendarAdhika")})` : m.name);

  const items = [
    { label: t("calendarAmantaMonth"), value: monthLabel(amanta) },
    { label: t("calendarPurnimantaMonth"), value: monthLabel(purnimanta) },
    { label: t("calendarSolarMonth"), value: calendar.solarMonth.name },
    { label: t("calendarRitu"), value: t(`ritu_${calendar.ritu}`) },
    { label: t("calendarAyana"), value: t(`ayana_${calendar.ayana}`) },
    {
      label: t("calendarNextSankranti"),
      value: `${calendar.nextSankranti.fromRashi} → ${calendar.nextSankranti.toRashi}, ${calendar.nextSankranti.at}`,
    },
  ];

  return (
    <div className="sunmoon">
      <div className="sunmoon__grid calendar-panel__grid">
        {items.map((item) => (
          <div className="sunmoon__item" key={item.label}>
            <span className="sunmoon__label">{item.label}</span>
            <span className="sunmoon__value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
