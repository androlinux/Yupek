import { NextRequest, NextResponse } from "next/server";
import {
  verifyPrintifySignature,
  isEventProcessed,
  recordEvent,
  syncPrintifyProductLocal,
} from "@/lib/printifySync";
import { getBackendApiUrl } from "@/lib/apiConfig";
import { getOrderRecordById, persistOrderRecord, OrderRecord } from "@/lib/orderPersistence";
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} from "@/lib/orderEmail";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Handle incoming Printify Order Webhook Events:
 * - order:sent-to-production -> in_production
 * - order:shipment:created   -> shipped (+ parses carrier, tracking, triggers customer email)
 * - order:shipment:delivered -> delivered
 */
async function handlePrintifyOrderEvent(
  eventType: string,
  resource: any,
  eventId: string
): Promise<{ success: boolean; order_id?: string; status?: string; message?: string }> {
  const resourceData = resource.data || {};
  // STEP 6: Primary lookup = resourceData.external_id (or resourceData.label)
  const externalId = String(resourceData.external_id || resourceData.label || "").trim();
  const printifyOrderId = String(resource.id || resourceData.id || "").trim();

  let order: OrderRecord | null = null;
  if (externalId) {
    order = await getOrderRecordById(externalId);
  }

  // Fallback lookup = printifyOrderId matching orders.printify_order_id
  if (!order && printifyOrderId) {
    const supabase = getSupabaseServerClient();
    try {
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("printify_order_id", printifyOrderId)
        .maybeSingle();
      if (data?.id) {
        order = await getOrderRecordById(data.id);
      }
    } catch {}
  }

  if (!order) {
    console.log(`[Printify Webhook] Order not found for external_id='${externalId}', printify_id='${printifyOrderId}'. Skipping.`);
    return { success: false, message: "order_not_found" };
  }

  // STEP 8: State Machine & Payment Protection
  // A shipment webhook must never mark an unpaid order as paid or advance its fulfillment
  if (order.payment_status !== "paid") {
    console.warn(`[Printify Webhook] Order ${order.id} payment_status is '${order.payment_status}'. Skipping fulfillment transition.`);
    return { success: false, message: "order_unpaid" };
  }

  const statusRank: Record<string, number> = {
    pending_payment: 0,
    paid: 1,
    printify_order_created: 2,
    sent_to_production: 3,
    in_production: 3,
    shipped: 4,
    delivered: 5,
  };

  let targetStatus: OrderRecord["fulfillment_status"] = order.fulfillment_status;
  if (eventType === "order:sent-to-production") {
    targetStatus = "in_production";
  } else if (eventType === "order:shipment:created") {
    targetStatus = "shipped";
  } else if (eventType === "order:shipment:delivered") {
    targetStatus = "delivered";
  }

  const currentRank = statusRank[order.fulfillment_status] ?? 0;
  const targetRank = statusRank[targetStatus] ?? 0;

  // Monotonic progression: only advance state, never regress
  if (targetRank > currentRank) {
    order.fulfillment_status = targetStatus;
  } else {
    console.log(
      `[Printify Webhook] Monotonic protection: order ${order.id} is already '${order.fulfillment_status}' (rank ${currentRank}). Will not regress to '${targetStatus}' (rank ${targetRank}).`
    );
  }

  // STEP 7: Parse Shipment Details (never erase valid existing data with empty values)
  const shipments = Array.isArray(resourceData.shipments) ? resourceData.shipments : [];
  if (shipments.length > 0) {
    const primaryShipment = shipments.find((s: any) => s.number || s.url || s.carrier) || shipments[0];

    if (primaryShipment.carrier) {
      order.carrier = String(primaryShipment.carrier).toUpperCase();
    }

    const trackingNumbers = shipments
      .map((s: any) => String(s.number || "").trim())
      .filter(Boolean);

    if (trackingNumbers.length > 0) {
      order.tracking_number = trackingNumbers.join(", ");
    } else if (primaryShipment.number) {
      order.tracking_number = String(primaryShipment.number).trim();
    }

    if (primaryShipment.url) {
      order.tracking_url = String(primaryShipment.url).trim();
    }

    if (primaryShipment.delivered_at) {
      order.delivered_at = new Date(primaryShipment.delivered_at).toISOString();
    }
  }

  // Set timestamps based on event
  const nowIso = new Date().toISOString();
  if (eventType === "order:shipment:created" && !order.shipped_at) {
    order.shipped_at = nowIso;
  }
  if (eventType === "order:shipment:delivered" && !order.delivered_at) {
    order.delivered_at = nowIso;
  }

  // STEP 9: Customer Shipping Email (Dispatched exactly once)
  let emailDispatched = false;
  const isShipmentEvent =
    eventType === "order:shipment:created" ||
    order.fulfillment_status === "shipped" ||
    order.fulfillment_status === "delivered";

  if (isShipmentEvent && !order.shipped_email_sent) {
    try {
      emailDispatched = await sendOrderShippedEmail(order);
      if (emailDispatched) {
        order.shipped_email_sent = true;
      }
    } catch (emailErr: any) {
      console.warn(`[Printify Webhook] Shipment email error for ${order.id}:`, emailErr.message);
    }
  }

  // STEP 9b: Customer Delivery Email (Dispatched exactly once)
  if (order.fulfillment_status === "delivered" && !order.delivered_email_sent) {
    try {
      const deliveredEmailSent = await sendOrderDeliveredEmail(order);
      if (deliveredEmailSent) {
        order.delivered_email_sent = true;
      }
    } catch (emailErr: any) {
      console.warn(`[Printify Webhook] Delivery email error for ${order.id}:`, emailErr.message);
    }
  }

  // Persist updated order record
  await persistOrderRecord(order);

  return {
    success: true,
    order_id: order.id,
    status: order.fulfillment_status,
  };
}

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

    const rawShopId = resourceData.shop_id ?? payload.data?.shop_id ?? payload.shop_id;
    const shopId = rawShopId != null ? String(rawShopId).trim() : "";

    // 3. STEP 3: Explicit Shop ID required & shop_id MUST equal 29215191
    if (!shopId) {
      console.warn("[Printify Webhook] Rejected: Missing required shop_id in payload.");
      return NextResponse.json(
        { error: "Missing required shop_id in webhook payload." },
        { status: 400 }
      );
    }

    // Never process Etsy Shop 29193770 or any third-party shops
    if (shopId !== "29215191") {
      console.log(`[Printify Webhook] Safely ignored for non-target shop: ${shopId}`);
      return NextResponse.json(
        { status: "ignored", reason: "shop_not_eligible", received_shop_id: shopId },
        { status: 200 }
      );
    }

    // 4. STEP 4: Persistent Idempotency Check (Supabase webhook_events)
    if (eventId && (await isEventProcessed(eventId))) {
      console.log(`[Printify Webhook] Duplicate event detected: ${eventId}. Skipping.`);
      return NextResponse.json(
        { status: "ok", message: "event_already_processed", event_id: eventId },
        { status: 200 }
      );
    }

    // Forward to FastAPI backend if running
    const backendUrl = getBackendApiUrl();
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

    // 5. STEP 5: Supported Events Dispatch
    const supportedProductEvents = [
      "product:created",
      "product:updated",
      "product:deleted",
      "product:publish:started",
    ];

    const supportedOrderEvents = [
      "order:sent-to-production",
      "order:shipment:created",
      "order:shipment:delivered",
    ];

    if (supportedProductEvents.includes(eventType)) {
      let syncResult: any = null;
      if (resourceId) {
        try {
          syncResult = await syncPrintifyProductLocal(resourceId, eventType, "29215191");
          await recordEvent(eventId, eventType, "29215191", resourceId, "processed");
        } catch (err: any) {
          console.error(`[Printify Webhook] Product sync error for ${resourceId}:`, err.message);
          await recordEvent(eventId, eventType, "29215191", resourceId, "error", err.message);
        }
      }
      return NextResponse.json({
        status: "ok",
        event_id: eventId,
        event_type: eventType,
        sync: syncResult,
      });
    }

    if (supportedOrderEvents.includes(eventType)) {
      try {
        const orderResult = await handlePrintifyOrderEvent(eventType, resource, eventId);
        await recordEvent(
          eventId,
          eventType,
          "29215191",
          orderResult.order_id || resourceId,
          orderResult.success ? "processed" : "skipped"
        );
        return NextResponse.json({
          status: "ok",
          event_id: eventId,
          event_type: eventType,
          order: orderResult,
        });
      } catch (orderErr: any) {
        console.error(`[Printify Webhook] Order processing error for ${resourceId}:`, orderErr.message);
        await recordEvent(eventId, eventType, "29215191", resourceId, "error", orderErr.message);
        return NextResponse.json(
          { error: "Internal order processing error", details: orderErr.message },
          { status: 500 }
        );
      }
    }

    // Untracked event
    await recordEvent(eventId, eventType, shopId, resourceId, "skipped");
    return NextResponse.json(
      { status: "ok", message: `untracked_event_${eventType}` },
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
