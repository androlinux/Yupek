/**
 * Deterministic Promio Shipping Calculator for YUPEK Storefront.
 *
 * Source of truth: Promio published tariff schedule (https://promio.nl/shipping-costs)
 * Verified: 2025-08-26 (Audited: 2026-10-09)
 *
 * SAFETY RULES:
 * - Deterministic, pure server-side calculation.
 * - Never calls Printify as a fallback.
 * - Enforces exact Promio weight-point schedule and EUR tariffs.
 * - Never invents unsupported rates or currencies.
 */

export interface ShippingOption {
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

export interface PromioShippingItem {
  category?: string;
  type?: string;
  quantity?: number;
  weight_points?: number;
  name?: string;
  title?: string;
}

// Weight points schedule per product type (Promio Puntentabel)
export const DEFAULT_PRODUCT_WEIGHT_POINTS: Record<string, number> = {
  "t-shirt": 100,
  "t-shirts": 100,
  tee: 100,
  tees: 100,
  crafter: 100,
  shirt: 100,
  shirts: 100,
  mug: 200,
  mugs: 200,
  mok: 200,
  mokken: 200,
  hoodie: 250,
  hoodies: 250,
  sweatshirt: 250,
  sweatshirts: 250,
  sweater: 250,
  sweaters: 250,
  "tote-bag": 100,
  tote: 100,
  bag: 100,
  cap: 100,
};

// Netherlands Domestic Tariffs (in EUR cents)
export const NL_RATES = [
  { max_points: 100, tracked: 375, courier: 395 },
  { max_points: 249, tracked: 469, courier: 495 },
  { max_points: 999999, tracked: null, courier: 495 },
];

// Europe Tracked Tariffs (in EUR cents)
export const EUROPE_TRACKED_RATES = [
  { max_points: 100, rate: 395 },
  { max_points: 249, rate: 495 },
  { max_points: 399, rate: 545 },
  { max_points: 499, rate: 695 },
  { max_points: 599, rate: 795 },
  { max_points: 699, rate: 895 },
];

// US & Canada Tracked Tariffs (in EUR cents)
export const US_CA_TRACKED_RATES = [
  { max_points: 100, rate: 495 },
  { max_points: 249, rate: 645 },
  { max_points: 399, rate: 745 },
  { max_points: 499, rate: 945 },
  { max_points: 599, rate: 1095 },
  { max_points: 699, rate: 1245 },
];

// European countries covered by Promio
export const EUROPE_COUNTRIES = new Set([
  "albania", "al", "andorra", "ad", "austria", "at", "belarus", "by", "belgium", "be",
  "bosnia and herzegovina", "ba", "bulgaria", "bg", "croatia", "hr", "cyprus", "cy",
  "czech republic", "czechia", "cz", "denmark", "dk", "estonia", "ee", "faroe islands", "fo",
  "finland", "fi", "france", "fr", "germany", "de", "gibraltar", "gi", "greece", "gr",
  "hungary", "hu", "iceland", "is", "ireland", "ie", "israel", "il", "italy", "it",
  "kosovo", "xk", "latvia", "lv", "liechtenstein", "li", "lithuania", "lt", "luxembourg", "lu",
  "macedonia", "north macedonia", "mk", "malta", "mt", "moldova", "md", "monaco", "mc",
  "norway", "no", "poland", "pl", "portugal", "pt", "montenegro", "me", "serbia", "rs",
  "romania", "ro", "san marino", "sm", "slovakia", "sk", "slovenia", "si", "spain", "es",
  "sweden", "se", "switzerland", "ch", "turkey", "tr", "ukraine", "ua", "united kingdom", "gb",
  "uk", "vatican city", "va"
]);

export const US_CA_COUNTRIES = new Set([
  "united states", "usa", "us", "canada", "ca"
]);

export function calculateItemWeightPoints(item: PromioShippingItem): number {
  if (typeof item.weight_points === "number" && item.weight_points > 0) {
    return item.weight_points;
  }
  const key = (item.category || item.type || item.name || item.title || "t-shirt").toLowerCase().trim();
  for (const [k, pts] of Object.entries(DEFAULT_PRODUCT_WEIGHT_POINTS)) {
    if (key.includes(k)) {
      return pts;
    }
  }
  return 100;
}

export function calculateTotalWeightPoints(items: PromioShippingItem[]): number {
  let total = 0;
  for (const item of items) {
    const qty = Math.max(1, Math.min(50, Number(item.quantity || 1)));
    const pts = calculateItemWeightPoints(item);
    total += pts * qty;
  }
  return total;
}

export interface CalculatePromioShippingResult {
  options: ShippingOption[];
  total_weight_points: number;
  country: string;
}

export function calculatePromioShippingOptions(params: {
  country: string;
  items: PromioShippingItem[];
  subtotalCents: number;
  freeShippingThresholdCents: number;
}): CalculatePromioShippingResult {
  const { country, items, subtotalCents, freeShippingThresholdCents } = params;
  if (!country || !country.trim()) {
    throw new Error("Destination country is required for shipping calculation.");
  }
  if (!items || items.length === 0) {
    throw new Error("At least one line item is required for shipping calculation.");
  }

  const normCountry = country.trim().toLowerCase();
  const totalPoints = calculateTotalWeightPoints(items);
  const isFreeEligible = freeShippingThresholdCents > 0 && subtotalCents >= freeShippingThresholdCents;
  const options: ShippingOption[] = [];

  // 1. Domestic Netherlands
  if (normCountry === "netherlands" || normCountry === "nl" || normCountry === "nederland") {
    let trackedRate: number | null = null;
    let courierRate = 495;

    for (const bracket of NL_RATES) {
      if (totalPoints <= bracket.max_points) {
        trackedRate = bracket.tracked;
        courierRate = bracket.courier;
        break;
      }
    }

    if (trackedRate !== null) {
      const standardCost = isFreeEligible ? 0 : trackedRate;
      options.push({
        id: "standard",
        label: "Standard Tracked Delivery",
        description: "Promio Breda fulfillment • Estimated delivery 2–4 business days",
        amount_cents: standardCost,
        amount_formatted: `€${(standardCost / 100).toFixed(2)}`,
        currency: "EUR",
        is_free: isFreeEligible,
        estimated_days_min: 2,
        estimated_days_max: 4,
      });

      options.push({
        id: "express",
        label: "Express Courier Delivery",
        description: "Promio Breda courier dispatch • Estimated delivery 1–2 business days",
        amount_cents: courierRate,
        amount_formatted: `€${(courierRate / 100).toFixed(2)}`,
        currency: "EUR",
        is_free: false,
        estimated_days_min: 1,
        estimated_days_max: 2,
      });
    } else {
      // 250+ points in NL: Courier is the sole domestic option
      const standardCost = isFreeEligible ? 0 : courierRate;
      options.push({
        id: "standard",
        label: "Standard Courier Delivery",
        description: "Promio Breda courier dispatch • Estimated delivery 1–3 business days",
        amount_cents: standardCost,
        amount_formatted: `€${(standardCost / 100).toFixed(2)}`,
        currency: "EUR",
        is_free: isFreeEligible,
        estimated_days_min: 1,
        estimated_days_max: 3,
      });
    }

    return { options, total_weight_points: totalPoints, country: "NL" };
  }

  // 2. European Destinations
  if (EUROPE_COUNTRIES.has(normCountry)) {
    let rateCents: number | null = null;
    for (const bracket of EUROPE_TRACKED_RATES) {
      if (totalPoints <= bracket.max_points) {
        rateCents = bracket.rate;
        break;
      }
    }

    if (rateCents === null) {
      throw new Error(
        `Total shipment weight (${totalPoints} points) exceeds Promio maximum flat-tariff schedule (699 points). Please contact support for custom shipping.`
      );
    }

    const standardCost = isFreeEligible ? 0 : rateCents;
    options.push({
      id: "standard",
      label: "Standard European Tracked Delivery",
      description: "Promio Breda international dispatch • Estimated delivery 3–6 business days",
      amount_cents: standardCost,
      amount_formatted: `€${(standardCost / 100).toFixed(2)}`,
      currency: "EUR",
      is_free: isFreeEligible,
      estimated_days_min: 3,
      estimated_days_max: 6,
    });

    return { options, total_weight_points: totalPoints, country: country.toUpperCase() };
  }

  // 3. United States & Canada
  if (US_CA_COUNTRIES.has(normCountry)) {
    let rateCents: number | null = null;
    for (const bracket of US_CA_TRACKED_RATES) {
      if (totalPoints <= bracket.max_points) {
        rateCents = bracket.rate;
        break;
      }
    }

    if (rateCents === null) {
      throw new Error(
        `Total shipment weight (${totalPoints} points) exceeds Promio maximum flat-tariff schedule for US/CA.`
      );
    }

    const standardCost = isFreeEligible ? 0 : rateCents;
    options.push({
      id: "standard",
      label: "International Tracked Delivery",
      description: "Promio Breda international dispatch • Estimated delivery 5–10 business days",
      amount_cents: standardCost,
      amount_formatted: `€${(standardCost / 100).toFixed(2)}`,
      currency: "EUR",
      is_free: isFreeEligible,
      estimated_days_min: 5,
      estimated_days_max: 10,
    });

    return { options, total_weight_points: totalPoints, country: country.toUpperCase() };
  }

  throw new Error(`Shipping to '${country}' is currently not supported.`);
}
