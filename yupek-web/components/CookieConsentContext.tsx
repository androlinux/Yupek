"useclient";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type CookieCategory,
  type CookieConsentPreferences,
  CONSENT_EVENT_NAME,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  getStoredConsent,
  hasConsent as checkConsent,
  saveStoredConsent,
} from "@/lib/cookieConsent";

interface CookieConsentContextType {
  consent: CookieConsentPreferences | null;
  isLoaded: boolean;
  bannerOpen: boolean;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: { analytics: boolean; marketing: boolean }) => void;
  hasConsent: (category: CookieCategory) => boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentPreferences | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync initial stored consent on client mount
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    }
    setIsLoaded(true);
  }, []);

  // Listen for consent updates across tabs or within application
  useEffect(() => {
    const handleConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CookieConsentPreferences>;
      if (customEvent.detail) {
        setConsent(customEvent.detail);
      } else {
        const stored = getStoredConsent();
        setConsent(stored);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) {
        const stored = getStoredConsent();
        setConsent(stored);
      }
    };

    window.addEventListener(CONSENT_EVENT_NAME, handleConsentUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(CONSENT_EVENT_NAME, handleConsentUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    const updated: CookieConsentPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    saveStoredConsent(updated);
    setConsent(updated);
    setSettingsOpen(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    const updated: CookieConsentPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    saveStoredConsent(updated);
    setConsent(updated);
    setSettingsOpen(false);
  }, []);

  const savePreferences = useCallback(
    (prefs: { analytics: boolean; marketing: boolean }) => {
      const updated: CookieConsentPreferences = {
        essential: true,
        analytics: Boolean(prefs.analytics),
        marketing: Boolean(prefs.marketing),
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION,
      };
      saveStoredConsent(updated);
      setConsent(updated);
      setSettingsOpen(false);
    },
    []
  );

  const hasCategoryConsent = useCallback((category: CookieCategory) => {
    return checkConsent(category);
  }, []);

  // Show banner only after client mount and if no explicit choice has been stored
  const bannerOpen = isLoaded && consent === null;

  const value: CookieConsentContextType = {
    consent,
    isLoaded,
    bannerOpen,
    settingsOpen,
    openSettings,
    closeSettings,
    acceptAll,
    rejectNonEssential,
    savePreferences,
    hasConsent: hasCategoryConsent,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextType {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return ctx;
}
