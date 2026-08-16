import { useLanguage } from "../lib/language";
import { translatePlanet } from "../lib/i18n";
import "./MuhurtaPanel.css";

// Hora, Abhijit, Nishita, Trikalam (Rahu Kalam/Yamaganda/Gulika Kalam),
// Choghadiya, Brahma Muhurta -- see backend core/muhurta.py and the
// project plan folder's Plan 5. Durmuhurta is intentionally absent: the
// backend doesn't compute it yet (no citable per-weekday table sourced).
//
// Only the "current" moment is surfaced for Hora/Choghadiya, not their
// full 12/8-entry day+night lists -- a full timetable is a reasonable
// future addition but out of scope for this pass, matching how e.g.
// Vargas (D2-D60) are also deferred elsewhere in this project.

function timeOnly(dtStr) {
  if (!dtStr) return null;
  const time = dtStr.split(" ")[1];
  return time ? time.slice(0, 5) : null;
}

function range(start, end) {
  const s = timeOnly(start);
  const e = timeOnly(end);
  return s && e ? `${s} – ${e}` : null;
}

export default function MuhurtaPanel({ muhurta, circumpolar }) {
  const { t, lang } = useLanguage();
  if (!muhurta) return null;

  if (circumpolar) {
    return (
      <div className="muhurta">
        <p className="muhurta__notice" role="note">{t("circumpolarNote")}</p>
      </div>
    );
  }

  const hora = muhurta.hora?.current;
  const cho = muhurta.choghadiya?.current;

  const items = [
    {
      label: t("muhurtaHora"),
      value: hora ? `${translatePlanet(hora.lord, lang)} (${range(hora.start, hora.end)})` : null,
    },
    {
      label: t("muhurtaChoghadiya"),
      value: cho
        ? `${cho.name} — ${t(`muhurtaQuality_${cho.quality}`)} (${range(cho.start, cho.end)})`
        : null,
    },
    { label: t("muhurtaAbhijit"), value: muhurta.abhijit ? range(muhurta.abhijit.start, muhurta.abhijit.end) : null },
    { label: t("muhurtaRahuKalam"), value: muhurta.rahuKalam ? range(muhurta.rahuKalam.start, muhurta.rahuKalam.end) : null },
    { label: t("muhurtaYamaganda"), value: muhurta.yamaganda ? range(muhurta.yamaganda.start, muhurta.yamaganda.end) : null },
    { label: t("muhurtaGulikaKalam"), value: muhurta.gulikaKalam ? range(muhurta.gulikaKalam.start, muhurta.gulikaKalam.end) : null },
    { label: t("muhurtaNishita"), value: muhurta.nishita ? timeOnly(muhurta.nishita.midpoint) : null },
    { label: t("muhurtaBrahmaMuhurta"), value: muhurta.brahmaMuhurta ? range(muhurta.brahmaMuhurta.start, muhurta.brahmaMuhurta.end) : null },
  ];

  const dash = t("doesNotOccur");

  return (
    <div className="muhurta">
      <div className="muhurta__grid">
        {items.map((item) => (
          <div className="muhurta__item" key={item.label}>
            <span className="muhurta__label">{item.label}</span>
            <span className={`muhurta__value${item.value ? "" : " muhurta__value--absent"}`}>
              {item.value || dash}
            </span>
          </div>
        ))}
      </div>
      {muhurta.abhijit?.excludedByWeekday && (
        <p className="muhurta__footnote">{t("muhurtaAbhijitExcluded")}</p>
      )}
    </div>
  );
}
