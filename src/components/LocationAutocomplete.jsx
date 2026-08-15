import { useId, useRef, useState } from "react";
import { searchCities } from "../data/cities";
import { useLanguage } from "../lib/language";
import "./LocationAutocomplete.css";

// Emits the full city record ({ city, state, country, lat, lon, tz }) via
// onSelect, not just a string — birth calculations need lat/lon/tz, not
// a display label.
export default function LocationAutocomplete({ value, onSelect, required }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(value?.label || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const blurTimeout = useRef(null);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    setActiveIndex(-1);
    const matches = searchCities(q);
    setResults(matches);
    setOpen(matches.length > 0);
    if (value) onSelect(null); // clear a previously confirmed selection while typing
  }

  function choose(city) {
    const label = `${city.city}, ${city.state}, ${city.country}`;
    setQuery(label);
    setOpen(false);
    onSelect({ ...city, label });
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        choose(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="location-autocomplete">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={t("formLocationPlaceholder")}
        value={query}
        required={required}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => {
          // delay so a click on an option registers before the list unmounts
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && (
        <ul className="location-autocomplete__list" id={listId} role="listbox">
          {results.map((city, i) => (
            <li
              key={`${city.city}-${city.state}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? "is-active" : ""}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus so onBlur doesn't fire first
                clearTimeout(blurTimeout.current);
                choose(city);
              }}
            >
              <span className="location-autocomplete__city">{city.city}</span>
              <span className="location-autocomplete__meta">
                {city.state}, {city.country}
              </span>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="location-autocomplete__coords">
          {value.lat.toFixed(4)}°, {value.lon.toFixed(4)}° · {value.tz}
        </p>
      )}
    </div>
  );
}
