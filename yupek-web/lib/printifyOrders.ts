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
  const shopId = (process.env.PRINTIFY_SHOP_ID || "29215191").trim();

  // Safety: NEVER send orders to Etsy Shop 29193770 or unexpected shops
  if (shopId !== "29215191") {
    throw new Error(`[Security Alert] Invalid Printify Shop ID: ${shopId}. Only YUPEK Shop 29215191 is authorized.`);
  }

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

  let res: Response;
  try {
    res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Yupek/1.0 (https://www.yupek.shop; orders@yupek.shop)",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === "AbortError") {
      throw new Error("Printify API request timed out after 10s. Order kept safe as paid.");
    }
    throw new Error(`Printify API network error: ${fetchErr.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    // Sanitize response to prevent any credential reflection
    const sanitizedMsg = errorText.substring(0, 300).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "[REDACTED]");
    throw new Error(`Printify API Error (HTTP ${res.status}): ${sanitizedMsg}`);
  }

  const data = await res.json();
  return {
    id: String(data.id),
    status: data.status || "created",
    raw: data,
  };
}
