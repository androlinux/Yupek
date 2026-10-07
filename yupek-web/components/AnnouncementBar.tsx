"use client";
import Link from "next/link";
import { useSiteConfig } from "./ConfigContext";
import { useLanguage } from "./LanguageContext";

export default function AnnouncementBar() {
  const { config } = useSiteConfig();
  const { t, locale } = useLanguage();

  if (!config.announcementEnabled) {
    return null;
  }

  // Use localized text if default config, or custom text
  const isDefaultText =
    !config.announcementText ||
    config.announcementText ===
      "COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100 — CLIENT CONCIERGE ASSISTANCE AVAILABLE";
  const displayText = isDefaultText || locale === "nl" ? t.announcement.text : config.announcementText;
  const displayBadge = isDefaultText || locale === "nl" ? t.announcement.badge : config.announcementBadge;

  const content = (
    <div className="relative overflow-hidden bg-brown py-2 px-3 sm:px-4 text-center text-[10px] uppercase tracking-[.25em] text-cream/90 transition-colors hover:text-cream">
      <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-full min-w-0">
        {displayBadge && (
          <span className="hidden sm:inline-block shrink-0 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[8px] font-semibold text-gold tracking-widest">
            {displayBadge}
          </span>
        )}
        <span className="truncate min-w-0 block">{displayText}</span>
      </div>
    </div>
  );

  if (config.announcementLink) {
    return (
      <Link href={config.announcementLink} className="block group">
        {content}
      </Link>
    );
  }

  return content;
}
