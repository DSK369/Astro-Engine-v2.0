import { useLanguage } from "../lib/language";
import { translateTithiLabel, translateWeekday, translateNakshatra, translateYoga, translateKarana } from "../lib/i18n";
import "./PanchangDetails.css";

// Backend now returns each timed limb (tithi/nakshatra/yoga/karana) as an
// object with its own start/end -- Plan 1 §57's uniform timing interface
// -- rather than a bare name string. `end` is "YYYY-MM-DD HH:MM:SS"; only
// the HH:MM is surfaced here since the date is implied for a same-day
// reading and clutters the compact grid otherwise.
function endClock(dtStr) {
  if (!dtStr) return null;
  const time = dtStr.split(" ")[1];
  return time ? time.slice(0, 5) : null;
}

export default function PanchangDetails({ panchang }) {
  const { t, lang } = useLanguage();
  const items = [
    {
      label: t("panchangTithi"),
      value: translateTithiLabel(panchang.tithi.label, lang),
      end: endClock(panchang.tithi.end),
    },
    { label: t("panchangVar"), value: translateWeekday(panchang.vara.name, lang), end: null },
    {
      label: t("panchangNakshatra"),
      value: translateNakshatra(panchang.nakshatra.name, lang),
      end: endClock(panchang.nakshatra.end),
    },
    {
      label: t("panchangYog"),
      value: translateYoga(panchang.yoga.name, lang),
      end: endClock(panchang.yoga.end),
    },
    {
      label: t("panchangKarana"),
      value: translateKarana(panchang.karana.name, lang),
      end: endClock(panchang.karana.end),
    },
  ];

  return (
    <div className="panchang">
      {panchang._mock && (
        <p className="panchang__notice">
          Sample data — Panchang calculation isn&rsquo;t implemented in the
          backend yet.
        </p>
      )}
      <div className="panchang__grid">
        {items.map((item) => (
          <div className="panchang__item" key={item.label}>
            <span className="panchang__label">{item.label}</span>
            <span className="panchang__value">{item.value}</span>
            {item.end && (
              <span className="panchang__end">
                {t("panchangEnds")} {item.end}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
