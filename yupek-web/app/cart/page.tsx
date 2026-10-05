"use client";
import Link from "next/link";
import { CartLines, useCartTotal } from "@/components/CartDrawer";
import { useStore } from "@/components/Providers";
import { useLanguage } from "@/components/LanguageContext";
import { eur } from "@/lib/catalog";

export default function Cart() {
  const { lines } = useStore();
  const { t } = useLanguage();
  const total = useCartTotal(lines);

  return (
    <div className="wrap max-w-3xl py-16 md:py-24">
      <h1 className="h-display mb-10 text-center text-5xl md:text-7xl text-brown">{t.cart.title}</h1>
      {lines.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-serif text-3xl tracking-[.1em] text-brown">{t.cart.emptyTitle}</p>
          <p className="mt-2 text-xs text-brown/60">{t.cart.emptySubtitle}</p>
          <Link href="/shop" className="btn btn-dark mt-8">
            {t.cart.continueShopping}
          </Link>
        </div>
      ) : (
        <>
          <CartLines />
          <p className="label mt-8 flex justify-between border-t border-brown/15 pt-6 text-sm text-brown">
            <span>{t.cart.subtotal}</span>
            <span className="font-semibold">{eur(total)}</span>
          </p>
          <Link href="/checkout" className="btn btn-dark mt-8 w-full">
            {t.cart.checkout}
          </Link>
        </>
      )}
    </div>
  );
}
