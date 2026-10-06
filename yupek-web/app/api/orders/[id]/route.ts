import { NextRequest, NextResponse } from "next/server";
import { getOrderRecordById } from "@/lib/orderPersistence";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
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

  return NextResponse.json({
    order_id: order.id,
    customer_email: order.customer_email,
    customer_name: order.customer_name,
    currency: order.currency || "EUR",
    total_cents: order.total_cents,
    subtotal_cents: order.subtotal_cents,
    shipping_cents: order.shipping_cents,
    vat_cents: order.vat_cents,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    stripe_payment_intent_id: order.stripe_payment_intent_id,
    printify_order_id: order.printify_order_id,
    items: order.items,
    created_at: order.created_at,
    updated_at: order.updated_at,
  });
}
