/**
 * Promio Brick API 1.0 Orders Client for YUPEK Storefront.
 *
 * Dedicated server-side helper for Promio fulfillment (Breda, NL).
 *
 * SAFETY RULES:
 * - Order submission is strictly DISABLED by default (PROMIO_SUBMIT_ORDERS_ENABLED !== "true").
 * - Live orders or print jobs will NEVER be sent without explicit approval.
 * - Credentials and signatures are never exposed in logs or customer-facing responses.
 */

import crypto from "crypto";

export interface PromioLineItem {
  variant_uid: string;
  sku: string;
  quantity: number;
}

export interface PromioShippingAddress {
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

export interface CreatePromioOrderParams {
  client_order_id: string;
  line_items: PromioLineItem[];
  shipping_address: PromioShippingAddress;
}

export function generatePromioSignature(params: Record<string, string>, secretKey: string): string {
  if (!secretKey) {
    throw new Error("Cannot generate Promio signature without Secret Key.");
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key.toLowerCase() !== "signature") {
      searchParams.append(key, value);
    }
  }

  const toSign = `${searchParams.toString()}${secretKey}`;
  return crypto.createHash("sha1").update(toSign, "utf8").digest("hex");
}

export function buildPromioOrderPayload(params: CreatePromioOrderParams): Record<string, any> {
  if (!params.client_order_id) {
    throw new Error("client_order_id is required for Promio order creation.");
  }
  if (!params.line_items || params.line_items.length === 0) {
    throw new Error("At least one line item is required for Promio order creation.");
  }

  return {
    client_order_id: params.client_order_id,
    shipping_address: {
      first_name: params.shipping_address.first_name,
      last_name: params.shipping_address.last_name,
      email: params.shipping_address.email || "",
      phone: params.shipping_address.phone || "",
      country: params.shipping_address.country || "NL",
      region: params.shipping_address.region || "",
      address1: params.shipping_address.address1,
      address2: params.shipping_address.address2 || "",
      city: params.shipping_address.city,
      zip: params.shipping_address.zip,
    },
    items: params.line_items.map((item) => ({
      variant_uid: String(item.variant_uid),
      sku: String(item.sku),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    })),
  };
}

export async function createPromioOrder(params: CreatePromioOrderParams): Promise<{ id: string; status: string; raw: any }> {
  const isSubmitEnabled = process.env.PROMIO_SUBMIT_ORDERS_ENABLED === "true";
  if (!isSubmitEnabled) {
    throw new Error(
      "[Promio Safety Lock] Promio live order submission is strictly disabled (PROMIO_SUBMIT_ORDERS_ENABLED=false). Order kept safe as paid."
    );
  }

  const appId = (process.env.PROMIO_APP_ID || "").trim();
  const secretKey = (process.env.PROMIO_SECRET_KEY || "").trim();
  const baseUrl = (process.env.PROMIO_BASE_URL || "https://promio.pro/api").replace(/\/$/, "");

  if (!appId || !secretKey) {
    throw new Error("Promio API credentials are not configured (PROMIO_APP_ID or PROMIO_SECRET_KEY missing).");
  }

  const payload = buildPromioOrderPayload(params);
  const queryParams: Record<string, string> = { AppId: appId };
  const signature = generatePromioSignature(queryParams, secretKey);
  queryParams.Signature = signature;

  const url = `${baseUrl}/orders.php?${new URLSearchParams(queryParams).toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Yupek/1.0 (https://www.yupek.shop; orders@yupek.shop)",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Promio API request timed out after 15s. Order kept safe as paid.");
    }
    throw new Error(`Promio API network error: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const sanitizedMsg = errorText.substring(0, 300).replace(/[A-Za-z0-9+/=]{30,}/g, "[REDACTED]");
    throw new Error(`Promio API Error (HTTP ${res.status}): ${sanitizedMsg}`);
  }

  const data = await res.json();
  const createdId = String(data.id || data.order_id || "");
  if (!createdId) {
    throw new Error("Promio API response missing order ID.");
  }

  return {
    id: createdId,
    status: data.status || "processing",
    raw: data,
  };
}
