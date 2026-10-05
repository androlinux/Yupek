"use client";
import Icon from "./ui/Icon";
import { useStore } from "./Providers";
import { useLanguage } from "./LanguageContext";

export default function WishlistButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { wishlist, toggleWish } = useStore();
  const { locale } = useLanguage();
  const on = wishlist.includes(slug);
  const label = on
    ? locale === "nl" ? "Verwijder uit verlanglijst" : "Remove from wishlist"
    : locale === "nl" ? "Toevoegen aan verlanglijst" : "Add to wishlist";

  return (
    <button aria-label={label} aria-pressed={on} onClick={() => toggleWish(slug)} className={`flex h-9 w-9 items-center justify-center bg-cream/90 text-brown transition hover:bg-cream ${className}`}>
      <Icon name="heart" className="h-4 w-4" fill={on} />
    </button>
  );
}
