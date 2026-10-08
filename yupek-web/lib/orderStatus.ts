/**
 * Centralized Customer-Facing Order & Payment Status Mapping for YUPEK.
 *
 * CRITICAL RULES:
 * - Internal state names (printify_order_created, sent_to_production, etc.) are NEVER exposed to normal customers.
 * - Technical terms (Printify, Stripe, PaymentIntent, webhook, fulfillment_status, Printify order ID) are strictly hidden.
 * - Customer-facing statuses are clear, elegant, and bilingual (EN / NL).
 * - Timestamps are only displayed when authentically available in the database; no fake dates are invented.
 * - Timeline never shows "Delivered" unless fulfillment_status === "delivered".
 */

export type InternalFulfillmentStatus =
  | "pending_payment"
  | "paid"
  | "printify_order_created"
  | "sent_to_production"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "failed"
  | string;

export type InternalPaymentStatus = "pending" | "paid" | "failed" | "refunded" | string;

export interface CustomerStatusInfo {
  label: string;
  badgeClass: string;
  description: string;
}

/**
 * Map internal fulfillment_status to human-readable customer label.
 */
export function mapFulfillmentStatus(status: InternalFulfillmentStatus, locale: string = "en"): string {
  const isNl = locale === "nl";
  switch (status) {
    case "pending_payment":
      return isNl ? "Bestelling ontvangen" : "Order received";
    case "paid":
    case "printify_order_created":
    case "sent_to_production":
      return isNl ? "Bestelling in voorbereiding" : "Preparing your order";
    case "in_production":
      return isNl ? "In productie" : "In production";
    case "shipped":
      return isNl ? "Verzonden" : "Shipped";
    case "out_for_delivery":
      return isNl ? "Onderweg voor bezorging" : "Out for delivery";
    case "delivered":
      return isNl ? "Bezorgd" : "Delivered";
    case "cancelled":
      return isNl ? "Geannuleerd" : "Cancelled";
    case "failed":
      return isNl ? "Geannuleerd" : "Cancelled";
    default:
      return isNl ? "Bestelling ontvangen" : "Order received";
  }
}

/**
 * Map internal payment_status to human-readable customer label.
 */
export function mapPaymentStatus(status: InternalPaymentStatus, locale: string = "en"): string {
  const isNl = locale === "nl";
  switch (status) {
    case "pending":
      return isNl ? "In afwachting" : "Pending";
    case "paid":
      return isNl ? "Betaald" : "Paid";
    case "failed":
      return isNl ? "Mislukt" : "Failed";
    case "refunded":
      return isNl ? "Terugbetaald" : "Refunded";
    default:
      return isNl ? "In afwachting" : "Pending";
  }
}

export function getPaymentBadgeClass(status: InternalPaymentStatus): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 border-green-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    case "refunded":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gold/20 text-brown border-gold/40";
  }
}

export function getFulfillmentBadgeClass(status: InternalFulfillmentStatus): string {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200";
    case "shipped":
    case "out_for_delivery":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_production":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "cancelled":
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-sand/40 text-brown border-brown/15";
  }
}

export interface TimelineStep {
  key: "order_received" | "order_preparing" | "in_production" | "shipped" | "delivered";
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  timestamp?: string | null;
}

/**
 * Build the 5-step customer order timeline from authoritative order state:
 * 1. Order received
 * 2. Preparing your order
 * 3. In production
 * 4. Shipped
 * 5. Delivered
 */
export function getOrderTimelineSteps(
  order: {
    payment_status: string;
    fulfillment_status: string;
    created_at?: string | null;
    paid_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  },
  locale: string = "en"
): {
  isSpecialState: boolean;
  specialStateType?: "cancelled" | "failed" | "refunded";
  specialStateMessage?: string;
  steps: TimelineStep[];
} {
  const isNl = locale === "nl";
  const { payment_status, fulfillment_status, created_at, shipped_at, delivered_at } = order;

  // 1. Check for special terminal/exception states
  if (fulfillment_status === "cancelled") {
    return {
      isSpecialState: true,
      specialStateType: "cancelled",
      specialStateMessage: isNl
        ? "Deze bestelling is geannuleerd."
        : "This order has been cancelled.",
      steps: [],
    };
  }

  if (payment_status === "failed") {
    return {
      isSpecialState: true,
      specialStateType: "failed",
      specialStateMessage: isNl
        ? "Uw betaling kon niet worden voltooid. U kunt de betaling opnieuw proberen."
        : "Your payment could not be completed. You can safely retry your payment.",
      steps: [],
    };
  }

  if (payment_status === "refunded") {
    return {
      isSpecialState: true,
      specialStateType: "refunded",
      specialStateMessage: isNl
        ? "Deze bestelling is terugbetaald."
        : "This order has been refunded.",
      steps: [],
    };
  }

  // 2. Compute state progression for active orders
  const isDelivered = fulfillment_status === "delivered";
  const isShipped = isDelivered || fulfillment_status === "shipped" || fulfillment_status === "out_for_delivery";
  const isInProduction = isShipped || fulfillment_status === "in_production";
  const isPreparing =
    isInProduction ||
    fulfillment_status === "printify_order_created" ||
    fulfillment_status === "sent_to_production" ||
    fulfillment_status === "paid" ||
    payment_status === "paid";

  // Step 1: Order received (Always completed once placed)
  const step1: TimelineStep = {
    key: "order_received",
    label: isNl ? "Bestelling ontvangen" : "Order received",
    description: isNl ? "Uw bestelling is ontvangen" : "Your order has been received",
    status: "completed",
    timestamp: created_at ? formatOrderDate(created_at, locale) : null,
  };

  // Step 2: Preparing your order
  let step2Status: "completed" | "current" | "upcoming" = "upcoming";
  if (isInProduction) {
    step2Status = "completed";
  } else if (isPreparing) {
    step2Status = "current";
  }

  const step2: TimelineStep = {
    key: "order_preparing",
    label: isNl ? "Bestelling in voorbereiding" : "Preparing your order",
    description: isNl ? "Artikelen worden klaargezet voor productie" : "Garments queued for production",
    status: step2Status,
    timestamp: null,
  };

  // Step 3: In production
  let step3Status: "completed" | "current" | "upcoming" = "upcoming";
  if (isShipped) {
    step3Status = "completed";
  } else if (fulfillment_status === "in_production") {
    step3Status = "current";
  }

  const step3: TimelineStep = {
    key: "in_production",
    label: isNl ? "In productie" : "In production",
    description: isNl ? "Vervaardigd met kwaliteitscontrole" : "Crafted with quality control",
    status: step3Status,
    timestamp: null,
  };

  // Step 4: Shipped
  let step4Status: "completed" | "current" | "upcoming" = "upcoming";
  if (isDelivered) {
    step4Status = "completed";
  } else if (fulfillment_status === "shipped" || fulfillment_status === "out_for_delivery") {
    step4Status = "current";
  }

  const step4: TimelineStep = {
    key: "shipped",
    label: isNl ? "Verzonden" : "Shipped",
    description: isNl ? "Pakket overhandigd aan koerier" : "Package handed over to courier",
    status: step4Status,
    timestamp: shipped_at ? formatOrderDate(shipped_at, locale) : null,
  };

  // Step 5: Delivered (Never completed or current unless actually delivered)
  const step5Status: "completed" | "current" | "upcoming" = isDelivered ? "completed" : "upcoming";
  const step5: TimelineStep = {
    key: "delivered",
    label: isNl ? "Bezorgd" : "Delivered",
    description: isNl ? "Pakket bezorgd op uw adres" : "Package delivered to destination",
    status: step5Status,
    timestamp: delivered_at ? formatOrderDate(delivered_at, locale) : null,
  };

  return {
    isSpecialState: false,
    steps: [step1, step2, step3, step4, step5],
  };
}

/**
 * Format timestamp cleanly in YUPEK brand format (e.g. "8 Oct 2026").
 * Returns empty string if date is null/undefined to prevent fake dates.
 */
export function formatOrderDate(
  dateStr?: string | null,
  locale: string = "en",
  includeTime: boolean = false
): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };

    if (includeTime) {
      dateOptions.hour = "2-digit";
      dateOptions.minute = "2-digit";
    }

    return d.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-GB", dateOptions);
  } catch {
    return "";
  }
}

/**
 * Validate tracking external URL for security before rendering.
 * Prevents javascript:, data:, or malformed links.
 */
export function isSafeExternalUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Sanitize an order record before sending it to a customer frontend.
 * Removes all internal Printify, Stripe, and supplier IDs.
 */
export function sanitizeCustomerOrder(order: any): any {
  if (!order) return null;

  const sanitizedItems = (order.items || []).map((item: any) => ({
    name: item.title || item.name || "YUPEK Garment",
    title: item.title || item.name || "YUPEK Garment",
    slug: item.slug || "",
    size: item.size || "",
    color: item.color || "",
    quantity: Number(item.quantity ?? item.qty ?? 1),
    unit_price_cents: Number(item.unit_price_cents ?? (item.price ? Math.round(item.price * 100) : 0)),
    image: item.image || "",
  }));

  return {
    id: order.id,
    customer_email: order.customer_email || "",
    customer_name: order.customer_name || "",
    shipping_address: {
      first_name: order.shipping_address?.first_name || order.shipping_address?.firstName || "",
      last_name: order.shipping_address?.last_name || order.shipping_address?.lastName || "",
      street: order.shipping_address?.street || "",
      address2: order.shipping_address?.address2 || "",
      city: order.shipping_address?.city || "",
      postalCode: order.shipping_address?.postalCode || order.shipping_address?.postal_code || "",
      country: order.shipping_address?.country || "Netherlands",
      phone: order.shipping_address?.phone || "",
    },
    currency: order.currency || "EUR",
    subtotal_cents: order.subtotal_cents || 0,
    shipping_cents: order.shipping_cents || 0,
    total_cents: order.total_cents || 0,
    payment_status: order.payment_status || "pending",
    fulfillment_status: order.fulfillment_status || "pending_payment",
    shipping_method: order.shipping_method || null,
    shipping_method_label: order.shipping_method_label || order.deliveryMethod || null,
    carrier: order.carrier || null,
    tracking_number: order.tracking_number || null,
    tracking_url: isSafeExternalUrl(order.tracking_url) ? order.tracking_url : null,
    shipped_at: order.shipped_at || null,
    delivered_at: order.delivered_at || null,
    created_at: order.created_at || order.createdAt || "",
    items: sanitizedItems,
  };
}
