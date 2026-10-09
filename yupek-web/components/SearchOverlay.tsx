"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useDeferredValue } from "react";
import { eur, searchProducts } from "@/lib/catalog";
import Icon from "./ui/Icon";
import ProductImage from "./ui/ProductImage";
import { useStore } from "./Providers";
import { useSiteConfig } from "./ConfigContext";
import { useLanguage } from "./LanguageContext";

const POPULAR_SEARCHES = [
  "Silk",
  "Oversized Tee",
  "Camp Shirt",
  "Denim",
  "Trousers",
  "Organic Cotton",
  "Sweatshirt",
];

const CATEGORY_TABS = [
  { id: "all", label: "ALL" },
  { id: "shirts", label: "SHIRTS" },
  { id: "tees", label: "TEES" },
  { id: "trousers", label: "TROUSERS" },
  { id: "denim", label: "DENIM" },
  { id: "sweatshirts", label: "SWEATSHIRTS" },
];

const RECENT_KEY = "yupek-recent-searches";

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const { allProducts } = useSiteConfig();
  const { t, locale } = useLanguage();

  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  // useDeferredValue keeps input typing responsive while filtering
  const deferredQ = useDeferredValue(q);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 6));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => ref.current?.focus(), 60);
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    if (searchOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [searchOpen, setSearchOpen]);

  // Lock body scroll when search overlay is open
  useEffect(() => {
    if (searchOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [searchOpen]);

  // Reset query on overlay close
  useEffect(() => {
    if (!searchOpen) {
      setQ("");
      setSelectedCat("all");
    }
  }, [searchOpen]);

  // Compute matched items
  let rawResults = searchProducts(deferredQ, allProducts);
  if (selectedCat !== "all") {
    rawResults = rawResults.filter((p) => p.category.toLowerCase() === selectedCat);
  }

  const handleSelectProduct = (productName: string) => {
    if (q.trim()) saveRecentSearch(q);
    setSearchOpen(false);
    setQ("");
  };

  const applyQuery = (term: string) => {
    setQ(term);
    ref.current?.focus();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSearchOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.nav.search}
      aria-hidden={!searchOpen}
      inert={!searchOpen}
      onClick={handleBackdropClick}
      style={{ backgroundColor: "#FAF7F2", color: "#171717" }}
      className={`fixed inset-0 z-[80] overflow-y-auto overflow-x-hidden max-w-full transition-all duration-300 ${
        searchOpen ? "opacity-100" : "invisible opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`wrap max-w-5xl py-8 md:py-12 transform transition-all duration-300 ease-out ${
          searchOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-[0.98]"
        }`}
      >
        {/* Top Header Actions */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase tracking-[.3em] font-semibold"
            style={{ color: "#555555" }}
          >
            YUPEK ARCHIVE SEARCH
          </span>
          <button
            type="button"
            aria-label={t.searchOverlay.closeAria}
            onClick={() => setSearchOpen(false)}
            style={{ color: "#171717" }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 ease-out active:scale-95 opacity-80 hover:opacity-100 focus:outline-none"
          >
            <Icon name="close" className="h-5 w-5 text-[#171717]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Big Search Input Field */}
        <div className="relative mt-8 md:mt-12">
          <label htmlFor="yupek-search" className="sr-only">
            {t.nav.search}
          </label>
          <input
            id="yupek-search"
            name="q"
            type="search"
            aria-label={t.nav.search}
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) saveRecentSearch(q);
            }}
            placeholder={t.searchOverlay.placeholder}
            style={{
              backgroundColor: "#FAF7F2",
              color: "#171717",
              borderColor: "rgba(23, 23, 23, 0.20)",
            }}
            className="w-full border-b-2 pb-4 pr-10 text-center font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl tracking-[.08em] focus:outline-none transition-colors placeholder:text-[rgba(23,23,23,0.55)] focus:border-[#171717] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                ref.current?.focus();
              }}
              style={{ color: "#171717" }}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center opacity-60 hover:opacity-100 transition-all duration-200 ease-out active:scale-95 focus:outline-none"
              aria-label={locale === "nl" ? "Zoekopdracht wissen" : "Clear query"}
            >
              <Icon name="close" className="w-4 h-4 text-[#171717]" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Quick Suggestion Pills & Recent Searches (shown when query is empty) */}
        {!q && (
          <div className="mt-8 space-y-6 max-w-3xl mx-auto">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className="text-[10px] uppercase tracking-widest font-mono"
                    style={{ color: "#555555" }}
                  >
                    {locale === "nl" ? "Recente Zoekopdrachten" : "Recent Searches"}
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    style={{ color: "#555555" }}
                    className="text-[10px] uppercase tracking-wider hover:opacity-100 opacity-70 transition-opacity"
                  >
                    {locale === "nl" ? "Wissen" : "Clear"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => applyQuery(term)}
                      style={{
                        backgroundColor: "#FAF7F2",
                        borderColor: "rgba(23, 23, 23, 0.20)",
                        color: "#171717",
                      }}
                      className="px-3 py-1.5 text-xs tracking-wider border hover:bg-[#171717] hover:text-[#FAF7F2] transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending & Popular Searches */}
            <div>
              <span
                className="text-[10px] uppercase tracking-widest font-mono block mb-2.5"
                style={{ color: "#555555" }}
              >
                {locale === "nl" ? "Populaire Zoektermen" : "Popular Searches"}
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => applyQuery(term)}
                    style={{
                      backgroundColor: "#FAF7F2",
                      borderColor: "rgba(23, 23, 23, 0.20)",
                      color: "#171717",
                    }}
                    className="px-3 py-1.5 text-xs uppercase tracking-wider border hover:bg-[#171717] hover:text-[#FAF7F2] transition-all duration-200"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Filter Pills (shown when query is present) */}
        {q && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {CATEGORY_TABS.map((tab) => {
              const active = selectedCat === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCat(tab.id)}
                  style={{
                    backgroundColor: active ? "#171717" : "#FAF7F2",
                    color: active ? "#FAF7F2" : "#555555",
                    borderColor: active ? "#171717" : "rgba(23, 23, 23, 0.20)",
                  }}
                  className="px-3 py-1 text-[10px] uppercase tracking-[.2em] border transition-all hover:text-[#171717] hover:border-[#171717]"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Area */}
        <div className="mt-10" aria-live="polite">
          {q && (
            <div
              className="flex items-center justify-between pb-4 mb-8"
              style={{ borderBottom: "1px solid rgba(23, 23, 23, 0.12)" }}
            >
              <span
                className="text-xs uppercase tracking-widest font-mono"
                style={{ color: "#555555" }}
              >
                {rawResults.length} {locale === "nl" ? "stuks gevonden" : "pieces found"}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "#555555" }}
              >
                Relevance Ranked
              </span>
            </div>
          )}

          {q && rawResults.length === 0 && (
            <div className="py-16 text-center space-y-4">
              <p className="font-serif text-2xl md:text-3xl" style={{ color: "#171717" }}>
                {t.searchOverlay.noResults} “{q}”
              </p>
              <p
                className="text-xs max-w-md mx-auto leading-relaxed"
                style={{ color: "#555555" }}
              >
                {locale === "nl"
                  ? "Geen artikelen gevonden die overeenkomen met uw zoekopdracht. Wis uw zoekterm of ontdek de volledige collectie."
                  : "No garments matched your search query. Clear your search or explore the complete collection."}
              </p>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    ref.current?.focus();
                  }}
                  className="px-5 py-2.5 text-xs uppercase tracking-[.18em] border border-[#171717]/40 text-[#171717] hover:bg-[#171717] hover:text-[#FAF7F2] transition-colors"
                >
                  {locale === "nl" ? "Zoekopdracht wissen" : "Clear Search"}
                </button>
                <Link
                  href="/shop"
                  onClick={() => {
                    setSearchOpen(false);
                    setQ("");
                  }}
                  className="px-5 py-2.5 text-xs uppercase tracking-[.18em] bg-[#171717] text-[#FAF7F2] border border-[#171717] hover:bg-transparent hover:text-[#171717] transition-colors"
                >
                  {locale === "nl" ? "Bekijk alle artikelen" : "Browse All Products"}
                </Link>
              </div>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-4">
            {rawResults.map((p) => (
              <li key={p.id} className="group">
                <Link
                  href={`/product/${p.slug}`}
                  onClick={() => handleSelectProduct(p.name)}
                  className="block"
                >
                  <div
                    className="relative aspect-[3/4] overflow-hidden shadow-sm transition-shadow group-hover:shadow-md"
                    style={{
                      backgroundColor: "#FAF7F2",
                      border: "1px solid rgba(23, 23, 23, 0.15)",
                    }}
                  >
                    <ProductImage
                      src={p.images[0]}
                      alt={p.name}
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    {p.badge && (
                      <span
                        className="absolute top-2 left-2 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5"
                        style={{
                          backgroundColor: "#FAF7F2",
                          color: "#171717",
                          border: "1px solid rgba(23, 23, 23, 0.20)",
                        }}
                      >
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <span
                      className="text-[9px] uppercase tracking-widest font-mono block"
                      style={{ color: "#555555" }}
                    >
                      {p.category}
                    </span>
                    <h4
                      className="text-[11px] uppercase tracking-[.16em] font-medium transition-opacity group-hover:opacity-75 truncate"
                      style={{ color: "#171717" }}
                    >
                      {p.name}
                    </h4>
                    <p
                      className="text-xs mt-0.5 font-light"
                      style={{ color: "#171717" }}
                    >
                      {eur(p.price)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
