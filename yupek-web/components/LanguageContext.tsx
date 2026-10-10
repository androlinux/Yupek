"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Locale, Translations, dictionaries } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "yupek_locale_preference";

const VALID_LOCALES = new Set<Locale>(["en", "nl", "de", "fr", "es"]);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && VALID_LOCALES.has(saved)) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      } else if (typeof navigator !== "undefined" && navigator.language) {
        const lang = navigator.language.toLowerCase();
        let detected: Locale = "en";
        if (lang.startsWith("nl")) detected = "nl";
        else if (lang.startsWith("de")) detected = "de";
        else if (lang.startsWith("fr")) detected = "fr";
        else if (lang.startsWith("es")) detected = "es";

        if (detected !== "en") {
          setLocaleState(detected);
          document.documentElement.lang = detected;
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
      window.dispatchEvent(new CustomEvent("yupek_locale_changed", { detail: newLocale }));
    } catch {
      // Ignore
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
