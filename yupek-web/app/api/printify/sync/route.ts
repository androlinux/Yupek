import { NextRequest, NextResponse } from "next/server";
import { syncPrintifyProductLocal } from "@/lib/printifySync";
import { getBackendApiUrl } from "@/lib/apiConfig";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Enforce server-side verified admin authorization
  const authRes = await verifyAdminAuth(req);
  if (!authRes.authorized) {
    return NextResponse.json(
      { error: authRes.errorMessage || "Unauthorized: Administrator authentication required to trigger sync." },
      { status: authRes.errorStatus || 401 }
    );
  }

  const backendUrl = getBackendApiUrl();
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/printify/sync`, {
        method: "POST",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {}
  }

  // Fallback to local Printify manual sync
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "PRINTIFY_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const listRes = await fetch("https://api.printify.com/v1/shops/29215191/products.json?limit=50", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
      },
      cache: "no-store",
    });

    if (!listRes.ok) {
      return NextResponse.json({ error: `Printify API error ${listRes.status}` }, { status: 502 });
    }

    const data = await listRes.json();
    const rawProducts = data.data || (Array.isArray(data) ? data : []);
    const synced = [];

    for (const p of rawProducts) {
      if (p.id) {
        const r = await syncPrintifyProductLocal(String(p.id), "manual", "29215191");
        synced.push(r);
      }
    }

    return NextResponse.json({
      status: "ok",
      total_synced: synced.length,
      synced,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
