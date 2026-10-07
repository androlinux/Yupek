"use client";

import React, { useEffect, useState, useRef } from "react";
import { useLanguage } from "./LanguageContext";
import { useCookieConsent } from "./CookieConsentContext";

export default function CookieSettingsModal() {
  const { t } = useLanguage();
  const {
    settingsOpen,
    closeSettings,
    consent,
    acceptAll,
    rejectNonEssential,
    savePreferences,
  } = useCookieConsent();

  // Local state for the settings switches; defaults to stored consent or false (OFF by default)
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync state whenever modal opens or consent changes
  useEffect(() => {
    if (settingsOpen) {
      setAnalytics(consent?.analytics ?? false);
      setMarketing(consent?.marketing ?? false);
    }
  }, [settingsOpen, consent]);

  // Handle Escape key press
  useEffect(() => {
    if (!settingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen, closeSettings]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (settingsOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [settingsOpen]);

  if (!settingsOpen) {
    return null;
  }

  const handleSave = () => {
    savePreferences({ analytics, marketing });
  };

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeSettings();
        }
      }}
      className="fixed inset-0 z-50 bg-[#2C221E]/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        aria-describedby="cookie-settings-desc"
        className="bg-[#FAF7F2] text-[#2C221E] border border-[#2C221E]/15 shadow-2xl rounded-sm w-full max-w-xl my-auto p-5 sm:p-8 flex flex-col gap-6 relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeSettings}
          aria-label={t.common.close}
          className="absolute top-4 right-4 p-2 text-[#2C221E]/60 hover:text-[#2C221E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" aria-hidden="true" />
            <h2
              id="cookie-settings-title"
              className="font-serif text-xl sm:text-2xl text-[#2C221E] tracking-tight"
            >
              {t.cookies.modalTitle}
            </h2>
          </div>
          <p
            id="cookie-settings-desc"
            className="text-xs sm:text-[13px] text-[#2C221E]/75 leading-relaxed"
          >
            {t.cookies.modalSubtitle}
          </p>
        </div>

        {/* Category List */}
        <div className="space-y-4 divide-y divide-[#2C221E]/10">
          {/* 1. Essential Category */}
          <div className="pt-1 first:pt-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[.12em] text-[#2C221E]">
                  {t.cookies.essentialTitle}
                </h3>
                <span className="inline-block text-[10px] uppercase tracking-wider text-[#C5A059] font-medium mt-0.5">
                  {t.cookies.essentialStatus}
                </span>
              </div>

              {/* Locked Active Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked="true"
                aria-disabled="true"
                disabled
                className="w-11 h-6 bg-[#2C221E] rounded-full relative p-0.5 cursor-not-allowed opacity-90 transition-colors"
              >
                <span className="block w-5 h-5 bg-[#FAF7F2] rounded-full shadow-sm transform translate-x-5 transition-transform" />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#2C221E]/75 leading-relaxed">
              {t.cookies.essentialDesc}
            </p>
          </div>

          {/* 2. Analytics Category */}
          <div className="pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[.12em] text-[#2C221E]">
                  {t.cookies.analyticsTitle}
                </h3>
                <span className="inline-block text-[10px] uppercase tracking-wider text-[#2C221E]/60 mt-0.5">
                  {analytics ? t.cookies.analyticsStatusOn : t.cookies.analyticsStatusOff}
                </span>
              </div>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={analytics}
                onClick={() => setAnalytics((prev) => !prev)}
                aria-label={t.cookies.analyticsTitle}
                className={`w-11 h-6 rounded-full relative p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E] ${
                  analytics ? "bg-[#2C221E]" : "bg-[#2C221E]/20"
                }`}
              >
                <span
                  className={`block w-5 h-5 bg-[#FAF7F2] rounded-full shadow-sm transform transition-transform duration-200 ${
                    analytics ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#2C221E]/75 leading-relaxed">
              {t.cookies.analyticsDesc}
            </p>
          </div>

          {/* 3. Marketing Category */}
          <div className="pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[.12em] text-[#2C221E]">
                  {t.cookies.marketingTitle}
                </h3>
                <span className="inline-block text-[10px] uppercase tracking-wider text-[#2C221E]/60 mt-0.5">
                  {marketing ? t.cookies.marketingStatusOn : t.cookies.marketingStatusOff}
                </span>
              </div>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={marketing}
                onClick={() => setMarketing((prev) => !prev)}
                aria-label={t.cookies.marketingTitle}
                className={`w-11 h-6 rounded-full relative p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E] ${
                  marketing ? "bg-[#2C221E]" : "bg-[#2C221E]/20"
                }`}
              >
                <span
                  className={`block w-5 h-5 bg-[#FAF7F2] rounded-full shadow-sm transform transition-transform duration-200 ${
                    marketing ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#2C221E]/75 leading-relaxed">
              {t.cookies.marketingDesc}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#2C221E]/10">
          <button
            type="button"
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center min-h-[44px] px-3 py-2.5 bg-[#2C221E] text-[#FAF7F2] text-[11px] uppercase tracking-[.18em] font-medium border border-[#2C221E] hover:bg-[#1A1412] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E]"
          >
            {t.cookies.savePreferences}
          </button>

          <button
            type="button"
            onClick={acceptAll}
            className="w-full inline-flex items-center justify-center min-h-[44px] px-3 py-2.5 bg-transparent text-[#2C221E] text-[11px] uppercase tracking-[.18em] font-medium border border-[#2C221E] hover:bg-[#2C221E]/8 active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E]"
          >
            {t.cookies.acceptAll}
          </button>

          <button
            type="button"
            onClick={rejectNonEssential}
            className="w-full inline-flex items-center justify-center min-h-[44px] px-3 py-2.5 bg-transparent text-[#2C221E]/85 text-[11px] uppercase tracking-[.18em] font-medium border border-[#2C221E]/30 hover:border-[#2C221E] hover:text-[#2C221E] active:scale-[0.99] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C221E]"
          >
            {t.cookies.rejectNonEssential}
          </button>
        </div>
      </div>
    </div>
  );
}
