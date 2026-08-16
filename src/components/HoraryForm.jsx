import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";
import { AYANAMSA_OPTIONS } from "./BirthDataForm";
import { useLanguage } from "../lib/language";
import "./BirthDataForm.css";

const DEFAULT_FORM = {
  horaryNumber: "",
  date: "",
  location: null,
  ayanamsa: "KP",
  customAyanamsaValue: "",
  rahuNode: "mean",
};

export default function HoraryForm({ onSubmit, submitting }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const n = Number(form.horaryNumber);
    if (!form.horaryNumber || !Number.isInteger(n) || n < 1 || n > 249) {
      setError(t("horaryErrorNumber"));
      return;
    }
    if (!form.location) {
      setError(t("formErrorLocation"));
      return;
    }
    if (form.ayanamsa === "CUSTOM_MANUAL" && !form.customAyanamsaValue) {
      setError(t("formErrorAyanamsa"));
      return;
    }
    setError(null);
    onSubmit({ ...form, horaryNumber: n });
  }

  return (
    <form className="birth-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{t("horaryFormLegend")}</legend>
        <div className="birth-form__row birth-form__row--2">
          <label>
            {t("horaryNumber")}
            <input
              type="number"
              min="1"
              max="249"
              placeholder={t("horaryNumberHint")}
              value={form.horaryNumber}
              onChange={(e) => set("horaryNumber", e.target.value)}
              required
            />
          </label>
          <label>
            {t("horaryDate")}
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          {t("formLocation")}
          <LocationAutocomplete
            value={form.location}
            onSelect={(loc) => set("location", loc)}
            required
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("formCalcSettings")}</legend>
        <div className="birth-form__row birth-form__row--2">
          <label>
            {t("formAyanamsa")}
            <select value={form.ayanamsa} onChange={(e) => set("ayanamsa", e.target.value)}>
              {AYANAMSA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </label>
          {form.ayanamsa === "CUSTOM_MANUAL" && (
            <label>
              {t("formCustomAyanamsa")}
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

        <fieldset className="birth-form__radio-group">
          <legend>{t("formRahuKetuNode")}</legend>
          <label className="birth-form__radio">
            <input
              type="radio"
              name="horaryRahuNode"
              value="mean"
              checked={form.rahuNode === "mean"}
              onChange={(e) => set("rahuNode", e.target.value)}
            />
            {t("formMean")}
          </label>
          <label className="birth-form__radio">
            <input
              type="radio"
              name="horaryRahuNode"
              value="true"
              checked={form.rahuNode === "true"}
              onChange={(e) => set("rahuNode", e.target.value)}
            />
            {t("formTrue")}
          </label>
        </fieldset>
      </fieldset>

      {error && <p className="birth-form__error" role="alert">{error}</p>}

      <button type="submit" className="birth-form__submit" disabled={submitting}>
        {submitting ? t("formSubmitting") : t("horaryFormSubmit")}
      </button>
    </form>
  );
}
