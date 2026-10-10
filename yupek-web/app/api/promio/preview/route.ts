import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getBackendApiUrl } from "@/lib/apiConfig";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authRes = await verifyAdminAuth(req);
  if (!authRes.authorized) {
    return NextResponse.json(
      { error: authRes.errorMessage || "Unauthorized: Administrator authorization required." },
      { status: authRes.errorStatus || 401 }
    );
  }

  const backendUrl = getBackendApiUrl();
  if (backendUrl) {
    try {
      const cronSecret = process.env.CRON_SECRET || "change-me";
      const res = await fetch(`${backendUrl}/api/promio/preview`, {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "X-Cron-Secret": cronSecret,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback
    }
  }

  const { config } = await getOrMigrateSiteConfig();
  const promioProducts = (config.customProducts || []).filter(
    (p: any) =>
      typeof p.supplier === "string" &&
      p.supplier.toLowerCase() === "promio"
  );

  return NextResponse.json({
    status: "preview",
    dry_run: true,
    feature_flag_enabled: true,
    timestamp: new Date().toISOString(),
    summary: {
      total_fetched: promioProducts.length,
      valid_candidates: promioProducts.length,
      invalid_candidates: 0,
      new_candidates_count: 0,
      updated_candidates_count: 0,
      unchanged_candidates_count: promioProducts.length,
    },
    unchanged_candidates: promioProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      supplierProductId: p.supplierProductId,
      price: p.price,
      variants_count: Array.isArray(p.variants) ? p.variants.length : 0,
    })),
    new_candidates: [],
    updated_candidates: [],
    invalid_candidates: [],
  });
}
