"use client";
import Link from "next/link";
import { useEffect } from "react";
import { eur } from "@/lib/catalog";
import Icon from "./ui/Icon";
import ProductImage from "./ui/ProductImage";
import { useStore, type CartLine } from "./Providers";
import { useSiteConfig } from "./ConfigContext";
import { useLanguage } from "./LanguageContext";

export function useCartTotal(lines: CartLine[]) {
  const { getProduct } = useSiteConfig();
  return lines.reduce((s, l) => s + (getProduct(l.slug)?.price ?? 0) * l.qty, 0);
}

export function CartLines() {
  const { lines, setQty, remove } = useStore();
  const { getProduct } = useSiteConfig();
  const { t, locale } = useLanguage();

  return (
    <ul className="divide-y divide-brown/10">
      {lines.map((l) => {
        const p = getProduct(l.slug);
        if (!p) return null;
        return (
          <li key={`${l.slug}-${l.size}-${l.color}`} className="flex gap-4 py-5">
            <div className="relative h-28 w-20 shrink-0 bg-sand/30 overflow-hidden">
              <ProductImage src={p.images[0]} alt={p.name} sizes="80px" />
            </div>
            <div className="flex flex-1 flex-col justify-between text-xs">
              <div>
                <p className="uppercase tracking-[.14em] font-medium text-brown">{p.name}</p>
                <p className="mt-1 text-brown/60">
                  {l.color} / {l.size}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center border border-brown/25">
                  <button
                    aria-label={locale === "nl" ? "Aantal verlagen" : "Decrease quantity"}
                    className="p-2 hover:bg-brown/5 transition-colors"
                    onClick={() => setQty(l, l.qty - 1)}
                  >
                    <Icon name="minus" className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-mono" aria-live="polite">
                    {l.qty}
                  </span>
                  <button
                    aria-label={locale === "nl" ? "Aantal verhogen" : "Increase quantity"}
                    className="p-2 hover:bg-brown/5 transition-colors"
                    onClick={() => setQty(l, l.qty + 1)}
                  >
                    <Icon name="plus" className="h-3 w-3" />
                  </button>
                </div>
                <button
                  className="underline underline-offset-4 text-brown/60 hover:text-burgundy transition-colors text-[11px]"
                  onClick={() => remove(l)}
                >
                  {t.cart.remove}
                </button>
              </div>
            </div>
            <p className="text-sm font-medium text-brown">{eur(p.price * l.qty)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default function CartDrawer() {
  const { lines, cartOpen, setCartOpen } = useStore();
  const { config } = useSiteConfig();
  const { t, locale } = useLanguage();
  const total = useCartTotal(lines);

  const threshold = config.freeShippingThreshold || 100;
  const progress = Math.min(100, Math.round((total / threshold) * 100));
  const diff = threshold - total;

  const checkoutBtnText = locale === "nl" ? t.cart.checkout : (config.checkoutButtonLabel || t.cart.checkout);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    if (cartOpen) window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [cartOpen, setCartOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-brown/50 backdrop-blur-sm transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.cart.title}
        aria-hidden={!cartOpen}
        inert={!cartOpen || undefined}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          cartOpen ? "translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-brown/10 px-6 py-5">
          <h2 className="label text-brown">
            {t.cart.title} ({lines.reduce((n, l) => n + l.qty, 0)})
          </h2>
          <button
            aria-label={t.common.close}
            onClick={() => setCartOpen(false)}
            className="p-1 text-brown/60 hover:text-brown transition-colors"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="border-b border-brown/10 bg-sand/20 px-6 py-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-brown">
            <span>
              {diff <= 0 ? (
                <span className="font-semibold text-green-800">{t.cart.freeShippingUnlocked}</span>
              ) : (
                <span>{t.cart.addMoreForFreeShipping.replace("{amount}", eur(diff))}</span>
              )}
            </span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-brown/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <img
              src="/images/logo-symbol.png"
              alt=""
              className="h-14 w-14 object-contain opacity-75 animate-in fade-in zoom-in-95 duration-500"
              aria-hidden="true"
            />
            <p className="font-serif text-3xl tracking-[.1em] text-brown">{t.cart.emptyTitle}</p>
            <p className="text-xs text-brown/60 max-w-xs">{t.cart.emptySubtitle}</p>
            <Link href="/shop" onClick={() => setCartOpen(false)} className="btn btn-dark">
              {t.cart.continueShopping}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <CartLines />
            </div>
            <div className="border-t border-brown/10 p-6 space-y-4 bg-sand/10">
              <div className="label flex justify-between text-xs text-brown">
                <span>{t.cart.subtotal}</span>
                <span className="font-semibold text-sm">{eur(total)}</span>
              </div>
              <p className="text-[10px] text-brown/60">{t.cart.taxesNote}</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  onClick={() => setCartOpen(false)}
                  className="btn btn-line text-center text-xs"
                >
                  {t.cart.viewBag}
                </Link>
                <Link
                  href="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="btn btn-dark text-center text-xs"
                >
                  {checkoutBtnText}
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
