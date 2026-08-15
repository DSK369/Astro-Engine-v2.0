import { useLanguage } from "../lib/language";
import { translatePlanet } from "../lib/i18n";
import "./RulingPlanetsStrip.css";

// Matches the "Lagna Lord / Lag. Star L. / Rasi Lord / Day Lord / Moon
// Star L." strip from the reference report. Validated exactly against a
// real Kismat printout for the sample chart (see core/ruling_planets.py).
export default function RulingPlanetsStrip({ rulingPlanets }) {
  const { t, lang } = useLanguage();
  const items = [
    { label: t("rulingLagnaLord"), value: translatePlanet(rulingPlanets.lagnaLord, lang) },
    { label: t("rulingLagnaStarLord"), value: translatePlanet(rulingPlanets.lagnaStarLord, lang) },
    { label: t("rulingRasiLord"), value: translatePlanet(rulingPlanets.rasiLord, lang) },
    { label: t("rulingDayLord"), value: translatePlanet(rulingPlanets.dayLord, lang) },
    { label: t("rulingMoonStarLord"), value: translatePlanet(rulingPlanets.moonStarLord, lang) },
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
