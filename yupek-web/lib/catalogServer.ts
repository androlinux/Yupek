import { products, type Product } from "@/data/products";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

export async function getCatalogProductsServer(): Promise<Product[]> {
  try {
    const { config } = await getOrMigrateSiteConfig();
    const custom: Product[] = (config as any).customProducts || [];
    const overrides = (config as any).productOverrides || {};
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
          variants: p.variants,
        };
      });
  } catch {
    return products;
  }
}

export async function getProductServer(slug: string): Promise<Product | undefined> {
  const list = await getCatalogProductsServer();
  return list.find((p) => p.slug === slug);
}
