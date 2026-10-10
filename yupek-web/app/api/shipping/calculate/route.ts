import { NextRequest, NextResponse } from "next/server";
import { getCatalogProductsServer } from "@/lib/catalogServer";
import { site } from "@/config/site";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import {
  calculatePromioShippingOptions,
  PromioShippingItem,
  ShippingOption,
  EUROPE_COUNTRIES,
  US_CA_COUNTRIES,
} from "@/lib/promioShipping";

export const dynamic = "force-dynamic";

const ISO_COUNTRY_MAP: Record<string, string> = {
  netherlands: "NL",
  "the netherlands": "NL",
  nederland: "NL",
  belgium: "BE",
  "belgië": "BE",
  belgique: "BE",
  germany: "DE",
  deutschland: "DE",
  france: "FR",
  italy: "IT",
  italia: "IT",
  spain: "ES",
  "españa": "ES",
  austria: "AT",
  "österreich": "AT",
  denmark: "DK",
  danmark: "DK",
  sweden: "SE",
  sverige: "SE",
  finland: "FI",
  suomi: "FI",
  ireland: "IE",
  portugal: "PT",
  poland: "PL",
  polska: "PL",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  "united states": "US",
  usa: "US",
};

function toIsoCountryCode(country?: string | null): string {
  if (!country) return "NL";
  const cleaned = country.trim();
  if (cleaned.length === 2 && /^[a-zA-Z]+$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }
  return ISO_COUNTRY_MAP[cleaned.toLowerCase()] || cleaned.slice(0, 2).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: "Shipping address is required." }, { status: 400 });
    }

    const countryInput = (address.country || "Netherlands").trim();
    const isoCountry = toIsoCountryCode(countryInput);
    const countryLower = countryInput.toLowerCase();

    // Validate supported European countries
    const isSupportedCountry =
      site.countries.some(
        (c) => c.toLowerCase() === countryLower || toIsoCountryCode(c) === isoCountry
      ) ||
      EUROPE_COUNTRIES.has(countryLower) ||
      EUROPE_COUNTRIES.has(isoCountry.toLowerCase()) ||
      US_CA_COUNTRIES.has(countryLower) ||
      US_CA_COUNTRIES.has(isoCountry.toLowerCase());

    if (!isSupportedCountry) {
      return NextResponse.json(
        { error: `Shipping to '${countryInput}' is currently not supported. We ship across European destinations.` },
        { status: 400 }
      );
    }

    // 1. Authoritative Catalog Validation & Subtotal Calculation
    const catalog = await getCatalogProductsServer();
    let subtotalCents = 0;
    const shippingItems: PromioShippingItem[] = [];

    for (const item of items) {
      const qty = Math.max(1, Math.min(10, Number(item.qty ?? item.quantity ?? 1)));
      const matched = catalog.find((p) => {
        if (item.slug && p.slug === item.slug) return true;
        if (item.productId && p.id === item.productId) return true;
        if (item.supplierProductId && (p.supplierProductId === item.supplierProductId || p.id === item.supplierProductId)) return true;
        return false;
      });

      if (!matched) {
        return NextResponse.json(
          { error: `Item '${item.title || item.slug || "Product"}' could not be verified in catalog.` },
          { status: 400 }
        );
      }

      // Variant matching
      const variants = matched.variants || [];
      const reqVarId = item.variant_id || item.variantId || item.supplierVariantId || item.printifyVariantId;
      let matchedVar: any = null;

      if (reqVarId) {
        matchedVar = variants.find((v: any) => String(v.variant_id || v.id || v.supplier_variant_uid) === String(reqVarId));
      } else if (item.size && item.color) {
        matchedVar = variants.find((v: any) => {
          return (
            String(v.size || "").toLowerCase() === String(item.size).toLowerCase() &&
            String(v.color || "").toLowerCase() === String(item.color).toLowerCase()
          );
        });
      } else if (item.size) {
        matchedVar = variants.find((v: any) => String(v.size || "").toLowerCase() === String(item.size).toLowerCase());
      }

      if (!matchedVar) {
        if (!reqVarId && !item.size && !item.color && variants.length === 1) {
          matchedVar = variants[0];
        } else {
          return NextResponse.json(
            { error: `Selected variant (${item.size || ""}${item.color ? ` / ${item.color}` : ""}) is unavailable for '${item.title || matched.name}'.` },
            { status: 400 }
          );
        }
      }

      let priceCents = 0;
      const isPromio =
        (matched as any).supplier === "Promio" ||
        (matched as any).supplier === "promio" ||
        String(matched.id || "").startsWith("promio-") ||
        String((matched as any).supplierProductId || "").startsWith("259865");

      if (isPromio && typeof matched.price === "number" && matched.price > 0) {
        priceCents = Math.round(Number(matched.price) * 100);
      } else if (matchedVar?.price_cents && Number(matchedVar.price_cents) >= 1000) {
        priceCents = Number(matchedVar.price_cents);
      } else if (matchedVar?.price && Number(matchedVar.price) >= 10.0) {
        priceCents = Math.round(Number(matchedVar.price) * 100);
      } else if (matched.price) {
        priceCents = Math.round(Number(matched.price) * 100);
      } else if (matchedVar?.price_cents) {
        priceCents = Number(matchedVar.price_cents);
      }

      subtotalCents += priceCents * qty;

      shippingItems.push({
        category: matched.category,
        type: (matched as any).baseGarment || matched.category,
        title: matched.name,
        quantity: qty,
        weight_points: (matched as any).weight_points,
      });
    }

    // 2. Free Shipping Threshold from Site Config
    const { config: siteConfig } = await getOrMigrateSiteConfig();
    const freeShippingThresholdCents = Math.round(
      Number(siteConfig.freeShippingThreshold ?? site.freeShippingOver ?? 100) * 100
    );
    const isFreeShippingEligible = subtotalCents >= freeShippingThresholdCents;

    // 3. Promio Deterministic Shipping Rate Calculation
    // Promio is the sole fulfillment provider. Printify is never called as a fallback.
    const shippingResult = calculatePromioShippingOptions({
      country: isoCountry,
      items: shippingItems,
      subtotalCents,
      freeShippingThresholdCents,
    });

    return NextResponse.json({
      success: true,
      currency: "EUR",
      subtotal_cents: subtotalCents,
      free_shipping_threshold_cents: freeShippingThresholdCents,
      is_free_shipping_eligible: isFreeShippingEligible,
      country: isoCountry,
      total_weight_points: shippingResult.total_weight_points,
      options: shippingResult.options,
    });
  } catch (err: any) {
    console.error("[Promio Shipping Calculation Error]", err);
    return NextResponse.json(
      { error: err.message || "Shipping calculation unavailable. Please check your address." },
      { status: 400 }
    );
  }
}
