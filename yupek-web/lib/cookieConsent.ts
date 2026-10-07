/**
 * YUPEK — GDPR Cookie Consent Core Utility
 * Compliant with EU ePrivacy Directive & GDPR (Netherlands / European Union).
 * Non-essential cookies (Analytics, Marketing) are strictly blocked by default until explicit consent.
 */

export type CookieCategory = "essential" | "analytics" | "marketing";

export interface CookieConsentPreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export const CONSENT_STORAGE_KEY = "yupek_cookie_consent";
export const CONSENT_COOKIE_NAME = "yupek_cookie_consent";
export const CONSENT_VERSION = "1.0";
export const CONSENT_EVENT_NAME = "yupek_consent_update";

/**
 * Read the current stored consent preferences from localStorage or cookie.
 * Returns null if the user has not yet made an explicit choice.
 */
export function getStoredConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Try localStorage first (fast synchronous access)
    const local = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (isValidConsent(parsed)) {
        return parsed;
      }
    }

    // 2. Fallback to document.cookie
    const cookieMatch = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

    if (cookieMatch) {
      const rawVal = cookieMatch.split("=")[1];
      const parsed = JSON.parse(decodeURIComponent(rawVal));
      if (isValidConsent(parsed)) {
        // Sync back to localStorage if missing
        try {
          localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
    }
  } catch {
    // Corrupted or blocked storage
  }

  return null;
}

/**
 * Validate that an arbitrary parsed object satisfies CookieConsentPreferences
 */
function isValidConsent(obj: any): obj is CookieConsentPreferences {
  return (
    obj &&
    typeof obj === "object" &&
    obj.essential === true &&
    typeof obj.analytics === "boolean" &&
    typeof obj.marketing === "boolean" &&
    typeof obj.timestamp === "string"
  );
}

/**
 * Save user consent choice to first-party cookie and localStorage,
 * and dispatch an event so active services can react immediately.
 */
export function saveStoredConsent(consent: CookieConsentPreferences): void {
  if (typeof window === "undefined") return;

  try {
    const jsonStr = JSON.stringify(consent);

    // 1. LocalStorage
    localStorage.setItem(CONSENT_STORAGE_KEY, jsonStr);

    // 2. First-party Cookie (1 year duration, SameSite=Lax, Secure when on HTTPS)
    const maxAge = 365 * 24 * 60 * 60; // 31,536,000 seconds
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      jsonStr
    )}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;

    // 3. Dispatch browser event for real-time gating
    window.dispatchEvent(
      new CustomEvent(CONSENT_EVENT_NAME, {
        detail: consent,
      })
    );
  } catch (err) {
    console.error("Failed to persist cookie consent:", err);
  }
}

/**
 * Central Consent Gating Utility
 * 
 * Rules:
 * - "essential": Always true (required for site functionality, auth, cart, locale).
 * - "analytics": Strictly false until explicitly accepted.
 * - "marketing": Strictly false until explicitly accepted.
 */
export function hasConsent(category: CookieCategory): boolean {
  if (category === "essential") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const stored = getStoredConsent();
  if (!stored) {
    return false;
  }

  if (category === "analytics") {
    return stored.analytics === true;
  }

  if (category === "marketing") {
    return stored.marketing === true;
  }

  return false;
}

// Expose on global window object for any external or embedded script checking
if (typeof window !== "undefined") {
  (window as any).__YUPEK_HAS_CONSENT__ = hasConsent;
  (window as any).__YUPEK_GET_CONSENT__ = getStoredConsent;
}
