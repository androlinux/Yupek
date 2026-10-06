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

  // Sleek, refined, compact dimensions for luxury header integration
  const dims = short
    ? {
        sm: {
          wrapper: "h-[20px] w-[66px]",
          trackH: "h-[19px]",
          thumbW: 33,
          thumbH: "h-[20px]",
          knobSize: "h-[8px] w-[8px]",
          fontSize: "text-[8px]",
          bevelH: "h-[1.5px]",
          knobPosNl: "left-[3px]",
          knobPosEn: "right-[3px]",
          textPadNl: "pl-[13px] pr-[3px]",
          textPadEn: "pr-[13px] pl-[3px]",
        },
        md: {
          wrapper: "h-[24px] w-[76px]",
          trackH: "h-[22px]",
          thumbW: 38,
          thumbH: "h-[24px]",
          knobSize: "h-[10px] w-[10px]",
          fontSize: "text-[9px]",
          bevelH: "h-[2px]",
          knobPosNl: "left-[4px]",
          knobPosEn: "right-[4px]",
          textPadNl: "pl-[16px] pr-[3px]",
          textPadEn: "pr-[16px] pl-[3px]",
        },
        lg: {
          wrapper: "h-[27px] w-[86px]",
          trackH: "h-[25px]",
          thumbW: 43,
          thumbH: "h-[27px]",
          knobSize: "h-[11px] w-[11px]",
          fontSize: "text-[10px]",
          bevelH: "h-[2px]",
          knobPosNl: "left-[4px]",
          knobPosEn: "right-[4px]",
          textPadNl: "pl-[17px] pr-[4px]",
          textPadEn: "pr-[17px] pl-[4px]",
        },
      }[size]
    : {
        sm: {
          wrapper: "h-[22px] w-[126px]",
          trackH: "h-[21px]",
          thumbW: 63,
          thumbH: "h-[22px]",
          knobSize: "h-[8px] w-[8px]",
          fontSize: "text-[8.5px]",
          bevelH: "h-[1.5px]",
          knobPosNl: "left-[4px]",
          knobPosEn: "right-[4px]",
          textPadNl: "pl-[15px] pr-[3px]",
          textPadEn: "pr-[15px] pl-[3px]",
        },
        md: {
          wrapper: "h-[25px] w-[142px]",
          trackH: "h-[23px]",
          thumbW: 71,
          thumbH: "h-[25px]",
          knobSize: "h-[10px] w-[10px]",
          fontSize: "text-[9.5px]",
          bevelH: "h-[2px]",
          knobPosNl: "left-[5px]",
          knobPosEn: "right-[5px]",
          textPadNl: "pl-[17px] pr-[4px]",
          textPadEn: "pr-[17px] pl-[4px]",
        },
        lg: {
          wrapper: "h-[28px] w-[156px]",
          trackH: "h-[26px]",
          thumbW: 78,
          thumbH: "h-[28px]",
          knobSize: "h-[11px] w-[11px]",
          fontSize: "text-[10px]",
          bevelH: "h-[2.5px]",
          knobPosNl: "left-[5px]",
          knobPosEn: "right-[5px]",
          textPadNl: "pl-[19px] pr-[5px]",
          textPadEn: "pr-[19px] pl-[5px]",
        },
      }[size];

  return (
    <button
      role="switch"
      aria-label={`Toggle language between ${nlLabel} and ${enLabel}`}
      aria-checked={isEn}
      onKeyDown={handleKeyDown}
      onClick={toggle}
      className={`relative inline-flex items-center select-none cursor-pointer group focus:outline-none focus-visible:ring-1.5 focus-visible:ring-gold focus-visible:ring-offset-1 transition-transform duration-200 active:scale-[0.97] ${dims.wrapper} ${className}`}
    >
      {/* Deep Brown Main Track (compact rounded pill, flush border, zero heavy shadow) */}
      <div
        className={`relative z-10 w-full ${dims.trackH} bg-[#2B1D14] border-[1px] border-[#2B1D14] rounded-full flex items-center overflow-hidden shadow-sm ring-1 ring-cream/10`}
      >
        {/* Inactive Option Left: Nederlands / NL */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setLocale("nl");
          }}
          className={`w-1/2 h-full flex items-center justify-center font-sans font-medium text-cream/90 transition-all duration-200 ${dims.fontSize} ${
            !isEn ? "opacity-0 pointer-events-none" : "opacity-90 hover:opacity-100 hover:text-white"
          }`}
        >
          <span className="tracking-tight leading-none">{nlLabel}</span>
        </div>

        {/* Inactive Option Right: English / EN */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setLocale("en");
          }}
          className={`w-1/2 h-full flex items-center justify-center font-sans font-medium text-cream/90 transition-all duration-200 ${dims.fontSize} ${
            isEn ? "opacity-0 pointer-events-none" : "opacity-90 hover:opacity-100 hover:text-white"
          }`}
        >
          <span className="tracking-tight leading-none">{enLabel}</span>
        </div>
      </div>

      {/* Elevated White Sliding Capsule (Thumb with refined sand bevel) */}
      <div
        style={{
          transform: isEn ? `translateX(${dims.thumbW}px)` : "translateX(0px)",
        }}
        className={`absolute top-0 left-0 z-20 w-1/2 ${dims.thumbH} transition-transform duration-300 ease-[cubic-bezier(0.34,1.25,0.64,1)] bg-white border-[1px] border-[#2B1D14] ${
          isEn ? "rounded-r-full rounded-l-[3px]" : "rounded-l-full rounded-r-[3px]"
        } flex flex-col justify-between overflow-hidden shadow-[0_1.5px_6px_rgba(43,29,20,0.18)]`}
      >
        {/* Main upper white body with active text & circular tactile knob */}
        <div className="relative w-full flex-1 flex items-center">
          {/* Active Language Label */}
          <span
            className={`w-full flex items-center justify-center font-sans font-semibold text-[#2B1D14] transition-all duration-200 tracking-tight leading-none ${dims.fontSize} ${
              isEn ? dims.textPadEn : dims.textPadNl
            }`}
          >
            {isEn ? enLabel : nlLabel}
          </span>

          {/* Tactile Circular Knob */}
          <span
            className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-[#2B1D14] shadow-[0_1px_2px_rgba(43,29,20,0.25)] transition-all duration-300 ease-[cubic-bezier(0.34,1.25,0.64,1)] ${
              isEn ? dims.knobPosEn : dims.knobPosNl
            } ${dims.knobSize}`}
          />
        </div>

        {/* Refined Sand Bevel Rim at bottom */}
        <div className={`w-full bg-[#D9CBB0] border-t border-[#2B1D14]/10 shrink-0 ${dims.bevelH}`} />
      </div>
    </button>
  );
}
