import "./ResultsSummary.css";

// "Rashi" here means Moon Rashi (the conventional meaning in Vedic
// astrology — your Moon sign), distinct from Lagna Rashi (Ascendant sign).
export default function ResultsSummary({ summary }) {
  const items = [
    { label: "Lagna Rashi", value: summary.lagnaRashi },
    { label: "Rashi (Moon Sign)", value: summary.moonRashi },
    { label: "Nakshatra", value: summary.moonNakshatra },
    { label: "Charan", value: summary.moonCharan },
  ];

  return (
    <div className="results-summary">
      {items.map((item) => (
        <div className="results-summary__item" key={item.label}>
          <span className="results-summary__label">{item.label}</span>
          <span className="results-summary__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
