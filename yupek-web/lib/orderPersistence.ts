import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { promises as fs } from "fs";
import path from "path";

export interface OrderRecord {
  id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    street: string;
    address2?: string;
    city: string;
    postalCode: string;
    country: string;
    region?: string;
  };
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  vat_cents: number;
  total_cents: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  fulfillment_status:
    | "pending_payment"
    | "paid"
    | "printify_order_created"
    | "sent_to_production"
    | "in_production"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "failed";
  stripe_payment_intent_id?: string | null;
  printify_order_id?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  confirmation_email_sent?: boolean;
  shipped_email_sent?: boolean;
  delivered_email_sent?: boolean;
  failed_email_sent?: boolean;
  refund_email_sent?: boolean;
  items: Array<{
    product_id?: string;
    supplier_product_id?: string;
    slug?: string;
    variant_id?: string | number;
    color?: string;
    size?: string;
    quantity: number;
    unit_price_cents: number;
    image?: string;
    title?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  user_id?: string | null;
}

const inMemoryOrders = new Map<string, OrderRecord>();

/**
 * Dual-persistence saving:
 * Writes to in-memory cache, Supabase 'orders' table (if available)
 * and 'site_config.storeOrders' JSONB array to ensure zero-downtime compatibility.
 */
export async function persistOrderRecord(order: OrderRecord): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  order.updated_at = now;
  if (!order.created_at) {
    order.created_at = now;
  }
  inMemoryOrders.set(order.id, JSON.parse(JSON.stringify(order)));

  // 1. Attempt write to Supabase dedicated 'orders' table
  try {
    const { error } = await supabase.from("orders").upsert({
      id: order.id,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      shipping_address: order.shipping_address,
      currency: order.currency || "EUR",
      subtotal_cents: order.subtotal_cents,
      shipping_cents: order.shipping_cents,
      vat_cents: order.vat_cents,
      total_cents: order.total_cents,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      stripe_payment_intent_id: order.stripe_payment_intent_id || null,
      printify_order_id: order.printify_order_id || null,
      tracking_number: order.tracking_number ?? null,
      carrier: order.carrier ?? null,
      tracking_url: order.tracking_url ?? null,
      shipped_at: order.shipped_at ?? null,
      delivered_at: order.delivered_at ?? null,
      shipped_email_sent: Boolean(order.shipped_email_sent),
      items: order.items,
      notes: order.notes || null,
      user_id: order.user_id || null,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
    if (error) {
      // Table may not have been migrated yet in PostgREST schema cache
      console.warn("[Orders Table Notice]", error.message);
    }
  } catch (err: any) {
    console.warn("[Orders Table Catch]", err.message);
  }

  // 2. Persist to site_config.storeOrders
  try {
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "global")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const cfg = data.value as any;
      const existing: any[] = Array.isArray(cfg.storeOrders) ? cfg.storeOrders : [];

      // Map to StoreOrder format for admin compatibility
      const storeOrderFormat = {
        id: order.id,
        orderNumber: order.id,
        userId: order.user_id || null,
        createdAt: order.created_at,
        customer: {
          firstName: order.shipping_address.first_name,
          lastName: order.shipping_address.last_name,
          email: order.customer_email,
          phone: order.shipping_address.phone,
          street: order.shipping_address.street,
          city: order.shipping_address.city,
          postalCode: order.shipping_address.postalCode,
          country: order.shipping_address.country,
        },
        items: order.items.map((i) => ({
          slug: i.slug || "",
          name: i.title || "Garment",
          size: i.size || "M",
          color: i.color || "Default",
          qty: i.quantity,
          price: i.unit_price_cents / 100,
          image: i.image || "",
          productId: i.product_id,
          supplierProductId: i.supplier_product_id,
          variantId: i.variant_id,
        })),
        subtotal: order.subtotal_cents / 100,
        shipping: order.shipping_cents / 100,
        total: order.total_cents / 100,
        currency: order.currency,
        status: order.payment_status === "paid" ? "Paid" : order.payment_status === "failed" ? "Failed" : "Pending",
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        printify_order_id: order.printify_order_id,
        tracking_number: order.tracking_number ?? null,
        carrier: order.carrier ?? null,
        tracking_url: order.tracking_url ?? null,
        shipped_at: order.shipped_at ?? null,
        delivered_at: order.delivered_at ?? null,
        shipped_email_sent: Boolean(order.shipped_email_sent),
      };

      const updated = [
        storeOrderFormat,
        ...existing.filter((o: any) => o.id !== order.id && o.orderNumber !== order.id),
      ];

      await supabase.from("site_config").upsert({
        key: "global",
        value: {
          ...cfg,
          storeOrders: updated,
        },
        updated_at: now,
      });
    }
  } catch (err: any) {
    console.error("[site_config Orders Save Error]", err.message);
  }
}

/**
 * Retrieve order record by ID (from orders table or site_config.storeOrders fallback).
 */
export async function getOrderRecordById(orderId: string): Promise<OrderRecord | null> {
  if (inMemoryOrders.has(orderId)) {
    return inMemoryOrders.get(orderId)!;
  }

  const supabase = getSupabaseServerClient();

  // Try orders table
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (data && !error) {
      return data as OrderRecord;
    }
  } catch {
    // Ignore and fallback
  }

  // Fallback to site_config
  try {
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "global")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const cfg = data.value as any;
      const existing: any[] = Array.isArray(cfg.storeOrders) ? cfg.storeOrders : [];
      const match = existing.find((o: any) => o.id === orderId || o.orderNumber === orderId);
      if (match) {
        return {
          id: match.id || match.orderNumber,
          customer_email: match.customer?.email || "",
          customer_name: `${match.customer?.firstName || ""} ${match.customer?.lastName || ""}`.trim(),
          shipping_address: {
            first_name: match.customer?.firstName || "",
            last_name: match.customer?.lastName || "",
            email: match.customer?.email || "",
            phone: match.customer?.phone || "",
            street: match.customer?.street || "",
            city: match.customer?.city || "",
            postalCode: match.customer?.postalCode || "",
            country: match.customer?.country || "Netherlands",
          },
          currency: match.currency || "EUR",
          subtotal_cents: Math.round((match.subtotal || 0) * 100),
          shipping_cents: Math.round((match.shipping || 0) * 100),
          vat_cents: Math.round(((match.total || 0) - (match.total || 0) / 1.21) * 100),
          total_cents: Math.round((match.total || 0) * 100),
          payment_status: match.payment_status || (match.status === "Paid" ? "paid" : "pending"),
          fulfillment_status: match.fulfillment_status || "pending_payment",
          stripe_payment_intent_id: match.stripe_payment_intent_id || null,
          printify_order_id: match.printify_order_id || null,
          tracking_number: match.tracking_number ?? null,
          carrier: match.carrier ?? null,
          tracking_url: match.tracking_url ?? null,
          shipped_at: match.shipped_at ?? null,
          delivered_at: match.delivered_at ?? null,
          shipped_email_sent: Boolean(match.shipped_email_sent),
          items: (match.items || []).map((i: any) => ({
            product_id: i.productId,
            supplier_product_id: i.supplierProductId,
            slug: i.slug,
            variant_id: i.variantId,
            color: i.color,
            size: i.size,
            quantity: i.qty || 1,
            unit_price_cents: Math.round((i.price || 0) * 100),
            image: i.image,
            title: i.name,
          })),
          user_id: match.userId || null,
          created_at: match.createdAt,
        };
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Retrieve all orders belonging to a specific customer user_id (with email and in-memory fallback).
 */
export async function getUserOrders(userId: string, customerEmail?: string): Promise<OrderRecord[]> {
  const supabase = getSupabaseServerClient();
  const results: OrderRecord[] = [];
  const seenIds = new Set<string>();

  // 1. Check orders table by user_id
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data && !error && Array.isArray(data)) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          results.push(row as OrderRecord);
          seenIds.add(row.id);
        }
      }
    }
  } catch {
    // Ignore
  }

  // 2. Fallback or augment with site_config.storeOrders
  try {
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "global")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const cfg = data.value as any;
      const storeOrders: any[] = Array.isArray(cfg.storeOrders) ? cfg.storeOrders : [];
      const normalizedEmail = (customerEmail || "").trim().toLowerCase();

      for (const match of storeOrders) {
        const orderId = match.id || match.orderNumber;
        if (seenIds.has(orderId)) continue;

        const isUserMatch = match.userId && match.userId === userId;
        const isEmailMatch = normalizedEmail && match.customer?.email?.trim().toLowerCase() === normalizedEmail;

        if (isUserMatch || isEmailMatch) {
          seenIds.add(orderId);
          results.push({
            id: orderId,
            customer_email: match.customer?.email || "",
            customer_name: `${match.customer?.firstName || ""} ${match.customer?.lastName || ""}`.trim(),
            shipping_address: {
              first_name: match.customer?.firstName || "",
              last_name: match.customer?.lastName || "",
              email: match.customer?.email || "",
              phone: match.customer?.phone || "",
              street: match.customer?.street || "",
              city: match.customer?.city || "",
              postalCode: match.customer?.postalCode || "",
              country: match.customer?.country || "Netherlands",
            },
            currency: match.currency || "EUR",
            subtotal_cents: Math.round((match.subtotal || 0) * 100),
            shipping_cents: Math.round((match.shipping || 0) * 100),
            vat_cents: Math.round(((match.total || 0) - (match.total || 0) / 1.21) * 100),
            total_cents: Math.round((match.total || 0) * 100),
            payment_status: match.payment_status || (match.status === "Paid" ? "paid" : "pending"),
            fulfillment_status: match.fulfillment_status || "pending_payment",
            stripe_payment_intent_id: match.stripe_payment_intent_id || null,
            printify_order_id: match.printify_order_id || null,
            tracking_number: match.tracking_number ?? null,
            carrier: match.carrier ?? null,
            tracking_url: match.tracking_url ?? null,
            shipped_at: match.shipped_at ?? null,
            delivered_at: match.delivered_at ?? null,
            shipped_email_sent: Boolean(match.shipped_email_sent),
            items: (match.items || []).map((i: any) => ({
              product_id: i.productId,
              supplier_product_id: i.supplierProductId,
              slug: i.slug,
              variant_id: i.variantId,
              color: i.color,
              size: i.size,
              quantity: i.qty || 1,
              unit_price_cents: Math.round((i.price || 0) * 100),
              image: i.image,
              title: i.name,
            })),
            user_id: match.userId || userId,
            created_at: match.createdAt,
          });
        }
      }
    }
  } catch {
    // Ignore
  }

  // 3. In-memory check
  for (const [id, order] of inMemoryOrders.entries()) {
    if (!seenIds.has(id)) {
      if (order.user_id === userId || (customerEmail && order.customer_email.toLowerCase() === customerEmail.toLowerCase())) {
        seenIds.add(id);
        results.push(order);
      }
    }
  }

  // Sort by date descending
  return results.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

/**
 * Permanently deletes an order record by ID:
 * 1. Removes from inMemoryOrders cache.
 * 2. Deletes from Supabase dedicated 'orders' table (and related 'order_items' if any).
 * 3. Removes from Supabase 'site_config.storeOrders' array.
 * 4. Removes from local development mirror 'data/site-config.json' if not in production.
 *
 * SAFETY GUARANTEES:
 * - Strictly deletes LOCAL database records.
 * - NEVER calls Stripe or creates refunds.
 * - NEVER calls Printify or cancels supplier orders.
 * - NEVER modifies customer profiles or product catalog.
 */
export async function deleteOrderRecord(orderId: string): Promise<{ success: boolean; error?: string }> {
  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    return { success: false, error: "A valid order ID is required" };
  }
  const cleanId = orderId.trim();

  // 1. Remove from in-memory cache
  inMemoryOrders.delete(cleanId);

  const supabase = getSupabaseServerClient();

  // 2. Safely delete from Supabase 'orders' and related 'order_items' tables
  try {
    // Delete any dependent order items first if table exists (cascade safety)
    try {
      await supabase.from("order_items").delete().eq("order_id", cleanId);
    } catch {
      // Table may not exist or not have FK
    }

    const { error: orderDeleteErr } = await supabase
      .from("orders")
      .delete()
      .or(`id.eq.${cleanId},stripe_payment_intent_id.eq.${cleanId}`);

    if (orderDeleteErr) {
      console.warn("[Orders Table Delete Notice]", orderDeleteErr.message);
    }
  } catch (err: any) {
    console.warn("[Orders Table Delete Catch]", err.message);
  }

  // 3. Remove from site_config.storeOrders
  try {
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "global")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const cfg = data.value as any;
      const existing: any[] = Array.isArray(cfg.storeOrders) ? cfg.storeOrders : [];
      const updated = existing.filter(
        (o: any) => o.id !== cleanId && o.orderNumber !== cleanId
      );

      await supabase.from("site_config").upsert({
        key: "global",
        value: {
          ...cfg,
          storeOrders: updated,
        },
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error("[site_config Orders Delete Error]", err.message);
  }

  // 4. Disk mirror for local development
  const isServerlessOrProd =
    Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

  if (!isServerlessOrProd) {
    try {
      const configPath = path.join(process.cwd(), "data", "site-config.json");
      const raw = await fs.readFile(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      const orders = Array.isArray(parsed.storeOrders) ? parsed.storeOrders : [];
      parsed.storeOrders = orders.filter(
        (o: any) => o.id !== cleanId && o.orderNumber !== cleanId
      );
      await fs.writeFile(configPath, JSON.stringify(parsed, null, 2), "utf-8");
    } catch (saveErr) {
      console.warn("[Orders delete from disk warning]", saveErr);
    }
  }

  return { success: true };
}

