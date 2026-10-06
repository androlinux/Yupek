import { products, type Product } from "@/data/products";

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
    price: number;
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

export function getCatalogProducts(): Product[] {
  if (typeof window === "undefined") {
    try {
      const nodeRequire = eval("require");
      const fs = nodeRequire("fs");
      const path = nodeRequire("path");
      const configPath = path.join(process.cwd(), "data", "site-config.json");
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        const custom: Product[] = parsed.customProducts || [];
        const overrides = parsed.productOverrides || {};
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
          });
      }
    } catch {}
  }
  return products;
}

export const getProduct = (slug: string, list?: Product[]) => {
  const source = list || getCatalogProducts();
  return source.find((p) => p.slug === slug);
};

export const related = (p: Product, n = 4, list: Product[] = products) =>
  list
    .filter((x) => x.slug !== p.slug && x.category === p.category)
    .concat(list.filter((x) => x.slug !== p.slug && x.category !== p.category))
    .slice(0, n);

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

export function searchProducts(q: string, list: Product[] = products): Product[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { product: Product; score: number }[] = [];

  for (const p of list) {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const catLower = p.category.toLowerCase();
    const descLower = `${p.description} ${p.descriptor}`.toLowerCase();
    const tagsLower = p.tags.map((t) => t.toLowerCase());
    const colorsLower = p.colors.map((c) => c.toLowerCase());
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

      // Category / Gender matches
      if (catLower === token || catLower.includes(token) || p.gender.toLowerCase() === token) {
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

export function filterProducts(f: Filters, list: Product[] = products): Product[] {
  let r = list.filter(
    (p) =>
      (!f.category || p.category === f.category) &&
      (!f.gender || p.gender === f.gender || p.gender === "unisex") &&
      (!f.size || p.sizes.includes(f.size)) &&
      (!f.color || p.colors.includes(f.color)) &&
      (!f.max || p.price <= f.max) &&
      (!f.isNew || p.newArrival)
  );
  if (f.sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
  else if (f.sort === "newest") r = [...r].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
  else r = [...r].sort((a, b) => Number(b.featured) - Number(a.featured));
  return r;
}
