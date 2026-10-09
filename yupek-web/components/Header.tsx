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
      { label: "Accessories", href: "/shop?gender=men&category=accessories" },
    ],
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
      { label: "Accessories", href: "/shop?gender=women&category=accessories" },
    ],
  },
  {
    title: "UNISEX & EDITIONS",
    href: "/shop?gender=unisex",
    items: [
      { label: "All Garments", href: "/shop" },
      { label: "Eastern Heritage", href: "/lookbook" },
      { label: "Silk Inspired", href: "/lookbook" },
      { label: "Capsule Essentials", href: "/shop" },
    ],
  },
];

const collectionsCategories = [
  {
    title: "COLLECTION 01 — THE WEAVE",
    subtitle: "Silk Road Architecture",
    desc: "Contemporary architectural cuts infused with traditional Turkmen silk heritage, tailored for modern European living.",
    href: "/lookbook",
  },
  {
    title: "CAPSULE ESSENTIALS",
    subtitle: "Organic Heavyweight Form",
    desc: "Everyday luxury silhouettes crafted from natural plant-dyed fibers and silk-touch drape engineered for longevity.",
    href: "/shop",
  },
  {
    title: "NEW ARRIVALS",
    subtitle: "Spring / Summer Edition",
    desc: "Latest archive releases and experimental seasonal textile pieces.",
    href: "/shop?isNew=true",
  },
];

export default function Header() {
  const path = usePathname();
  const home = path === "/";
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Minimal desktop sub-menu state
  const [activeMenu, setActiveMenu] = useState<"shop" | "collections" | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile navigation state
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [menuAnimated, setMenuAnimated] = useState(false);

  const { count, wishlist, setCartOpen, setSearchOpen, menuOpen, setMenuOpen } = useStore();
  const { user, setAuthModalOpen, setAuthModalTab, signOut } = useAuth();
  const { t, locale } = useLanguage();
  const { openDrawer } = useAccessibility();

  // Scroll detection for header background
  useEffect(() => {
    let lastScrolled = false;
    let ticking = false;

    const updateScroll = () => {
      const isPast = window.scrollY > 20;
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

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
    setActiveMenu(null);
  }, [path, setMenuOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setUserDropdownOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [setMenuOpen]);

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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const raf = requestAnimationFrame(() => setMenuAnimated(true));
      return () => {
        document.body.style.overflow = originalOverflow;
        cancelAnimationFrame(raf);
      };
    } else {
      setMenuAnimated(false);
    }
  }, [menuOpen]);

  const handleMouseEnter = (menu: "shop" | "collections") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 220);
  };

  const isSubMenuOpen = activeMenu !== null;
  const solid = scrolled || !home || isSubMenuOpen;
  const tone = solid ? "text-brown" : "text-cream";

  // Mobile menu items for staggered entrance
  const mobileNavItems = [
    {
      id: "shop",
      label: t.nav.shop,
      href: "/shop",
      hasSub: true,
    },
    {
      id: "collections",
      label: t.nav.collections,
      href: "/lookbook",
      hasSub: false,
    },
    {
      id: "about",
      label: t.nav.about,
      href: "/about",
      hasSub: false,
    },
    {
      id: "account",
      label: t.nav.account,
      href: "/account",
      hasSub: false,
    },
    {
      id: "wishlist",
      label: t.nav.wishlist,
      href: "/wishlist",
      badge: wishlist.length > 0 ? wishlist.length : null,
      hasSub: false,
    },
    {
      id: "contact",
      label: t.nav.contact,
      href: "/contact",
      hasSub: false,
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ease-in-out ${
          solid
            ? "border-b border-brown/10 bg-[#FAF7F2]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(43,29,20,0.02)]"
            : "border-b border-white/10 bg-gradient-to-b from-black/40 via-black/15 to-transparent backdrop-blur-[1px]"
        } ${tone}`}
        onMouseLeave={handleMouseLeave}
      >
        <div className="wrap relative flex items-center justify-between w-full h-16 lg:h-20">
          {/* ========================================================= */}
          {/* DESKTOP NAVBAR (>= 1024px)                                */}
          {/* LEFT: Logo + Nav Links | RIGHT: Actions & Controls        */}
          {/* Center: Flexible empty space (ml-auto on right actions)   */}
          {/* ========================================================= */}

          {/* DESKTOP LEFT CLUSTER: YUPEK Logo + Primary Navigation */}
          <div className="hidden lg:flex items-center gap-[28px] xl:gap-[36px] shrink-0">
            {/* YUPEK Logo Asset */}
            <Link
              href="/"
              className="relative flex items-center py-2 group focus:outline-none shrink-0"
              aria-label="YUPEK home"
            >
              {/* Light variant for transparent hero */}
              <Image
                unoptimized
                src="/images/logo-light.png"
                alt="YUPEK"
                width={140}
                height={102}
                priority
                className={`h-8 lg:h-9 w-auto object-contain transition-opacity duration-300 ${
                  solid ? "opacity-0 absolute pointer-events-none" : "opacity-100"
                } group-hover:opacity-80`}
              />
              {/* Dark variant for solid scrolled / inner pages */}
              <Image
                unoptimized
                src="/images/logo.png"
                alt="YUPEK"
                width={140}
                height={102}
                priority={false}
                loading="eager"
                className={`h-8 lg:h-9 w-auto object-contain transition-opacity duration-300 ${
                  solid ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                } group-hover:opacity-80`}
              />
            </Link>

            {/* Primary Navigation: WINKEL, COLLECTIES, OVER YUPEK */}
            <nav
              aria-label="Primary"
              className="flex items-center gap-[28px] xl:gap-[36px]"
            >
              {/* SHOP */}
              <Link
                href="/shop"
                onMouseEnter={() => handleMouseEnter("shop")}
                className="group relative py-2 text-[12px] xl:text-[13px] uppercase tracking-[.22em] xl:tracking-[.26em] font-light transition-all duration-200 ease-out hover:opacity-75 focus:outline-none whitespace-nowrap"
              >
                <span className="relative z-10 leading-none">
                  {t.nav.shop}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 h-[1px] w-full bg-current transition-transform duration-300 ease-out origin-left ${
                    path.startsWith("/shop")
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>

              {/* COLLECTIONS */}
              <Link
                href="/lookbook"
                onMouseEnter={() => handleMouseEnter("collections")}
                className="group relative py-2 text-[12px] xl:text-[13px] uppercase tracking-[.22em] xl:tracking-[.26em] font-light transition-all duration-200 ease-out hover:opacity-75 focus:outline-none whitespace-nowrap"
              >
                <span className="relative z-10 leading-none">
                  {t.nav.collections}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 h-[1px] w-full bg-current transition-transform duration-300 ease-out origin-left ${
                    path.startsWith("/lookbook")
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>

              {/* ABOUT YUPEK */}
              <Link
                href="/about"
                onMouseEnter={handleMouseLeave}
                className="group relative py-2 text-[12px] xl:text-[13px] uppercase tracking-[.22em] xl:tracking-[.26em] font-light transition-all duration-200 ease-out hover:opacity-75 focus:outline-none whitespace-nowrap"
              >
                <span className="relative z-10 leading-none">
                  {t.nav.about}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 h-[1px] w-full bg-current transition-transform duration-300 ease-out origin-left ${
                    path === "/about"
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            </nav>
          </div>

          {/* DESKTOP RIGHT: SEARCH, LANGUAGE SWITCHER, ACCOUNT, BAG */}
          <div className="hidden lg:flex items-center gap-[22px] xl:gap-[28px] ml-auto shrink-0 justify-end">
            {/* SEARCH: [search icon] SEARCH */}
            <button
              id="nav-search-desktop"
              onClick={() => setSearchOpen(true)}
              aria-label={t.nav.search}
              className="min-h-[44px] group relative flex items-center justify-center gap-2 py-2 px-1 text-[11px] xl:text-[12px] uppercase tracking-[.20em] xl:tracking-[.22em] font-light transition-all duration-200 ease-out hover:-translate-y-[1px] opacity-80 hover:opacity-100 focus:outline-none whitespace-nowrap"
            >
              <Icon name="search" className="h-[17px] w-[17px] transition-transform duration-200 shrink-0" />
              <span className="leading-none pt-[1px]">
                {t.nav.search}
              </span>
            </button>

            {/* LANGUAGE SWITCHER: Quiet compact pill */}
            <div className="flex items-center justify-center min-h-[44px] px-0.5 shrink-0">
              <LanguageSwitcher short size="sm" className="inline-flex" />
            </div>

            {/* ACCOUNT: [account icon] ACCOUNT */}
            <div className="relative" ref={dropdownRef}>
              {user ? (
                <button
                  id="nav-account-desktop"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label={t.nav.account}
                  className="min-h-[44px] group flex items-center justify-center gap-2 py-2 px-1 text-[11px] xl:text-[12px] uppercase tracking-[.20em] xl:tracking-[.22em] font-light transition-all duration-200 ease-out hover:-translate-y-[1px] opacity-80 hover:opacity-100 focus:outline-none whitespace-nowrap"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px] font-medium tracking-wider shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="leading-none pt-[1px]">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
              ) : (
                <button
                  id="nav-account-desktop"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label={t.nav.account}
                  className="min-h-[44px] group relative flex items-center justify-center gap-2 py-2 px-1 text-[11px] xl:text-[12px] uppercase tracking-[.20em] xl:tracking-[.22em] font-light transition-all duration-200 ease-out hover:-translate-y-[1px] opacity-80 hover:opacity-100 focus:outline-none whitespace-nowrap"
                >
                  <Icon name="user" className="h-[17px] w-[17px] transition-transform duration-200 shrink-0" />
                  <span className="leading-none pt-[1px]">
                    {t.nav.account}
                  </span>
                </button>
              )}

              {/* Minimal Account Dropdown */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-56 border border-brown/10 bg-[#FAF7F2] p-2 shadow-xl backdrop-blur-md transition-all text-brown z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {user ? (
                    <>
                      <div className="border-b border-brown/10 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-brown/50 font-semibold">
                          ACCOUNT
                        </p>
                        <p className="truncate text-xs font-semibold text-brown mt-0.5">{user.name}</p>
                        <p className="truncate text-[10px] text-brown/50">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          role="menuitem"
                          href="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          My Account
                        </Link>
                        <Link
                          role="menuitem"
                          href="/account/orders"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          Orders
                        </Link>
                        <Link
                          role="menuitem"
                          href="/wishlist"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          Wishlist ({wishlist.length})
                        </Link>
                        <Link
                          role="menuitem"
                          href="/account/addresses"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          Addresses
                        </Link>
                        <Link
                          role="menuitem"
                          href="/account/security"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          Security
                        </Link>
                      </div>
                      <div className="border-t border-brown/10 pt-1">
                        <button
                          role="menuitem"
                          onClick={() => {
                            signOut();
                            setUserDropdownOpen(false);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs tracking-wider text-brown/70 hover:text-burgundy hover:bg-burgundy/5 transition-colors"
                        >
                          {t.nav.signOut}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border-b border-brown/10 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-brown/50 font-semibold">
                          ACCOUNT
                        </p>
                      </div>
                      <div className="py-1">
                        <button
                          role="menuitem"
                          onClick={() => {
                            setAuthModalTab("signin");
                            setAuthModalOpen(true);
                            setUserDropdownOpen(false);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          Sign In
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => {
                            setAuthModalTab("signup");
                            setAuthModalOpen(true);
                            setUserDropdownOpen(false);
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs tracking-wider hover:bg-sand/30 transition-colors"
                        >
                          Create Account
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* BAG: [bag icon] BAG (6) */}
            <button
              id="nav-bag-desktop"
              onClick={() => setCartOpen(true)}
              aria-label={`${t.nav.bag}, ${count} items`}
              className="min-h-[44px] group relative flex items-center justify-center gap-2 py-2 px-1 text-[11px] xl:text-[12px] uppercase tracking-[.20em] xl:tracking-[.22em] font-light transition-all duration-200 ease-out hover:-translate-y-[1px] opacity-80 hover:opacity-100 focus:outline-none whitespace-nowrap"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <Icon name="bag" className="h-[17px] w-[17px] transition-transform duration-200" />
              </div>
              <span className="leading-none pt-[1px]">
                {t.nav.bag}{count > 0 ? ` (${count})` : ""}
              </span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* MOBILE / TABLET NAVBAR (< 1024px)                          */}
          {/* LEFT: Animated ☰/✕ | CENTER: Logo | RIGHT: Search, Bag    */}
          {/* ========================================================= */}

          {/* MOBILE LEFT: Animated 3-line Hamburger */}
          <div className="flex lg:hidden items-center shrink-0">
            <button
              id="nav-mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? (locale === "nl" ? "Menu sluiten" : "Close menu") : (locale === "nl" ? "Menu openen" : "Open menu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation-overlay"
              className="min-h-[44px] min-w-[44px] flex flex-col justify-center items-start gap-[5.5px] text-current p-2.5 focus:outline-none group z-50 relative transition-opacity duration-200 opacity-85 hover:opacity-100"
            >
              <span
                aria-hidden="true"
                className={`h-[1.5px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center ${
                  menuOpen ? "w-5 translate-y-[7px] rotate-45" : "w-5"
                }`}
              />
              <span
                aria-hidden="true"
                className={`h-[1.5px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center ${
                  menuOpen ? "w-5 opacity-0 scale-x-0" : "w-3.5 group-hover:w-5"
                }`}
              />
              <span
                aria-hidden="true"
                className={`h-[1.5px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-center ${
                  menuOpen ? "w-5 -translate-y-[7px] -rotate-45" : "w-5"
                }`}
              />
            </button>
          </div>

          {/* MOBILE CENTER: Logo Mathematically Centered in Viewport */}
          <div className="flex lg:hidden absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-auto">
            <Link
              href="/"
              aria-label="YUPEK home"
              className="relative flex items-center justify-center py-1 max-w-[105px] sm:max-w-[130px] focus:outline-none"
            >
              <Image
                unoptimized
                src="/images/logo-light.png"
                alt="YUPEK"
                width={120}
                height={87}
                priority
                className={`h-6 sm:h-7 w-auto object-contain transition-opacity duration-300 ${
                  solid ? "opacity-0 absolute pointer-events-none" : "opacity-100"
                }`}
              />
              <Image
                unoptimized
                src="/images/logo.png"
                alt="YUPEK"
                width={120}
                height={87}
                priority={false}
                loading="eager"
                className={`h-6 sm:h-7 w-auto object-contain transition-opacity duration-300 ${
                  solid ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                }`}
              />
            </Link>
          </div>

          {/* MOBILE RIGHT: Search and Bag */}
          <div className="flex lg:hidden items-center gap-0.5 justify-end shrink-0 ml-auto">
            <button
              id="nav-search-mobile"
              onClick={() => setSearchOpen(true)}
              aria-label={t.nav.search}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-current transition-all duration-200 ease-out active:scale-95 opacity-85 hover:opacity-100 focus:outline-none"
            >
              <Icon name="search" className="h-5 w-5" />
            </button>

            <button
              id="nav-bag-mobile"
              onClick={() => setCartOpen(true)}
              aria-label={`${t.nav.bag}, ${count} items`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center relative text-current transition-all duration-200 ease-out active:scale-95 opacity-85 hover:opacity-100 focus:outline-none"
            >
              <div className="relative flex items-center justify-center">
                <Icon name="bag" className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[13px] px-0.5 items-center justify-center rounded-full bg-burgundy text-[8px] font-medium text-cream shadow-sm">
                    {count}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP EDITORIAL SUB-PANEL (Warm Ivory, High Contrast)   */}
        {/* ========================================================= */}
        <div
          className={`hidden lg:block absolute left-0 top-full w-full bg-[#FAF7F2] text-brown border-b border-brown/15 shadow-[0_20px_48px_rgba(43,29,20,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top z-40 ${
            activeMenu
              ? "opacity-100 translate-y-0 pointer-events-auto visible"
              : "opacity-0 -translate-y-2 pointer-events-none invisible"
          }`}
        >
          {activeMenu === "shop" && (
            <div className="wrap py-10">
              <div className="grid grid-cols-3 gap-12 max-w-4xl mx-auto">
                {shopCategories.map((col) => (
                  <div key={col.title}>
                    <Link
                      href={col.href}
                      onClick={handleMouseLeave}
                      className="group relative inline-block text-[10px] font-semibold uppercase tracking-[.25em] text-brown mb-4 pb-1 border-b border-brown/15 hover:text-burgundy transition-colors"
                    >
                      <span>{col.title}</span>
                    </Link>
                    <ul className="space-y-3">
                      {col.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={handleMouseLeave}
                            className="group inline-flex items-center text-xs font-light text-brown/75 hover:text-brown tracking-wide transition-colors"
                          >
                            <span className="transition-transform duration-200 group-hover:translate-x-1">
                              {item.label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === "collections" && (
            <div className="wrap py-10">
              <div className="grid grid-cols-3 gap-10 max-w-4xl mx-auto">
                {collectionsCategories.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={handleMouseLeave}
                    className="group block space-y-2 p-3 -m-3 hover:bg-sand/20 transition-colors rounded-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-brown pb-1 border-b border-brown/15 group-hover:text-burgundy transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] font-serif text-brown/90 tracking-wider">
                      {item.subtitle}
                    </p>
                    <p className="text-xs font-light text-brown/65 leading-relaxed">
                      {item.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* MOBILE FULL-SCREEN NAVIGATION OVERLAY                     */}
      {/* ========================================================= */}
      {menuOpen && (
        <div
          id="mobile-navigation-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="fixed inset-0 z-50 bg-[#FAF7F2] text-brown flex flex-col justify-between overflow-y-auto overflow-x-hidden max-w-full w-full h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-300"
        >
          {/* Top Bar inside Overlay */}
          <div className="w-full flex items-center justify-between px-6 py-5 border-b border-brown/10 shrink-0">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center focus:outline-none"
              aria-label="YUPEK home"
            >
              <Image
                unoptimized
                src="/images/logo.png"
                alt="YUPEK"
                width={120}
                height={87}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>

            <button
              id="nav-close-mobile-menu"
              onClick={() => setMenuOpen(false)}
              aria-label={locale === "nl" ? "Menu sluiten" : "Close menu"}
              className="min-h-[44px] min-w-[44px] flex items-center justify-end text-brown hover:text-burgundy transition-all duration-200 ease-out active:scale-95 opacity-80 hover:opacity-100 focus:outline-none"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          {/* Primary Editorial Navigation Links with Sequential Stagger */}
          <nav
            aria-label="Mobile Navigation"
            className="flex-1 flex flex-col justify-center px-6 sm:px-12 py-8 space-y-5"
          >
            {mobileNavItems.map((item, index) => {
              if (item.hasSub) {
                return (
                  <div
                    key={item.id}
                    style={{
                      transitionDelay: `${index * 60}ms`,
                    }}
                    className={`border-b border-brown/10 pb-4 transform transition-all duration-300 ease-out ${
                      menuAnimated
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="font-serif text-3xl sm:text-5xl tracking-[.12em] text-brown hover:text-burgundy transition-colors uppercase"
                      >
                        {item.label}
                      </Link>
                      <button
                        onClick={() => setMobileShopOpen(!mobileShopOpen)}
                        aria-label="Toggle shop categories"
                        aria-expanded={mobileShopOpen}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-brown/60 hover:text-brown focus:outline-none"
                      >
                        <Icon name={mobileShopOpen ? "minus" : "plus"} className="h-4 w-4" />
                      </button>
                    </div>

                    {mobileShopOpen && (
                      <div className="grid grid-cols-2 gap-4 pt-4 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Link
                          href="/shop?gender=men"
                          onClick={() => setMenuOpen(false)}
                          className="text-xs uppercase tracking-[.2em] text-brown/70 hover:text-brown py-1"
                        >
                          Men
                        </Link>
                        <Link
                          href="/shop?gender=women"
                          onClick={() => setMenuOpen(false)}
                          className="text-xs uppercase tracking-[.2em] text-brown/70 hover:text-brown py-1"
                        >
                          Women
                        </Link>
                        <Link
                          href="/shop?gender=unisex"
                          onClick={() => setMenuOpen(false)}
                          className="text-xs uppercase tracking-[.2em] text-brown/70 hover:text-brown py-1"
                        >
                          Unisex
                        </Link>
                        <Link
                          href="/shop?isNew=true"
                          onClick={() => setMenuOpen(false)}
                          className="text-xs uppercase tracking-[.2em] text-brown/70 hover:text-brown py-1"
                        >
                          New Arrivals
                        </Link>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  style={{
                    transitionDelay: `${index * 60}ms`,
                  }}
                  className={`border-b border-brown/10 pb-4 transform transition-all duration-300 ease-out ${
                    menuAnimated
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-3"
                  }`}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 font-serif text-3xl sm:text-5xl tracking-[.12em] text-brown hover:text-burgundy transition-colors uppercase"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-sm font-sans font-normal text-gold">
                        ({item.badge})
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Overlay Footer: Language, Accessibility, Customer Care */}
          <div
            style={{
              transitionDelay: `${mobileNavItems.length * 60}ms`,
            }}
            className={`border-t border-brown/10 px-6 sm:px-12 py-6 bg-sand/15 flex flex-col gap-4 shrink-0 transform transition-all duration-300 ease-out ${
              menuAnimated
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[.25em] text-brown/50">Language</span>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center justify-between text-[11px] tracking-wider text-brown/70 pt-2 border-t border-brown/10">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openDrawer();
                }}
                className="flex items-center gap-1.5 hover:text-gold transition-colors text-[10px] uppercase tracking-widest text-brown/70 focus:outline-none"
              >
                <Icon name="accessibility" className="h-3.5 w-3.5 text-gold" />
                <span>Accessibility</span>
              </button>

              <div className="flex items-center gap-4">
                <Link
                  href="/shipping"
                  onClick={() => setMenuOpen(false)}
                  className="hover:text-brown transition-colors text-[10px] uppercase tracking-widest text-brown/70"
                >
                  Shipping
                </Link>
                <Link
                  href="/returns"
                  onClick={() => setMenuOpen(false)}
                  className="hover:text-brown transition-colors text-[10px] uppercase tracking-widest text-brown/70"
                >
                  Returns
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
