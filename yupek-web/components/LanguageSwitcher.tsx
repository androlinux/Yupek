"use client";

import { useLanguage } from "./LanguageContext";
import { type Locale } from "@/lib/i18n";
import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";

interface LanguageSwitcherProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  short?: boolean;
}

const LANGUAGES: Array<{ code: Locale; label: string; full: string }> = [
  { code: "en", label: "EN", full: "English" },
  { code: "nl", label: "NL", full: "Nederlands" },
  { code: "de", label: "DE", full: "Deutsch" },
  { code: "fr", label: "FR", full: "Français" },
  { code: "es", label: "ES", full: "Español" },
];

export default function LanguageSwitcher({
  className = "",
  size = "md",
  short = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    []
  );

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  // Short version (desktop navigation pill with quiet dropdown)
  if (short) {
    return (
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className={`relative inline-block text-left ${className}`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Select language. Current: ${currentLang.full}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-current/25 bg-current/[0.04] text-[9.5px] uppercase tracking-[0.16em] font-medium transition-all duration-200 hover:border-current/40 hover:bg-current/[0.08] active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-current/40"
        >
          <span>{currentLang.label}</span>
          <svg
            className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label="Language options"
            className="absolute right-0 mt-1.5 w-36 rounded-md bg-[#FDFBF7] dark:bg-[#1E1712] border border-brown/15 dark:border-sand/15 shadow-[0_10px_25px_-5px_rgba(43,29,20,0.15)] backdrop-blur-md py-1 z-50 animate-fade-in text-[10.5px]"
          >
            <div className="px-3 py-1 text-[8.5px] tracking-[0.2em] uppercase opacity-40 font-mono border-b border-brown/10 dark:border-sand/10">
              Language
            </div>
            {LANGUAGES.map((item) => {
              const isSelected = item.code === locale;
              return (
                <button
                  key={item.code}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLocale(item.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors duration-150 hover:bg-brown/5 dark:hover:bg-sand/10 ${
                    isSelected
                      ? "font-medium text-brown dark:text-cream bg-brown/[0.03]"
                      : "font-light text-brown/70 dark:text-cream/70"
                  }`}
                >
                  <span className="tracking-wider">{item.full}</span>
                  <span className="text-[9px] uppercase tracking-widest opacity-50 font-mono">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full segmented pill selector (for mobile menu and footer)
  return (
    <div
      role="group"
      aria-label="Select website language"
      className={`inline-flex items-center p-1 rounded-full border border-brown/15 dark:border-sand/20 bg-sand/20 dark:bg-brown/20 gap-0.5 select-none ${className}`}
    >
      {LANGUAGES.map((item) => {
        const isSelected = item.code === locale;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLocale(item.code)}
            aria-pressed={isSelected}
            aria-label={item.full}
            className={`relative px-2.5 py-1 rounded-full text-[10px] tracking-[0.14em] uppercase font-sans transition-all duration-200 focus:outline-none ${
              isSelected
                ? "bg-brown text-cream shadow-2xs font-medium"
                : "text-brown/70 hover:text-brown dark:text-cream/70 dark:hover:text-cream font-light"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
