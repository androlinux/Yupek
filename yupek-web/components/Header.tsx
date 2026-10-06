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

const shopCategories = [
  {
    title: "MEN",
    href: "/shop?gender=men",
    items: [
      { label: "New Arrivals", href: "/shop?gender=men&isNew=true" },
      { label: "T-Shirts", href: "/shop?gender=men&category=tees" },
      { label: "Shirts", href: "/shop?gender=men&category=shirts" },
      { label: "Sweatshirts", href: "/shop?gender=men&category=sweatshirts" },
      { label: "Trousers", href: "/shop?gender=men&category=trousers" },
      { label: "Denim", href: "/shop?gender=men&category=denim" },
      { label: "Accessories", href: "/shop?gender=men&category=accessories" },
    ]
  },
  {
    title: "WOMEN",
    href: "/shop?gender=women",
    items: [
      { label: "New Arrivals", href: "/shop?gender=women&isNew=true" },
      { label: "T-Shirts", href: "/shop?gender=women&category=tees" },
      { label: "Shirts", href: "/shop?gender=women&category=shirts" },
      { label: "Sweatshirts", href: "/shop?gender=women&category=sweatshirts" },
      { label: "Trousers", href: "/shop?gender=women&category=trousers" },
      { label: "Denim", href: "/shop?gender=women&category=denim" },
      { label: "Accessories", href: "/shop?gender=women&category=accessories" },
    ]
  },
  {
    title: "UNISEX",
    href: "/shop?gender=unisex",
    items: [
      { label: "T-Shirts", href: "/shop?gender=unisex&category=tees" },
      { label: "Shirts", href: "/shop?gender=unisex&category=shirts" },
      { label: "Sweatshirts", href: "/shop?gender=unisex&category=sweatshirts" },
      { label: "Trousers", href: "/shop?gender=unisex&category=trousers" },
      { label: "Accessories", href: "/shop?gender=unisex&category=accessories" },
    ]
  },
  {
    title: "FEATURED",
    href: "/shop",
    items: [
      { label: "New Arrivals", href: "/shop?isNew=true" },
      { label: "Eastern Heritage", href: "/lookbook" },
      { label: "Silk Inspired", href: "/lookbook" },
      { label: "Essentials", href: "/shop" },
    ]
  }
];

const collectionsCategories = [
  {
    title: "FEATURED COLLECTIONS",
    href: "/lookbook",
    items: [
      { label: "Eastern Heritage", desc: "Contemporary silhouettes inspired by Eastern heritage.", href: "/lookbook" },
      { label: "Silk Inspired", desc: "Soft textures and patterns inspired by silk traditions.", href: "/lookbook" },
      { label: "Essentials", desc: "Everyday YUPEK pieces.", href: "/shop" },
    ]
  },
  {
    title: "NEW ARRIVALS",
    href: "/shop?isNew=true",
    items: [
      { label: "Latest pieces from the collection.", desc: "", href: "/shop?isNew=true" }
    ]
  }
];

export default function Header() {
  const path = usePathname();
  const home = path === "/";
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mega Menu State
  const [activeMenu, setActiveMenu] = useState<"shop" | "collections" | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile Accordion State
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);

  const { count, wishlist, setCartOpen, setSearchOpen, menuOpen, setMenuOpen } = useStore();
  const { user, setAuthModalOpen, signOut } = useAuth();
  const { t, locale } = useLanguage();
  const { openDrawer } = useAccessibility();

  useEffect(() => {
    let lastScrolled = false;
    let ticking = false;

    const updateScroll = () => {
      const isPast = window.scrollY > 30;
      if (isPast !== lastScrolled) {
        lastScrolled = isPast;
        setScrolled(isPast);
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    updateScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change or escape
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
    setActiveMenu(null);
  }, [path, setMenuOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Click outside user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = (menu: "shop" | "collections") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 200);
  };

  const isMegaMenuOpen = activeMenu !== null;
  const solid = scrolled || !home || menuOpen || isMegaMenuOpen;
  const tone = solid ? "text-brown" : "text-cream";

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ease-in-out ${
        solid
          ? "border-b border-brown/10 bg-cream/95 backdrop-blur-md shadow-[0_4px_24px_rgba(43,29,20,0.04)]"
          : "border-b border-transparent bg-transparent"
      } ${tone}`}
      onMouseLeave={handleMouseLeave}
    >
      <div className="wrap grid h-16 grid-cols-3 items-center md:h-20 transition-all duration-300 relative z-50">
        {/* Left: Desktop Navigation */}
        <nav aria-label="Primary" className="hidden md:flex">
          <ul className="flex items-center gap-7">
            <li>
              <Link
                href="/shop"
                onMouseEnter={() => handleMouseEnter("shop")}
                onFocus={() => handleMouseEnter("shop")}
                className="group relative py-4 text-[11px] uppercase tracking-[.22em] transition-opacity duration-300 hover:opacity-100"
                aria-expanded={activeMenu === "shop"}
                aria-haspopup="true"
                aria-controls="mega-menu-shop"
              >
                <span className={path.startsWith("/shop") ? "font-semibold" : "opacity-80 group-hover:opacity-100"}>
                  {t.nav.shop}
                </span>
                <span
                  className={`absolute bottom-2 left-0 h-[1.5px] bg-current transition-all duration-300 ease-out ${
                    path.startsWith("/shop") ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            </li>
            <li>
              <Link
                href="/lookbook"
                onMouseEnter={() => handleMouseEnter("collections")}
                onFocus={() => handleMouseEnter("collections")}
                className="group relative py-4 text-[11px] uppercase tracking-[.22em] transition-opacity duration-300 hover:opacity-100"
                aria-expanded={activeMenu === "collections"}
                aria-haspopup="true"
                aria-controls="mega-menu-collections"
              >
                <span className={path.startsWith("/lookbook") ? "font-semibold" : "opacity-80 group-hover:opacity-100"}>
                  {t.nav.collections}
                </span>
                <span
                  className={`absolute bottom-2 left-0 h-[1.5px] bg-current transition-all duration-300 ease-out ${
                    path.startsWith("/lookbook") ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                onMouseEnter={handleMouseLeave}
                className="group relative py-4 text-[11px] uppercase tracking-[.22em] transition-opacity duration-300 hover:opacity-100"
              >
                <span className={path === "/about" ? "font-semibold" : "opacity-80 group-hover:opacity-100"}>
                  {t.nav.about}
                </span>
                <span
                  className={`absolute bottom-2 left-0 h-[1.5px] bg-current transition-all duration-300 ease-out ${
                    path === "/about" ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                onMouseEnter={handleMouseLeave}
                className="group relative py-4 text-[11px] uppercase tracking-[.22em] transition-opacity duration-300 hover:opacity-100"
              >
                <span className={path === "/contact" ? "font-semibold" : "opacity-80 group-hover:opacity-100"}>
                  {t.nav.contact}
                </span>
                <span
                  className={`absolute bottom-2 left-0 h-[1.5px] bg-current transition-all duration-300 ease-out ${
                    path === "/contact" ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            </li>
          </ul>
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden justify-self-start min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 transition-transform active:scale-95 text-current"
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

        {/* Center: Brand Logo */}
        <Link
          href="/"
          className="justify-self-center relative flex items-center justify-center py-1 group focus:outline-none"
          aria-label="YUPEK home"
          onMouseEnter={handleMouseLeave}
        >
          <Image
            src="/images/logo-light.png"
            alt="YUPEK"
            width={180}
            height={55}
            priority
            className={`transition-all duration-500 ease-out object-contain drop-shadow-sm w-auto ${
              scrolled || isMegaMenuOpen ? "h-11 md:h-13" : "h-12 md:h-15"
            } ${solid ? "opacity-0 absolute pointer-events-none scale-95" : "opacity-100 scale-100"} group-hover:scale-105`}
          />
          <Image
            src="/images/logo.png"
            alt=""
            width={180}
            height={55}
            priority={false}
            loading="eager"
            className={`transition-all duration-500 ease-out object-contain drop-shadow-sm w-auto ${
              scrolled || isMegaMenuOpen ? "h-11 md:h-13" : "h-12 md:h-15"
            } ${solid ? "opacity-100 scale-100" : "opacity-0 absolute pointer-events-none scale-95"} group-hover:scale-105`}
          />
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center justify-self-end gap-3.5 sm:gap-5 md:gap-6" onMouseEnter={handleMouseLeave}>
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <button
            aria-label={t.nav.search}
            onClick={() => setSearchOpen(true)}
            className="p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="search" className="h-5 w-5" />
          </button>

          <button
            aria-label={t.a11y.floatingButtonLabel}
            onClick={openDrawer}
            title={t.a11y.floatingTooltip}
            className="p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="accessibility" className="h-5 w-5" />
          </button>

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

            {userDropdownOpen && user && (
              <div role="menu" className="absolute right-0 mt-2 w-56 border border-brown/15 bg-cream p-2 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200 text-brown">
                <div className="border-b border-brown/10 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-brown/60">
                    {locale === "nl" ? "Ingelogd als" : "Signed in as"}
                  </p>
                  <p className="truncate text-xs font-semibold text-brown">{user.name}</p>
                </div>
                <div className="py-1">
                  <Link role="menuitem" href="/account" onClick={() => setUserDropdownOpen(false)} className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors">
                    {t.nav.account}
                  </Link>
                  <Link role="menuitem" href="/wishlist" onClick={() => setUserDropdownOpen(false)} className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors">
                    {t.nav.wishlist} ({wishlist.length})
                  </Link>
                </div>
                <div className="border-t border-brown/10 pt-1">
                  <button role="menuitem" onClick={() => { signOut(); setUserDropdownOpen(false); }} className="block w-full text-left px-3 py-1.5 text-xs tracking-wider text-brown/70 hover:text-burgundy hover:bg-burgundy/5 transition-colors">
                    {t.nav.signOut}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/wishlist"
            aria-label={`${t.nav.wishlist}, ${wishlist.length} items`}
            className="relative hidden md:block p-1 transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Icon name="heart" className="h-5 w-5" />
            {wishlist.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-brown">
                {wishlist.length}
              </span>
            )}
          </Link>

          <button
            aria-label={`${t.nav.bag}, ${count} items`}
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

      {/* Desktop Mega Menu Dropdowns */}
      <div
        className={`absolute left-0 top-full w-full bg-cream text-brown border-b border-brown/10 shadow-[0_20px_40px_-15px_rgba(43,29,20,0.05)] transition-all duration-300 origin-top z-40 ${
          activeMenu
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        onMouseEnter={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }}
        onMouseLeave={handleMouseLeave}
      >
        <div className="wrap relative">
          {/* Shop Mega Menu */}
          <div
            id="mega-menu-shop"
            className={`transition-opacity duration-300 ${
              activeMenu === "shop" ? "opacity-100 z-10 relative" : "opacity-0 absolute inset-0 z-0 pointer-events-none"
            }`}
          >
            <div className="grid grid-cols-[1fr_300px] xl:grid-cols-[1fr_400px] gap-12 py-10">
              <div className="grid grid-cols-4 gap-8">
                {shopCategories.map((col) => (
                  <div key={col.title} className="flex flex-col gap-5">
                    <Link href={col.href} onClick={() => setActiveMenu(null)} className="font-serif tracking-widest text-sm text-brown border-b border-brown/10 pb-2 hover:text-burgundy transition-colors inline-block">
                      {col.title}
                    </Link>
                    <ul className="flex flex-col gap-3">
                      {col.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={() => setActiveMenu(null)}
                            className="text-[13px] text-brown/70 hover:text-brown hover:translate-x-1 transition-all inline-block font-light"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="relative group overflow-hidden bg-sand/30 h-[360px] cursor-pointer" onClick={() => { window.location.href = "/lookbook"; setActiveMenu(null); }}>
                <Image
                  src="/images/look-4.jpg"
                  alt="Eastern Heritage Collection"
                  fill
                  sizes="400px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 text-cream">
                  <p className="text-xs uppercase tracking-widest font-semibold mb-2 text-gold">New Season</p>
                  <p className="font-serif text-2xl tracking-wide mb-1">Eastern Heritage</p>
                  <span className="text-xs tracking-widest uppercase inline-flex items-center gap-2 hover:text-gold transition-colors border-b border-transparent hover:border-gold">
                    Discover Collection <Icon name="chevron-right" className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Collections Mega Menu */}
          <div
            id="mega-menu-collections"
            className={`transition-opacity duration-300 ${
              activeMenu === "collections" ? "opacity-100 z-10 relative" : "opacity-0 absolute inset-0 z-0 pointer-events-none"
            }`}
          >
            <div className="grid grid-cols-[1fr_300px] xl:grid-cols-[1fr_400px] gap-12 py-10">
              <div className="grid grid-cols-2 gap-12">
                {collectionsCategories.map((col) => (
                  <div key={col.title} className="flex flex-col gap-5">
                    <h3 className="font-serif tracking-widest text-sm text-brown border-b border-brown/10 pb-2">
                      {col.title}
                    </h3>
                    <ul className="flex flex-col gap-6">
                      {col.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={() => setActiveMenu(null)}
                            className="group block"
                          >
                            <p className="text-[14px] text-brown font-medium group-hover:text-burgundy transition-colors">
                              {item.label}
                            </p>
                            {item.desc && (
                              <p className="text-[12px] text-brown/60 mt-1 font-light leading-relaxed max-w-xs">
                                {item.desc}
                              </p>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="relative group overflow-hidden bg-sand/30 h-[360px] cursor-pointer" onClick={() => { window.location.href = "/lookbook"; setActiveMenu(null); }}>
                <Image
                  src="/images/heritage.jpg"
                  alt="Collections"
                  fill
                  sizes="400px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 text-cream">
                  <p className="font-serif text-2xl tracking-wide mb-1">Silk Inspired</p>
                  <span className="text-xs tracking-widest uppercase inline-flex items-center gap-2 hover:text-gold transition-colors border-b border-transparent hover:border-gold mt-2">
                    View Lookbook <Icon name="chevron-right" className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <div
        aria-hidden={!menuOpen}
        inert={!menuOpen || undefined}
        className={`overflow-y-auto bg-cream text-brown transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden fixed inset-x-0 top-[64px] bottom-0 z-30 ${
          menuOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <nav aria-label="Mobile" className="wrap flex flex-col gap-0 py-2 pb-24">
          
          <div className="border-b border-brown/10 pb-4 mb-2 pt-4 px-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-brown/60">Language / Taal</span>
              <LanguageSwitcher />
            </div>
          </div>

          <ul className="flex flex-col">
            {/* Mobile Shop Accordion */}
            <li className="border-b border-brown/10">
              <button
                onClick={() => setMobileShopOpen(!mobileShopOpen)}
                className="w-full flex items-center justify-between py-5 px-2 font-serif text-xl tracking-[.15em] text-brown transition-colors hover:bg-sand/20"
                aria-expanded={mobileShopOpen}
              >
                <span>{t.nav.shop}</span>
                <Icon name={mobileShopOpen ? "minus" : "plus"} className="w-4 h-4 text-brown/50" />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  mobileShopOpen ? "max-h-[800px] opacity-100 pb-4" : "max-h-0 opacity-0"
                }`}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-4 pt-2">
                  {shopCategories.map(col => (
                    <div key={col.title}>
                      <Link href={col.href} onClick={() => setMenuOpen(false)} className="text-[11px] font-semibold uppercase tracking-widest text-brown mb-3 border-b border-brown/10 pb-1 block">
                        {col.title}
                      </Link>
                      <ul className="flex flex-col gap-3">
                        {col.items.map(item => (
                          <li key={item.label}>
                            <Link href={item.href} onClick={() => setMenuOpen(false)} className="text-[13px] font-light text-brown/70 hover:text-brown block">
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </li>

            {/* Mobile Collections Accordion */}
            <li className="border-b border-brown/10">
              <button
                onClick={() => setMobileCollectionsOpen(!mobileCollectionsOpen)}
                className="w-full flex items-center justify-between py-5 px-2 font-serif text-xl tracking-[.15em] text-brown transition-colors hover:bg-sand/20"
                aria-expanded={mobileCollectionsOpen}
              >
                <span>{t.nav.collections}</span>
                <Icon name={mobileCollectionsOpen ? "minus" : "plus"} className="w-4 h-4 text-brown/50" />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  mobileCollectionsOpen ? "max-h-[500px] opacity-100 pb-4" : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex flex-col gap-6 px-4 pt-2">
                  {collectionsCategories.map(col => (
                    <div key={col.title}>
                      <Link href={col.href} onClick={() => setMenuOpen(false)} className="text-[11px] font-semibold uppercase tracking-widest text-brown mb-3 border-b border-brown/10 pb-1 block">
                        {col.title}
                      </Link>
                      <ul className="flex flex-col gap-4">
                        {col.items.map(item => (
                          <li key={item.label}>
                            <Link href={item.href} onClick={() => setMenuOpen(false)} className="block">
                              <span className="text-[14px] font-medium text-brown block">{item.label}</span>
                              {item.desc && <span className="text-[11px] font-light text-brown/60 leading-tight mt-0.5 block">{item.desc}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </li>

            {/* Other static links */}
            {[
              { label: t.nav.about, href: "/about" },
              { label: t.nav.contact, href: "/contact" },
              { label: `${t.nav.wishlist} (${wishlist.length})`, href: "/wishlist" },
            ].map((n) => (
              <li key={n.label} className="border-b border-brown/10">
                <Link
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block py-5 px-2 font-serif text-xl tracking-[.15em] transition-colors hover:bg-sand/20 ${
                    path === n.href ? "text-burgundy font-medium" : "text-brown"
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-brown/10 pt-4 px-2">
            {user ? (
              <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-xs uppercase tracking-widest text-brown py-2">
                <Icon name="user" className="h-4 w-4" />
                <span>{user.name}</span>
              </Link>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); setAuthModalOpen(true); }}
                className="flex items-center gap-2 text-xs uppercase tracking-widest text-brown py-2"
              >
                <Icon name="user" className="h-4 w-4" />
                <span>{t.nav.signIn}</span>
              </button>
            )}
          </div>

          <div className="px-2 mt-2">
            <button
              onClick={() => { setMenuOpen(false); openDrawer(); }}
              className="flex items-center justify-between w-full py-2 text-xs uppercase tracking-widest text-brown hover:text-gold transition-colors"
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
