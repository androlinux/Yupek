import { NextResponse } from "next/server";
import { readSyncMetadata } from "@/lib/printifySync";
import { getBackendApiUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = getBackendApiUrl();
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/printify/status`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {}
  }

  // Fallback to local Printify status
  const token = process.env.PRINTIFY_API_TOKEN;
  let apiConnected = false;
  let webhooks: any[] = [];
  let webhookStatus = "NOT CONNECTED";

  if (token) {
    try {
      const hooksRes = await fetch("https://api.printify.com/v1/shops/29215191/webhooks.json", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
        },
        cache: "no-store",
      });

      if (hooksRes.ok) {
        apiConnected = true;
        const rawHooks = await hooksRes.json();
        if (Array.isArray(rawHooks)) {
          webhooks = rawHooks.map((h: any) => ({
            id: h.id,
            topic: h.topic,
            url: h.url,
            shop_id: h.shop_id,
          }));

          const topics = new Set(webhooks.map((h) => h.topic));
          const required = ["product:created", "product:updated", "product:deleted", "product:publish:started"];
          if (required.every((t) => topics.has(t))) {
            webhookStatus = "CONNECTED";
          } else if (topics.size > 0) {
            webhookStatus = "PARTIAL";
          }
        }
      }
    } catch {}
  }

  const meta = await readSyncMetadata();

  return NextResponse.json({
    api_connection: apiConnected ? "CONNECTED" : "NOT CONNECTED",
    shop_id: "29215191",
    shop_name: "Yupek",
    sales_channel: "custom_integration",
    webhook_status: webhookStatus,
    registered_webhooks: webhooks,
    last_webhook_received: meta.last_webhook_received,
    last_sync: meta.last_sync,
    products_synced: meta.products_synced,
    sync_errors: meta.sync_errors,
    recent_events: meta.events.slice(-10),
  });
}
