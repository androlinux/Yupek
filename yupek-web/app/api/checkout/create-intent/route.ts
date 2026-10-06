import { NextRequest, NextResponse } from "next/server";
import { getCatalogProductsServer } from "@/lib/catalogServer";
import { getStripeServer } from "@/lib/stripeServer";
import { persistOrderRecord, getOrderRecordById, OrderRecord } from "@/lib/orderPersistence";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer, items, delivery } = body;

    if (!customer || !customer.email || !customer.firstName || !items || !items.length) {
      return NextResponse.json(
        { error: "Missing customer contact or items." },
        { status: 400 }
      );
    }

    // 1. Load authoritative product catalog
    const trustedCatalog = await getCatalogProductsServer();

    // 2. Authoritative price & variant calculation in integer cents
    let subtotalCents = 0;
    const validatedItems: OrderRecord["items"] = [];

    for (const rawItem of items) {
      const quantity = Math.max(1, Math.floor(Number(rawItem.qty || rawItem.quantity) || 1));

      // Match product strictly from trusted catalog
      const matchedProduct = trustedCatalog.find((p) => {
        if (rawItem.slug && p.slug === rawItem.slug) return true;
        if (rawItem.productId && p.id === rawItem.productId) return true;
        if (rawItem.supplierProductId && (p.supplierProductId === rawItem.supplierProductId || p.id === rawItem.supplierProductId)) return true;
        return false;
      });

      if (!matchedProduct) {
        return NextResponse.json(
          { error: `Product '${rawItem.title || rawItem.slug || "Unknown"}' is not found in the trusted catalog.` },
          { status: 400 }
        );
      }

      // Match variant
      let matchedVariant: any = null;
      if (rawItem.variant_id || rawItem.variantId || rawItem.printifyVariantId) {
        const targetVarId = String(rawItem.variant_id || rawItem.variantId || rawItem.printifyVariantId);
        matchedVariant = (matchedProduct.variants || []).find((v: any) => String(v.variant_id || v.id) === targetVarId);
      }

      if (!matchedVariant && rawItem.size && rawItem.color) {
        matchedVariant = (matchedProduct.variants || []).find((v: any) => {
          const optStr = JSON.stringify(v.options || {}).toLowerCase();
          return optStr.includes(rawItem.size.toLowerCase()) && optStr.includes(rawItem.color.toLowerCase());
        });
      }

      // Authoritative unit price in integer cents
      let unitPriceCents = 0;
      if (matchedVariant?.price_cents) {
        unitPriceCents = Math.round(Number(matchedVariant.price_cents));
      } else if (matchedVariant?.price !== undefined) {
        unitPriceCents = Math.round(Number(matchedVariant.price) * 100);
      } else if (matchedProduct.price !== undefined) {
        unitPriceCents = Math.round(Number(matchedProduct.price) * 100);
      } else {
        unitPriceCents = 2699; // Fallback
      }

      subtotalCents += unitPriceCents * quantity;

      validatedItems.push({
        product_id: matchedProduct.id,
        supplier_product_id: matchedProduct.supplierProductId || matchedProduct.id,
        slug: matchedProduct.slug,
        variant_id: matchedVariant?.variant_id || matchedVariant?.id || rawItem.variant_id || rawItem.printifyVariantId,
        color: rawItem.color || matchedVariant?.color || "Default",
        size: rawItem.size || matchedVariant?.size || "M",
        quantity,
        unit_price_cents: unitPriceCents,
        image: rawItem.image || matchedProduct.images?.[0] || "",
        title: matchedProduct.name,
      });
    }

    // Shipping in integer cents
    const isExpress = delivery === "express";
    let shippingCents = isExpress ? 995 : 495;
    if (!isExpress && subtotalCents >= 10000) {
      shippingCents = 0; // Free shipping over €100
    }

    const totalCents = subtotalCents + shippingCents;
    const vatCents = Math.round(totalCents - totalCents / 1.21);

    const bodyOrderId = body.order_id;
    let existingOrder: OrderRecord | null = null;
    let orderId = bodyOrderId;

    if (bodyOrderId) {
      existingOrder = await getOrderRecordById(bodyOrderId);
      if (existingOrder && existingOrder.payment_status === "paid") {
        return NextResponse.json(
          { error: "Payment for this order has already succeeded." },
          { status: 400 }
        );
      }
    }

    if (!existingOrder || !orderId) {
      orderId = `YPK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const nowIso = new Date().toISOString();

    // 3. Create or reuse Stripe PaymentIntent
    const stripe = getStripeServer();
    let clientSecret = "";
    let paymentIntentId = "";

    if (stripe) {
      if (existingOrder?.stripe_payment_intent_id) {
        try {
          const existingIntent = await stripe.paymentIntents.retrieve(
            existingOrder.stripe_payment_intent_id
          );
          if (
            ["requires_payment_method", "requires_confirmation", "requires_action"].includes(
              existingIntent.status
            )
          ) {
            // Reuse existing retryable PaymentIntent
            clientSecret = existingIntent.client_secret || "";
            paymentIntentId = existingIntent.id;
          }
        } catch (e: any) {
          console.warn("[Stripe Intent Reuse Notice]", e.message);
        }
      }

      if (!clientSecret) {
        const intent = await stripe.paymentIntents.create(
          {
            amount: totalCents,
            currency: "eur",
            automatic_payment_methods: { enabled: true },
            receipt_email: customer.email,
            metadata: {
              order_id: orderId,
              yupek_order_id: orderId,
            },
          },
          {
            idempotencyKey: `intent-${orderId}`,
          }
        );

        clientSecret = intent.client_secret || "";
        paymentIntentId = intent.id;
      }
    } else {
      console.warn("[Stripe Warning] STRIPE_SECRET_KEY not set. Using test mock intent for development.");
      paymentIntentId = existingOrder?.stripe_payment_intent_id || `pi_test_${Date.now()}`;
      clientSecret = `${paymentIntentId}_secret_test`;
    }

    // 4. Save or update order in Supabase before payment
    const orderRecord: OrderRecord = {
      id: orderId,
      customer_email: customer.email,
      customer_name: `${customer.firstName} ${customer.lastName}`.trim(),
      shipping_address: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone || "",
        street: customer.street || "",
        address2: customer.address2 || "",
        city: customer.city || "",
        postalCode: customer.postalCode || "",
        country: customer.country || "Netherlands",
        region: customer.region || "",
      },
      currency: "EUR",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      vat_cents: vatCents,
      total_cents: totalCents,
      payment_status: "pending",
      fulfillment_status: "pending_payment",
      stripe_payment_intent_id: paymentIntentId,
      printify_order_id: existingOrder?.printify_order_id || null,
      items: validatedItems,
      user_id: body.user_id || existingOrder?.user_id || null,
      created_at: existingOrder?.created_at || nowIso,
      updated_at: nowIso,
    };

    await persistOrderRecord(orderRecord);

    return NextResponse.json({
      order_id: orderId,
      client_secret: clientSecret,
      payment_intent_id: paymentIntentId,
      currency: "EUR",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      vat_cents: vatCents,
      total_cents: totalCents,
    });
  } catch (err: any) {
    console.error("[Create Intent Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
