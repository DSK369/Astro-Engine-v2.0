import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";
import "./BirthDataForm.css";

export const AYANAMSA_OPTIONS = [
  { value: "KP", label: "KP (Krishnamurti)" },
  { value: "LAHIRI", label: "Lahiri" },
  { value: "RAMAN", label: "Raman" },
  { value: "FAGAN", label: "Fagan-Bradley" },
  { value: "CUSTOM_KP", label: "Custom KP (23°44'18\")" },
  { value: "CUSTOM_MANUAL", label: "Custom Manual…" },
];

export const HOUSE_SYSTEM_OPTIONS = [
  { value: "whole_sign", label: "Vedic (Whole Sign)" },
  { value: "placidus_kp", label: "KP (Placidus)" },
];

const DEFAULT_FORM = {
  firstName: "",
  fatherName: "",
  lastName: "",
  dob: "",
  tob: "",
  location: null,
  ayanamsa: "KP",
  customAyanamsaValue: "",
  chartStyle: "north",
  rahuNode: "mean",
  houseSystem: "whole_sign",
};

export default function BirthDataForm({ onSubmit, submitting }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.location) {
      setError("Choose a location from the list — free text isn't enough, we need lat/long.");
      return;
    }
    if (form.ayanamsa === "CUSTOM_MANUAL" && !form.customAyanamsaValue) {
      setError("Enter a custom ayanamsa value.");
      return;
    }
    setError(null);
    onSubmit(form);
  }

  return (
    <form className="birth-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Name</legend>
        <div className="birth-form__row birth-form__row--3">
          <label>
            First Name
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              required
            />
          </label>
          <label>
            Father&rsquo;s Name
            <input
              type="text"
              value={form.fatherName}
              onChange={(e) => set("fatherName", e.target.value)}
            />
          </label>
          <label>
            Last Name
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Birth Details</legend>
        <div className="birth-form__row birth-form__row--2">
          <label>
            Date of Birth
            <input
              type="date"
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
              required
            />
          </label>
          <label>
            Time of Birth
            <input
              type="time"
              step="1"
              value={form.tob}
              onChange={(e) => set("tob", e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Location
          <LocationAutocomplete
            value={form.location}
            onSelect={(loc) => set("location", loc)}
            required
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Calculation Settings</legend>
        <div className="birth-form__row birth-form__row--2">
          <label>
            Ayanamsa
            <select value={form.ayanamsa} onChange={(e) => set("ayanamsa", e.target.value)}>
              {AYANAMSA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {form.ayanamsa === "CUSTOM_MANUAL" && (
            <label>
              Custom Ayanamsa (°)
              <input
                type="number"
                step="0.000001"
                placeholder="e.g. 23.738333"
                value={form.customAyanamsaValue}
                onChange={(e) => set("customAyanamsaValue", e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="birth-form__row birth-form__row--3">
          <fieldset className="birth-form__radio-group">
            <legend>Chart Style</legend>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="chartStyle"
                value="north"
                checked={form.chartStyle === "north"}
                onChange={(e) => set("chartStyle", e.target.value)}
              />
              North Indian
            </label>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="chartStyle"
                value="south"
                checked={form.chartStyle === "south"}
                onChange={(e) => set("chartStyle", e.target.value)}
              />
              South Indian
            </label>
          </fieldset>

          <fieldset className="birth-form__radio-group">
            <legend>Rahu / Ketu Node</legend>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="rahuNode"
                value="mean"
                checked={form.rahuNode === "mean"}
                onChange={(e) => set("rahuNode", e.target.value)}
              />
              Mean
            </label>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="rahuNode"
                value="true"
                checked={form.rahuNode === "true"}
                onChange={(e) => set("rahuNode", e.target.value)}
              />
              True
            </label>
          </fieldset>

          <label>
            House System
            <select value={form.houseSystem} onChange={(e) => set("houseSystem", e.target.value)}>
              {HOUSE_SYSTEM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {error && <p className="birth-form__error" role="alert">{error}</p>}

      <button type="submit" className="birth-form__submit" disabled={submitting}>
        {submitting ? "Calculating…" : "Generate Chart"}
      </button>
    </form>
  );
}

export { DEFAULT_FORM };
