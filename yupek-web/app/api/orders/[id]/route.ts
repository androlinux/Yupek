import { NextRequest, NextResponse } from "next/server";
import { getOrderRecordById, deleteOrderRecord } from "@/lib/orderPersistence";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import { verifyAdminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  const order = await getOrderRecordById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check server-verified admin authorization
  const authResult = await verifyAdminAuth(req);
  const isAdmin = authResult.authorized;

  // Strictly validate tracking URL (must be valid http/https)
  const rawTrackingUrl = order.tracking_url;
  const trackingUrl =
    typeof rawTrackingUrl === "string" && /^https?:\/\//i.test(rawTrackingUrl.trim())
      ? rawTrackingUrl.trim()
      : null;

  const baseResponse: Record<string, any> = {
    order_id: order.id,
    id: order.id,
    customer_email: order.customer_email,
    customer_name: order.customer_name,
    currency: order.currency || "EUR",
    total_cents: order.total_cents,
    subtotal_cents: order.subtotal_cents,
    shipping_cents: order.shipping_cents,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    carrier: order.carrier || null,
    tracking_number: order.tracking_number || null,
    tracking_url: trackingUrl,
    shipped_at: order.shipped_at || null,
    delivered_at: order.delivered_at || null,
    items: order.items,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };

  if (isAdmin) {
    baseResponse.vat_cents = order.vat_cents;
    baseResponse.stripe_payment_intent_id = order.stripe_payment_intent_id;
    baseResponse.printify_order_id = order.printify_order_id;
  }

  return NextResponse.json(baseResponse);
}

/**
 * DELETE /api/orders/[id]
 *
 * Permanently removes a single order record from the local database.
 *
 * SAFETY REQUIREMENTS & GUARANTEES:
 * - Requires a single, specific, non-empty order ID in the URL route.
 * - Rejects any attempt at wildcard or bulk deletion.
 * - Strictly enforces server-side verified Admin authorization.
 * - NEVER contacts Stripe (no refund, no payment intent cancel).
 * - NEVER contacts Printify (no order cancellation, no API calls).
 * - NEVER alters customer accounts or product catalogs.
 * - Safely removes local order references from orders table and site_config storeOrders.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rawId = params?.id;
  const orderId = typeof rawId === "string" ? rawId.trim() : "";

  // 1. Validate Single Specific Order ID (Prevent any bulk or accidental deletion)
  if (!orderId || orderId === "all" || orderId === "*" || orderId.length < 3) {
    return NextResponse.json(
      { error: "Invalid request: A specific valid order ID is required. Bulk deletion is strictly prohibited." },
      { status: 400 }
    );
  }

  // 2. Authorization: Only verified Admin users can delete orders
  const authResult = await verifyAdminAuth(req);
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.errorMessage || "Unauthorized: Administrator authentication required to delete orders." },
      { status: authResult.errorStatus || 401 }
    );
  }

  // 3. Verify order exists before deletion
  const existing = await getOrderRecordById(orderId);
  if (!existing) {
    const { config } = await getOrMigrateSiteConfig();
    const storeOrders: any[] = Array.isArray(config.storeOrders) ? config.storeOrders : [];
    const foundInConfig = storeOrders.some(
      (o: any) => o.id === orderId || o.orderNumber === orderId
    );
    if (!foundInConfig) {
      return NextResponse.json(
        { error: `Order '${orderId}' not found.` },
        { status: 404 }
      );
    }
  }

  // 4. Safely delete local order record
  const result = await deleteOrderRecord(orderId);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to delete order" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deleted_id: orderId,
    message: `Order #${orderId} permanently removed from local store database.`,
  });
}
