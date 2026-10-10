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
      id: p.id,
      supplier_product_id: String(p.supplierProductId || p.id.replace("promio-", "")),
      title: p.name,
      description: p.description || "",
      category: p.category || "garments",
      gender: p.gender || "unisex",
      supplier: "Promio",
      price: typeof p.price === "number" ? p.price : 29.99,
      images: Array.isArray(p.images) ? p.images : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      is_draft: Boolean(p.isDraft),
      visible: !p.isDraft,
      colors: Array.isArray(p.colors) ? p.colors : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      base_garment: p.baseGarment || "",
    }));

    return NextResponse.json({
      success: true,
      total: formatted.length,
      products: formatted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load Promio products" },
      { status: 500 }
    );
  }
}

function strSupplier(val: any): string {
  return typeof val === "string" ? val : "";
}
