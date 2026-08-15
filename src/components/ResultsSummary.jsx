import { useLanguage } from "../lib/language";
import { translateRashi, translateNakshatra } from "../lib/i18n";
import "./ResultsSummary.css";

// "Rashi" here means Moon Rashi (the conventional meaning in Vedic
// astrology — your Moon sign), distinct from Lagna Rashi (Ascendant sign).
export default function ResultsSummary({ summary }) {
  const { t, lang } = useLanguage();
  const items = [
    { label: t("summaryLagnaRashi"), value: translateRashi(summary.lagnaRashi, lang) },
    { label: t("summaryMoonRashi"), value: translateRashi(summary.moonRashi, lang) },
    { label: t("summaryNakshatra"), value: translateNakshatra(summary.moonNakshatra, lang) },
    { label: t("summaryCharan"), value: summary.moonCharan },
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
