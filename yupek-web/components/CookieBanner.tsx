"use client";

import React from "react";
import { useLanguage } from "./LanguageContext";
import { useCookieConsent } from "./CookieConsentContext";

export default function CookieBanner() {
  const { t } = useLanguage();
  const { bannerOpen, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();

  if (!bannerOpen) {
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#2B211D]/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
        style={{
          backgroundColor: "#FAF7F2",
          width: "min(760px, calc(100vw - 32px))",
          maxWidth: "760px",
        }}
        className="relative my-auto w-full bg-[#FAF7F2] text-[#171717] border border-[rgba(23,23,23,0.15)] shadow-[0_24px_64px_rgba(23,23,23,0.22)] p-6 sm:p-8 md:p-10 flex flex-col gap-6"
      >
        {/* TOP: Brand Eyebrow & Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-[.25em] font-semibold text-[#171717]/70">
              YUPEK
            </span>
          </div>
          <h2
            id="cookie-banner-title"
            className="font-serif text-2xl sm:text-3xl text-[#171717] tracking-normal font-normal"
          >
            {t.cookies.bannerTitle}
          </h2>
        </div>

        {/* MAIN: Full-width readable paragraph */}
        <p
          id="cookie-banner-desc"
          style={{
            overflowWrap: "normal",
            wordBreak: "normal",
            whiteSpace: "normal",
            color: "#171717",
            fontSize: "15.5px",
            lineHeight: "1.65",
          }}
          className="w-full text-[15px] sm:text-[16px] leading-[1.65] text-[#171717] font-light"
        >
          {t.cookies.bannerDescription}
        </p>

        {/* BOTTOM: Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={acceptAll}
            style={{
              backgroundColor: "#2B211D",
              color: "#FFFFFF",
            }}
            className="flex-1 inline-flex items-center justify-center min-h-[46px] px-3.5 py-3 text-[10.5px] md:text-[11.5px] uppercase tracking-[.16em] md:tracking-[.18em] font-medium border border-[#2B211D] hover:bg-[#1A1412] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B211D] focus-visible:ring-offset-2 whitespace-nowrap text-center shadow-sm"
          >
            {t.cookies.acceptAll}
          </button>

          <button
            type="button"
            onClick={rejectNonEssential}
            style={{
              backgroundColor: "transparent",
              color: "#171717",
              borderColor: "rgba(23, 23, 23, 0.35)",
            }}
            className="flex-1 inline-flex items-center justify-center min-h-[46px] px-3.5 py-3 text-[10.5px] md:text-[11.5px] uppercase tracking-[.16em] md:tracking-[.18em] font-medium border hover:bg-[rgba(23,23,23,0.05)] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 whitespace-nowrap text-center"
          >
            {t.cookies.rejectNonEssential}
          </button>

          <button
            type="button"
            onClick={openSettings}
            style={{
              backgroundColor: "transparent",
              color: "#171717",
              borderColor: "rgba(23, 23, 23, 0.35)",
            }}
            className="flex-1 inline-flex items-center justify-center min-h-[46px] px-3.5 py-3 text-[10.5px] md:text-[11.5px] uppercase tracking-[.16em] md:tracking-[.18em] font-medium border hover:bg-[rgba(23,23,23,0.05)] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 whitespace-nowrap text-center"
          >
            {t.cookies.cookieSettings}
          </button>
        </div>
      </div>
    </div>
  );
}
