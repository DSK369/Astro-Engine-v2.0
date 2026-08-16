import { useLanguage } from "../lib/language";
import "./BirthDetailsHeader.css";

// Same label-value strip layout as BirthDetailsHeader, but for a horary
// chart's own identifying facts (the matched moment and KP zone) instead
// of birth details -- there is no "birth" for a Prasna chart.
export default function HoraryResultHeader({ horary }) {
  const { t } = useLanguage();
  const matched = new Date(horary.matchedDateTime);

  const items = [
    { label: t("horaryNumber"), value: horary.horaryNumber },
    { label: t("horaryMatchedMoment"), value: matched.toLocaleString() },
    { label: t("horaryZoneSign"), value: horary.horaryZone.sign },
    { label: t("horaryZoneNakshatra"), value: horary.horaryZone.nakshatra },
    { label: t("horaryZoneSubLord"), value: horary.horaryZone.subLord },
    { label: t("horaryZoneRange"), value: `${horary.horaryZone.fromDeg.toFixed(4)}° – ${horary.horaryZone.toDeg.toFixed(4)}°` },
  ];

  return (
    <div className="birth-header">
      {items.map((item) => (
        <div className="birth-header__item" key={item.label}>
          <span className="birth-header__label">{item.label}</span>
          <span className="birth-header__value">{item.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
