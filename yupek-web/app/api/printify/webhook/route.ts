import { NextRequest, NextResponse } from "next/server";
import {
  verifyPrintifySignature,
  isEventProcessed,
  recordEvent,
  syncPrintifyProductLocal,
} from "@/lib/printifySync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sigHeader =
      req.headers.get("x-pfy-signature") ||
      req.headers.get("X-Pfy-Signature") ||
      req.headers.get("x-printify-signature");

    // 1. Webhook Security Verification
    const isValid = verifyPrintifySignature(rawBody, sigHeader);
    if (!isValid) {
      console.warn("[Printify Webhook] Rejected: Invalid or missing X-Pfy-Signature.");
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    // 2. Parse Payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = String(payload.id || "");
    const eventType = String(payload.type || "");
    const resource = payload.resource || {};
    const resourceId = String(resource.id || "");
    const resourceData = resource.data || {};

    const shopId = String(
      resourceData.shop_id ||
      payload.data?.shop_id ||
      payload.shop_id ||
      ""
    );

    // 3. Shop Validation (Only 29215191 - Never touch Etsy 29193770)
    if (shopId && shopId !== "29215191") {
      console.log(`[Printify Webhook] Safely ignored for non-target shop: ${shopId}`);
      return NextResponse.json(
        { status: "ignored", reason: "shop_not_eligible", received_shop_id: shopId },
        { status: 200 }
      );
    }

    // 4. Idempotency Check
    if (eventId && (await isEventProcessed(eventId))) {
      console.log(`[Printify Webhook] Duplicate event detected: ${eventId}. Skipping.`);
      return NextResponse.json(
        { status: "ok", message: "event_already_processed", event_id: eventId },
        { status: 200 }
      );
    }

    // 5. Supported Product Events
    const supportedEvents = [
      "product:created",
      "product:updated",
      "product:deleted",
      "product:publish:started",
    ];

    if (!supportedEvents.includes(eventType)) {
      await recordEvent(eventId, eventType, shopId || "29215191", resourceId, "skipped");
      return NextResponse.json(
        { status: "ok", message: `untracked_event_${eventType}` },
        { status: 200 }
      );
    }

    // Forward to FastAPI backend if running
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        fetch(`${backendUrl}/api/printify/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Pfy-Signature": sigHeader || "",
          },
          body: rawBody,
        }).catch((err) => {
          console.warn("[Printify Webhook] Backend forwarding notice:", err.message);
        });
      } catch {}
    }

    // 6. Process Product Synchronization
    let syncResult: any = null;
    if (resourceId) {
      try {
        syncResult = await syncPrintifyProductLocal(resourceId, eventType, "29215191");
        await recordEvent(eventId, eventType, "29215191", resourceId, "processed");
      } catch (err: any) {
        console.error(`[Printify Webhook] Sync error for ${resourceId}:`, err.message);
        await recordEvent(eventId, eventType, "29215191", resourceId, "error", err.message);
      }
    }

    return NextResponse.json(
      {
        status: "ok",
        event_id: eventId,
        event_type: eventType,
        sync: syncResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Printify Webhook Handler Error]:", err.message);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
