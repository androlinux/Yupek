"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Icon from "./ui/Icon";
import { useStore } from "./Providers";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAccessibility } from "./AccessibilityContext";

export default function Header() {
  const path = usePathname();
  const home = path === "/";
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { count, wishlist, setCartOpen, setSearchOpen, menuOpen, setMenuOpen } = useStore();
  const { user, setAuthModalOpen, signOut } = useAuth();
  const { t, locale } = useLanguage();
  const { openDrawer } = useAccessibility();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
  }, [path, setMenuOpen]);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const solid = scrolled || !home || menuOpen;
  const tone = solid ? "text-brown" : "text-cream";

  const navLinks = [
    { label: t.nav.shop, href: "/shop" },
    { label: t.nav.collections, href: "/lookbook" },
    { label: t.nav.about, href: "/about" },
    { label: t.nav.contact, href: "/contact" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ease-in-out ${
        solid
          ? "border-b border-brown/10 bg-cream/90 backdrop-blur-md shadow-[0_4px_24px_rgba(43,29,20,0.04)]"
          : "border-b border-transparent bg-transparent"
      } ${tone}`}
    >
      <div className="wrap grid h-16 grid-cols-3 items-center md:h-20 transition-all duration-300">
        {/* Left: Desktop Navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {navLinks.map((n) => {
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className="group relative py-1 text-[11px] uppercase tracking-[.22em] transition-opacity duration-300 hover:opacity-100"
              >
                <span className={active ? "font-semibold" : "opacity-80 group-hover:opacity-100"}>
                  {n.label}
                </span>
                {/* Animated delicate underline */}
                <span
                  className={`absolute bottom-0 left-0 h-[1.5px] bg-current transition-all duration-300 ease-out ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden justify-self-start min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 transition-transform active:scale-95"
          aria-label={
            menuOpen
              ? locale === "nl" ? "Menu sluiten" : "Close menu"
              : locale === "nl" ? "Menu openen" : "Open menu"
          }
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? "close" : "menu"} className="h-6 w-6" />
        </button>

        {/* Center: Brand Logo with dynamic scale & theme-responsive cross-fade */}
        <Link
          href="/"
          className="justify-self-center relative flex items-center justify-center py-1 group focus:outline-none"
          aria-label="YUPEK home"
        >
          {/* Light variant for dark hero transparent header */}
          <Image
            src="/images/logo-light.png"
            alt="YUPEK"
            width={180}
            height={55}
            priority
            className={`transition-all duration-500 ease-out object-contain drop-shadow-sm w-auto ${
              scrolled ? "h-11 md:h-13" : "h-12 md:h-15"
            } ${solid ? "opacity-0 absolute pointer-events-none scale-95" : "opacity-100 scale-100"} group-hover:scale-105`}
          />
          {/* Dark/Original variant for cream/solid header */}
          <Image
            src="/images/logo.png"
            alt="YUPEK"
            width={180}
            height={55}
            priority
            className={`transition-all duration-500 ease-out object-contain drop-shadow-sm w-auto ${
              scrolled ? "h-11 md:h-13" : "h-12 md:h-15"
            } ${solid ? "opacity-100 scale-100" : "opacity-0 absolute pointer-events-none scale-95"} group-hover:scale-105`}
          />
        </Link>

        {/* Right: Actions (Language Switcher, Search, Account, Wishlist, Cart) */}
        <div className="flex items-center justify-self-end gap-3.5 sm:gap-5 md:gap-6">
          {/* Language Switcher */}
          <LanguageSwitcher className="hidden sm:inline-flex" />

          {/* Search Trigger */}
          <button
            aria-label={t.nav.search}
            onClick={() => setSearchOpen(true)}
            className="p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="search" className="h-5 w-5" />
          </button>

          {/* Accessibility & Color Blind Trigger */}
          <button
            aria-label={t.a11y.floatingButtonLabel}
            onClick={openDrawer}
            title={t.a11y.floatingTooltip}
            className="p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="accessibility" className="h-5 w-5" />
          </button>

          {/* User Account / Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {user ? (
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label={t.nav.account}
                className="group flex items-center gap-1.5 p-1 transition-transform active:scale-95"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-[11px] font-medium tracking-wider transition-colors group-hover:bg-brown group-hover:text-cream">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                aria-label={t.nav.signIn}
                className="p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
              >
                <Icon name="user" className="h-5 w-5" />
              </button>
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && user && (
              <div className="absolute right-0 mt-2 w-56 border border-brown/15 bg-cream p-2 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200 text-brown">
                <div className="border-b border-brown/10 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-brown/60">
                    {locale === "nl" ? "Ingelogd als" : "Signed in as"}
                  </p>
                  <p className="truncate text-xs font-semibold text-brown">{user.name}</p>
                  <span className="mt-0.5 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[8px] uppercase tracking-wider text-brown">
                    {user.role === "admin" ? t.account.adminMemberTag : t.account.vipMemberTag}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                  >
                    {t.nav.account}
                  </Link>
                  <Link
                    href="/account?tab=orders"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                  >
                    {t.account.ordersTab} ({user.orders?.length || 0})
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                  >
                    {t.nav.wishlist} ({wishlist.length})
                  </Link>
                </div>

                <div className="border-t border-brown/10 pt-1">
                  <button
                    onClick={() => {
                      signOut();
                      setUserDropdownOpen(false);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs tracking-wider text-brown/70 hover:text-burgundy hover:bg-burgundy/5 transition-colors"
                  >
                    {t.nav.signOut}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wishlist Link (Desktop) */}
          <Link
            href="/wishlist"
            aria-label={`${t.nav.wishlist}, ${wishlist.length} ${t.cart.itemsCount}`}
            className="relative hidden md:block p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="heart" className="h-5 w-5" />
            {wishlist.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-brown">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Shopping Bag Button with Bounce Counter */}
          <button
            aria-label={`${t.nav.bag}, ${count} ${t.cart.itemsCount}`}
            onClick={() => setCartOpen(true)}
            className="group relative p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="bag" className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-burgundy text-[9px] font-bold text-cream animate-pulse shadow-sm">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation with Staggered Entrance */}
      <div
        className={`overflow-hidden bg-cream text-brown transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          menuOpen ? "max-h-[560px] border-t border-brown/10 shadow-xl opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <nav aria-label="Mobile" className="wrap flex flex-col gap-4 py-6">
          <div className="flex items-center justify-between pb-2 border-b border-brown/10">
            <span className="text-[10px] uppercase tracking-widest text-brown/60">Language / Taal</span>
            <LanguageSwitcher />
          </div>

          {[
            { label: t.nav.shop, href: "/shop" },
            { label: t.nav.collections, href: "/lookbook" },
            { label: t.nav.journal, href: "/journal" },
            { label: t.nav.about, href: "/about" },
            { label: t.nav.contact, href: "/contact" },
            { label: `${t.nav.wishlist} (${wishlist.length})`, href: "/wishlist" },
          ].map((n, idx) => (
            <Link
              key={n.label}
              href={n.href}
              style={{ transitionDelay: `${idx * 40}ms` }}
              className={`font-serif text-xl tracking-[.15em] transition-transform duration-300 hover:translate-x-2 ${
                path === n.href ? "text-burgundy font-medium" : "text-brown"
              }`}
            >
              {n.label}
            </Link>
          ))}

          {/* Mobile Auth button */}
          <div className="mt-4 border-t border-brown/10 pt-4 flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <Link href="/account" className="flex items-center gap-2 text-xs uppercase tracking-widest text-brown">
                  <Icon name="user" className="h-4 w-4" />
                  <span>{user.name}</span>
                </Link>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAuthModalOpen(true);
                }}
                className="flex items-center gap-2 text-xs uppercase tracking-widest text-brown"
              >
                <Icon name="user" className="h-4 w-4" />
                <span>{t.nav.signIn}</span>
              </button>
            )}
          </div>

          {/* Mobile Accessibility Button */}
          <div className="border-t border-brown/10 pt-3">
            <button
              onClick={() => {
                setMenuOpen(false);
                openDrawer();
              }}
              className="flex items-center justify-between w-full py-1 text-xs uppercase tracking-widest text-brown hover:text-gold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon name="accessibility" className="h-4 w-4 text-gold" />
                <span>{t.a11y.drawerTitle}</span>
              </span>
              <span className="text-[10px] text-brown/50 font-mono">Audio & Vision</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
