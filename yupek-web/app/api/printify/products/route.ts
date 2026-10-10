import { NextRequest, NextResponse } from "next/server";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { config } = await getOrMigrateSiteConfig();
    const customProducts = (config.customProducts || []).filter(
      (p: any) =>
        strSupplier(p.supplier).toLowerCase() === "promio" ||
        String(p.id || "").startsWith("promio-")
    );

    const formatted = customProducts.map((p: any) => ({
      printify_product_id: String(p.supplierProductId || p.id),
      id: p.id,
      title: p.name,
      slug: p.slug,
      description: p.description || "",
      tags: p.tags || [],
      price: typeof p.price === "number" ? p.price : 29.99,
      currency: "EUR",
      images: Array.isArray(p.images) ? p.images : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
      available: !p.isDraft,
      visible: !p.isDraft,
    }));

    return NextResponse.json({
      products: formatted,
      total: formatted.length,
      page: 1,
      last_page: 1,
      per_page: 50,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load products" },
      { status: 500 }
    );
  }
}

function strSupplier(val: any): string {
  return typeof val === "string" ? val : "";
}
