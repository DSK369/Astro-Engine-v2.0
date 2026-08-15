import { useLanguage } from "../lib/language";
import { translatePlanet, translateRashi } from "../lib/i18n";
import "./SignificatorTable.css";

// KP 4-step house significators — matches core/significators.py exactly.
// Presented as an explicit 4-group breakdown per house rather than
// Kismat's compact per-cusp notation, which couldn't be confidently
// reverse-engineered from a single sample printout (see
// core/significators.py's module docstring for why).
export default function SignificatorTable({ significators }) {
  const { t, lang } = useLanguage();
  const names = (list) => list.map((n) => translatePlanet(n, lang)).join(", ") || "—";

  return (
    <div className="significator-grid">
      {significators.map((s) => (
        <div className="significator-card" key={s.house}>
          <div className="significator-card__header">
            <span className="significator-card__house">{t("sigHouse")} {s.house}</span>
            <span className="significator-card__rashi">{translateRashi(s.cuspRashi, lang)}</span>
          </div>
          <dl className="significator-card__steps">
            <dt>{t("sigStepA")}</dt>
            <dd>{names(s.stepAStarOfOccupants)}</dd>
            <dt>{t("sigStepB")}</dt>
            <dd>{names(s.stepBOccupants)}</dd>
            <dt>{t("sigStepC")}</dt>
            <dd>{names(s.stepCStarOfOwner)}</dd>
            <dt>{t("sigStepD")}</dt>
            <dd>{names(s.stepDOwner)}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}
