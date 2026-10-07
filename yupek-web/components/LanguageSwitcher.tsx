"use client";

import { useLanguage } from "./LanguageContext";
import { useCallback, KeyboardEvent } from "react";

interface LanguageSwitcherProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  short?: boolean;
}

export default function LanguageSwitcher({
  className = "",
  size = "md",
  short = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const isEn = locale === "en";

  const toggle = useCallback(() => {
    setLocale(isEn ? "nl" : "en");
  }, [isEn, setLocale]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLocale("nl");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLocale("en");
      }
    },
    [toggle, setLocale]
  );

  const nlLabel = short ? "NL" : "Nederlands";
  const enLabel = short ? "EN" : "English";

  // Compact, quiet luxury dimensions
  const dims = short
    ? {
        sm: {
          wrapper: "h-[22px] w-[58px] text-[8.5px]",
          thumbW: 27,
        },
        md: {
          wrapper: "h-[24px] w-[64px] text-[9px]",
          thumbW: 30,
        },
        lg: {
          wrapper: "h-[26px] w-[72px] text-[10px]",
          thumbW: 34,
        },
      }[size]
    : {
        sm: {
          wrapper: "h-[24px] w-[122px] text-[9px]",
          thumbW: 59,
        },
        md: {
          wrapper: "h-[26px] w-[138px] text-[10px]",
          thumbW: 67,
        },
        lg: {
          wrapper: "h-[28px] w-[150px] text-[11px]",
          thumbW: 73,
        },
      }[size];

  return (
    <button
      role="switch"
      aria-label={`Toggle language between ${nlLabel} and ${enLabel}`}
      aria-checked={isEn}
      onKeyDown={handleKeyDown}
      onClick={toggle}
      className={`relative inline-flex items-center justify-between p-[2px] rounded-full border border-current/25 bg-current/[0.04] select-none cursor-pointer group focus:outline-none focus-visible:ring-1 focus-visible:ring-current/40 transition-opacity duration-200 hover:border-current/40 active:scale-[0.98] ${dims.wrapper} ${className}`}
    >
      {/* Quiet Sliding Highlight Pill */}
      <span
        aria-hidden="true"
        style={{
          width: `${dims.thumbW}px`,
          transform: isEn ? `translateX(${dims.thumbW}px)` : "translateX(0px)",
        }}
        className="absolute top-[2px] bottom-[2px] left-[2px] rounded-full bg-current/15 transition-transform duration-200 ease-out"
      />

      {/* Option: NL / Nederlands */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          setLocale("nl");
        }}
        className={`relative z-10 flex-1 text-center font-sans tracking-[0.14em] uppercase transition-opacity duration-200 ${
          !isEn ? "font-medium opacity-100" : "font-light opacity-50 hover:opacity-80"
        }`}
      >
        {nlLabel}
      </span>

      {/* Option: EN / English */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          setLocale("en");
        }}
        className={`relative z-10 flex-1 text-center font-sans tracking-[0.14em] uppercase transition-opacity duration-200 ${
          isEn ? "font-medium opacity-100" : "font-light opacity-50 hover:opacity-80"
        }`}
      >
        {enLabel}
      </span>
    </button>
  );
}
