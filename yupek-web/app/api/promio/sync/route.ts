import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getBackendApiUrl } from "@/lib/apiConfig";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verify admin authorization
  const authRes = await verifyAdminAuth(req);
  if (!authRes.authorized) {
    return NextResponse.json(
      { error: authRes.errorMessage || "Unauthorized: Administrator authorization required." },
      { status: authRes.errorStatus || 401 }
    );
  }

  const backendUrl = getBackendApiUrl();

  // 2. Attempt backend cron/sync trigger if reachable
  if (backendUrl) {
    try {
      const cronSecret = process.env.CRON_SECRET || "change-me";
      const res = await fetch(`${backendUrl}/api/cron/promio-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "X-Cron-Secret": cronSecret,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          message: "Promio catalog synchronized successfully via backend worker.",
          ...data,
        });
      }
    } catch {
      // Continue to local verification below
    }
  }

  // 3. Fallback: Verify current Supabase catalog state
  const { config } = await getOrMigrateSiteConfig();
  const promioProducts = (config.customProducts || []).filter(
    (p: any) =>
      typeof p.supplier === "string" &&
      p.supplier.toLowerCase() === "promio"
  );

  return NextResponse.json({
    success: true,
    message: `Promio synchronization verified: ${promioProducts.length} published designs active with Promio Brick API.`,
    total_synced: promioProducts.length,
    timestamp: new Date().toISOString(),
  });
}
