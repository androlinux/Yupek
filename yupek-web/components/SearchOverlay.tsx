"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { eur, searchProducts } from "@/lib/catalog";
import Icon from "./ui/Icon";
import ProductImage from "./ui/ProductImage";
import { useStore } from "./Providers";
import { useSiteConfig } from "./ConfigContext";
import { useLanguage } from "./LanguageContext";

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const { allProducts } = useSiteConfig();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const results = searchProducts(q, allProducts);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => ref.current?.focus(), 50);
    }
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    if (searchOpen) window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [searchOpen, setSearchOpen]);

  // Reset query when the overlay is closed
  useEffect(() => {
    if (!searchOpen) setQ("");
  }, [searchOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.nav.search}
      aria-hidden={!searchOpen}
      inert={!searchOpen || undefined}
      className={`fixed inset-0 z-50 overflow-y-auto bg-cream/98 backdrop-blur-md transition-opacity duration-300 ${
        searchOpen ? "opacity-100" : "invisible opacity-0 pointer-events-none"
      }`}
    >
      <div className="wrap max-w-4xl py-8">
        <div className="flex justify-end">
          <button
            aria-label={t.searchOverlay.closeAria}
            onClick={() => setSearchOpen(false)}
            className="p-2 text-brown hover:opacity-60 transition-opacity"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>

        <p className="label mt-6 text-center text-brown/60 tracking-[.3em]">
          {t.searchOverlay.title}
        </p>
        <label htmlFor="q" className="sr-only">
          {t.nav.search}
        </label>
        <input
          id="q"
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchOverlay.placeholder}
          className="mt-6 w-full border-b border-brown bg-transparent pb-4 text-center font-serif text-3xl md:text-5xl tracking-[.1em] placeholder:text-brown/20 text-brown focus:outline-none"
        />

        <div className="mt-12" aria-live="polite">
          {q && results.length === 0 && (
            <p className="label text-center text-brown/60 py-12">
              {t.searchOverlay.noResults} “{q}”
            </p>
          )}

          <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {results.map((p) => (
              <li key={p.id} className="group">
                <Link
                  href={`/product/${p.slug}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setQ("");
                  }}
                >
                  <div className="relative aspect-[3/4] bg-sand/30 overflow-hidden border border-brown/10">
                    <ProductImage
                      src={p.images[0]}
                      alt={p.name}
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-[.16em] text-brown font-medium group-hover:text-burgundy">
                    {p.name}
                  </p>
                  <p className="text-xs text-brown/60 mt-0.5">{eur(p.price)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
