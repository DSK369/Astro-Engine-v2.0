import { createContext, useContext } from "react";

// The context object and hook live in a component-free module on purpose.
// When a module exports both a component and a non-component, React Fast
// Refresh can't hot-update it cleanly: an edit re-evaluates the module and
// mints a *new* context object, so an already-mounted provider and its
// consumers end up on different contexts and useContext() returns null.
// Keeping the context here means editing the provider never re-creates it.
export const LanguageContext = createContext(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
