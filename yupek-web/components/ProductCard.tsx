"use client";
import Link from "next/link";
import { useMemo } from "react";
import type { Product } from "@/data/products";
import { eur, isCustomerFacingDescriptor, isExcludedSize } from "@/lib/catalog";
import ProductImage from "./ui/ProductImage";
import WishlistButton from "./WishlistButton";
import { useStore } from "./Providers";
import { useLanguage } from "./LanguageContext";

export default function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const { add } = useStore();
  const { t } = useLanguage();

  const defaultColor = (p.colors && p.colors[0]) || "Default";

  // Filter available sizes (strictly excluding 3XL, 4XL, 5XL, and unavailable variants)
  const availableSizes = useMemo(() => {
    if (p.variants && p.variants.length > 0) {
      const active = p.variants.filter(
        (v) =>
          v.is_enabled !== false &&
          v.is_available !== false &&
          (!v.color || v.color === defaultColor) &&
          !isExcludedSize(v.size)
      );
      if (active.length > 0) {
        const found = Array.from(new Set(active.map((v) => v.size).filter(Boolean))) as string[];
        const ordered = (p.sizes || []).filter((s) => !isExcludedSize(s) && found.includes(s));
        return ordered.length > 0 ? ordered : found;
      }
    }
    return (p.sizes || []).filter((s) => !isExcludedSize(s));
  }, [p, defaultColor]);

  const handleQuickAdd = (s: string) => {
    const variant = p.variants?.find(
      (v) =>
        v.size === s &&
        (!v.color || v.color === defaultColor) &&
        v.is_enabled !== false &&
        v.is_available !== false
    );
    const unitPrice = variant?.price_cents ? variant.price_cents / 100 : p.price;
    add({
      slug: p.slug,
      size: s,
      color: defaultColor,
      productId: p.id,
      printifyProductId: p.supplierProductId,
      printifyVariantId: variant?.variant_id != null ? String(variant.variant_id) : "",
      title: p.name,
      price: unitPrice,
      price_cents: variant?.price_cents ?? Math.round(unitPrice * 100),
      image: p.images[0] || "/images/look-1.jpg",
    });
  };

  return (
    <article className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-sand/30">
        <Link href={`/product/${p.slug}`} className="absolute inset-0 block" aria-label={p.name}>
          <ProductImage
            src={p.images[0]}
            alt={p.name}
            priority={priority}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          {p.images[1] && (
            <ProductImage
              src={p.images[1]}
              alt=""
              className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>
        {p.badge && (
          <span className="label absolute left-3 top-3 bg-cream px-2 py-1 text-[9px] shadow-2xs">
            {p.badge}
          </span>
        )}
        <WishlistButton
          slug={p.slug}
          className="absolute right-3 top-3 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        />
        {availableSizes.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-cream/95 p-3 transition-transform duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0 lg:block">
            <p className="label mb-2 text-center text-[9px]">{t.common.quickAdd}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {availableSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`${t.common.quickAdd} ${s}`}
                  onClick={() => handleQuickAdd(s)}
                  className="min-w-9 border border-brown/30 px-2 py-1.5 text-[10px] tracking-widest hover:bg-brown hover:text-cream transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] uppercase tracking-[.16em] break-words hover:text-brown/80 transition-colors">
            <Link href={`/product/${p.slug}`}>{p.name}</Link>
          </h3>
          {isCustomerFacingDescriptor(p.descriptor) && (
            <p className="mt-1 text-xs text-brown/60 break-words">{p.descriptor}</p>
          )}
        </div>
        <p className="text-sm font-medium text-brown whitespace-nowrap">{eur(p.price)}</p>
      </div>
    </article>
  );
}
