import { MetadataRoute } from "next";
import { getCatalogProducts } from "@/lib/catalog";

/**
 * Production sitemap for https://www.yupek.shop
 *
 * Served at: https://www.yupek.shop/sitemap.xml
 * Compatible with: Google Search Console, Bing Webmaster Tools
 *
 * Note: We intentionally use the hardcoded production URL rather than
 * NEXT_PUBLIC_SITE_URL to prevent the localhost value in .env.local from
 * appearing in the production sitemap. Vercel production builds always
 * resolve to the production domain.
 */
const PRODUCTION_URL = "https://www.yupek.shop";

// A stable build-time date used for lastModified on static pages.
// Using a constant date (instead of new Date()) prevents the sitemap from
// reporting every page as "just changed" on every deploy, which helps
// search engines prioritise genuinely updated content.
const SITE_LAUNCH_DATE = new Date("2026-10-01T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  // ─── Static public routes ────────────────────────────────────────────────
  // Excluded intentionally:
  //   /account   — private user portal (requires login)
  //   /admin     — staff-only panel
  //   /checkout  — transient payment flow
  //   /cart      — transient session state
  //   /auth      — OAuth callback, no indexable content
  //   /api       — REST endpoints, not HTML pages
  //   /wishlist  — user-specific saved items, no canonical content
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
      url: `${PRODUCTION_URL}/returns`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${PRODUCTION_URL}/contact`,
      lastModified: SITE_LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 0.75,
    },
  ];

  // ─── Dynamic product routes ───────────────────────────────────────────────
  // Products are sourced dynamically from the real catalog via getCatalogProducts().
  const catalogProducts = getCatalogProducts();
  const productRoutes: MetadataRoute.Sitemap = catalogProducts.map((p) => ({
    url: `${PRODUCTION_URL}/product/${p.slug}`,
    lastModified: SITE_LAUNCH_DATE,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));


  return [...staticRoutes, ...productRoutes];
}
