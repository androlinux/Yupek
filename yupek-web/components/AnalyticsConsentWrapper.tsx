"use client";

import { useCookieConsent } from "./CookieConsentContext";
import { Analytics } from "@vercel/analytics/next";

/**
 * AnalyticsConsentWrapper
 * 
 * Strictly gates analytics tracking under European Union ePrivacy Directive & GDPR.
 * Vercel Analytics is NEVER rendered or executed until the user explicitly consents
 * to the "analytics" cookie category.
 */
export default function AnalyticsConsentWrapper() {
  const { consent, isLoaded } = useCookieConsent();

  if (!isLoaded || consent?.analytics !== true) {
    return null;
  }

  return <Analytics />;
}
