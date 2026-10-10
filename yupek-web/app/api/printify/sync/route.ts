import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authRes = await verifyAdminAuth(req);
  if (!authRes.authorized) {
    return NextResponse.json(
      { error: authRes.errorMessage || "Unauthorized" },
      { status: authRes.errorStatus || 401 }
    );
  }

  const { config } = await getOrMigrateSiteConfig();
  const promioProducts = (config.customProducts || []).filter(
    (p: any) =>
      typeof p.supplier === "string" &&
      p.supplier.toLowerCase() === "promio"
  );

  return NextResponse.json({
    status: "migrated_to_promio",
    message: "Fulfillment and catalog synchronization migrated to Promio (Breda, NL).",
    promio_sync_url: "/api/promio/sync",
    total_synced: promioProducts.length,
    timestamp: new Date().toISOString(),
  });
}
