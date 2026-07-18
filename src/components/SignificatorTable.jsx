import "./SignificatorTable.css";

// KP 4-step house significators — matches core/significators.py exactly.
// Presented as an explicit 4-group breakdown per house rather than
// Kismat's compact per-cusp notation, which couldn't be confidently
// reverse-engineered from a single sample printout (see
// core/significators.py's module docstring for why).
export default function SignificatorTable({ significators }) {
  return (
    <div className="significator-grid">
      {significators.map((s) => (
        <div className="significator-card" key={s.house}>
          <div className="significator-card__header">
            <span className="significator-card__house">House {s.house}</span>
            <span className="significator-card__rashi">{s.cuspRashi}</span>
          </div>
          <dl className="significator-card__steps">
            <dt>A. Star lord of occupants</dt>
            <dd>{s.stepAStarOfOccupants.join(", ") || "—"}</dd>
            <dt>B. Occupants</dt>
            <dd>{s.stepBOccupants.join(", ") || "—"}</dd>
            <dt>C. Star lord of owner</dt>
            <dd>{s.stepCStarOfOwner.join(", ") || "—"}</dd>
            <dt>D. Owner</dt>
            <dd>{s.stepDOwner.join(", ") || "—"}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}
