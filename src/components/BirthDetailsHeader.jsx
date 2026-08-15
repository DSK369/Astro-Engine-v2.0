import { useLanguage } from "../lib/language";
import "./BirthDetailsHeader.css";

// Matches the birth-details strip at the top of a printed KP horoscope
// report (name / DOB / TOB / location / ayanamsa etc laid out as
// label-value pairs) rather than a form recap.
export default function BirthDetailsHeader({ formData }) {
  const { t } = useLanguage();
  const fullName = [formData.firstName, formData.fatherName, formData.lastName]
    .filter(Boolean)
    .join(" ");

  const items = [
    { label: t("birthName"), value: fullName || "—" },
    { label: t("birthDob"), value: formData.dob },
    { label: t("birthTob"), value: formData.tob },
    { label: t("birthPlace"), value: formData.location?.label },
    { label: t("birthLatLon"), value: formData.location ? `${formData.location.lat.toFixed(4)}°, ${formData.location.lon.toFixed(4)}°` : "—" },
    { label: t("birthTz"), value: formData.location?.tz },
    { label: t("birthAyanamsa"), value: formData.ayanamsa },
    { label: t("birthHouseSystem"), value: formData.houseSystem === "placidus_kp" ? t("houseSystemPlacidus") : t("houseSystemWholeSign") },
    { label: t("birthRahuKetu"), value: formData.rahuNode === "true" ? t("formTrue") : t("formMean") },
  ];

  return (
    <div className="birth-header">
      {items.map((item) => (
        <div className="birth-header__item" key={item.label}>
          <span className="birth-header__label">{item.label}</span>
          <span className="birth-header__value">{item.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}
