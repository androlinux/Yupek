"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useLanguage } from "./LanguageContext";

export type TextSize = "normal" | "large" | "xlarge";
export type ColorMode = "normal" | "high-contrast" | "deuteranopia" | "protanopia" | "tritanopia" | "monochrome";

interface AccessibilityState {
  textSize: TextSize;
  dyslexicFont: boolean;
  readingGuide: boolean;
  colorMode: ColorMode;
  highlightLinks: boolean;
  pauseAnimations: boolean;
  speechRate: number;
}

interface AccessibilityContextType extends AccessibilityState {
  isSpeaking: boolean;
  isPaused: boolean;
  drawerOpen: boolean;
  setTextSize: (size: TextSize) => void;
  setDyslexicFont: (enabled: boolean) => void;
  setReadingGuide: (enabled: boolean) => void;
  setColorMode: (mode: ColorMode) => void;
  setHighlightLinks: (enabled: boolean) => void;
  setPauseAnimations: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
  speakText: (customText?: string) => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;
  resetAll: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const defaultState: AccessibilityState = {
  textSize: "normal",
  dyslexicFont: false,
  readingGuide: false,
  colorMode: "normal",
  highlightLinks: false,
  pauseAnimations: false,
  speechRate: 1.0,
};

const STORAGE_KEY = "yupek-a11y-preferences";

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguage();
  const [prefs, setPrefs] = useState<AccessibilityState>(defaultState);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Restore stored preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPrefs((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // storage unavailable / blocked
    }
    setMounted(true);
  }, []);

  // Persist preferences
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs, mounted]);

  // Synchronize CSS classes on document.documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Text size
    root.classList.remove("a11y-text-large", "a11y-text-xlarge");
    if (prefs.textSize === "large") root.classList.add("a11y-text-large");
    if (prefs.textSize === "xlarge") root.classList.add("a11y-text-xlarge");

    // Dyslexic font
    if (prefs.dyslexicFont) root.classList.add("a11y-dyslexic");
    else root.classList.remove("a11y-dyslexic");

    // Link highlights
    if (prefs.highlightLinks) root.classList.add("a11y-highlight-links");
    else root.classList.remove("a11y-highlight-links");

    // Pause animations
    if (prefs.pauseAnimations) root.classList.add("a11y-pause-animations");
    else root.classList.remove("a11y-pause-animations");

    // Color modes
    root.classList.remove(
      "a11y-high-contrast",
      "a11y-filter-deuteranopia",
      "a11y-filter-protanopia",
      "a11y-filter-tritanopia",
      "a11y-filter-monochrome"
    );
    if (prefs.colorMode === "high-contrast") root.classList.add("a11y-high-contrast");
    if (prefs.colorMode === "deuteranopia") root.classList.add("a11y-filter-deuteranopia");
    if (prefs.colorMode === "protanopia") root.classList.add("a11y-filter-protanopia");
    if (prefs.colorMode === "tritanopia") root.classList.add("a11y-filter-tritanopia");
    if (prefs.colorMode === "monochrome") root.classList.add("a11y-filter-monochrome");
  }, [prefs]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-To-Speech Functions
  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const pauseSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const speakText = useCallback(
    (customText?: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      let targetText = customText?.trim();

      // If no custom text provided, check for active selection
      if (!targetText) {
        const selection = window.getSelection()?.toString().trim();
        if (selection) {
          targetText = selection;
        } else {
          // Read page main content
          const main = document.getElementById("main") || document.querySelector("main") || document.body;
          // Filter out script/style/nav text and get clean readable sentences
          const raw = main.innerText || "";
          targetText = raw
            .replace(/\s+/g, " ")
            .slice(0, 3500)
            .trim();
        }
      }

      if (!targetText) return;

      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.lang = locale === "nl" ? "nl-NL" : "en-US";
      utterance.rate = prefs.speechRate;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [locale, prefs.speechRate]
  );

  const setTextSize = useCallback((textSize: TextSize) => setPrefs((p) => ({ ...p, textSize })), []);
  const setDyslexicFont = useCallback((dyslexicFont: boolean) => setPrefs((p) => ({ ...p, dyslexicFont })), []);
  const setReadingGuide = useCallback((readingGuide: boolean) => setPrefs((p) => ({ ...p, readingGuide })), []);
  const setColorMode = useCallback((colorMode: ColorMode) => setPrefs((p) => ({ ...p, colorMode })), []);
  const setHighlightLinks = useCallback((highlightLinks: boolean) => setPrefs((p) => ({ ...p, highlightLinks })), []);
  const setPauseAnimations = useCallback((pauseAnimations: boolean) => setPrefs((p) => ({ ...p, pauseAnimations })), []);
  const setSpeechRate = useCallback((speechRate: number) => setPrefs((p) => ({ ...p, speechRate })), []);

  const resetAll = useCallback(() => {
    stopSpeech();
    setPrefs(defaultState);
  }, [stopSpeech]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      ...prefs,
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
      toggleDrawer,
    }),
    [
      prefs,
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
      toggleDrawer,
    ]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
