"use client";

import Link from "next/link";
import { site } from "@/config/site";
import { Pattern } from "./ui/Pattern";
import Icon from "./ui/Icon";
import { useLanguage } from "./LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAccessibility } from "./AccessibilityContext";

export default function Footer() {
  const { t } = useLanguage();
  const { openDrawer } = useAccessibility();

  const navCols = [
    { label: t.nav.shop, href: "/shop" },
    { label: t.nav.collections, href: "/lookbook" },
    { label: t.nav.journal, href: "/journal" },
    { label: t.nav.about, href: "/about" },
    { label: t.nav.contact, href: "/contact" },
    { label: t.nav.account, href: "/account" },
  ];

  return (
    <footer className="bg-brown text-cream">
      <div className="wrap grid gap-12 py-20 md:grid-cols-3">
        <div>
          <Link href="/" className="inline-block group focus:outline-none" aria-label="YUPEK home">
            <img
              src="/images/logo-light.png"
              alt="YUPEK"
              className="h-16 md:h-20 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-md"
            />
          </Link>
          <p className="label mt-5 leading-7 text-cream/70">
            {t.hero.tagline1}<br />{t.hero.tagline2}
          </p>
          <p className="mt-4 text-xs text-cream/50 max-w-xs leading-relaxed">
            {t.footer.citySummary}
          </p>
          <div className="mt-6 flex items-center gap-4">
            <img src="/images/logo-symbol.png" alt="" className="h-6 w-6 object-contain opacity-85" aria-hidden="true" />
            <div className="border-l border-cream/20 pl-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3 md:items-center">
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

        <div className="flex flex-col gap-4 md:items-end">
          <span className="text-[10px] uppercase tracking-widest text-cream/50">
            {t.footer.followYupek}
          </span>
          <ul className="flex flex-col gap-2.5 md:items-end">
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

      <div className="border-t border-cream/15">
        <div className="wrap flex flex-col justify-between gap-4 py-6 text-[10px] uppercase tracking-[.2em] text-cream/60 md:flex-row items-center">
          <p>© 2026 YUPEK B.V. {t.common.allRightsReserved}.</p>
          <div className="flex flex-wrap gap-6 items-center">
            <Link href="/about" className="hover:text-cream transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <Link href="/about" className="hover:text-cream transition-colors">
              {t.footer.termsOfService}
            </Link>
            <Link href="/contact" className="hover:text-cream transition-colors">
              {t.footer.complimentaryShipping}
            </Link>
            <Link href="/returns" className="hover:text-cream transition-colors">
              {t.footer.returns30Days}
            </Link>
            <Link href="/returns" className="hover:text-cream transition-colors">
              {t.footer.euCompliance}
            </Link>
            <button
              onClick={openDrawer}
              className="hover:text-cream transition-colors uppercase inline-flex items-center gap-1.5 text-gold"
            >
              <Icon name="accessibility" className="w-3 h-3 text-gold" />
              <span>{t.a11y.drawerTitle}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
