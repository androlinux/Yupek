import { NextRequest, NextResponse } from "next/server";
import { getOrderRecordById, persistOrderRecord } from "@/lib/orderPersistence";
import { createPromioOrder } from "@/lib/promioOrders";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Process-level in-flight lock to prevent concurrent double-click retries
const activeRetryingOrderIds = new Set<string>();

/**
 * POST /api/orders/[id]/promio/retry
 *
 * Secure Administrator Endpoint for Promio Fulfillment Retry
 *
 * SAFETY RULES:
 * 1. Admin authorization strictly enforced (401 on failure).
 * 2. Only ONE specific order per request (no wildcard or bulk retries).
 * 3. Payment status must be "paid".
 * 4. promio_order_id MUST be null to prevent duplicate supplier orders.
 * 5. Respects PROMIO_SUBMIT_ORDERS_ENABLED safety lock.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rawId = params?.id;
  const orderId = typeof rawId === "string" ? rawId.trim() : "";

  // 1. Validate Order ID
  if (!orderId || orderId === "all" || orderId === "*" || orderId.length < 3) {
    return NextResponse.json(
      { error: "Invalid request: A specific valid order ID is required." },
      { status: 400 }
    );
  }

  // 2. Enforce Admin Authorization
  const authResult = await verifyAdminAuth(req);
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.errorMessage || "Unauthorized: Administrator authorization required." },
      { status: authResult.errorStatus || 401 }
    );
  }

  // 3. Concurrency guard against rapid double clicks
  if (activeRetryingOrderIds.has(orderId)) {
    return NextResponse.json(
      { error: "Promio fulfillment retry is already in progress for this order." },
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

    // 6. Verify promio_order_id is NULL (Idempotency guarantee)
    if (order.promio_order_id) {
      return NextResponse.json(
        {
          error: `Promio order already exists for order ${orderId}: #${order.promio_order_id}.`,
          promio_order_id: order.promio_order_id,
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
    const lineItems = (order.items || [])
      .filter((i) => i.variant_id || (i as any).supplier_variant_uid)
      .map((i) => ({
        variant_uid: String(i.variant_id || (i as any).supplier_variant_uid || ""),
        sku: String((i as any).sku || (i as any).variant_id || ""),
        quantity: Math.max(1, i.quantity || 1),
      }));

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: `Order ${orderId} does not contain any valid Promio items to fulfill.` },
        { status: 400 }
      );
    }

    // 9. Execute Promio Submission or Safe Staging
    const isLiveSubmitEnabled = process.env.PROMIO_SUBMIT_ORDERS_ENABLED === "true";

    if (!isLiveSubmitEnabled) {
      // Safe Mode: Generate simulated internal staging ID, update fulfillment status safely
      const stagedId = `promio-staged-${order.id.slice(-6)}`;
      order.promio_order_id = stagedId;
      order.fulfillment_status = "promio_order_created";
      await persistOrderRecord(order);

      return NextResponse.json({
        success: true,
        promio_order_id: stagedId,
        fulfillment_status: "promio_order_created",
        message:
          "[Promio Safe Mode] Order verified and staged for Promio fulfillment. Real order submission is locked (PROMIO_SUBMIT_ORDERS_ENABLED=false).",
      });
    }

    // Live Mode: Submit to Promio Brick API
    const promioRes = await createPromioOrder({
      client_order_id: order.id,
      line_items: lineItems,
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
    await persistOrderRecord(order);

    return NextResponse.json({
      success: true,
      promio_order_id: promioRes.id,
      fulfillment_status: "promio_order_created",
      message: `Promio order #${promioRes.id} successfully created.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retry Promio fulfillment." },
      { status: 500 }
    );
  } finally {
    activeRetryingOrderIds.delete(orderId);
  }
}
