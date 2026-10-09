import { products, type Product } from "@/data/products";
import initialSiteConfig from "@/data/site-config.json";

export type ProductSource = "local" | "supabase" | "printify";

export interface NormalizedPrintifyProduct {
  printify_product_id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  price: number;
  currency: string;
  images: Array<{
    src: string;
    position: number;
    variant_ids: number[];
    is_default: boolean;
  }>;
  variants: Array<{
    variant_id: number | string;
    title: string;
    sku: string;
    price_cents: number;
    is_enabled: boolean;
    is_available: boolean;
    options: any;
  }>;
  sku: string;
  available: boolean;
  visible: boolean;
  blueprint_id?: number | null;
  print_provider_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const eur = (n: number) => `€${n.toFixed(2)}`;

export const EXCLUDED_SIZES = new Set(["3XL", "4XL", "5XL", "XXXL", "XXXXL", "XXXXXL"]);

export const STANDARD_GARMENT_SIZES = new Set([
  "XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
  "XXXL", "XXXXL", "XXXXXL", "ONE SIZE", "OS"
]);

export function isExcludedSize(size?: string | null): boolean {
  if (!size) return false;
  const s = String(size).toUpperCase().trim();
  return EXCLUDED_SIZES.has(s) || s === "3XL" || s === "4XL" || s === "5XL";
}

/**
 * Normalizes product sizes, variants, and descriptors.
 * Safely detects and resolves inverted/swapped colors and sizes
 * (e.g. where garment sizes were mistakenly stored under colors, and colors under sizes).
 */
export function sanitizeProductSizes(p: Product): Product {
  let rawColors = p.colors || [];
  let rawSizes = p.sizes || [];
  let rawVariants = p.variants || [];

  // Detect inverted size/color data
  const colorsAreSizes =
    rawColors.length > 0 &&
    rawColors.every((c) => STANDARD_GARMENT_SIZES.has(String(c).toUpperCase().trim()));
  const sizesAreColors =
    rawSizes.length > 0 &&
    !rawSizes.some((s) => STANDARD_GARMENT_SIZES.has(String(s).toUpperCase().trim()));

  if (colorsAreSizes && sizesAreColors) {
    const tempColors = rawSizes;
    rawSizes = rawColors;
    rawColors = tempColors;

    rawVariants = rawVariants.map((v) => ({
      ...v,
      color: v.size,
      size: v.color,
    }));
  }

  const cleanSizes = rawSizes.filter((s) => !isExcludedSize(s));
  const cleanVariants = rawVariants.filter((v) => {
    if (isExcludedSize(v.size)) return false;
    const title = String(v.title || "").toUpperCase();
    if (title.includes("3XL") || title.includes("4XL") || title.includes("5XL")) return false;
    return true;
  });
  const cleanOptions = (p.options || []).map((opt) => {
    const isSizeOpt = opt.type?.toLowerCase() === "size" || opt.name?.toLowerCase() === "size";
    if (!isSizeOpt || !opt.values) return opt;
    return {
      ...opt,
      values: opt.values.filter((val) => !isExcludedSize(val.title)),
    };
  });

  // Enforce customer-facing presentation separation:
  // Internal supplier metadata (e.g. Printify, SKUs, provider IDs) is never presented to customers
  const cleanDescriptor = isCustomerFacingDescriptor(p.descriptor) ? p.descriptor.trim() : "";

  return {
    ...p,
    colors: rawColors,
    descriptor: cleanDescriptor,
    sizes: cleanSizes,
    variants: cleanVariants,
    options: cleanOptions,
  };
}

/**
 * Authoritative customer-facing price resolution.
 * Prevents corrupted sub-unit conversions (e.g. 26 cents for a €26.99 garment)
 * from rendering fractional pennies in UI or cart, and guarantees that product
 * cards, product views, and cart line items share the exact same price source.
 */
export function getVerifiedPrice(
  product: Product,
  variant?: { price_cents?: number | null; price?: number | null } | null
): number {
  if (variant) {
    if (typeof variant.price_cents === "number" && variant.price_cents >= 100) {
      return variant.price_cents / 100;
    }
    if (typeof variant.price === "number" && variant.price >= 1.0) {
      return variant.price;
    }
  }
  return typeof product.price === "number" && product.price > 0 ? product.price : 0;
}

export function getVerifiedPriceCents(
  product: Product,
  variant?: { price_cents?: number | null; price?: number | null } | null
): number {
  const verified = getVerifiedPrice(product, variant);
  return Math.round(verified * 100);
}

/**
 * Distinguishes between legitimate customer-facing fashion copy and
 * internal supplier/fulfillment metadata (e.g. "Printify Custom Edition", SKUs, internal IDs).
 * Returns true only if the string is safe and intended for customer display.
 */
export function isCustomerFacingDescriptor(descriptor?: string | null): boolean {
  if (!descriptor) return false;
  const trimmed = descriptor.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  // Explicit internal supplier / dropship keywords
  if (
    lower.includes("printify") ||
    lower.includes("custom edition") ||
    lower.includes("ypk-pfy") ||
    lower.includes("pfy") ||
    lower.includes("dropship") ||
    lower.includes("blueprint") ||
    lower.includes("provider") ||
    lower.includes("supplier")
  ) {
    return false;
  }

  // Internal SKU strings or numeric IDs (e.g. "• 13882006219804623954", "SKU-...")
  if (/\b\d{6,}\b/.test(trimmed) || /•\s*[\dA-Za-z-]{4,}/.test(trimmed)) {
    return false;
  }

  return true;
}

export function getCatalogProducts(): Product[] {
  try {
    const custom: Product[] = (initialSiteConfig as any).customProducts || [];
    const overrides = (initialSiteConfig as any).productOverrides || {};
    const combined = [...products, ...custom];

    return combined
      .filter((p) => !overrides[p.slug]?.deleted)
      .map((p) => {
        const ov = overrides[p.slug];
        if (!ov) return p;
        return {
          ...p,
          name: ov.name ?? p.name,
          descriptor: ov.descriptor ?? p.descriptor,
          price: ov.price ?? p.price,
          badge: ov.badge !== undefined ? ov.badge : p.badge,
          featured: ov.featured ?? p.featured,
          newArrival: ov.newArrival ?? p.newArrival,
          sizes: ov.sizes && ov.sizes.length > 0 ? ov.sizes : p.sizes,
          colors: ov.colors && ov.colors.length > 0 ? ov.colors : p.colors,
          description: ov.description ?? p.description,
          material: ov.material ?? p.material,
          inventory: ov.inventory !== undefined ? ov.inventory : p.inventory,
          images: ov.images && ov.images.length > 0 ? ov.images : p.images,
        };
      })
      .map(sanitizeProductSizes);
  } catch {}
  return products;
}

export const getProduct = (slug: string, list?: Product[]) => {
  const source = list || getCatalogProducts();
  return source.find((p) => p.slug === slug);
};

export function getRelatedProducts(
  current: Product,
  allProducts?: Product[],
  limit = 4
): Product[] {
  const catalog = allProducts && allProducts.length > 0 ? allProducts : getCatalogProducts();

  // 1. Exclude the current product strictly by id and slug
  const candidates = catalog.filter(
    (p) => p.slug !== current.slug && p.id !== current.id
  );

  if (candidates.length === 0) {
    return [];
  }

  // 2. Score candidates based on recommendation priority:
  // - Same category (+100)
  // - Same gender (+50)
  // - Overlapping tags (+10 per matched tag)
  // - Base score for being a real catalog product (+1)
  const scored = candidates.map((p) => {
    let score = 1;

    if (p.category && current.category && p.category.toLowerCase() === current.category.toLowerCase()) {
      score += 100;
    }

    if (p.gender && current.gender && p.gender.toLowerCase() === current.gender.toLowerCase()) {
      score += 50;
    }

    if (p.tags && current.tags && p.tags.length > 0 && current.tags.length > 0) {
      const currentTags = new Set(current.tags.map((t) => t.toLowerCase().trim()));
      let sharedTags = 0;
      for (const t of p.tags) {
        if (currentTags.has(t.toLowerCase().trim())) {
          sharedTags++;
        }
      }
      score += sharedTags * 10;
    }

    return { product: p, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.product);
}

export const related = (p: Product, n = 4, list?: Product[]) =>
  getRelatedProducts(p, list, n);

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function searchProducts(q: string, list?: Product[]): Product[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { product: Product; score: number }[] = [];
  const items = list || getCatalogProducts();

  for (const p of items) {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const catLower = p.category.toLowerCase();
    const descLower = `${p.description} ${isCustomerFacingDescriptor(p.descriptor) ? p.descriptor : ""}`.toLowerCase();
    const tagsLower = p.tags.map((t) => t.toLowerCase());
    const colorsLower: string[] = [
      ...p.colors.map((c) => c.toLowerCase()),
      ...(p.variants?.flatMap((v) => (v.color ? [v.color.toLowerCase()] : [])) || []),
    ];
    const matLower = p.material.toLowerCase();

    // Exact full query match
    if (nameLower === query) score += 120;
    else if (nameLower.includes(query)) score += 60;

    let matchedTokens = 0;

    for (const token of tokens) {
      let tokenMatched = false;

      // Name matches
      if (nameLower.includes(token)) {
        score += 40;
        tokenMatched = true;
      }

      // Tag matches
      if (tagsLower.some((t) => t === token)) {
        score += 35;
        tokenMatched = true;
      } else if (tagsLower.some((t) => t.includes(token))) {
        score += 20;
        tokenMatched = true;
      }

      // Category synonyms
      const isSynonym =
        (catLower === "tees" && (token === "tee" || token === "tees" || token === "t-shirt" || token === "tshirt" || token === "t-shirts")) ||
        (catLower === "shirts" && (token === "shirt" || token === "shirts" || token === "overhemd")) ||
        (catLower === "sweatshirts" && (token === "sweatshirt" || token === "sweatshirts" || token === "sweater" || token === "hoodie" || token === "trui")) ||
        (catLower === "trousers" && (token === "trouser" || token === "trousers" || token === "pants" || token === "pant" || token === "pantalon")) ||
        (catLower === "denim" && (token === "denim" || token === "jeans" || token === "spijkerbroek"));

      // Category / Gender matches
      if (catLower === token || catLower.includes(token) || p.gender.toLowerCase() === token || isSynonym) {
        score += 25;
        tokenMatched = true;
      }

      // Color matches
      if (colorsLower.some((c) => c.includes(token))) {
        score += 25;
        tokenMatched = true;
      }

      // Material matches
      if (matLower.includes(token)) {
        score += 20;
        tokenMatched = true;
      }

      // Description matches
      if (descLower.includes(token)) {
        score += 10;
        tokenMatched = true;
      }

      // Typo tolerance (fuzzy matching for words >= 4 letters)
      if (!tokenMatched && token.length >= 4) {
        const words = `${nameLower} ${catLower} ${tagsLower.join(" ")} ${colorsLower.join(" ")}`.split(/\s+/);
        for (const w of words) {
          if (w.length >= 4 && levenshtein(token, w) <= 1) {
            score += 18;
            tokenMatched = true;
            break;
          }
        }
      }

      if (tokenMatched) matchedTokens++;
    }

    if (matchedTokens === tokens.length && tokens.length > 1) {
      score += 40; // Bonus for multi-term match
    }

    if (score > 0) {
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.product);
}

export type Filters = {
  category?: string;
  gender?: string;
  size?: string;
  color?: string;
  max?: number;
  isNew?: boolean;
  sort?: string;
};

export function filterProducts(f: Filters, list?: Product[]): Product[] {
  const items = list || getCatalogProducts();
  let r = items.filter(
    (p) => {
      const pSizes = (p.variants && p.variants.length > 0) 
        ? p.variants.filter((v) => v.is_enabled !== false && v.is_available !== false).map((v) => v.size as string)
        : (p.sizes || []);
      const pColors = (p.variants && p.variants.length > 0)
        ? p.variants.filter((v) => v.is_enabled !== false && v.is_available !== false).map((v) => v.color as string)
        : (p.colors || []);
        
      return (!f.category || p.category === f.category) &&
      (!f.gender || p.gender === f.gender || p.gender === "unisex") &&
      (!f.size || pSizes.includes(f.size)) &&
      (!f.color || pColors.includes(f.color)) &&
      (!f.max || p.price <= f.max) &&
      (!f.isNew || p.newArrival)
    }
  );
  if (f.sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
  else if (f.sort === "newest") r = [...r].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
  else r = [...r].sort((a, b) => Number(b.featured) - Number(a.featured));
  return r;
}
