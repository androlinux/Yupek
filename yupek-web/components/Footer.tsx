"use client";

import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";
import Icon from "./ui/Icon";
import { useLanguage } from "./LanguageContext";
import { useAccessibility } from "./AccessibilityContext";
import { useCookieConsent } from "./CookieConsentContext";

export default function Footer() {
  const { t, locale } = useLanguage();
  const { openDrawer } = useAccessibility();
  const { openSettings } = useCookieConsent();

  const navCols = [
    { label: t.nav.shop, href: "/shop" },
    { label: t.nav.collections, href: "/lookbook" },
    { label: t.nav.journal, href: "/journal" },
    { label: t.nav.about, href: "/about" },
    { label: t.nav.account, href: "/account" },
  ];

  return (
    <footer className="bg-brown text-cream">
      <div className="wrap grid gap-12 py-20 sm:grid-cols-2 lg:grid-cols-4">
        {/* Column 1: Brand Heritage */}
        <div>
          <Link href="/" className="inline-block group focus:outline-none" aria-label="YUPEK home">
            <Image
              unoptimized
              src="/images/logo-light.png"
              alt="YUPEK"
              width={180}
              height={131}
              loading="lazy"
              className="h-16 md:h-20 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md"
            />
          </Link>
          <p className="label mt-5 leading-7 text-cream/70">
            {t.hero.tagline1}<br />{t.hero.tagline2}
          </p>
          <p className="mt-4 text-xs text-cream/50 max-w-xs leading-relaxed">
            {t.footer.citySummary}
          </p>
          <div className="mt-6 flex items-center">
            <Image
              unoptimized
              src="/images/logo-symbol.png"
              alt=""
              width={24}
              height={24}
              loading="lazy"
              className="h-6 w-6 object-contain opacity-85"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Column 2: Navigation */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] uppercase tracking-widest text-cream/50">
            {locale === "nl" ? "NAVIGATIE" : "NAVIGATION"}
          </span>
          <nav aria-label="Footer" className="flex flex-col gap-3">
            {navCols.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="label transition-colors hover:text-gold text-[11px] tracking-[.2em]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Column 3: SUPPORT SERVICE */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] uppercase tracking-widest text-cream/50">
            {t.footer.supportService || "SUPPORT SERVICE"}
          </span>
          <p className="text-xs text-cream/70 leading-relaxed max-w-xs">
            {t.footer.needHelpDesc || (locale === "nl" ? "Hulp nodig? Neem contact op met onze klantenservice." : "Need help? Contact our support service.")}
          </p>
          <nav aria-label="Support Service" className="flex flex-col gap-3">
            <Link
              href="/contact"
              className="label transition-colors hover:text-gold text-[11px] tracking-[.2em]"
            >
              {t.footer.contactSupport || (locale === "nl" ? "Contact Klantenservice" : "Contact Support")}
            </Link>
            <Link
              href="/shipping"
              className="label transition-colors hover:text-gold text-[11px] tracking-[.2em]"
            >
              {t.footer.shippingPolicy || (locale === "nl" ? "Verzendbeleid" : "Shipping Policy")}
            </Link>
            <Link
              href="/returns"
              className="label transition-colors hover:text-gold text-[11px] tracking-[.2em]"
            >
              {t.footer.returns30Days || (locale === "nl" ? "Retourbeleid" : "Returns & Exchanges")}
            </Link>
            <Link
              href="/account"
              className="label transition-colors hover:text-gold text-[11px] tracking-[.2em]"
            >
              {t.footer.orderHelp || (locale === "nl" ? "Hulp bij Bestelling" : "Order Help")}
            </Link>
          </nav>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-block border border-cream/30 text-cream hover:bg-cream hover:text-brown transition-colors text-[10px] tracking-[.2em] uppercase font-semibold py-2.5 px-4 text-center"
            >
              {t.footer.contactSupport || (locale === "nl" ? "Contact Klantenservice" : "Contact Support")}
            </Link>
          </div>
        </div>

        {/* Column 4: Social / Follow */}
        <div className="flex flex-col gap-4 sm:items-start lg:items-end">
          <span className="text-[10px] uppercase tracking-widest text-cream/50">
            {t.footer.followYupek}
          </span>
          <ul className="flex flex-col gap-2.5 sm:items-start lg:items-end">
            {site.social.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  className="label transition-colors hover:text-gold text-[11px] tracking-[.2em]"
                  rel="noopener noreferrer"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sub-footer legal bar */}
      <div className="border-t border-cream/15">
        <div className="wrap flex flex-col justify-between gap-4 py-6 text-[10px] uppercase tracking-[.2em] text-cream/60 md:flex-row items-center">
          <p>© 2026 YUPEK. {t.common.allRightsReserved}.</p>
          <div className="flex flex-wrap gap-6 items-center">
            <Link href="/privacy" className="hover:text-cream transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <Link href="/terms" className="hover:text-cream transition-colors">
              {t.footer.termsOfService}
            </Link>
            <Link href="/shipping" className="hover:text-cream transition-colors">
              {t.footer.shippingPolicy}
            </Link>
            <Link href="/returns" className="hover:text-cream transition-colors">
              {t.footer.returns30Days}
            </Link>
            <Link href="/returns" className="hover:text-cream transition-colors">
              {t.footer.euCompliance}
            </Link>
            <button
              type="button"
              onClick={openSettings}
              className="hover:text-cream transition-colors uppercase tracking-[.2em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
            >
              {t.footer.cookiePreferences}
            </button>
            <button
              onClick={openDrawer}
              aria-label={t.a11y.floatingButtonLabel}
              className="hover:text-cream transition-colors uppercase inline-flex items-center gap-1.5 text-gold"
            >
              <Icon name="accessibility" className="w-3 h-3 text-gold" aria-hidden="true" />
              <span>{t.a11y.drawerTitle}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
