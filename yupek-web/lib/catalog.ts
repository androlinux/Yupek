import { products, type Product } from "@/data/products";
import initialSiteConfig from "@/data/site-config.json";
import type { Locale } from "@/lib/i18n";

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

export const eur = (n?: number | null) => {
  if (typeof n !== "number" || isNaN(n) || n <= 0) return "";
  return `€${n.toFixed(2)}`;
};

export const EXCLUDED_SIZES = new Set([
  "3XL", "4XL", "5XL", "XXXL", "XXXXL", "XXXXXL",
  "3X-LARGE", "4X-LARGE", "5X-LARGE"
]);

export const STANDARD_GARMENT_SIZES = new Set([
  "XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
  "XXXL", "XXXXL", "XXXXXL", "ONE SIZE", "OS",
  "XX-SMALL", "X-SMALL", "SMALL", "MEDIUM", "LARGE", "X-LARGE",
  "2X-LARGE", "3X-LARGE", "4X-LARGE", "5X-LARGE"
]);

export function isExcludedSize(size?: string | null): boolean {
  if (!size) return false;
  const s = String(size).toUpperCase().trim();
  return EXCLUDED_SIZES.has(s) || s.includes("3XL") || s.includes("4XL") || s.includes("5XL") || s.includes("3X-LARGE") || s.includes("4X-LARGE") || s.includes("5X-LARGE");
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
  const isPromio =
    (product as any).supplier === "Promio" ||
    (product as any).supplier === "promio" ||
    String(product.id || "").startsWith("promio-") ||
    String((product as any).supplierProductId || "").startsWith("259865");

  if (isPromio && typeof product.price === "number" && product.price > 0) {
    return product.price;
  }

  if (variant) {
    // If variant.price_cents represents supplier wholesale cost while product retail price is set:
    if (
      typeof product.price === "number" &&
      product.price > 0 &&
      typeof variant.price_cents === "number" &&
      variant.price_cents < product.price * 50
    ) {
      return product.price;
    }

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
      .filter((p) => {
        if (overrides[p.slug]?.deleted) return false;
        if ((p as any).isDraft) return false;
        const effectivePrice = overrides[p.slug]?.price ?? p.price;
        if (typeof effectivePrice !== "number" || isNaN(effectivePrice) || effectivePrice <= 0) return false;
        return true;
      })
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

export interface ProductTranslation {
  name: string;
  descriptor?: string;
  description?: string;
  material?: string;
  badge?: string;
}

export const PRODUCT_TRANSLATIONS: Record<string, Partial<Record<Locale, ProductTranslation>>> = {
  // 1. Crafter T-shirt (promio-25986528 / yupek-tees-25986528)
  "yupek-tees-25986528": {
    en: {
      name: "Crafter 2.0 — Vintage Emblem Organic T-Shirt",
      descriptor: "Organic Cotton Vintage Emblem Tee",
      description: "Heavyweight 100% organic cotton T-shirt featuring the archival YUPEK emblem inspired by ancient Silk Road geometric talismans. Cut with a relaxed European silhouette, reinforced ribbed collar, and twin-needle hems. Breathable, durable, and designed for perpetual everyday wear.",
      material: "100% Organic Ring-Spun Combed Cotton (220 GSM). Wash at 30°C delicate, do not tumble dry.",
    },
    nl: {
      name: "Crafter 2.0 — Vintage Embleem Biologisch T-Shirt",
      descriptor: "Biologisch Katoenen Vintage Embleem T-Shirt",
      description: "Zwaar 100% biologisch katoenen T-shirt met het historische YUPEK-embleem geïnspireerd op geometrische zijderoute-talismannen. Voorzien van een ontspannen Europese pasvorm, versterkte geribde hals en dubbelgestikte zomen.",
      material: "100% Biologisch gekamd ringgesponnen katoen (220 g/m²). Wassen op 30°C fijnwas, niet in de droogtrommel.",
    },
    de: {
      name: "Crafter 2.0 — Vintage-Emblem Bio-T-Shirt",
      descriptor: "Bio-Baumwoll-T-Shirt mit Vintage-Emblem",
      description: "Schweres T-Shirt aus 100 % gekämmter Bio-Baumwolle mit dem historischen YUPEK-Emblem, inspiriert von geometrischen Talismanen der Seidenstraße. Entspannte europäische Schnittführung mit verstärktem Rippkragen und doppelten Steppnähten.",
      material: "100 % Gekämmte ringgesponnene Bio-Baumwolle (220 g/m²). Schonwaschgang bei 30°C, nicht im Trockner trocknen.",
    },
    fr: {
      name: "Crafter 2.0 — T-shirt Bio avec Emblème Vintage",
      descriptor: "T-shirt en Coton Biologique avec Emblème Vintage",
      description: "T-shirt épais en pur coton 100 % biologique arborant l'emblème d'archive YUPEK inspiré des motifs géométriques protecteurs de la Route de la Soie. Coupe européenne décontractée, col côtelé renforcé et finitions surpiquées durables.",
      material: "100 % Coton peigné biologique filé à l'anneau (220 g/m²). Lavage délicat à 30°C, ne pas sécher en machine.",
    },
    es: {
      name: "Crafter 2.0 — Camiseta Orgánica con Emblema Vintage",
      descriptor: "Camiseta de Algodón Orgánico con Emblema Vintage",
      description: "Camiseta gruesa de algodón 100 % orgánico con el emblema de archivo YUPEK, inspirado en la geometría y los talismanes textiles de la Ruta de la Seda. Corte europeo relajado, cuello acanalado reforzado y dobladillo con doble pespunte.",
      material: "100 % Algodón orgánico peinado hilado en anillo (220 g/m²). Lavar a 30°C en ciclo delicado, no secar en secadora.",
    },
  },
  "promio-25986528": {
    en: {
      name: "Crafter 2.0 — Vintage Emblem Organic T-Shirt",
      descriptor: "Organic Cotton Vintage Emblem Tee",
      description: "Heavyweight 100% organic cotton T-shirt featuring the archival YUPEK emblem inspired by ancient Silk Road geometric talismans. Cut with a relaxed European silhouette, reinforced ribbed collar, and twin-needle hems. Breathable, durable, and designed for perpetual everyday wear.",
      material: "100% Organic Ring-Spun Combed Cotton (220 GSM). Wash at 30°C delicate, do not tumble dry.",
    },
    nl: {
      name: "Crafter 2.0 — Vintage Embleem Biologisch T-Shirt",
      descriptor: "Biologisch Katoenen Vintage Embleem T-Shirt",
      description: "Zwaar 100% biologisch katoenen T-shirt met het historische YUPEK-embleem geïnspireerd op geometrische zijderoute-talismannen. Voorzien van een ontspannen Europese pasvorm, versterkte geribde hals en dubbelgestikte zomen.",
      material: "100% Biologisch gekamd ringgesponnen katoen (220 g/m²). Wassen op 30°C fijnwas, niet in de droogtrommel.",
    },
    de: {
      name: "Crafter 2.0 — Vintage-Emblem Bio-T-Shirt",
      descriptor: "Bio-Baumwoll-T-Shirt mit Vintage-Emblem",
      description: "Schweres T-Shirt aus 100 % gekämmter Bio-Baumwolle mit dem historischen YUPEK-Emblem, inspiriert von geometrischen Talismanen der Seidenstraße. Entspannte europäische Schnittführung mit verstärktem Rippkragen und doppelten Steppnähten.",
      material: "100 % Gekämmte ringgesponnene Bio-Baumwolle (220 g/m²). Schonwaschgang bei 30°C, nicht im Trockner trocknen.",
    },
    fr: {
      name: "Crafter 2.0 — T-shirt Bio avec Emblème Vintage",
      descriptor: "T-shirt en Coton Biologique avec Emblème Vintage",
      description: "T-shirt épais en pur coton 100 % biologique arborant l'emblème d'archive YUPEK inspiré des motifs géométriques protecteurs de la Route de la Soie. Coupe européenne décontractée, col côtelé renforcé et finitions surpiquées durables.",
      material: "100 % Coton peigné biologique filé à l'anneau (220 g/m²). Lavage délicat à 30°C, ne pas sécher en machine.",
    },
    es: {
      name: "Crafter 2.0 — Camiseta Orgánica con Emblema Vintage",
      descriptor: "Camiseta de Algodón Orgánico con Emblema Vintage",
      description: "Camiseta gruesa de algodón 100 % orgánico con el emblema de archivo YUPEK, inspirado en la geometría y los talismanes textiles de la Ruta de la Seda. Corte europeo relajado, cuello acanalado reforzado y dobladillo con doble pespunte.",
      material: "100 % Algodón orgánico peinado hilado en anillo (220 g/m²). Lavar a 30°C en ciclo delicado, no secar en secadora.",
    },
  },

  // 2. AWDis JH030 Crewneck Sweatshirt (promio-25986529 / yupek-sweatshirts-25986529)
  "yupek-sweatshirts-25986529": {
    en: {
      name: "AWDis JH030 — Vintage Emblem Crewneck Sweatshirt",
      descriptor: "Heavyweight Heritage Crewneck Sweatshirt",
      description: "Classic architectural crewneck sweatshirt crafted from heavyweight brushed fleece. Features drop-shoulder styling, ribbed cuffs and hem, and our signature central Silk Road emblem print with rich pigment density.",
      material: "80% Ringspun Cotton, 20% Polyester (280 GSM brushed fleece). Machine wash cold, hang dry.",
    },
    nl: {
      name: "AWDis JH030 — Vintage Embleem Crewneck Sweatshirt",
      descriptor: "Zwaar Vintage Embleem Sweatshirt met Ronde Hals",
      description: "Klassiek architectonisch sweatshirt met ronde hals, vervaardigd uit zwaar geborsteld fleece. Voorzien van verlaagde schoudernaden, geribde boorden en onze kenmerkende centrale zijderoute-embleemopdruk.",
      material: "80% Ringgesponnen katoen, 20% polyester (280 g/m² geborsteld fleece). Wassen op 30°C, hangend drogen.",
    },
    de: {
      name: "AWDis JH030 — Vintage-Emblem Rundhals-Sweatshirt",
      descriptor: "Schweres Heritage Rundhals-Sweatshirt",
      description: "Klassisches architektonisches Sweatshirt aus schwerem angerautem Fleece. Mit überschnittenen Schultern, elastischen Rippbündchen und unserem charakteristischen YUPEK-Emblem-Druck in hoher Farbdichte.",
      material: "80 % Ringgesponnene Baumwolle, 20 % Polyester (280 g/m² angerautes Fleece). Kaltwäsche bei 30°C, hängend trocknen.",
    },
    fr: {
      name: "AWDis JH030 — Sweat-shirt Col Rond avec Emblème Vintage",
      descriptor: "Sweat-shirt Épais Heritage Col Rond",
      description: "Sweat-shirt classique à col rond confectionné dans un molleton brossé épais et réconfortant. Épaules tombantes, finitions côtelées aux poignets et à la taille, rehaussé de notre emblème patrimonial de la Route de la Soie.",
      material: "80 % Coton peigné, 20 % Polyester (molleton brossé 280 g/m²). Lavage en machine à froid, séchage sur cintre.",
    },
    es: {
      name: "AWDis JH030 — Sudadera Cuello Redondo con Emblema Vintage",
      descriptor: "Sudadera Gruesa Heritage Cuello Redondo",
      description: "Sudadera arquitectónica clásica de cuello redondo elaborada en suave felpa gruesa cepillada. Hombros caídos, puños y bajo de canalé reforzado y nuestro emblemático estampado de la Ruta de la Seda.",
      material: "80 % Algodón hilado en anillo, 20 % Poliéster (felpa cepillada 280 g/m²). Lavar en frío, secar colgado.",
    },
  },
  "promio-25986529": {
    en: {
      name: "AWDis JH030 — Vintage Emblem Crewneck Sweatshirt",
      descriptor: "Heavyweight Heritage Crewneck Sweatshirt",
      description: "Classic architectural crewneck sweatshirt crafted from heavyweight brushed fleece. Features drop-shoulder styling, ribbed cuffs and hem, and our signature central Silk Road emblem print with rich pigment density.",
      material: "80% Ringspun Cotton, 20% Polyester (280 GSM brushed fleece). Machine wash cold, hang dry.",
    },
    nl: {
      name: "AWDis JH030 — Vintage Embleem Crewneck Sweatshirt",
      descriptor: "Zwaar Vintage Embleem Sweatshirt met Ronde Hals",
      description: "Klassiek architectonisch sweatshirt met ronde hals, vervaardigd uit zwaar geborsteld fleece. Voorzien van verlaagde schoudernaden, geribde boorden en onze kenmerkende centrale zijderoute-embleemopdruk.",
      material: "80% Ringgesponnen katoen, 20% polyester (280 g/m² geborsteld fleece). Wassen op 30°C, hangend drogen.",
    },
    de: {
      name: "AWDis JH030 — Vintage-Emblem Rundhals-Sweatshirt",
      descriptor: "Schweres Heritage Rundhals-Sweatshirt",
      description: "Klassisches architektonisches Sweatshirt aus schwerem angerautem Fleece. Mit überschnittenen Schultern, elastischen Rippbündchen und unserem charakteristischen YUPEK-Emblem-Druck in hoher Farbdichte.",
      material: "80 % Ringgesponnene Baumwolle, 20 % Polyester (280 g/m² angerautes Fleece). Kaltwäsche bei 30°C, hängend trocknen.",
    },
    fr: {
      name: "AWDis JH030 — Sweat-shirt Col Rond avec Emblème Vintage",
      descriptor: "Sweat-shirt Épais Heritage Col Rond",
      description: "Sweat-shirt classique à col rond confectionné dans un molleton brossé épais et réconfortant. Épaules tombantes, finitions côtelées aux poignets et à la taille, rehaussé de notre emblème patrimonial de la Route de la Soie.",
      material: "80 % Coton peigné, 20 % Polyester (molleton brossé 280 g/m²). Lavage en machine à froid, séchage sur cintre.",
    },
    es: {
      name: "AWDis JH030 — Sudadera Cuello Redondo con Emblema Vintage",
      descriptor: "Sudadera Gruesa Heritage Cuello Redondo",
      description: "Sudadera arquitectónica clásica de cuello redondo elaborada en suave felpa gruesa cepillada. Hombros caídos, puños y bajo de canalé reforzado y nuestro emblemático estampado de la Ruta de la Seda.",
      material: "80 % Algodón hilado en anillo, 20 % Poliéster (felpa cepillada 280 g/m²). Lavar en frío, secar colgado.",
    },
  },

  // 3. AWDis JH001 DTG Hoodie (promio-25986530 / yupek-sweatshirts-25986530)
  "yupek-sweatshirts-25986530": {
    en: {
      name: "AWDis JH001 — Vintage Emblem DTG Hoodie",
      descriptor: "Kangaroo Pocket Heritage Fleece Hoodie",
      description: "Architectural heavyweight fleece hoodie featuring a double-fabric hood with self-coloured drawcords, kangaroo pouch pocket, and high-definition direct-to-garment emblem print celebrating Central Asian textile geometry.",
      material: "80% Ringspun Cotton, 20% Polyester (280 GSM). Double-fabric hood, twin needle stitch detailing.",
    },
    nl: {
      name: "AWDis JH001 — Vintage Embleem DTG Hoodie",
      descriptor: "Heritage Fleece Hoodie met Kangoeroezak",
      description: "Zware fleece hoodie met dubbellaagse capuchon, kangoeroezak en hoogwaardige direct-to-garment opdruk van het traditionele Centraal-Aziatische textielembleem.",
      material: "80% Ringgesponnen katoen, 20% polyester (280 g/m²). Dubbellaagse capuchon, dubbelgestikte naden.",
    },
    de: {
      name: "AWDis JH001 — Vintage-Emblem DTG Hoodie",
      descriptor: "Heritage Fleece-Kapuzenpullover mit Kängurutasche",
      description: "Kapuzenpullover aus dichtem Fleece mit doppellagiger Kapuze, passenden Kordelzügen, Kängurutasche und hochauflösendem Direktdruck des traditionellen zentralasiatischen Textilornaments.",
      material: "80 % Ringgesponnene Baumwolle, 20 % Polyester (280 g/m²). Doppellagige Kapuze, Doppelnaht-Details.",
    },
    fr: {
      name: "AWDis JH001 — Sweat à Capuche DTG avec Emblème Vintage",
      descriptor: "Sweat à Capuche en Molleton Heritage avec Poche Kangourou",
      description: "Sweat à capuche architectural en molleton dense avec capuche doublée, cordons ton sur ton, poche kangourou et impression numérique haute précision célébrant la géométrie textile d'Asie centrale.",
      material: "80 % Coton peigné, 20 % Polyester (280 g/m²). Capuche doublée en tissu assorti, coutures doubles renforcées.",
    },
    es: {
      name: "AWDis JH001 — Sudadera con Capucha DTG y Emblema Vintage",
      descriptor: "Sudadera con Capucha de Felpa Heritage con Bolsillo Canguro",
      description: "Sudadera con capucha de felpa gruesa, capucha de doble capa con cordones a tono, bolsillo canguro y estampado directo de alta definición con el emblema geométrico de Asia Central.",
      material: "80 % Algodón hilado en anillo, 20 % Poliéster (280 g/m²). Capuche de doble tela, costuras dobles reforzadas.",
    },
  },
  "promio-25986530": {
    en: {
      name: "AWDis JH001 — Vintage Emblem DTG Hoodie",
      descriptor: "Kangaroo Pocket Heritage Fleece Hoodie",
      description: "Architectural heavyweight fleece hoodie featuring a double-fabric hood with self-coloured drawcords, kangaroo pouch pocket, and high-definition direct-to-garment emblem print celebrating Central Asian textile geometry.",
      material: "80% Ringspun Cotton, 20% Polyester (280 GSM). Double-fabric hood, twin needle stitch detailing.",
    },
    nl: {
      name: "AWDis JH001 — Vintage Embleem DTG Hoodie",
      descriptor: "Heritage Fleece Hoodie met Kangoeroezak",
      description: "Zware fleece hoodie met dubbellaagse capuchon, kangoeroezak en hoogwaardige direct-to-garment opdruk van het traditionele Centraal-Aziatische textielembleem.",
      material: "80% Ringgesponnen katoen, 20% polyester (280 g/m²). Dubbellaagse capuchon, dubbelgestikte naden.",
    },
    de: {
      name: "AWDis JH001 — Vintage-Emblem DTG Hoodie",
      descriptor: "Heritage Fleece-Kapuzenpullover mit Kängurutasche",
      description: "Kapuzenpullover aus dichtem Fleece mit doppellagiger Kapuze, passenden Kordelzügen, Kängurutasche und hochauflösendem Direktdruck des traditionellen zentralasiatischen Textilornaments.",
      material: "80 % Ringgesponnene Baumwolle, 20 % Polyester (280 g/m²). Doppellagige Kapuze, Doppelnaht-Details.",
    },
    fr: {
      name: "AWDis JH001 — Sweat à Capuche DTG avec Emblème Vintage",
      descriptor: "Sweat à Capuche en Molleton Heritage avec Poche Kangourou",
      description: "Sweat à capuche architectural en molleton dense avec capuche doublée, cordons ton sur ton, poche kangourou et impression numérique haute précision célébrant la géométrie textile d'Asie centrale.",
      material: "80 % Coton peigné, 20 % Polyester (280 g/m²). Capuche doublée en tissu assorti, coutures doubles renforcées.",
    },
    es: {
      name: "AWDis JH001 — Sudadera con Capucha DTG y Emblema Vintage",
      descriptor: "Sudadera con Capucha de Felpa Heritage con Bolsillo Canguro",
      description: "Sudadera con capucha de felpa gruesa, capucha de doble capa con cordones a tono, bolsillo canguro y estampado directo de alta definición con el emblema geométrico de Asia Central.",
      material: "80 % Algodón hilado en anillo, 20 % Poliéster (280 g/m²). Capuche de doble tela, costuras dobles reforzadas.",
    },
  },

  // 4. AWDis JH001 Embroidered Hoodie (promio-25986531 / yupek-sweatshirts-25986531)
  "yupek-sweatshirts-25986531": {
    en: {
      name: "AWDis JH001 — Vintage Embroidered Emblem Hoodie",
      descriptor: "Textured Archival Embroidery Edition",
      description: "Our pinnacle capsule edition. Heavyweight fleece hoodie adorned with high-density, multi-thread direct embroidery reproducing the sacred Silk Road emblem in tactile relief. Built with double-fabric hood, rib cuffs, and premium finish.",
      material: "80% Ringspun Cotton, 20% Polyester (280 GSM). Multi-thread architectural direct embroidery.",
    },
    nl: {
      name: "AWDis JH001 — Vintage Geborduurd Embleem Hoodie",
      descriptor: "Exclusieve Geborduurde Archief Editie",
      description: "Onze exclusieve capsule-editie. Zware fleece hoodie versierd met dichte borduursels met meerdere draden die het historische zijderoute-embleem in voelbaar reliëf weergeven. Voorzien van dubbellaagse capuchon en premium afwerking.",
      material: "80% Ringgesponnen katoen, 20% polyester (280 g/m²). Verfijnd direct borduurwerk.",
    },
    de: {
      name: "AWDis JH001 — Vintage Bestickter Emblem Hoodie",
      descriptor: "Strukturierte Archiv-Stickerei Edition",
      description: "Unser Meisterstück der Kapselkollektion. Dichter Fleece-Kapuzenpullover mit aufwendiger Mehrfaden-Direktstickerei, die das historische Seidenstraßen-Emblem als spürbares Relief verewigt. Doppellagige Kapuze und veredelte Kanten.",
      material: "80 % Ringgesponnene Baumwolle, 20 % Polyester (280 g/m²). Hochdichte architektonische Direktstickerei.",
    },
    fr: {
      name: "AWDis JH001 — Sweat à Capuche avec Emblème Brodé Vintage",
      descriptor: "Édition Broderie d'Archive Texturée",
      description: "La pièce maîtresse de notre capsule. Sweat à capuche en molleton dense sublimé par une broderie directe haute densité en fils multiples, restituant l'emblème de la Route de la Soie en relief tactile. Capuche doublée et finitions d'exception.",
      material: "80 % Coton peigné, 20 % Polyester (280 g/m²). Broderie architecturale directe haute densité.",
    },
    es: {
      name: "AWDis JH001 — Sudadera con Capucha y Emblema Bordado Vintage",
      descriptor: "Edición de Archivo con Bordado Texturizado",
      description: "La pieza cumbre de nuestra colección cápsula. Sudadera de felpa gruesa adornada con bordado directo de alta densidad y múltiples hilos que reproduce el emblema sagrado de la Ruta de la Seda en relieve táctil.",
      material: "80 % Algodón hilado en anillo, 20 % Poliéster (280 g/m²). Bordado arquitectónico directo de alta densidad.",
    },
  },
  "promio-25986531": {
    en: {
      name: "AWDis JH001 — Vintage Embroidered Emblem Hoodie",
      descriptor: "Textured Archival Embroidery Edition",
      description: "Our pinnacle capsule edition. Heavyweight fleece hoodie adorned with high-density, multi-thread direct embroidery reproducing the sacred Silk Road emblem in tactile relief. Built with double-fabric hood, rib cuffs, and premium finish.",
      material: "80% Ringspun Cotton, 20% Polyester (280 GSM). Multi-thread architectural direct embroidery.",
    },
    nl: {
      name: "AWDis JH001 — Vintage Geborduurd Embleem Hoodie",
      descriptor: "Exclusieve Geborduurde Archief Editie",
      description: "Onze exclusieve capsule-editie. Zware fleece hoodie versierd met dichte borduursels met meerdere draden die het historische zijderoute-embleem in voelbaar reliëf weergeven. Voorzien van dubbellaagse capuchon en premium afwerking.",
      material: "80% Ringgesponnen katoen, 20% polyester (280 g/m²). Verfijnd direct borduurwerk.",
    },
    de: {
      name: "AWDis JH001 — Vintage Bestickter Emblem Hoodie",
      descriptor: "Strukturierte Archiv-Stickerei Edition",
      description: "Unser Meisterstück der Kapselkollektion. Dichter Fleece-Kapuzenpullover mit aufwendiger Mehrfaden-Direktstickerei, die das historische Seidenstraßen-Emblem als spürbares Relief verewigt. Doppellagige Kapuze und veredelte Kanten.",
      material: "80 % Ringgesponnene Baumwolle, 20 % Polyester (280 g/m²). Hochdichte architektonische Direktstickerei.",
    },
    fr: {
      name: "AWDis JH001 — Sweat à Capuche avec Emblème Brodé Vintage",
      descriptor: "Édition Broderie d'Archive Texturée",
      description: "La pièce maîtresse de notre capsule. Sweat à capuche en molleton dense sublimé par une broderie directe haute densité en fils multiples, restituant l'emblème de la Route de la Soie en relief tactile. Capuche doublée et finitions d'exception.",
      material: "80 % Coton peigné, 20 % Polyester (280 g/m²). Broderie architecturale directe haute densité.",
    },
    es: {
      name: "AWDis JH001 — Sudadera con Capucha y Emblema Bordado Vintage",
      descriptor: "Edición de Archivo con Bordado Texturizado",
      description: "La pieza cumbre de nuestra colección cápsula. Sudadera de felpa gruesa adornada con bordado directo de alta densidad y múltiples hilos que reproduce el emblema sagrado de la Ruta de la Seda en relieve táctil.",
      material: "80 % Algodón hilado en anillo, 20 % Poliéster (280 g/m²). Bordado arquitectónico directo de alta densidad.",
    },
  },
};

export function getLocalizedProduct(p: Product, locale?: Locale): Product {
  if (!p) return p;
  const targetLocale = locale || "en";
  const map = PRODUCT_TRANSLATIONS[p.slug] || PRODUCT_TRANSLATIONS[p.id];
  const tr = map?.[targetLocale] || map?.["en"];

  // Strict purge: if Cyrillic characters exist in p.name, override from translation map
  const hasRussian = /[\u0400-\u04FF]/.test(p.name || "");

  if (!tr && !hasRussian) return p;

  return {
    ...p,
    name: tr?.name || (hasRussian ? (map?.["en"]?.name || "YUPEK Garment") : p.name),
    descriptor: tr?.descriptor ?? p.descriptor,
    description: tr?.description ?? p.description,
    material: tr?.material ?? p.material,
    badge: tr?.badge !== undefined ? tr.badge : p.badge,
  };
}
