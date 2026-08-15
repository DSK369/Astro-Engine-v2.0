import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";
import { useLanguage } from "../lib/language";
import "./BirthDataForm.css";

export const AYANAMSA_OPTIONS = [
  { value: "KP", labelKey: "ayanamsaKP" },
  { value: "LAHIRI", labelKey: "ayanamsaLahiri" },
  { value: "RAMAN", labelKey: "ayanamsaRaman" },
  { value: "FAGAN", labelKey: "ayanamsaFagan" },
  { value: "CUSTOM_KP", labelKey: "ayanamsaCustomKP" },
  { value: "CUSTOM_MANUAL", labelKey: "ayanamsaCustomManual" },
];

export const HOUSE_SYSTEM_OPTIONS = [
  { value: "whole_sign", labelKey: "houseSystemWholeSign" },
  { value: "placidus_kp", labelKey: "houseSystemPlacidus" },
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
  const { t } = useLanguage();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.location) {
      setError(t("formErrorLocation"));
      return;
    }
    if (form.ayanamsa === "CUSTOM_MANUAL" && !form.customAyanamsaValue) {
      setError(t("formErrorAyanamsa"));
      return;
    }
    setError(null);
    onSubmit(form);
  }

  return (
    <form className="birth-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{t("formName")}</legend>
        <div className="birth-form__row birth-form__row--3">
          <label>
            {t("formFirstName")}
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              required
            />
          </label>
          <label>
            {t("formFatherName")}
            <input
              type="text"
              value={form.fatherName}
              onChange={(e) => set("fatherName", e.target.value)}
            />
          </label>
          <label>
            {t("formLastName")}
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t("formBirthDetails")}</legend>
        <div className="birth-form__row birth-form__row--2">
          <label>
            {t("formDob")}
            <input
              type="date"
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
              required
            />
          </label>
          <label>
            {t("formTob")}
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

        <div className="birth-form__row birth-form__row--3">
          <fieldset className="birth-form__radio-group">
            <legend>{t("formChartStyle")}</legend>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="chartStyle"
                value="north"
                checked={form.chartStyle === "north"}
                onChange={(e) => set("chartStyle", e.target.value)}
              />
              {t("northIndianChart")}
            </label>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="chartStyle"
                value="south"
                checked={form.chartStyle === "south"}
                onChange={(e) => set("chartStyle", e.target.value)}
              />
              {t("southIndianChart")}
            </label>
          </fieldset>

          <fieldset className="birth-form__radio-group">
            <legend>{t("formRahuKetuNode")}</legend>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="rahuNode"
                value="mean"
                checked={form.rahuNode === "mean"}
                onChange={(e) => set("rahuNode", e.target.value)}
              />
              {t("formMean")}
            </label>
            <label className="birth-form__radio">
              <input
                type="radio"
                name="rahuNode"
                value="true"
                checked={form.rahuNode === "true"}
                onChange={(e) => set("rahuNode", e.target.value)}
              />
              {t("formTrue")}
            </label>
          </fieldset>

          <label>
            {t("formHouseSystem")}
            <select value={form.houseSystem} onChange={(e) => set("houseSystem", e.target.value)}>
              {HOUSE_SYSTEM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {error && <p className="birth-form__error" role="alert">{error}</p>}

      <button type="submit" className="birth-form__submit" disabled={submitting}>
        {submitting ? t("formSubmitting") : t("formSubmit")}
      </button>
    </form>
  );
}

export { DEFAULT_FORM };
