import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripeServer";
import { getOrderRecordById, persistOrderRecord } from "@/lib/orderPersistence";
import { createPromioOrder } from "@/lib/promioOrders";
import {
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendRefundConfirmationEmail,
} from "@/lib/orderEmail";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// In-memory deduplication cache for sub-second safety & local fallback
const processedWebhookEventIds = new Set<string>();

/**
 * Structured safe logger: Logs operation metadata without exposing secrets, keys, or sensitive customer details.
 */
function logWebhook(
  level: "info" | "warn" | "error",
  data: {
    op: string;
    order_id?: string;
    event_id?: string;
    payment_intent_id?: string;
    promio_order_id?: string | null;
    printify_order_id?: string | null;
    category?: string;
    message: string;
  }
) {
  const timestamp = new Date().toISOString();
  const entry =
    `[Stripe Webhook ${level.toUpperCase()}] [${timestamp}] op=${data.op}` +
    (data.order_id ? ` order_id=${data.order_id}` : "") +
    (data.event_id ? ` event_id=${data.event_id}` : "") +
    (data.payment_intent_id ? ` pi_id=${data.payment_intent_id}` : "") +
    (data.promio_order_id ? ` promio_id=${data.promio_order_id}` : "") +
    (data.printify_order_id ? ` printify_id=${data.printify_order_id}` : "") +
    (data.category ? ` category=${data.category}` : "") +
    ` message="${data.message}"`;

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  if (processedWebhookEventIds.has(eventId)) {
    return true;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("stripe_webhook_events")
      .select("id, status")
      .eq("stripe_event_id", eventId)
      .maybeSingle();

    if (data && (data.status === "processed" || data.status === "ignored")) {
      processedWebhookEventIds.add(eventId);
      return true;
    }
  } catch {
    // If database unavailable or table not yet migrated, rely on in-memory set
  }

  return false;
}

async function markEventProcessed(
  eventId: string,
  eventType: string,
  status: string = "processed",
  error?: string
) {
  if (status === "processed" || status === "ignored") {
    processedWebhookEventIds.add(eventId);
  }

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
    // Optional fallback
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    logWebhook("warn", {
      op: "init",
      category: "config_missing",
      message: "Stripe secret key or webhook secret unconfigured.",
    });
    return NextResponse.json({ error: "Payments or webhooks not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    logWebhook("warn", {
      op: "signature_check",
      category: "auth_missing",
      message: "Missing stripe-signature header in request.",
    });
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    logWebhook("error", {
      op: "signature_verify",
      category: "signature_invalid",
      message: `Invalid signature verification: ${err.message}`,
    });
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;

  // 1. Database-level deduplication: preserve idempotency
  if (await isEventProcessed(eventId)) {
    logWebhook("info", {
      op: "dedup_check",
      event_id: eventId,
      category: "duplicate_event",
      message: `Event ${eventId} has already been processed. Returning HTTP 200.`,
    });
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  try {
    if (eventType === "payment_intent.succeeded") {
      const intent = event.data.object;
      const orderId = intent.metadata?.order_id || intent.metadata?.yupek_order_id;

      if (!orderId) {
        logWebhook("error", {
          op: "extract_metadata",
          event_id: eventId,
          payment_intent_id: intent.id,
          category: "metadata_missing",
          message: `PaymentIntent ${intent.id} missing order_id in metadata.`,
        });
        await markEventProcessed(eventId, eventType, "error", "Missing order_id");
        return NextResponse.json({ received: true, error: "Missing order_id metadata" });
      }

      const order = await getOrderRecordById(orderId);
      if (!order) {
        logWebhook("error", {
          op: "lookup_order",
          order_id: orderId,
          event_id: eventId,
          payment_intent_id: intent.id,
          category: "order_not_found",
          message: `Order ${orderId} not found in database.`,
        });
        await markEventProcessed(eventId, eventType, "error", "Order not found");
        return NextResponse.json({ received: true, error: "Order not found" });
      }

      // Authoritative verification: currency and amount
      if (intent.currency?.toLowerCase() !== "eur") {
        const mismatchMsg = `Currency mismatch: expected EUR, received ${intent.currency}`;
        logWebhook("error", {
          op: "validate_currency",
          order_id: order.id,
          event_id: eventId,
          category: "currency_mismatch",
          message: mismatchMsg,
        });
        throw new Error(mismatchMsg);
      }

      if (intent.amount_received !== order.total_cents) {
        const amountMsg = `Amount mismatch: received ${intent.amount_received}, expected ${order.total_cents}`;
        logWebhook("error", {
          op: "validate_amount",
          order_id: order.id,
          event_id: eventId,
          category: "amount_mismatch",
          message: amountMsg,
        });
        throw new Error(amountMsg);
      }

      if (order.payment_status === "refunded") {
        logWebhook("warn", {
          op: "refunded_guard",
          order_id: order.id,
          event_id: eventId,
          category: "order_already_refunded",
          message: `Order ${order.id} is already refunded. Ignoring late payment_intent.succeeded.`,
        });
        await markEventProcessed(eventId, eventType, "ignored");
        return NextResponse.json({ received: true, status: "order_already_refunded" });
      }

      // Mark payment as paid
      order.payment_status = "paid";
      order.stripe_payment_intent_id = intent.id;

      // 2. Strict Supplier Idempotency Protection:
      // Never create duplicate supplier orders if one is already linked
      if (order.promio_order_id || order.printify_order_id) {
        const existingSupplierId = order.promio_order_id || order.printify_order_id;
        logWebhook("info", {
          op: "supplier_idempotency_gate",
          order_id: order.id,
          event_id: eventId,
          promio_order_id: existingSupplierId,
          category: "fulfillment_already_exists",
          message: `Supplier order ${existingSupplierId} already exists for ${order.id}. Skipping fulfillment creation.`,
        });
        await persistOrderRecord(order);
        await markEventProcessed(eventId, eventType, "processed");
        return NextResponse.json({ received: true, supplier_order_id: existingSupplierId });
      }

      // 3. Create Promio Order (Primary and Sole Fulfillment Provider)
      const promioLineItems = order.items
        .filter((i) => i.variant_id || (i as any).supplier_variant_uid)
        .map((i) => ({
          variant_uid: String(i.variant_id || (i as any).supplier_variant_uid || ""),
          sku: String((i as any).sku || (i as any).variant_id || ""),
          quantity: Math.max(1, i.quantity || 1),
        }));

      if (promioLineItems.length > 0) {
        try {
          const promioRes = await createPromioOrder({
            client_order_id: order.id,
            line_items: promioLineItems,
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

          order.promio_order_id = promioRes.id;
          order.fulfillment_status = "promio_order_created";
          logWebhook("info", {
            op: "promio_order_created",
            order_id: order.id,
            event_id: eventId,
            promio_order_id: promioRes.id,
            category: "fulfillment_success",
            message: `Promio order ${promioRes.id} successfully created for ${order.id}`,
          });
        } catch (promioErr: any) {
          logWebhook("info", {
            op: "create_promio_order",
            order_id: order.id,
            event_id: eventId,
            category: "promio_safety_notice",
            message: `Promio order submission status: ${promioErr.message}`,
          });
          // Order payment is confirmed. Fulfillment is queued/pending admin review.
          order.fulfillment_status = "paid";
          order.notes = `Promio fulfillment pending activation: ${promioErr.message.substring(0, 200)}`;
        }
      } else {
        logWebhook("info", {
          op: "promio_line_items_check",
          order_id: order.id,
          event_id: eventId,
          category: "no_supplier_items",
          message: `No Promio line items present for order ${order.id}. Marked as paid.`,
        });
        order.fulfillment_status = "paid";
      }

      // Immediately persist order status & Printify ID
      await persistOrderRecord(order);

      // 4. Send customer & store owner confirmation emails
      // Note: Executed with bounded 7s timeout in orderEmail.ts.
      // Email failure or timeout MUST NEVER alter payment status or fail the webhook.
      try {
        await sendOrderConfirmationEmail(order);
      } catch (emailErr: any) {
        logWebhook("warn", {
          op: "email_dispatch",
          order_id: order.id,
          event_id: eventId,
          category: "email_failure",
          message: `Non-fatal email dispatch failure: ${emailErr.message}`,
        });
      }

      await markEventProcessed(eventId, eventType, "processed");
      return NextResponse.json({ received: true, order_id: order.id, payment_status: "paid" });
    } else if (eventType === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const orderId = intent.metadata?.order_id;
      if (orderId) {
        const order = await getOrderRecordById(orderId);
        if (order && order.payment_status !== "paid" && order.payment_status !== "refunded") {
          order.payment_status = "failed";
          await persistOrderRecord(order);
          logWebhook("info", {
            op: "payment_failed",
            order_id: orderId,
            event_id: eventId,
            payment_intent_id: intent.id,
            category: "payment_failure",
            message: `Order ${orderId} marked as payment_status=failed. ZERO Printify calls made.`,
          });
          try {
            await sendPaymentFailedEmail(order);
          } catch (emailErr: any) {
            logWebhook("warn", {
              op: "email_dispatch",
              order_id: orderId,
              event_id: eventId,
              category: "email_failure",
              message: `Payment failed email dispatch error: ${emailErr.message}`,
            });
          }
        }
      }
      await markEventProcessed(eventId, eventType, "processed");
      return NextResponse.json({ received: true, status: "payment_failed" });
    } else if (eventType === "charge.refunded") {
      const charge = event.data.object;
      const orderId = charge.metadata?.order_id || charge.metadata?.yupek_order_id;
      let order = orderId ? await getOrderRecordById(orderId) : null;
      if (!order && charge.payment_intent) {
        order = await getOrderRecordById(charge.payment_intent);
      }
      if (order && order.payment_status === "paid") {
        order.payment_status = "refunded";
        await persistOrderRecord(order);
        logWebhook("info", {
          op: "charge_refunded",
          order_id: order.id,
          event_id: eventId,
          category: "refund_processed",
          message: `Order ${order.id} marked as payment_status=refunded.`,
        });
        try {
          await sendRefundConfirmationEmail(order);
        } catch (emailErr: any) {
          logWebhook("warn", {
            op: "email_dispatch",
            order_id: order.id,
            event_id: eventId,
            category: "email_failure",
            message: `Refund email dispatch error: ${emailErr.message}`,
          });
        }
      }
      await markEventProcessed(eventId, eventType, "processed");
      return NextResponse.json({ received: true, status: "charge_refunded" });
    } else {
      logWebhook("info", {
        op: "unhandled_event",
        event_id: eventId,
        category: "event_ignored",
        message: `Event type ${eventType} ignored. Returning HTTP 200.`,
      });
      await markEventProcessed(eventId, eventType, "ignored");
      return NextResponse.json({ received: true, status: "unhandled_event" });
    }
  } catch (err: any) {
    logWebhook("error", {
      op: "webhook_execution",
      event_id: eventId,
      category: "internal_error",
      message: `Webhook handler caught error: ${err.message}`,
    });
    await markEventProcessed(eventId, eventType, "error", err.message);
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 500 });
  }
}
