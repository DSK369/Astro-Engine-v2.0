import "./PanchangDetails.css";

// Panchang is NOT implemented in the backend yet (see
// docs/KNOWN_LIMITATIONS.md — Phase 5, not started). This renders
// whatever `panchang` shape the caller provides so it's a no-op to wire
// up real data later; the `_mock` flag just controls the banner below.
export default function PanchangDetails({ panchang }) {
  const items = [
    { label: "Tithi", value: panchang.tithi },
    { label: "Var (Day)", value: panchang.var },
    { label: "Nakshatra", value: panchang.nakshatra },
    { label: "Yog", value: panchang.yog },
    { label: "Karana", value: panchang.karana },
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
          </div>
        ))}
      </div>
    </div>
  );
}
