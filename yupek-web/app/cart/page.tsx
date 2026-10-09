"use client";
import Link from "next/link";
import { CartLines, useCartTotal } from "@/components/CartDrawer";
import { useStore } from "@/components/Providers";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import { eur } from "@/lib/catalog";

export default function Cart() {
  const { lines } = useStore();
  const { config } = useSiteConfig();
  const { t, locale } = useLanguage();
  const total = useCartTotal(lines);

  const threshold = config.freeShippingThreshold || 100;
  const progress = Math.min(100, Math.round((total / threshold) * 100));
  const diff = threshold - total;

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
          {/* Free Shipping Progress Indicator */}
          <div className="border border-brown/15 bg-sand/20 px-6 py-4 mb-8 rounded-xs">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-brown">
              <span>
                {diff <= 0 ? (
                  <span className="font-semibold text-green-800">{t.cart.freeShippingUnlocked}</span>
                ) : (
                  <span>{t.cart.addMoreForFreeShipping.replace("{amount}", eur(diff))}</span>
                )}
              </span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={locale === "nl" ? "Voortgang gratis verzending" : "Free shipping progress"}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-1.5 w-full bg-brown/15 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gold transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <CartLines />

          <div className="mt-8 border-t border-brown/15 pt-6 space-y-4">
            <p className="label flex justify-between text-sm text-brown">
              <span>{t.cart.subtotal}</span>
              <span className="font-semibold text-base">{eur(total)}</span>
            </p>
            <p className="text-xs text-brown/60">{t.cart.taxesNote}</p>
            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <Link href="/shop" className="btn btn-line text-center text-xs flex-1">
                {t.cart.continueShopping}
              </Link>
              <Link href="/checkout" className="btn btn-dark text-center text-xs flex-1">
                {t.cart.checkout}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
