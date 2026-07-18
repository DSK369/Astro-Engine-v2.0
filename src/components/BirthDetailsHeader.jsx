import "./BirthDetailsHeader.css";

// Matches the birth-details strip at the top of a printed KP horoscope
// report (name / DOB / TOB / location / ayanamsa etc laid out as
// label-value pairs) rather than a form recap.
export default function BirthDetailsHeader({ formData }) {
  const fullName = [formData.firstName, formData.fatherName, formData.lastName]
    .filter(Boolean)
    .join(" ");

  const items = [
    { label: "Name", value: fullName || "—" },
    { label: "Date of Birth", value: formData.dob },
    { label: "Time of Birth", value: formData.tob },
    { label: "Place of Birth", value: formData.location?.label },
    { label: "Latitude / Longitude", value: formData.location ? `${formData.location.lat.toFixed(4)}°, ${formData.location.lon.toFixed(4)}°` : "—" },
    { label: "Timezone", value: formData.location?.tz },
    { label: "Ayanamsa", value: formData.ayanamsa },
    { label: "House System", value: formData.houseSystem === "placidus_kp" ? "KP (Placidus)" : "Vedic (Whole Sign)" },
    { label: "Rahu/Ketu Node", value: formData.rahuNode === "true" ? "True" : "Mean" },
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
