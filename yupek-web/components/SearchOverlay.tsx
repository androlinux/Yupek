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

  // useDeferredValue keeps input typing 60fps responsive while filtering
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.nav.search}
      aria-hidden={!searchOpen}
      inert={!searchOpen || undefined}
      className={`fixed inset-0 z-50 overflow-y-auto bg-cream/98 backdrop-blur-md transition-opacity duration-300 text-brown ${
        searchOpen ? "opacity-100" : "invisible opacity-0 pointer-events-none"
      }`}
    >
      <div className="wrap max-w-5xl py-8 md:py-12">
        {/* Top Header Actions */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[.3em] text-gold font-semibold">
            YUPEK ARCHIVE SEARCH
          </span>
          <button
            aria-label={t.searchOverlay.closeAria}
            onClick={() => setSearchOpen(false)}
            className="p-2 text-brown hover:text-gold transition-colors focus:outline-none"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>

        {/* Big Search Input Field */}
        <div className="relative mt-8 md:mt-12">
          <label htmlFor="yupek-search" className="sr-only">
            {t.nav.search}
          </label>
          <input
            id="yupek-search"
            ref={ref}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) saveRecentSearch(q);
            }}
            placeholder={t.searchOverlay.placeholder}
            className="w-full border-b-2 border-brown bg-transparent pb-4 pr-10 text-center font-serif text-3xl md:text-5xl lg:text-6xl tracking-[.08em] placeholder:text-brown/20 text-brown focus:outline-none focus:border-gold transition-colors"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brown/40 hover:text-brown transition-colors"
              aria-label="Clear query"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Pills & Recent Searches (shown when query is empty or short) */}
        {!q && (
          <div className="mt-8 space-y-6 max-w-3xl mx-auto">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] uppercase tracking-widest text-brown/50 font-mono">
                    {locale === "nl" ? "Recente Zoekopdrachten" : "Recent Searches"}
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[10px] uppercase tracking-wider text-brown/40 hover:text-gold transition-colors"
                  >
                    {locale === "nl" ? "Wissen" : "Clear"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => applyQuery(term)}
                      className="px-3 py-1.5 text-xs tracking-wider bg-sand/30 border border-brown/15 hover:border-gold hover:bg-sand/60 transition-colors text-brown"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending & Popular Searches */}
            <div>
              <span className="text-[10px] uppercase tracking-widest text-brown/50 font-mono block mb-2.5">
                {locale === "nl" ? "Populaire Zoektermen" : "Popular Searches"}
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => applyQuery(term)}
                    className="px-3 py-1.5 text-xs uppercase tracking-wider bg-white border border-brown/20 hover:border-brown hover:bg-brown hover:text-cream transition-all duration-200"
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
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCat(tab.id)}
                className={`px-3 py-1 text-[10px] uppercase tracking-[.2em] border transition-all ${
                  selectedCat === tab.id
                    ? "bg-brown text-gold border-gold font-semibold"
                    : "bg-white/80 border-brown/20 text-brown/70 hover:border-brown"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Search Results Area */}
        <div className="mt-10" aria-live="polite">
          {q && (
            <div className="flex items-center justify-between pb-4 border-b border-brown/10 mb-8">
              <span className="text-xs uppercase tracking-widest text-brown/70 font-mono">
                {rawResults.length} {locale === "nl" ? "stuks gevonden" : "pieces found"}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                Relevance Ranked
              </span>
            </div>
          )}

          {q && rawResults.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <p className="font-serif text-2xl text-brown">
                {t.searchOverlay.noResults} “{q}”
              </p>
              <p className="text-xs text-brown/60 max-w-md mx-auto leading-relaxed">
                {locale === "nl"
                  ? "Probeer te zoeken op 'Zijde', 'Overhemd', 'T-shirt', 'Denim' of pas uw filters aan."
                  : "Try searching for 'Silk', 'Shirt', 'Tee', 'Denim' or adjusting your filters."}
              </p>
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
                  <div className="relative aspect-[3/4] bg-sand/30 overflow-hidden border border-brown/10 shadow-sm transition-shadow group-hover:shadow-md">
                    <ProductImage
                      src={p.images[0]}
                      alt={p.name}
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    {p.badge && (
                      <span className="absolute top-2 left-2 text-[9px] font-semibold tracking-widest uppercase bg-cream px-2 py-0.5 border border-brown/10 text-brown">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] uppercase tracking-widest text-gold font-mono block">
                      {p.category}
                    </span>
                    <h4 className="text-[11px] uppercase tracking-[.16em] text-brown font-medium group-hover:text-burgundy transition-colors truncate">
                      {p.name}
                    </h4>
                    <p className="text-xs text-brown/70 mt-0.5 font-light">{eur(p.price)}</p>
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
