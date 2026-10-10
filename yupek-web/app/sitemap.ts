import { MetadataRoute } from "next";
import { getCatalogProductsServer } from "@/lib/catalogServer";

/**
 * Production sitemap for https://www.yupek.shop
 *
 * Served at: https://www.yupek.shop/sitemap.xml
 * Compatible with: Google Search Console, Bing Webmaster Tools, Google Merchant
 */
const PRODUCTION_URL = "https://www.yupek.shop";

const SITE_LAUNCH_DATE = new Date("2026-10-01T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Static public routes ────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${PRODUCTION_URL}/`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${PRODUCTION_URL}/shop`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${PRODUCTION_URL}/lookbook`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${PRODUCTION_URL}/journal`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${PRODUCTION_URL}/about`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${PRODUCTION_URL}/shipping`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${PRODUCTION_URL}/returns`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${PRODUCTION_URL}/contact`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${PRODUCTION_URL}/terms`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${PRODUCTION_URL}/privacy`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // ─── Dynamic product routes ───────────────────────────────────────────────
  // Products are sourced dynamically from the server catalog via getCatalogProductsServer().
  try {
    const catalogProducts = await getCatalogProductsServer();
    const productRoutes: MetadataRoute.Sitemap = catalogProducts.map((p) => ({
      url: `${PRODUCTION_URL}/product/${p.slug}`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}

