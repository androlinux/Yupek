"use client";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import { useStore } from "@/components/Providers";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import ScrollReveal from "@/components/ScrollReveal";

export default function Wishlist() {
  const { wishlist } = useStore();
  const { allProducts } = useSiteConfig();
  const { t, locale } = useLanguage();
  const items = allProducts.filter((p) => wishlist.includes(p.slug));

  return (
    <div className="wrap py-16 md:py-24">
      <ScrollReveal>
        <div className="text-center mb-14">
          <span className="label tracking-[.3em] text-burgundy text-[10px]">
            {t.account.wishlistTab.toUpperCase()}
          </span>
          <h1 className="h-display mt-2 text-5xl md:text-7xl text-brown">
            {t.nav.wishlist}
          </h1>
          <p className="mt-3 text-xs text-brown/60">
            {items.length > 0
              ? `${items.length} ${
                  locale === "nl"
                    ? items.length === 1
                      ? "kledingstuk bewaard"
                      : "kledingstukken bewaard"
                    : items.length === 1
                    ? "piece saved"
                    : "pieces saved"
                }`
              : t.account.emptyArchiveSubtitle}
          </p>
        </div>
      </ScrollReveal>

      {items.length ? (
        <ScrollReveal delayMs={100}>
          <ProductGrid items={items} centerIfFew={true} />
          <div className="mt-16 text-center">
            <Link href="/shop" className="btn btn-line text-xs py-3 px-8">
              {locale === "nl" ? "Verder Winkelen" : "Continue Shopping"}
            </Link>
          </div>
        </ScrollReveal>
      ) : (
        <div className="py-20 text-center border border-dashed border-brown/20 bg-sand/10 p-8 max-w-lg mx-auto">
          <p className="font-serif text-3xl tracking-[.1em] text-brown">
            {t.account.emptyArchiveTitle.toUpperCase()}
          </p>
          <p className="mt-2 text-xs text-brown/60">
            {t.account.emptyArchiveSubtitle}
          </p>
          <Link href="/shop" className="btn btn-dark mt-8 inline-block">
            {t.account.discoverPiecesBtn}
          </Link>
        </div>
      )}
    </div>
  );
}
