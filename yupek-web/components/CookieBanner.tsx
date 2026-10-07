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
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-5 md:p-6 pointer-events-none flex justify-center animate-fadeIn"
    >
      <div className="pointer-events-auto w-full max-w-4xl bg-[#FAF7F2] text-[#2C221E] border border-[#2C221E]/15 shadow-[0_16px_40px_rgba(44,34,30,0.14)] rounded-sm p-4 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" aria-hidden="true" />
              <h2
                id="cookie-banner-title"
                className="font-serif text-base sm:text-lg tracking-wide text-[#2C221E]"
              >
                {t.cookies.bannerTitle}
              </h2>
            </div>
            <p
              id="cookie-banner-desc"
              className="text-xs sm:text-[13px] text-[#2C221E]/80 leading-relaxed"
            >
              {t.cookies.bannerDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1 md:pt-0 shrink-0 md:min-w-[420px]">
            <button
              type="button"
              onClick={acceptAll}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-[#2C221E] text-[#FAF7F2] text-[11px] uppercase tracking-[.18em] font-medium border border-[#2C221E] hover:bg-[#1A1412] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E] focus-visible:ring-offset-2"
            >
              {t.cookies.acceptAll}
            </button>

            <button
              type="button"
              onClick={rejectNonEssential}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-transparent text-[#2C221E] text-[11px] uppercase tracking-[.18em] font-medium border border-[#2C221E] hover:bg-[#2C221E]/8 active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E] focus-visible:ring-offset-2"
            >
              {t.cookies.rejectNonEssential}
            </button>

            <button
              type="button"
              onClick={openSettings}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-transparent text-[#2C221E]/85 text-[11px] uppercase tracking-[.18em] font-medium border border-[#2C221E]/30 hover:border-[#2C221E] hover:text-[#2C221E] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E] focus-visible:ring-offset-2"
            >
              {t.cookies.cookieSettings}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
