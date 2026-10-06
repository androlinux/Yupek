"use client";
import Link from "next/link";
import type { Product } from "@/data/products";
import { eur } from "@/lib/catalog";
import ProductImage from "./ui/ProductImage";
import WishlistButton from "./WishlistButton";
import { useStore } from "./Providers";
import { useLanguage } from "./LanguageContext";

export default function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const { add } = useStore();
  const { t } = useLanguage();
  return (
    <article className="group">
      <div className="relative aspect-[3/4] overflow-hidden bg-sand/30">
        <Link href={`/product/${p.slug}`} className="absolute inset-0 block" aria-label={p.name}>
          <ProductImage src={p.images[0]} alt={p.name} priority={priority} className="transition-transform duration-700 group-hover:scale-[1.03]" />
          {p.images[1] && <ProductImage src={p.images[1]} alt="" className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
        </Link>
        {p.badge && <span className="label absolute left-3 top-3 bg-cream px-2 py-1 text-[9px]">{p.badge}</span>}
        <WishlistButton slug={p.slug} className="absolute right-3 top-3 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus-visible:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-cream/95 p-3 transition-transform duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0 lg:block">
          <p className="label mb-2 text-center text-[9px]">{t.common.quickAdd}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {p.sizes.map((s) => (
              <button
                key={s}
                aria-label={`${t.common.quickAdd} ${s}`}
                onClick={() => add({ slug: p.slug, size: s, color: p.colors[0] })}
                className="min-w-9 border border-brown/30 px-2 py-1.5 text-[10px] tracking-widest hover:bg-brown hover:text-cream"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[12px] uppercase tracking-[.16em]"><Link href={`/product/${p.slug}`}>{p.name}</Link></h3>
          <p className="mt-1 text-xs text-brown/60">{p.descriptor}</p>
        </div>
        <p className="text-sm">{eur(p.price)}</p>
      </div>
    </article>
  );
}
