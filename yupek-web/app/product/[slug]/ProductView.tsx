"use client";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { Product } from "@/data/products";
import { eur, isExcludedSize } from "@/lib/catalog";
import { useStore } from "@/components/Providers";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import Accordion from "@/components/ui/Accordion";
import ProductImage from "@/components/ui/ProductImage";
import WishlistButton from "@/components/WishlistButton";
import { Divider } from "@/components/ui/Pattern";
import Icon from "@/components/ui/Icon";
import { useAccessibility } from "@/components/AccessibilityContext";

/**
 * Cleanly parse Printify description into editorial intro, features, and care instructions.
 * Eliminates all raw `<br/>` and markdown bullet noise.
 */
function parseProductDescription(desc: string) {
  if (!desc) return { intro: "", features: [] as string[], care: [] as string[] };

  // Normalize all variations of br and escaped br tags to newlines
  const text = desc
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/\r\n/g, "\n");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let section: "intro" | "features" | "care" = "intro";
  const introParts: string[] = [];
  const features: string[] = [];
  const care: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("product features") || lower === "features") {
      section = "features";
      continue;
    }
    if (lower.includes("care instructions") || lower === "care") {
      section = "care";
      continue;
    }

    // Strip leading dash, bullet, or asterisk
    const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
    if (!cleanLine) continue;

    if (section === "intro") {
      introParts.push(cleanLine);
    } else if (section === "features") {
      features.push(cleanLine);
    } else if (section === "care") {
      care.push(cleanLine);
    }
  }

  return {
    intro: introParts.join(" "),
    features,
    care,
  };
}

export default function ProductView({ p: initialProduct }: { p: Product }) {
  const { add } = useStore();
  const { getProduct, config } = useSiteConfig();
  const { t, locale } = useLanguage();
  const { speakText, isSpeaking, stopSpeech } = useAccessibility();
  
  // Real-time catalog product merge
  const p = getProduct(initialProduct.slug) || initialProduct;

  // 1. Filter enabled & available variants (strictly excluding 3XL, 4XL, 5XL)
  const activeVariants = useMemo(() => {
    return (p.variants || [])
      .filter((v) => v.is_enabled !== false && v.is_available !== false)
      .filter((v) => !isExcludedSize(v.size) && !isExcludedSize(v.title));
  }, [p.variants]);

  // 2. Compute ordered available colors
  const availableColors = useMemo(() => {
    if (activeVariants.length === 0) {
      return p.colors.length > 0 ? p.colors : ["Default"];
    }
    const colorsPresent = new Set(activeVariants.map((v) => v.color).filter(Boolean));
    const ordered = (p.colors || []).filter((c) => colorsPresent.has(c));
    if (ordered.length > 0) return ordered;
    return Array.from(colorsPresent) as string[];
  }, [activeVariants, p.colors]);

  // Helper: Get valid sizes for a specific color (strictly excluding 3XL, 4XL, 5XL)
  const getValidSizesForColor = useCallback(
    (colorName: string): string[] => {
      if (activeVariants.length === 0) return (p.sizes || []).filter((s) => !isExcludedSize(s));
      const sizesForColor = new Set(
        activeVariants
          .filter((v) => v.color === colorName)
          .map((v) => v.size)
          .filter((s): s is string => Boolean(s) && !isExcludedSize(s))
      );
      const ordered = (p.sizes || []).filter((s) => !isExcludedSize(s) && sizesForColor.has(s));
      if (ordered.length > 0) return ordered;
      return Array.from(sizesForColor);
    },
    [activeVariants, p.sizes]
  );

  // 3. Initial color and size selection (automatically select valid default)
  const defaultColor = availableColors[0] || "";
  const defaultSizes = getValidSizesForColor(defaultColor);
  const defaultSize = defaultSizes[0] || "";

  const [color, setColor] = useState<string>(() => defaultColor);
  const [size, setSize] = useState<string>(() => defaultSize);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [err, setErr] = useState(false);
  const [guide, setGuide] = useState(false);

  // Synchronize state if product changes
  useEffect(() => {
    const validColors = availableColors;
    if (validColors.length > 0 && !validColors.includes(color)) {
      const newCol = validColors[0];
      setColor(newCol);
      const validS = getValidSizesForColor(newCol);
      setSize(validS[0] || "");
      setActiveImageIndex(0);
    }
  }, [availableColors, color, getValidSizesForColor]);

  // 4. Color -> Image Mapping
  const colorVariantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const v of p.variants || []) {
      if (v.color === color && v.variant_id != null) {
        ids.add(String(v.variant_id));
      }
    }
    return ids;
  }, [p.variants, color]);

  const galleryImages = useMemo(() => {
    if (p.detailedImages && p.detailedImages.length > 0) {
      const matched = p.detailedImages.filter(
        (img) => img.variant_ids && img.variant_ids.some((vid) => colorVariantIds.has(String(vid)))
      );
      if (matched.length > 0) {
        return matched.map((img) => img.src);
      }
    }
    return p.images.length > 0 ? p.images : ["/images/look-1.jpg"];
  }, [p.detailedImages, p.images, colorVariantIds]);

  // Clamp activeImageIndex if galleryImages length shrinks
  useEffect(() => {
    if (activeImageIndex >= galleryImages.length) {
      setActiveImageIndex(0);
    }
  }, [galleryImages.length, activeImageIndex]);

  // 5. Variant Matrix: Exact selectedVariant
  const selectedVariant = useMemo(() => {
    if (activeVariants.length === 0) return null;
    return activeVariants.find((v) => v.color === color && v.size === size) || null;
  }, [activeVariants, color, size]);

  // 6. Exact Price Calculation (No "From" when variant is selected)
  const displayPrice = useMemo(() => {
    if (selectedVariant && selectedVariant.price_cents) {
      return selectedVariant.price_cents / 100;
    }
    if (activeVariants.length > 0) {
      const firstActive = activeVariants.find((v) => v.color === color) || activeVariants[0];
      if (firstActive?.price_cents) {
        return firstActive.price_cents / 100;
      }
    }
    return p.price;
  }, [selectedVariant, activeVariants, color, p.price]);

  // 6b. Availability State
  const isOutOfStock = useMemo(() => {
    if (p.inventory !== undefined && p.inventory <= 0) return true;
    if (p.variants && p.variants.length > 0) {
      if (activeVariants.length === 0) return true;
      if (selectedVariant && selectedVariant.is_available === false) return true;
    }
    return false;
  }, [p.inventory, p.variants, activeVariants.length, selectedVariant]);

  // 7. Handlers for Color and Size changes
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setActiveImageIndex(0);
    setErr(false);

    // Keep size if available for the new color, otherwise auto-select first available size
    const validSizes = getValidSizesForColor(newColor);
    if (!validSizes.includes(size)) {
      setSize(validSizes[0] || "");
    }
  };

  const handleSizeChange = (newSize: string) => {
    setSize(newSize);
    setErr(false);
  };

  // Gallery Navigation
  const nextImage = useCallback(() => {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  // Keyboard navigation for image gallery
  const galleryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        prevImage();
      } else if (e.key === "ArrowRight") {
        nextImage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevImage, nextImage]);

  // Touch Swipe for Mobile Gallery
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      nextImage();
    } else if (diff < -45) {
      prevImage();
    }
    setTouchStartX(null);
  };

  // 8. Add to Bag with exact selected variant details
  const pick = (): boolean => {
    if (isOutOfStock) return false;
    const validSizes = getValidSizesForColor(color);
    if (!size && validSizes.length > 0) {
      setErr(true);
      return false;
    }
    setErr(false);
    add({
      slug: p.slug,
      size,
      color,
      qty: quantity,
      productId: p.id,
      printifyProductId: p.supplierProductId,
      printifyVariantId: selectedVariant?.variant_id != null ? String(selectedVariant.variant_id) : "",
      title: p.name,
      price: displayPrice,
      price_cents: selectedVariant?.price_cents ?? Math.round(displayPrice * 100),
      image: galleryImages[0] || p.images[0] || "/images/look-1.jpg",
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
    return true;
  };

  const pickQuiet = (): boolean => {
    if (isOutOfStock) return false;
    const validSizes = getValidSizesForColor(color);
    if (!size && validSizes.length > 0) {
      setErr(true);
      return false;
    }
    setErr(false);
    add(
      {
        slug: p.slug,
        size,
        color,
        qty: quantity,
        productId: p.id,
        printifyProductId: p.supplierProductId,
        printifyVariantId: selectedVariant?.variant_id != null ? String(selectedVariant.variant_id) : "",
        title: p.name,
        price: displayPrice,
        price_cents: selectedVariant?.price_cents ?? Math.round(displayPrice * 100),
        image: galleryImages[0] || p.images[0] || "/images/look-1.jpg",
      },
      false
    );
    return true;
  };

  // 9. Parse and structure the description
  const descParsed = useMemo(() => parseProductDescription(p.description), [p.description]);

  const addToBagText = locale === "nl" ? t.product.addToBag : config.addToBagLabel || t.product.addToBag;
  const currentSizesForColor = getValidSizesForColor(color);

  // Compute all distinct sizes across enabled variants (ordered)
  const allProductSizes = useMemo(() => {
    if (activeVariants.length === 0) return p.sizes;
    const presentSizes = new Set(activeVariants.map((v) => v.size).filter(Boolean));
    const ordered = (p.sizes || []).filter((s) => presentSizes.has(s));
    if (ordered.length > 0) return ordered;
    return Array.from(presentSizes) as string[];
  }, [activeVariants, p.sizes]);

  return (
    <div className="wrap grid gap-10 py-6 lg:grid-cols-[58%_42%] lg:gap-16 lg:py-12 items-start">
      {/* ============================================================ */}
      {/* 1. PRODUCT GALLERY (LEFT COLUMN: DESKTOP & MOBILE CAROUSEL)  */}
      {/* ============================================================ */}
      <div ref={galleryRef} className="w-full select-none" aria-label="Product image gallery">
        {/* Main Display Image Frame */}
        <div
          className="relative aspect-[3/4] md:aspect-[4/5] w-full bg-sand/20 overflow-hidden group border border-brown/10"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {galleryImages.map((src, i) => (
            <div
              key={src + i}
              className={`absolute inset-0 transition-opacity duration-300 ${
                i === activeImageIndex ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
              }`}
            >
              <ProductImage
                src={src}
                alt={`${p.name} - ${color} - view ${i + 1}`}
                priority={i === 0}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-contain w-full h-full p-2 md:p-6"
              />
            </div>
          ))}

          {/* Navigation Arrows (Subtle & Luxury) */}
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous product image"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-cream/90 hover:bg-cream border border-brown/20 text-brown shadow-sm transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
              >
                <Icon name="arrowLeft" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next product image"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-cream/90 hover:bg-cream border border-brown/20 text-brown shadow-sm transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
              >
                <Icon name="arrowRight" className="w-4 h-4" />
              </button>

              {/* Minimal Counter Badge */}
              <div className="absolute bottom-3 right-3 z-20 bg-cream/90 backdrop-blur-xs px-2.5 py-1 border border-brown/15 text-[10px] tracking-widest text-brown/80 font-mono">
                {activeImageIndex + 1} / {galleryImages.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Navigation Row */}
        {galleryImages.length > 1 && (
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Product thumbnails">
            {galleryImages.map((src, i) => (
              <button
                key={src + i}
                type="button"
                role="tab"
                aria-selected={i === activeImageIndex}
                aria-label={`View image ${i + 1}`}
                onClick={() => setActiveImageIndex(i)}
                className={`relative w-16 h-20 md:w-20 md:h-24 aspect-[3/4] shrink-0 bg-sand/15 overflow-hidden transition-all duration-150 border ${
                  i === activeImageIndex
                    ? "border-brown ring-1 ring-brown opacity-100"
                    : "border-brown/15 opacity-60 hover:opacity-100 hover:border-brown/40"
                }`}
              >
                <ProductImage
                  src={src}
                  alt={`${p.name} thumbnail ${i + 1}`}
                  sizes="80px"
                  className="object-contain w-full h-full p-1"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. PRODUCT INFORMATION & BUY PANEL (RIGHT COLUMN)            */}
      {/* ============================================================ */}
      <div className="lg:sticky lg:top-28 lg:self-start w-full">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="label mb-4 text-brown/50 text-[11px]">
          <Link href="/shop" className="hover:text-brown transition-colors">
            {t.product.breadcrumbShop}
          </Link>{" "}
          / <span className="uppercase">{p.category}</span>
        </nav>

        {/* Title & Wishlist */}
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="h-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] text-brown tracking-tight">
              {p.name.toUpperCase()}
            </h1>
            {p.badge && (
              <span className="mt-2.5 inline-block rounded-full bg-gold/25 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-brown font-semibold">
                {p.badge}
              </span>
            )}
          </div>
          <WishlistButton slug={p.slug} className="border border-brown/20 shrink-0" />
        </div>

        {/* Price Display (Clean exact price, no "From" prefix) */}
        <p className="mt-4 text-2xl font-light text-brown tracking-tight">
          {eur(displayPrice)}
        </p>

        {/* Heritage Tagline */}
        <p className="label mt-2 text-gold text-[10px] tracking-[.22em]">
          {locale === "nl" ? "OOSTERSE WORTELS / EUROPESE VORM" : "EASTERN ROOTS / EUROPEAN STYLE"}
        </p>

        <Divider className="my-6 justify-start" />

        {/* Color Selector */}
        <div className="mb-6">
          <p className="label mb-3 text-xs">
            {t.product.colorLabel} — <span className="text-brown/70 font-medium">{color.toUpperCase()}</span>
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
            {availableColors.map((c) => {
              const isSelected = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Color: ${c}`}
                  onClick={() => handleColorChange(c)}
                  className={`border px-4 py-2.5 text-[10px] uppercase tracking-[.18em] transition-all ${
                    isSelected
                      ? "border-brown bg-brown text-cream shadow-xs font-semibold"
                      : "border-brown/25 text-brown/90 hover:border-brown bg-cream/40"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Size Selector */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="label text-xs">
              {t.product.sizeLabel} —{" "}
              <span className="text-brown/70 font-medium">{size ? size.toUpperCase() : "SELECT"}</span>
            </p>
            <button
              type="button"
              className="label underline underline-offset-4 hover:text-burgundy text-[11px] transition-colors"
              onClick={() => setGuide(!guide)}
              aria-expanded={guide}
            >
              {t.product.sizeGuide}
            </button>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {allProductSizes.map((s) => {
              const isAvailable = currentSizesForColor.includes(s);
              const isSelected = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Size: ${s}${!isAvailable ? " (Unavailable)" : ""}`}
                  aria-disabled={!isAvailable}
                  disabled={!isAvailable}
                  onClick={() => handleSizeChange(s)}
                  className={`min-w-12 border px-3.5 py-3 text-[11px] font-mono tracking-widest transition-all ${
                    isSelected
                      ? "border-brown bg-brown text-cream shadow-xs font-semibold"
                      : isAvailable
                      ? "border-brown/25 text-brown hover:border-brown bg-cream/40"
                      : "border-brown/10 text-brown/30 cursor-not-allowed line-through bg-sand/10"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {err && (
            <p role="alert" className="mt-3 text-xs text-burgundy font-medium">
              {t.product.selectSizeError}
            </p>
          )}

          {/* Size Guide Table */}
          {guide && (
            <div className="mt-4 border border-brown/15 bg-sand/10 p-4 transition-all overflow-x-auto max-w-full">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">{t.product.sizeGuideCaption}</caption>
                <thead>
                  <tr className="label border-b border-brown/20 text-brown/70">
                    <th className="py-2">{t.product.sizeLabel}</th>
                    <th className="py-2">{t.product.chest} (cm)</th>
                    <th className="py-2">{t.product.length} (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown/10 font-mono text-[11px]">
                  {[
                    ["S", "98", "68"],
                    ["M", "104", "70"],
                    ["L", "110", "72"],
                    ["XL", "116", "74"],
                    ["2XL", "122", "76"],
                  ].map((r) => (
                    <tr key={r[0]}>
                      {r.map((c, i) => (
                        <td key={i} className="py-2">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quantity Selector & Real-Time Stock Status */}
        <div className="mb-6">
          <label htmlFor="product-quantity-stepper" className="label mb-3 block text-xs">
            {locale === "nl" ? "AANTAL" : "QUANTITY"}
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center border border-brown/30 bg-cream/50 shadow-2xs">
              <button
                type="button"
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label={locale === "nl" ? "Aantal verlagen" : "Decrease quantity"}
                className="h-11 w-11 flex items-center justify-center hover:bg-brown/5 text-brown transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:bg-brown/10 touch-manipulation"
              >
                <Icon name="minus" className="h-3 w-3" />
              </button>
              <span
                id="product-quantity-stepper"
                aria-live="polite"
                className="w-10 text-center font-mono text-xs font-semibold text-brown select-none"
              >
                {quantity}
              </span>
              <button
                type="button"
                disabled={quantity >= 10 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                aria-label={locale === "nl" ? "Aantal verhogen" : "Increase quantity"}
                className="h-11 w-11 flex items-center justify-center hover:bg-brown/5 text-brown transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:bg-brown/10 touch-manipulation"
              >
                <Icon name="plus" className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-block h-2 w-2 rounded-full ${isOutOfStock ? "bg-burgundy" : "bg-green-700"}`} />
              <span className="text-brown/75 text-[11px] font-medium tracking-wide">
                {isOutOfStock
                  ? (locale === "nl" ? "Tijdelijk uitverkocht" : "Currently out of stock")
                  : (locale === "nl" ? "Op voorraad • Verzonden binnen 1-3 werkdagen" : "In stock • Dispatched in 1-3 business days")}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            disabled={isOutOfStock}
            className={`btn w-full py-4 text-xs tracking-[.22em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              addedFeedback ? "bg-green-900 text-cream" : "btn-dark"
            }`}
            onClick={pick}
          >
            {addedFeedback
              ? (locale === "nl" ? "✓ TOEGEVOEGD AAN WINKELMAND" : "✓ ADDED TO BAG")
              : isOutOfStock
              ? (locale === "nl" ? "UITVERKOCHT" : "OUT OF STOCK")
              : addToBagText}
          </button>
          <Link
            href="/checkout"
            onClick={(e) => {
              if (isOutOfStock || !pickQuiet()) e.preventDefault();
            }}
            aria-disabled={isOutOfStock}
            className={`btn btn-line w-full py-3.5 text-xs tracking-[.22em] text-center ${
              isOutOfStock ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            {t.product.buyNow}
          </Link>
        </div>

        {/* Shipping Reassurance */}
        <div className="mt-5 flex items-center gap-2 text-[11px] text-brown/70 border-y border-brown/10 py-3">
          <span className="text-gold font-serif text-sm">✦</span>
          <span>
            {locale === "nl"
              ? "Gratis verzending in Europa vanaf €100 • 30 dagen kosteloos retourneren"
              : "Complimentary shipping in Europe on orders over €100 • 30-day free returns"}
          </span>
        </div>

        {/* Formatted Product Story & Features */}
        <div className="mt-8 border-t border-brown/15 pt-6 space-y-6">
          {/* Main Description Intro */}
          {descParsed.intro && (
            <p className="text-sm leading-relaxed text-brown/85 font-light">
              {descParsed.intro}
            </p>
          )}

          {/* Product Features List */}
          {descParsed.features.length > 0 && (
            <div>
              <h3 className="label text-[11px] font-semibold tracking-[.2em] text-brown mb-2.5">
                {locale === "nl" ? "KENMERKEN" : "PRODUCT FEATURES"}
              </h3>
              <ul className="space-y-1.5 text-xs text-brown/80 font-light">
                {descParsed.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-gold leading-tight">•</span>
                    <span className="leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Care Instructions List */}
          {descParsed.care.length > 0 && (
            <div>
              <h3 className="label text-[11px] font-semibold tracking-[.2em] text-brown mb-2.5">
                {locale === "nl" ? "WASVOORSCHRIFT" : "CARE INSTRUCTIONS"}
              </h3>
              <ul className="space-y-1.5 text-xs text-brown/80 font-light">
                {descParsed.care.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-gold leading-tight">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Audio Readout for Accessibility */}
          <div className="pt-2 flex items-center">
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stopSpeech();
                } else {
                  const speechScript = `${p.name}. Price ${eur(displayPrice)}. ${descParsed.intro}. Available in ${availableColors.join(", ")}. Available sizes: ${currentSizesForColor.join(", ")}.`;
                  speakText(speechScript);
                }
              }}
              aria-label={
                isSpeaking
                  ? locale === "nl"
                    ? "Stop voorlezen"
                    : "Stop reading product description"
                  : locale === "nl"
                  ? "Beluister productbeschrijving"
                  : "Listen to product description"
              }
              aria-pressed={isSpeaking}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.2em] font-semibold text-gold hover:text-brown border border-gold/40 px-3.5 py-1.5 transition-all bg-sand/15 hover:bg-gold/20"
            >
              <Icon name={isSpeaking ? "volumeMute" : "volume"} className="w-3.5 h-3.5 text-gold" />
              <span>
                {isSpeaking
                  ? locale === "nl"
                    ? "Stop voorlezen"
                    : "Stop reading"
                  : locale === "nl"
                  ? "Beluister beschrijving"
                  : "Listen to description"}
              </span>
            </button>
          </div>
        </div>

        {/* Editorial Accordions */}
        <div className="mt-8 border-t border-brown/15 pt-2">
          <Accordion
            items={[
              {
                title: t.product.materialTitle,
                body: p.material || "100% premium quality fabric tailored for modern living.",
              },
              {
                title: t.product.shippingTitle,
                body: (
                  <div className="space-y-3">
                    <p>{t.product.shippingBody}</p>
                    <div className="pt-1">
                      <Link
                        href="/shipping"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[.18em] uppercase text-gold hover:text-brown transition-colors underline underline-offset-4"
                      >
                        {locale === "nl" ? "Bekijk volledig verzendbeleid & levertijden" : "View Full Shipping & Delivery Policy"} &rarr;
                      </Link>
                    </div>
                  </div>
                ),
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
