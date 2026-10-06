import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripeServer";
import { getOrderRecordById, persistOrderRecord } from "@/lib/orderPersistence";
import { createPrintifyOrder } from "@/lib/printifyOrders";
import { sendOrderConfirmationEmail } from "@/lib/orderEmail";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// In-memory deduplication cache for sub-second safety & local fallback
const processedWebhookEventIds = new Set<string>();

async function isEventProcessed(eventId: string): Promise<boolean> {
  if (processedWebhookEventIds.has(eventId)) {
    return true;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("stripe_event_id", eventId)
      .maybeSingle();

    if (data) {
      processedWebhookEventIds.add(eventId);
      return true;
    }
  } catch {
    // If table not migrated yet, reliance on in-memory set
  }

  return false;
}

async function markEventProcessed(eventId: string, eventType: string, status: string = "processed", error?: string) {
  processedWebhookEventIds.add(eventId);

  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("stripe_webhook_events").upsert({
      stripe_event_id: eventId,
      event_type: eventType,
      status,
      error: error || null,
      processed_at: new Date().toISOString(),
    });
  } catch {
    // Optional table
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.warn("[Stripe Webhook] Stripe secret or webhook secret unconfigured.");
    return NextResponse.json({ error: "Payments or webhooks not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook Error] Invalid signature:", err.message);
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;

  // 1. Database-level deduplication
  if (await isEventProcessed(eventId)) {
    console.log(`[Stripe Webhook] Event ${eventId} already processed. Returning 200.`);
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  await markEventProcessed(eventId, eventType, "processing");

  try {
    if (eventType === "payment_intent.succeeded") {
      const intent = event.data.object;
      const orderId = intent.metadata?.order_id || intent.metadata?.yupek_order_id;

      if (!orderId) {
        console.error(`[Stripe Webhook] PaymentIntent ${intent.id} missing order_id in metadata.`);
        await markEventProcessed(eventId, eventType, "error", "Missing order_id");
        return NextResponse.json({ received: true, error: "Missing order_id metadata" });
      }

      const order = await getOrderRecordById(orderId);
      if (!order) {
        console.error(`[Stripe Webhook] Order ${orderId} not found in database.`);
        await markEventProcessed(eventId, eventType, "error", "Order not found");
        return NextResponse.json({ received: true, error: "Order not found" });
      }

      // Authoritative validation
      if (intent.currency.toLowerCase() !== "eur") {
        throw new Error(`Currency mismatch: expected EUR, got ${intent.currency}`);
      }

      if (intent.amount_received !== order.total_cents) {
        throw new Error(`Amount mismatch: received ${intent.amount_received}, expected ${order.total_cents}`);
      }

      // Mark payment as paid
      order.payment_status = "paid";
      order.stripe_payment_intent_id = intent.id;

      // 2. Strict Printify Idempotency Protection
      // NEVER create two Printify orders for one YUPEK order
      if (order.printify_order_id) {
        console.warn(`[Stripe Webhook] Printify order already exists for ${orderId}: ${order.printify_order_id}. Skipping Printify creation.`);
        await persistOrderRecord(order);
        await markEventProcessed(eventId, eventType, "processed");
        return NextResponse.json({ received: true, printify_order_id: order.printify_order_id });
      }

      // 3. Create Printify Order on Shop 29215191
      const printifyLineItems = order.items
        .filter((i) => i.supplier_product_id && i.variant_id)
        .map((i) => ({
          product_id: String(i.supplier_product_id),
          variant_id: Number(i.variant_id),
          quantity: Math.max(1, i.quantity || 1),
        }));

      if (printifyLineItems.length > 0) {
        try {
          const printifyRes = await createPrintifyOrder({
            external_id: order.id,
            line_items: printifyLineItems,
            shipping_address: {
              first_name: order.shipping_address.first_name,
              last_name: order.shipping_address.last_name,
              email: order.customer_email,
              phone: order.shipping_address.phone,
              country: order.shipping_address.country,
              region: order.shipping_address.region,
              address1: order.shipping_address.street,
              address2: order.shipping_address.address2,
              city: order.shipping_address.city,
              zip: order.shipping_address.postalCode,
            },
          });

          order.printify_order_id = printifyRes.id;
          order.fulfillment_status = "printify_order_created";
          console.log(`[Stripe Webhook] Printify order ${printifyRes.id} created for ${order.id}`);
        } catch (printifyErr: any) {
          console.error(`[Stripe Webhook] Printify order creation failed for ${order.id}:`, printifyErr.message);
          // Payment is already confirmed; fulfillment remains 'paid' for manual/admin review
          order.fulfillment_status = "paid";
          order.notes = `Printify error: ${printifyErr.message}`;
        }
      } else {
        order.fulfillment_status = "paid";
      }

      // Save updated order
      await persistOrderRecord(order);

      // 4. Send customer and store owner confirmation emails
      await sendOrderConfirmationEmail(order);

      await markEventProcessed(eventId, eventType, "processed");
      return NextResponse.json({ received: true, order_id: order.id, payment_status: "paid" });
    } else if (eventType === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const orderId = intent.metadata?.order_id;
      if (orderId) {
        const order = await getOrderRecordById(orderId);
        if (order) {
          order.payment_status = "failed";
          await persistOrderRecord(order);
        }
      }
      await markEventProcessed(eventId, eventType, "processed");
      return NextResponse.json({ received: true, status: "payment_failed" });
    } else {
      await markEventProcessed(eventId, eventType, "ignored");
      return NextResponse.json({ received: true, status: "unhandled_event" });
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook Processing Error] Event ${eventId}:`, err);
    await markEventProcessed(eventId, eventType, "error", err.message);
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 500 });
  }
}
