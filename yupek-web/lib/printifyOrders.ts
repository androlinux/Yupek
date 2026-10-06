/**
 * Printify Orders API Client for YUPEK.
 *
 * Dedicated server-side helper to create orders on Printify Shop 29215191.
 * NEVER sends YUPEK retail prices as Printify production costs.
 * Printify calculates its own fulfillment costs.
 */

export interface PrintifyLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
}

export interface PrintifyShippingAddress {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  country: string;
  region?: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
}

export interface CreatePrintifyOrderParams {
  external_id: string;
  line_items: PrintifyLineItem[];
  shipping_address: PrintifyShippingAddress;
  shipping_method?: number;
}

export async function createPrintifyOrder(params: CreatePrintifyOrderParams): Promise<{ id: string; status: string; raw: any }> {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID || "29215191";

  if (!token) {
    throw new Error("PRINTIFY_API_TOKEN is not configured.");
  }

  const payload = {
    external_id: params.external_id,
    label: params.external_id,
    line_items: params.line_items.map((item) => ({
      product_id: String(item.product_id),
      variant_id: Number(item.variant_id),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    })),
    shipping_method: params.shipping_method ?? 1,
    send_shipping_notification: false,
    address_to: {
      first_name: params.shipping_address.first_name,
      last_name: params.shipping_address.last_name,
      email: params.shipping_address.email || "",
      phone: params.shipping_address.phone || "",
      country: params.shipping_address.country || "Netherlands",
      region: params.shipping_address.region || "",
      address1: params.shipping_address.address1,
      address2: params.shipping_address.address2 || "",
      city: params.shipping_address.city,
      zip: params.shipping_address.zip,
    },
  };

  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Yupek/1.0 (https://www.yupek.shop; orders@yupek.shop)",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Printify API Error (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    id: String(data.id),
    status: data.status || "created",
    raw: data,
  };
}
