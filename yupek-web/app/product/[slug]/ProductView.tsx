"use client";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/products";
import { eur } from "@/lib/catalog";
import { useStore } from "@/components/Providers";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import Accordion from "@/components/ui/Accordion";
import ProductImage from "@/components/ui/ProductImage";
import WishlistButton from "@/components/WishlistButton";
import { Divider } from "@/components/ui/Pattern";

export default function ProductView({ p: initialProduct }: { p: Product }) {
  const { add } = useStore();
  const { getProduct, config } = useSiteConfig();
  const { t, locale } = useLanguage();
  const p = getProduct(initialProduct.slug) || initialProduct;

  const [size, setSize] = useState("");
  const [color, setColor] = useState(p.colors[0]);
  const [err, setErr] = useState(false);
  const [guide, setGuide] = useState(false);

  const imgs = p.images.length ? p.images : [undefined, undefined, undefined, undefined];

  const pick = (): boolean => {
    if (!size) {
      setErr(true);
      return false;
    }
    setErr(false);
    add({ slug: p.slug, size, color });
    return true;
  };

  const pickQuiet = (): boolean => {
    if (!size) {
      setErr(true);
      return false;
    }
    setErr(false);
    add({ slug: p.slug, size, color }, false);
    return true;
  };

  const addToBagText = locale === "nl" ? t.product.addToBag : (config.addToBagLabel || t.product.addToBag);

  return (
    <div className="wrap grid gap-10 py-8 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:py-14">
      {/* Product Image Gallery */}
      <div className="grid grid-cols-2 gap-3">
        {imgs.map((src, i) => (
          <div
            key={i}
            className={`relative bg-sand/30 overflow-hidden ${i === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[3/4]"}`}
          >
            <ProductImage
              src={src}
              alt={`${p.name} — view ${i + 1}`}
              priority={i === 0}
              sizes="(min-width:1024px) 45vw, 100vw"
            />
          </div>
        ))}
      </div>

      {/* Product Information & Buy Panel */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <nav aria-label="Breadcrumb" className="label mb-6 text-brown/50">
          <Link href="/shop" className="hover:text-brown">{t.product.breadcrumbShop}</Link> / {p.category.toUpperCase()}
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="h-display text-4xl md:text-5xl">{p.name.toUpperCase()}</h1>
            {p.badge && (
              <span className="mt-2 inline-block rounded-full bg-gold/25 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-brown font-semibold">
                {p.badge}
              </span>
            )}
          </div>
          <WishlistButton slug={p.slug} className="border border-brown/20" />
        </div>
        <p className="mt-4 text-xl font-light text-brown">{eur(p.price)}</p>
        <p className="label mt-3 text-gold">
          {locale === "nl" ? "OOSTERSE WORTELS / EUROPESE VORM" : "EASTERN ROOTS / EUROPEAN STYLE"}
        </p>
        <p className="mt-6 text-sm leading-7 text-brown/80 font-light">{p.description}</p>
        <Divider className="my-8 justify-start" />

        {/* Color Selector */}
        <p className="label mb-3">
          {t.product.colorLabel} — <span className="text-brown/60">{color.toUpperCase()}</span>
        </p>
        <div className="flex gap-2">
          {p.colors.map((c) => (
            <button
              key={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`border px-4 py-2 text-[10px] uppercase tracking-[.18em] transition-colors ${
                color === c ? "border-brown bg-brown text-cream" : "border-brown/25 hover:border-brown"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Size Selector */}
        <div className="mb-3 mt-8 flex justify-between">
          <p className="label">{t.product.sizeLabel}</p>
          <button
            className="label underline underline-offset-4 hover:text-burgundy"
            onClick={() => setGuide(!guide)}
            aria-expanded={guide}
          >
            {t.product.sizeGuide}
          </button>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Size">
          {p.sizes.map((s) => (
            <button
              key={s}
              aria-pressed={size === s}
              onClick={() => {
                setSize(s);
                setErr(false);
              }}
              className={`min-w-12 border px-3 py-3 text-[11px] tracking-widest transition-colors ${
                size === s ? "border-brown bg-brown text-cream" : "border-brown/25 hover:border-brown"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {err && <p role="alert" className="mt-3 text-xs text-burgundy">{t.product.selectSizeError}</p>}

        {guide && (
          <table className="mt-5 w-full text-left text-xs animate-in fade-in">
            <caption className="sr-only">{t.product.sizeGuideCaption}</caption>
            <thead>
              <tr className="label border-b border-brown/20">
                <th className="py-2">{t.product.sizeLabel}</th>
                <th>{t.product.chest}</th>
                <th>{t.product.length}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["XS", "92", "66"],
                ["S", "98", "68"],
                ["M", "104", "70"],
                ["L", "110", "72"],
                ["XL", "116", "74"],
                ["XXL", "122", "76"],
              ].map((r) => (
                <tr key={r[0]} className="border-b border-brown/10">
                  {r.map((c, i) => (
                    <td key={i} className="py-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Action Buttons */}
        <div className="mt-8 grid gap-3">
          <button className="btn btn-dark" onClick={pick}>
            {addToBagText}
          </button>
          <Link
            href="/checkout"
            onClick={(e) => {
              if (!pickQuiet()) e.preventDefault();
            }}
            className="btn btn-line"
          >
            {t.product.buyNow}
          </Link>
        </div>

        {/* Accordions */}
        <div className="mt-10">
          <Accordion
            items={[
              { title: t.product.descriptionTitle, body: p.description },
              { title: t.product.materialTitle, body: p.material },
              {
                title: t.product.shippingTitle,
                body: t.product.shippingBody,
              },
              {
                title: t.product.euRulesTitle,
                body: (
                  <div className="space-y-3">
                    <p>{t.product.euRulesBody}</p>
                    <div className="pt-1">
                      <Link
                        href="/returns"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[.18em] uppercase text-gold hover:text-brown transition-colors underline underline-offset-4"
                      >
                        {locale === "nl" ? "Bekijk volledig EU retourbeleid & garanties" : "View Full EU Return Policy & Guarantees"} &rarr;
                      </Link>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
