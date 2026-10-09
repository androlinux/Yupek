import { products, type Product } from "@/data/products";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import { sanitizeProductSizes } from "@/lib/catalog";
import initialSiteConfig from "@/data/site-config.json";

/**
 * Deterministically resolves missing Printify variant_id values from the trusted bundled catalog.
 *
 * STRICT SAFETY RULES:
 * 1. Matches variants ONLY using verified product identity (supplierProductId or normalized id/slug)
 *    and exact size + color values. NEVER matches by product name alone.
 * 2. Does NOT overwrite valid authoritative IDs already present in Supabase (preserves existing valid IDs).
 * 3. NEVER invents, guesses, or substitutes a variant ID. If no exact match exists, variant_id remains untouched.
 */
export function enrichCatalogVariants(customProducts: Product[]): Product[] {
  if (!Array.isArray(customProducts) || customProducts.length === 0) {
    return customProducts || [];
  }

  const trustedProducts = (initialSiteConfig.customProducts || []) as Product[];
  const trustedVariantMap = new Map<string, number | string>();

  for (const tp of trustedProducts) {
    const rawId = String(tp.supplierProductId || tp.id || "").trim();
    const cleanProdId = rawId.startsWith("printify-") ? rawId.slice("printify-".length) : rawId;
    const slug = String(tp.slug || "").trim();

    for (const tv of tp.variants || []) {
      if (tv.variant_id != null && tv.variant_id !== "" && Number(tv.variant_id) > 0) {
        const cleanSize = String(tv.size || "").trim().toLowerCase();
        const cleanColor = String(tv.color || "").trim().toLowerCase();
        if (cleanSize && cleanColor) {
          if (cleanProdId) {
            trustedVariantMap.set(`${cleanProdId}:${cleanSize}:${cleanColor}`, tv.variant_id);
          }
          if (slug) {
            trustedVariantMap.set(`${slug}:${cleanSize}:${cleanColor}`, tv.variant_id);
          }
        }
      }
    }
  }

  return customProducts.map((p) => {
    const rawId = String(p.supplierProductId || p.id || "").trim();
    const cleanProdId = rawId.startsWith("printify-") ? rawId.slice("printify-".length) : rawId;
    const slug = String(p.slug || "").trim();

    const enrichedVariants = (p.variants || []).map((v) => {
      // 1. If valid authoritative variant_id already present in Supabase, preserve it untouched
      if (v.variant_id != null && v.variant_id !== "" && Number(v.variant_id) > 0) {
        return v;
      }

      // 2. Deterministic lookup by verified product identity and exact size/color
      const cleanSize = String(v.size || "").trim().toLowerCase();
      const cleanColor = String(v.color || "").trim().toLowerCase();
      if (!cleanSize || !cleanColor) {
        return v;
      }

      const lookupKey = cleanProdId ? `${cleanProdId}:${cleanSize}:${cleanColor}` : "";
      const slugKey = slug ? `${slug}:${cleanSize}:${cleanColor}` : "";
      const matchedVariantId = (lookupKey && trustedVariantMap.get(lookupKey)) || (slugKey && trustedVariantMap.get(slugKey));

      if (matchedVariantId != null) {
        return {
          ...v,
          variant_id: matchedVariantId,
        };
      }

      // 3. Never invent, guess, or substitute: leave untouched if no exact match exists
      return v;
    });

    return {
      ...p,
      variants: enrichedVariants,
    };
  });
}

export async function getCatalogProductsServer(): Promise<Product[]> {
  try {
    const { config } = await getOrMigrateSiteConfig();
    const custom: Product[] = (config as any).customProducts || [];
    const overrides = (config as any).productOverrides || {};
    const enrichedCustom = enrichCatalogVariants(custom);
    const combined = [...products, ...enrichedCustom];

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
          detailedImages: p.detailedImages,
          options: p.options,
          variants: p.variants,
        };
      })
      .map(sanitizeProductSizes);
  } catch {
    return products;
  }
}

export async function getProductServer(slug: string): Promise<Product | undefined> {
  const list = await getCatalogProductsServer();
  return list.find((p) => p.slug === slug);
}
