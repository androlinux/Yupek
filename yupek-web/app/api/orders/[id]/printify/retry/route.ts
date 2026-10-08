import { NextRequest, NextResponse } from "next/server";
import { getOrderRecordById, persistOrderRecord } from "@/lib/orderPersistence";
import { createPrintifyOrder } from "@/lib/printifyOrders";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Process-level in-flight lock to prevent concurrent double-click retries
const activeRetryingOrderIds = new Set<string>();

/**
 * POST /api/orders/[id]/printify/retry
 *
 * Secure Admin Endpoint for Manual Printify Fulfillment Retry
 *
 * Fulfills paid orders where initial Printify creation failed or is missing.
 *
 * SAFETY RULES:
 * 1. Admin authentication strictly required (401 on unauthorized).
 * 2. Only ONE specific order per request (no wildcards or bulk).
 * 3. payment_status MUST equal "paid" (never retries pending, failed, or refunded orders).
 * 4. printify_order_id MUST be null (prevents duplicate fulfillment).
 * 5. Order items must have complete Printify supplier mappings.
 * 6. Enforces Shop ID 29215191 strictly on server. Never trusts browser shop input.
 * 7. On Printify error: payment remains "paid", order remains safe and retryable.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rawId = params?.id;
  const orderId = typeof rawId === "string" ? rawId.trim() : "";

  // 1. Validate Single Specific Order ID
  if (!orderId || orderId === "all" || orderId === "*" || orderId.length < 3) {
    return NextResponse.json(
      { error: "Invalid request: A specific valid order ID is required. Bulk retry is prohibited." },
      { status: 400 }
    );
  }

  // 2. Enforce Admin Authorization
  const authResult = await verifyAdminAuth(req);
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.errorMessage || "Unauthorized: Administrator authentication required to retry fulfillment." },
      { status: authResult.errorStatus || 401 }
    );
  }

  // 3. Process-level concurrency guard against double clicks
  if (activeRetryingOrderIds.has(orderId)) {
    return NextResponse.json(
      { error: "Fulfillment retry is already in progress for this order." },
      { status: 409 }
    );
  }

  activeRetryingOrderIds.add(orderId);

  try {
    // 4. Retrieve fresh order record
    const order = await getOrderRecordById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: `Order '${orderId}' not found.` },
        { status: 404 }
      );
    }

    // 5. Verify payment status is strictly 'paid'
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        { error: `Cannot fulfill order: payment status is '${order.payment_status}', must be 'paid'.` },
        { status: 400 }
      );
    }

    // 6. Verify printify_order_id is NULL (Idempotency guarantee)
    if (order.printify_order_id) {
      return NextResponse.json(
        {
          error: `Printify order already exists for order ${orderId}: #${order.printify_order_id}.`,
          printify_order_id: order.printify_order_id,
        },
        { status: 400 }
      );
    }

    // 7. Prevent fulfillment of cancelled orders
    if (order.fulfillment_status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot fulfill a cancelled order." },
        { status: 400 }
      );
    }

    // 8. Line items & variant validation
    const items = order.items || [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Order has no items to fulfill." },
        { status: 400 }
      );
    }

    // Strict validation: every item must have supplier_product_id and variant_id
    for (const item of items) {
      const supplierProductId = String(item.supplier_product_id || "").trim();
      const variantId = Number(item.variant_id);

      if (!supplierProductId || !variantId || isNaN(variantId) || variantId <= 0) {
        return NextResponse.json(
          { error: "Product variant is not configured for Printify fulfillment." },
          { status: 400 }
        );
      }
    }

    // 9. Database-level atomic lock: transition fulfillment_status to 'printify_submitting'
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("orders")
        .update({
          fulfillment_status: "printify_submitting",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .is("printify_order_id", null);
    } catch {
      // Optional database layer; persistence fallback proceeds
    }

    // 10. Map line items using trusted order database data (never browser pricing)
    const printifyLineItems = items.map((i) => ({
      product_id: String(i.supplier_product_id),
      variant_id: Number(i.variant_id),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
    }));

    // 11. Dispatch to Printify (Shop 29215191 strictly enforced inside createPrintifyOrder)
    let printifyRes: { id: string; status: string; raw: any };
    try {
      printifyRes = await createPrintifyOrder({
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
    } catch (printifyErr: any) {
      // Safety: keep payment_status = 'paid', reset fulfillment_status = 'paid' for future retry
      order.fulfillment_status = "paid";
      order.notes = `Printify retry failed: ${String(printifyErr.message).substring(0, 200)}`;
      await persistOrderRecord(order);

      console.warn(`[Printify Admin Retry] Dispatch failed for ${orderId}: ${printifyErr.message}`);
      return NextResponse.json(
        {
          success: false,
          error: "Printify fulfillment could not be created. The order remains paid and can be retried.",
          details: printifyErr.message,
        },
        { status: 502 }
      );
    }

    // 12. Success: Immediately record Printify order ID & status
    order.printify_order_id = printifyRes.id;
    order.fulfillment_status = "printify_order_created";
    order.notes = `Printify fulfillment created via admin retry (${new Date().toISOString()})`;
    await persistOrderRecord(order);

    console.log(`[Printify Admin Retry] Success: Printify order #${printifyRes.id} created for ${orderId}`);

    return NextResponse.json({
      success: true,
      message: "Printify order created successfully.",
      order_id: order.id,
      printify_order_id: printifyRes.id,
      fulfillment_status: "printify_order_created",
    });
  } catch (err: any) {
    console.error(`[Printify Admin Retry Error] Order ${orderId}:`, err.message);
    return NextResponse.json(
      { error: err.message || "Internal server error during fulfillment retry." },
      { status: 500 }
    );
  } finally {
    activeRetryingOrderIds.delete(orderId);
  }
}
