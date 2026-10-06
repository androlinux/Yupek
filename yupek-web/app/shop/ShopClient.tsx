"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { filterProducts, type Filters } from "@/lib/catalog";
import ProductGrid from "@/components/ProductGrid";
import Icon from "@/components/ui/Icon";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import ScrollReveal from "@/components/ScrollReveal";

const uniq = (a: string[]) => Array.from(new Set(a));

export default function ShopClient({ initial }: { initial: Filters }) {
  const { allProducts } = useSiteConfig();
  const { t, locale } = useLanguage();
  const [f, setF] = useState<Filters>({ sort: "featured", ...initial });
  const [open, setOpen] = useState(false);

  const items = useMemo(() => filterProducts(f, allProducts), [f, allProducts]);
  const set = (k: keyof Filters, v: string | number | boolean | undefined) =>
    setF((p) => ({ ...p, [k]: p[k] === v ? undefined : v }));

  const sizes = uniq(allProducts.flatMap((p) => p.sizes));
  const colors = uniq(allProducts.flatMap((p) => p.colors));
  const cats = uniq(allProducts.map((p) => p.category));

  const chip = (on: boolean) =>
    `border px-3 py-2 text-[10px] uppercase tracking-[.18em] transition-colors ${
      on ? "border-brown bg-brown text-cream" : "border-brown/25 hover:border-brown"
    }`;

  const categoryLabels: Record<string, string> = {
    tees: t.shop.categories.tees || "TEES",
    shirts: t.shop.categories.shirts || "SHIRTS",
    sweatshirts: t.shop.categories.sweatshirts || "SWEATSHIRTS",
    trousers: t.shop.categories.trousers || "TROUSERS",
    denim: t.shop.categories.denim || "DENIM",
    accessories: t.shop.categories.accessories || "ACCESSORIES",
  };

  const topCategoryPills = [
    { label: t.shop.categories.men, q: "gender=men" },
    { label: t.shop.categories.women, q: "gender=women" },
    { label: t.shop.categories.unisex, q: "gender=unisex" },
    { label: t.shop.categories.tees, q: "category=tees" },
    { label: t.shop.categories.shirts, q: "category=shirts" },
    { label: t.shop.categories.sweatshirts, q: "category=sweatshirts" },
    { label: t.shop.categories.trousers, q: "category=trousers" },
    { label: t.shop.categories.denim, q: "category=denim" },
    { label: t.shop.categories.accessories, q: "category=accessories" },
    { label: t.shop.categories.new, q: "new=1" },
  ];

  const sorts = [
    ["featured", t.shop.sortFeatured],
    ["newest", t.shop.sortNewest],
    ["price-asc", t.shop.sortPriceAsc],
    ["price-desc", t.shop.sortPriceDesc],
  ];

  const panel = (
    <div className="space-y-8">
      <fieldset>
        <legend className="label mb-3">{t.shop.category}</legend>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              aria-pressed={f.category === c}
              onClick={() => set("category", c)}
              className={chip(f.category === c)}
            >
              {categoryLabels[c] || c}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3">{t.shop.size}</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              aria-pressed={f.size === s}
              onClick={() => set("size", s)}
              className={chip(f.size === s)}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3">{t.shop.color}</legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              aria-pressed={f.color === c}
              onClick={() => set("color", c)}
              className={chip(f.color === c)}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3">{t.shop.price}</legend>
        <div className="flex gap-2">
          {[50, 80, 100].map((m) => (
            <button
              key={m}
              aria-pressed={f.max === m}
              onClick={() => set("max", m)}
              className={chip(f.max === m)}
            >
              {t.shop.upTo} €{m}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        className="label underline underline-offset-4 hover:text-burgundy transition-colors"
        onClick={() => setF({ sort: f.sort })}
      >
        {t.shop.clearAll}
      </button>
    </div>
  );

  return (
    <>
      <header className="wrap py-16 text-center md:py-24">
        <span className="label tracking-[.3em] text-burgundy text-[10px]">
          {locale === "nl" ? "YUPEK CATALOGUS" : "YUPEK CATALOG"}
        </span>
        <h1 className="h-display mt-2 text-5xl md:text-7xl text-brown">{t.shop.title}</h1>
        <p className="mt-3 text-xs md:text-sm text-brown/70">{t.shop.subtitle}</p>
      </header>
      <div className="wrap pb-24">
        {/* Category Fast Switcher Bar */}
        <nav
          className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-y border-brown/10 py-4"
          aria-label={t.shop.category}
        >
          {topCategoryPills.map((c) => (
            <Link key={c.label} href={`/shop?${c.q}`} className="label hover:text-gold transition-colors">
              {c.label}
            </Link>
          ))}
        </nav>

      {/* Control bar */}
      <div className="mb-8 flex items-center justify-between">
        <button
          className="label flex items-center gap-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open
            ? (locale === "nl" ? "Filters sluiten" : "Close filters")
            : (locale === "nl" ? "Filters openen" : "Open filters")}
        >
          <Icon name="plus" className="h-3 w-3" />
          {t.shop.filter}
        </button>
        <p className="label hidden text-brown/60 lg:block">
          {items.length} {t.shop.piecesCount}
        </p>
        <div className="label flex items-center gap-3">
          <label htmlFor="shop-sort">
            {t.shop.sort}
          </label>
          <select
            id="shop-sort"
            name="sort"
            aria-label={t.shop.sort}
            value={f.sort}
            onChange={(e) => setF((p) => ({ ...p, sort: e.target.value }))}
            className="border-b border-brown bg-transparent py-1 text-[11px] tracking-[.15em] focus:outline-none"
          >
            {sorts.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {open && <div className="mb-10 border border-brown/15 p-5 lg:hidden bg-sand/15">{panel}</div>}

      <div className="grid gap-12 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          {panel}
        </aside>
        <div aria-live="polite">
          {items.length ? (
            <ScrollReveal>
              <ProductGrid items={items} cols={3} priority={true} />
            </ScrollReveal>
          ) : (
            <p className="label py-20 text-center text-brown/60">{t.shop.noResults}</p>
          )}
        </div>
      </div>
    </div>
  </>
);
}
