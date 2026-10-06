import { MetadataRoute } from "next";

/**
 * robots.txt for https://www.yupek.shop
 *
 * Served at: https://www.yupek.shop/robots.txt
 *
 * - Allows all public crawling by all bots
 * - Blocks admin panel, API routes, checkout, auth callback,
 *   user account pages, and cart (no indexable content)
 * - References the production sitemap for search engine discovery
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.yupek.shop";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/checkout",
          "/checkout/",
          "/account",
          "/account/",
          "/auth",
          "/auth/",
          "/cart",
          "/cart/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
