"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility, type ColorMode, type TextSize } from "./AccessibilityContext";
import { useLanguage } from "./LanguageContext";
import Icon from "./ui/Icon";

export default function AccessibilityDrawer() {
  const {
    textSize,
    dyslexicFont,
    readingGuide,
    colorMode,
    highlightLinks,
    pauseAnimations,
    speechRate,
    isSpeaking,
    isPaused,
    drawerOpen,
    setTextSize,
    setDyslexicFont,
    setReadingGuide,
    setColorMode,
    setHighlightLinks,
    setPauseAnimations,
    setSpeechRate,
    speakText,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    resetAll,
    openDrawer,
    closeDrawer,
  } = useAccessibility();

  const { t } = useLanguage();
  const a = t.a11y;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (drawerOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [drawerOpen]);

  // Check if any non-default assistive option is actively turned on
  const hasActiveModifiers =
    textSize !== "normal" ||
    dyslexicFont ||
    readingGuide ||
    colorMode !== "normal" ||
    highlightLinks ||
    pauseAnimations;

  const colorModeOptions: { id: ColorMode; name: string; desc: string; preview: string }[] = [
    {
      id: "normal",
      name: a.colorModes.normal.name,
      desc: a.colorModes.normal.desc,
      preview: "bg-[#2B1D14] border-[#C49A45]",
    },
    {
      id: "high-contrast",
      name: a.colorModes.highContrast.name,
      desc: a.colorModes.highContrast.desc,
      preview: "bg-black border-[#F8D26A]",
    },
    {
      id: "deuteranopia",
      name: a.colorModes.deuteranopia.name,
      desc: a.colorModes.deuteranopia.desc,
      preview: "bg-[#3D3A20] border-[#A89840]",
    },
    {
      id: "protanopia",
      name: a.colorModes.protanopia.name,
      desc: a.colorModes.protanopia.desc,
      preview: "bg-[#2A3445] border-[#D9B550]",
    },
    {
      id: "tritanopia",
      name: a.colorModes.tritanopia.name,
      desc: a.colorModes.tritanopia.desc,
      preview: "bg-[#452A30] border-[#50B5D9]",
    },
    {
      id: "monochrome",
      name: a.colorModes.monochrome.name,
      desc: a.colorModes.monochrome.desc,
      preview: "bg-neutral-800 border-neutral-300",
    },
  ];

  return (
    <>
      {/* Floating Accessibility Trigger Button (Bottom Left) */}
      <div
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex items-center gap-3"
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <button
          onClick={openDrawer}
          aria-label={a.floatingButtonLabel}
          aria-expanded={drawerOpen}
          className="group relative flex h-13 w-13 items-center justify-center rounded-full bg-brown text-cream shadow-xl border border-gold/40 transition-all duration-300 hover:scale-105 hover:bg-black hover:border-gold active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
          style={{ width: "52px", height: "52px" }}
        >
          {/* Subtle gold glow pulse if active modifiers */}
          {hasActiveModifiers && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
            </span>
          )}

          <Icon
            name="accessibility"
            className="h-6 w-6 text-cream transition-transform duration-300 group-hover:scale-110"
          />
        </button>

        {/* Hover Tooltip Prompt */}
        <div
          className={`hidden sm:flex items-center gap-2 rounded-full border border-brown/15 bg-cream/95 px-3.5 py-1.5 shadow-lg backdrop-blur transition-all duration-300 ${
            tooltipVisible ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 pointer-events-none"
          }`}
          aria-hidden="true"
        >
          <span className="text-[11px] font-medium tracking-wider text-brown">
            {a.floatingTooltip}
          </span>
          {hasActiveModifiers && (
            <span className="rounded-full bg-gold/20 px-1.5 py-0.2 text-[9px] font-mono text-brown">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Slide-out Accessibility Drawer */}
      {shouldRender && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={a.drawerTitle}
          aria-hidden={!drawerOpen}
          inert={!drawerOpen || undefined}
          className={`fixed top-0 bottom-0 left-0 z-50 w-full max-w-full sm:max-w-md bg-cream text-brown border-r border-brown/20 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
          }`}
        >
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-brown/15 p-6 bg-sand/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brown text-gold flex items-center justify-center border border-gold/40">
              <Icon name="accessibility" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg md:text-xl tracking-wider text-brown font-semibold">
                {a.drawerTitle}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-brown/60 mt-0.5">
                {a.drawerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            aria-label={a.closeBtn}
            className="p-1.5 text-brown/60 hover:text-brown hover:bg-brown/10 rounded transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 divide-y divide-brown/10">
          {/* Section 1: Audio Screen Reader (Text-to-Speech) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
                  01 • AUDIO READER
                </span>
                <h3 className="font-serif text-base tracking-wide text-brown font-medium">
                  {a.screenReaderTitle}
                </h3>
              </div>
              {isSpeaking && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-[10px] font-mono text-brown animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  {a.speakingNow}
                </span>
              )}
            </div>
            <p className="text-xs text-brown/70 leading-relaxed font-light">
              {a.screenReaderDesc}
            </p>

            {/* Playback Controls */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => speakText()}
                className={`btn py-2.5 px-3 text-[10px] tracking-[.18em] font-semibold flex items-center justify-center gap-2 ${
                  isSpeaking && !isPaused ? "bg-brown text-gold border-gold" : "btn-dark"
                }`}
              >
                <Icon name="volume" className="w-4 h-4" />
                <span>{a.readPageBtn}</span>
              </button>

              <button
                onClick={() => {
                  const sel = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
                  speakText(sel || undefined);
                }}
                className="btn btn-line py-2.5 px-3 text-[10px] tracking-[.18em] font-semibold flex items-center justify-center gap-2"
              >
                <Icon name="type" className="w-4 h-4" />
                <span>{a.readSelectionBtn}</span>
              </button>
            </div>

            {/* Ongoing Speech Player Controls */}
            {isSpeaking && (
              <div className="bg-sand/30 border border-gold/30 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex gap-0.5 items-end h-4">
                    <span className="w-1 bg-gold h-3 animate-pulse" />
                    <span className="w-1 bg-gold h-4 animate-bounce" />
                    <span className="w-1 bg-gold h-2 animate-pulse" />
                  </span>
                  <span className="text-[11px] font-medium text-brown">Speech Active</span>
                </div>

                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <button
                      onClick={resumeSpeech}
                      aria-label={a.resumeSpeechBtn}
                      className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-brown text-cream hover:bg-gold hover:text-brown transition-colors"
                    >
                      {a.resumeSpeechBtn}
                    </button>
                  ) : (
                    <button
                      onClick={pauseSpeech}
                      aria-label={a.pauseSpeechBtn}
                      className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-brown text-cream hover:bg-gold hover:text-brown transition-colors"
                    >
                      {a.pauseSpeechBtn}
                    </button>
                  )}
                  <button
                    onClick={stopSpeech}
                    aria-label={a.stopSpeechBtn}
                    className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border border-brown/30 text-brown hover:bg-brown/10 transition-colors"
                  >
                    {a.stopSpeechBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Reading Speed */}
            <div className="pt-2">
              <label className="text-[10px] uppercase tracking-widest text-brown/60 block mb-2 font-mono">
                {a.speechRateLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { rate: 0.8, label: a.rateSlow },
                  { rate: 1.0, label: a.rateNormal },
                  { rate: 1.2, label: a.rateFast },
                ].map((item) => (
                  <button
                    key={item.rate}
                    onClick={() => setSpeechRate(item.rate)}
                    className={`py-1.5 px-2 text-[10px] uppercase tracking-wider border text-center transition-all ${
                      speechRate === item.rate
                        ? "bg-brown text-gold border-gold font-semibold"
                        : "bg-white border-brown/20 text-brown/70 hover:border-brown"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Color Blindness & Contrast Modes */}
          <div className="pt-6 space-y-4">
            <div>
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
                02 • COLOR VISION & CONTRAST
              </span>
              <h3 className="font-serif text-base tracking-wide text-brown font-medium">
                {a.colorBlindTitle}
              </h3>
              <p className="text-xs text-brown/70 leading-relaxed font-light mt-1">
                {a.colorBlindDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {colorModeOptions.map((opt) => {
                const active = colorMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setColorMode(opt.id)}
                    className={`p-3 text-left border transition-all flex items-start justify-between gap-3 ${
                      active
                        ? "border-gold bg-sand/35 shadow-sm ring-1 ring-gold"
                        : "border-brown/15 bg-white hover:border-brown/40"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border ${opt.preview} flex-shrink-0`}
                        />
                        <span className="text-xs font-semibold tracking-wide text-brown">
                          {opt.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-brown/65 leading-snug font-light">
                        {opt.desc}
                      </p>
                    </div>

                    <div className="pt-0.5">
                      {active ? (
                        <span className="w-5 h-5 rounded-full bg-gold text-brown flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-brown/20 block" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Reading & Typography Assistance */}
          <div className="pt-6 space-y-5">
            <div>
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
                03 • DYSLEXIA & READABILITY
              </span>
              <h3 className="font-serif text-base tracking-wide text-brown font-medium">
                {a.readingTitle}
              </h3>
            </div>

            {/* Text Scaling */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-brown/60 block mb-2 font-mono">
                {a.textSizeLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "normal", label: a.textNormal },
                    { id: "large", label: a.textLarge },
                    { id: "xlarge", label: a.textXLarge },
                  ] as { id: TextSize; label: string }[]
                ).map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setTextSize(size.id)}
                    className={`py-2 px-2 text-[10px] uppercase tracking-wider border text-center transition-all ${
                      textSize === size.id
                        ? "bg-brown text-gold border-gold font-semibold"
                        : "bg-white border-brown/20 text-brown/70 hover:border-brown"
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dyslexia-Friendly Font */}
            <div className="bg-white border border-brown/15 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-brown block">
                  {a.dyslexiaFontLabel}
                </span>
                <span className="text-[11px] text-brown/65 leading-tight block mt-0.5">
                  {a.dyslexiaFontDesc}
                </span>
              </div>
              <button
                onClick={() => setDyslexicFont(!dyslexicFont)}
                role="switch"
                aria-checked={dyslexicFont}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  dyslexicFont ? "bg-gold" : "bg-brown/25"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    dyslexicFont ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Reading Ruler / Focus Guide */}
            <div className="bg-white border border-brown/15 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-brown block">
                  {a.readingGuideLabel}
                </span>
                <span className="text-[11px] text-brown/65 leading-tight block mt-0.5">
                  {a.readingGuideDesc}
                </span>
              </div>
              <button
                onClick={() => setReadingGuide(!readingGuide)}
                role="switch"
                aria-checked={readingGuide}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  readingGuide ? "bg-gold" : "bg-brown/25"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    readingGuide ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Highlight & Underline Links */}
            <div className="bg-white border border-brown/15 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-brown block">
                  {a.highlightLinksLabel}
                </span>
                <span className="text-[11px] text-brown/65 leading-tight block mt-0.5">
                  {a.highlightLinksDesc}
                </span>
              </div>
              <button
                onClick={() => setHighlightLinks(!highlightLinks)}
                role="switch"
                aria-checked={highlightLinks}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  highlightLinks ? "bg-gold" : "bg-brown/25"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    highlightLinks ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 4: Motion & Comfort */}
          <div className="pt-6 space-y-4">
            <div>
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
                04 • MOTION & COMFORT
              </span>
              <h3 className="font-serif text-base tracking-wide text-brown font-medium">
                {a.motionTitle}
              </h3>
            </div>

            <div className="bg-white border border-brown/15 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-brown block">
                  {a.pauseAnimationsLabel}
                </span>
                <span className="text-[11px] text-brown/65 leading-tight block mt-0.5">
                  {a.pauseAnimationsDesc}
                </span>
              </div>
              <button
                onClick={() => setPauseAnimations(!pauseAnimations)}
                role="switch"
                aria-checked={pauseAnimations}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pauseAnimations ? "bg-gold" : "bg-brown/25"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    pauseAnimations ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-brown/15 p-5 bg-sand/20 space-y-3">
          <button
            onClick={resetAll}
            className="w-full btn btn-line py-3 text-[10px] tracking-[.2em] font-semibold text-brown hover:bg-brown hover:text-cream flex items-center justify-center gap-2"
          >
            <Icon name="refresh" className="w-3.5 h-3.5" />
            <span>{a.resetAllBtn}</span>
          </button>
          <p className="text-[10px] text-center text-brown/50 tracking-wider">
            {a.savedNote}
          </p>
        </div>
      </div>
      )}
    </>
  );
}
