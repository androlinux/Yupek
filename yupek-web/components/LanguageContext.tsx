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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "en" || saved === "nl") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      } else {
        // Auto-detect browser language if Dutch
        if (typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("nl")) {
          setLocaleState("nl");
          document.documentElement.lang = "nl";
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
