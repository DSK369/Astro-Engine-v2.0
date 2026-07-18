import "./RulingPlanetsStrip.css";

// Matches the "Lagna Lord / Lag. Star L. / Rasi Lord / Day Lord / Moon
// Star L." strip from the reference report. Validated exactly against a
// real Kismat printout for the sample chart (see core/ruling_planets.py).
export default function RulingPlanetsStrip({ rulingPlanets }) {
  const items = [
    { label: "Lagna Lord", value: rulingPlanets.lagnaLord },
    { label: "Lagna Star Lord", value: rulingPlanets.lagnaStarLord },
    { label: "Rasi Lord", value: rulingPlanets.rasiLord },
    { label: "Day Lord", value: rulingPlanets.dayLord },
    { label: "Moon Star Lord", value: rulingPlanets.moonStarLord },
  ];

  return (
    <div className="ruling-strip">
      {items.map((item) => (
        <div className="ruling-strip__item" key={item.label}>
          <span className="ruling-strip__label">{item.label}</span>
          <span className="ruling-strip__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
