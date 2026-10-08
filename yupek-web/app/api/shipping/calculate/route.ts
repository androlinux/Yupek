import { NextRequest, NextResponse } from "next/server";
import { getCatalogProductsServer } from "@/lib/catalogServer";
import { site } from "@/config/site";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

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

interface ShippingOption {
  id: "standard" | "economy" | "express" | "priority";
  label: string;
  description: string;
  amount_cents: number;
  amount_formatted: string;
  currency: string;
  is_free: boolean;
  estimated_days_min: number;
  estimated_days_max: number;
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

    // Validate supported European countries
    const isSupportedCountry = site.countries.some(
      (c) => c.toLowerCase() === countryInput.toLowerCase() || toIsoCountryCode(c) === isoCountry
    );

    if (!isSupportedCountry) {
      return NextResponse.json(
        { error: `Shipping to '${countryInput}' is currently not supported. We ship across European destinations.` },
        { status: 400 }
      );
    }

    // 1. Authoritative Catalog Validation & Subtotal Calculation
    const catalog = await getCatalogProductsServer();
    let subtotalCents = 0;
    const printifyLineItems: Array<{ product_id: string; variant_id: number; quantity: number }> = [];

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
      const reqVarId = item.variant_id || item.variantId || item.printifyVariantId;
      let matchedVar: any = null;

      if (reqVarId) {
        matchedVar = variants.find((v: any) => String(v.variant_id || v.id) === String(reqVarId));
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

      if (!matchedVar && variants.length > 0) {
        matchedVar = variants[0];
      }

      let priceCents = 0;
      if (matchedVar?.price_cents) {
        priceCents = Number(matchedVar.price_cents);
      } else if (matchedVar?.price) {
        priceCents = Math.round(Number(matchedVar.price) * 100);
      } else if (matched.price) {
        priceCents = Math.round(Number(matched.price) * 100);
      }

      subtotalCents += priceCents * qty;

      // Extract Printify product and variant IDs for live calculation
      let prodId = matched.supplierProductId || matched.id || "";
      if (prodId.startsWith("printify-")) {
        prodId = prodId.replace("printify-", "");
      }
      const varIdNum = matchedVar ? Number(matchedVar.variant_id || matchedVar.id || 0) : 0;

      if (prodId && varIdNum > 0) {
        printifyLineItems.push({
          product_id: prodId,
          variant_id: varIdNum,
          quantity: qty,
        });
      }
    }

    // 2. Free Shipping Threshold from Site Config
    const { config: siteConfig } = await getOrMigrateSiteConfig();
    const freeShippingThresholdCents = Math.round(
      Number(siteConfig.freeShippingThreshold ?? site.freeShippingOver ?? 100) * 100
    );
    const isFreeShippingEligible = subtotalCents >= freeShippingThresholdCents;

    // 3. Printify API Shipping Calculation (Server-side, read-only)
    const printifyToken = process.env.PRINTIFY_API_TOKEN;
    const shopId = process.env.PRINTIFY_SHOP_ID || "29215191";

    // Strictly enforce shop ID 29215191
    if (shopId !== "29215191") {
      return NextResponse.json(
        { error: `Unauthorized Printify Shop ID: ${shopId}. Only YUPEK Shop 29215191 is authorized.` },
        { status: 403 }
      );
    }

    let calculatedOptions: ShippingOption[] = [];

    if (printifyToken && printifyLineItems.length > 0) {
      try {
        const addressTo = {
          first_name: (address.firstName || address.first_name || "Guest").trim(),
          last_name: (address.lastName || address.last_name || "Customer").trim(),
          email: address.email || undefined,
          phone: address.phone || undefined,
          country: isoCountry,
          address1: (address.street || address.address1 || "Main Street").trim(),
          address2: address.address2 || "",
          city: (address.city || "Amsterdam").trim(),
          zip: (address.postalCode || address.zip || "1000 AA").trim(),
        };

        const printifyRes = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/shipping.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${printifyToken}`,
            "Content-Type": "application/json",
            "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
          },
          body: JSON.stringify({
            line_items: printifyLineItems,
            address_to: addressTo,
          }),
        });

        if (printifyRes.ok) {
          const raw = await printifyRes.json();
          calculatedOptions = normalizePrintifyShipping(raw, subtotalCents, freeShippingThresholdCents);
        } else {
          const errText = await printifyRes.text();
          console.warn("[Printify Shipping Rate Notice]", printifyRes.status, errText.slice(0, 150));
        }
      } catch (err: any) {
        console.warn("[Printify Shipping Call Error]", err.message);
      }
    }

    // NEVER invent fallback shipping prices: return safe error when Printify API is unavailable
    if (calculatedOptions.length === 0) {
      return NextResponse.json(
        {
          error: "Server temporarily unavailable. Please try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      currency: "EUR",
      subtotal_cents: subtotalCents,
      free_shipping_threshold_cents: freeShippingThresholdCents,
      is_free_shipping_eligible: isFreeShippingEligible,
      country: isoCountry,
      options: calculatedOptions,
    });
  } catch (err: any) {
    console.error("[Shipping Calculation Error]", err);
    return NextResponse.json(
      { error: "Server temporarily unavailable. Please try again.", },
      { status: 503 }
    );
  }
}

function normalizePrintifyShipping(
  raw: any,
  subtotalCents: number,
  freeShippingThresholdCents: number
): ShippingOption[] {
  const options: ShippingOption[] = [];
  const extractedRates: Record<string, { cost: number; currency: string }> = {};
  let globalCurrency = "EUR";

  if (typeof raw === "object" && raw !== null) {
    if (typeof raw.currency === "string") {
      globalCurrency = raw.currency.toUpperCase();
    }

    const itemsList = Array.isArray(raw.options) ? raw.options : null;
    if (itemsList) {
      for (const item of itemsList) {
        if (typeof item === "object" && item !== null) {
          const mId = String(item.id || item.name || item.type || "standard").toLowerCase();
          const cost = item.cost ?? item.price;
          const curr = item.currency || globalCurrency;
          if (cost !== undefined && cost !== null) {
            extractedRates[mId] = { cost: Number(cost), currency: String(curr).toUpperCase() };
          }
        }
      }
    } else {
      for (const [key, val] of Object.entries(raw)) {
        if (["currency", "status", "message"].includes(key.toLowerCase())) continue;
        const mId = key.toLowerCase();
        if (typeof val === "object" && val !== null) {
          const cost = (val as any).cost ?? (val as any).price;
          const curr = (val as any).currency || globalCurrency;
          if (cost !== undefined && cost !== null) {
            extractedRates[mId] = { cost: Number(cost), currency: String(curr).toUpperCase() };
          }
        } else if (typeof val === "number") {
          extractedRates[mId] = { cost: val, currency: globalCurrency };
        }
      }
    }
  }

  const methodMetadata: Record<
    string,
    { label: string; description: string; min: number; max: number }
  > = {
    standard: {
      label: "Standard Delivery",
      description: "Estimated delivery: 3–5 business days",
      min: 3,
      max: 5,
    },
    economy: {
      label: "Economy Delivery",
      description: "Estimated delivery: 5–8 business days",
      min: 5,
      max: 8,
    },
    express: {
      label: "Express Delivery",
      description: "Estimated delivery: 1–2 business days",
      min: 1,
      max: 2,
    },
    priority: {
      label: "Priority Delivery",
      description: "Estimated delivery: 2–3 business days",
      min: 2,
      max: 3,
    },
  };

  for (const [rawMethod, info] of Object.entries(extractedRates)) {
    if (info.currency !== "EUR") {
      throw new Error(
        `Unsupported supplier shipping currency: '${info.currency}'. YUPEK storefront operates strictly in EUR and no currency exchange converter is configured.`
      );
    }

    let methodKey: "standard" | "economy" | "express" | "priority" = "standard";
    for (const cand of ["standard", "economy", "express", "priority"] as const) {
      if (rawMethod.includes(cand)) {
        methodKey = cand;
        break;
      }
    }

    const meta = methodMetadata[methodKey];
    let amountCents = Math.round(info.cost);
    let isFree = false;

    if (methodKey === "standard" && freeShippingThresholdCents > 0 && subtotalCents >= freeShippingThresholdCents) {
      amountCents = 0;
      isFree = true;
    }

    options.push({
      id: methodKey,
      label: meta.label,
      description: meta.description,
      amount_cents: amountCents,
      amount_formatted: `€${(amountCents / 100).toFixed(2)}`,
      currency: "EUR",
      is_free: isFree,
      estimated_days_min: meta.min,
      estimated_days_max: meta.max,
    });
  }

  const orderMap = { standard: 0, economy: 1, express: 2, priority: 3 };
  options.sort((a, b) => orderMap[a.id] - orderMap[b.id]);

  return options;
}
