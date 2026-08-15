import { useState, useCallback, useMemo } from "react";
import { LanguageContext } from "./language.js";
import { UI_STRINGS } from "./i18n";

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");

  const toggleLang = useCallback(() => {
    setLang((l) => (l === "en" ? "hi" : "en"));
  }, []);

  const t = useCallback(
    (key) => UI_STRINGS[lang]?.[key] ?? UI_STRINGS.en[key] ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
