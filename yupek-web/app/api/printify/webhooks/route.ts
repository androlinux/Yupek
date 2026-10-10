import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authRes = await verifyAdminAuth(req);
  if (!authRes.authorized) {
    return NextResponse.json(
      { error: authRes.errorMessage || "Unauthorized" },
      { status: authRes.errorStatus || 401 }
    );
  }

  return NextResponse.json({
    status: "migrated_to_promio",
    active_supplier: "Promio (Breda, NL)",
    webhooks: [
      {
        id: "cron-promio-sync",
        topic: "catalog:sync",
        url: "https://yupek-backend.vercel.app/api/cron/promio-sync",
        status: "active",
      },
    ],
  });
}

export async function POST(req: NextRequest) {
  const authRes = await verifyAdminAuth(req);
  if (!authRes.authorized) {
    return NextResponse.json(
      { error: authRes.errorMessage || "Unauthorized" },
      { status: authRes.errorStatus || 401 }
    );
  }

  return NextResponse.json({
    success: true,
    status: "migrated_to_promio",
    message: "Promio automated synchronization is active via Vercel Cron.",
  });
}
