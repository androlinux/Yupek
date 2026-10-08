import nodemailer from "nodemailer";
import { OrderRecord, persistOrderRecord } from "./orderPersistence";

const formatEur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

/**
 * Returns the authoritative public site URL for customer notification links.
 * Explicitly guards against using localhost or untrusted Host headers in production.
 */
export function getPublicSiteUrl(): string {
  const configured = (process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured.replace(/\/+$/, "");
  }
  return "https://www.yupek.shop";
}

/**
 * Centralized, safe email transport configuration.
 *
 * Supports standard SMTP environment variables:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_FROM
 *
 * Backwards-compatible fallback to GMAIL_USER / GMAIL_APP_PASSWORD.
 * Standardizes sender name to "YUPEK <...>"
 * Never exposes credentials to client bundles.
 */
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.NOTIFICATION_GMAIL || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim().replace(/\s+/g, "");
  const from = (process.env.SMTP_FROM || user || "orders@yupek.shop").trim();

  if (!user || !pass) {
    return null;
  }

  const senderAddress = from.includes("<") ? from : `"YUPEK" <${from}>`;

  let transportOptions: any;
  if (host) {
    transportOptions = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    };
  } else {
    // Gmail service fallback for test/dev credentials
    transportOptions = {
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    };
  }

  return {
    transporter: nodemailer.createTransport(transportOptions),
    sender: senderAddress,
  };
}

// =====================================================================
// 1. ORDER CONFIRMATION
// =====================================================================

export function generateOrderConfirmationHtml(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E8DFD5;">
      <td style="padding: 14px 10px; font-size: 13px; color: #2B1D14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <strong style="text-transform: uppercase; letter-spacing: 0.05em;">${item.title || "YUPEK Garment"}</strong><br/>
        <span style="font-size: 11px; color: #7A695C;">
          ${item.size ? `Size: <strong>${item.size}</strong> &bull; ` : ""}${item.color ? `Color: ${item.color} &bull; ` : ""}Qty: ${item.quantity}
        </span>
      </td>
      <td style="padding: 14px 10px; text-align: right; font-size: 13px; color: #2B1D14; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${formatEur(item.unit_price_cents * item.quantity)}
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK OFFICIAL CONFIRMATION</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">THANK YOU FOR YOUR ORDER</h1>
              <p style="color: #D9CBB0; font-size: 12px; margin: 8px 0 0; letter-spacing: 0.1em; font-family: monospace;">
                #${order.id}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #166534; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-right: 8px;">
                ORDER CONFIRMED
              </span>
              <span style="font-size: 14px; color: #2B1D14; font-weight: 600;">
                Total: <span style="color: #6E1F2B; font-size: 16px;">${formatEur(order.total_cents)}</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 26px 30px 10px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 15px;">
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 0 0 10px; font-weight: 700;">Customer Details</h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.6;">
                      ${order.customer_name ? `<strong>${order.customer_name}</strong><br/>` : ""}
                      ${order.customer_email || ""}<br/>
                      ${order.shipping_address?.phone || ""}
                    </p>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 15px;">
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 0 0 10px; font-weight: 700;">Shipping Destination</h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.6;">
                      ${order.shipping_address?.street || ""}<br/>
                      ${order.shipping_address?.postalCode || ""} ${order.shipping_address?.city || ""}<br/>
                      <strong>${order.shipping_address?.country || "Netherlands"}</strong>
                      ${
                        order.estimated_delivery_min && order.estimated_delivery_max
                          ? `<br/><span style="font-size: 11px; color: #7A695C;">Estimated Delivery: <strong>${order.estimated_delivery_min}–${order.estimated_delivery_max} business days</strong></span>`
                          : order.shipping_method_label
                          ? `<br/><span style="font-size: 11px; color: #7A695C;">Delivery: <strong>${order.shipping_method_label}</strong></span>`
                          : ""
                      }
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 30px 20px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 15px;">
                <thead>
                  <tr style="border-bottom: 2px solid #2B1D14;">
                    <th align="left" style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #7A695C;">Garment</th>
                    <th align="right" style="padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #7A695C;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td style="padding: 10px; font-size: 12px; color: #7A695C;">Subtotal</td>
                    <td align="right" style="padding: 10px; font-size: 12px; font-weight: 600; color: #2B1D14;">${formatEur(order.subtotal_cents)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; font-size: 12px; color: #7A695C;">Shipping</td>
                    <td align="right" style="padding: 10px; font-size: 12px; font-weight: 600; color: #2B1D14;">${formatEur(order.shipping_cents)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #2B1D14;">
                    <td style="padding: 12px 10px; font-size: 14px; font-weight: bold; color: #2B1D14;">Total</td>
                    <td align="right" style="padding: 12px 10px; font-size: 16px; font-weight: bold; color: #6E1F2B;">${formatEur(order.total_cents)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 30px 25px; text-align: center;">
              <a href="${orderUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                VIEW YOUR ORDER &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C; line-height: 1.5;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam<br/>
              Questions? Reach us at <a href="mailto:support@yupek.shop" style="color: #6E1F2B; text-decoration: underline;">support@yupek.shop</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateOrderConfirmationText(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;

  const itemsText = (order.items || [])
    .map(
      (item) =>
        `- ${item.title || "YUPEK Garment"} (${item.size || "M"} / ${item.color || "Default"}) x${item.quantity}: ${formatEur(item.unit_price_cents * item.quantity)}`
    )
    .join("\n");

  return `YUPEK — ORDER CONFIRMATION
Order: #${order.id}
Status: Order confirmed

Thank you for your order${order.customer_name ? `, ${order.customer_name}` : ""}.

ITEMS:
${itemsText}

Subtotal: ${formatEur(order.subtotal_cents)}
Shipping: ${formatEur(order.shipping_cents)}
Total: ${formatEur(order.total_cents)}

SHIPPING DESTINATION:
${order.shipping_address?.street || ""}
${order.shipping_address?.postalCode || ""} ${order.shipping_address?.city || ""}
${order.shipping_address?.country || "Netherlands"}${
  order.estimated_delivery_min && order.estimated_delivery_max
    ? `\nEstimated Delivery: ${order.estimated_delivery_min}–${order.estimated_delivery_max} business days`
    : order.shipping_method_label
    ? `\nDelivery: ${order.shipping_method_label}`
    : ""
}

View your order:
${orderUrl}

YUPEK — Eastern Heritage, European Style — Amsterdam
Customer Support: support@yupek.shop
`;
}

export async function sendOrderConfirmationEmail(order: OrderRecord): Promise<boolean> {
  if (order.confirmation_email_sent) {
    console.log(`[Email Skipped] Confirmation email already sent for order ${order.id}.`);
    return true;
  }

  if (!order.customer_email) {
    return false;
  }

  const transport = getEmailTransporter();
  if (!transport) {
    console.log(`[Email Notice] SMTP not configured. Skipped confirmation email for ${order.id}.`);
    return false;
  }

  try {
    const html = generateOrderConfirmationHtml(order);
    const text = generateOrderConfirmationText(order);

    const dispatchTask = async () => {
      // 1. Send to Customer
      await transport.transporter.sendMail({
        from: transport.sender,
        to: order.customer_email,
        subject: `YUPEK — Order #${order.id} Confirmed (${formatEur(order.total_cents)})`,
        html,
        text,
      });

      // 2. Send to Store Owner if configured
      const storeOwner = process.env.NOTIFICATION_GMAIL;
      if (storeOwner && storeOwner !== order.customer_email) {
        await transport.transporter.sendMail({
          from: transport.sender,
          to: storeOwner,
          subject: `🛒 New Paid Order #${order.id} — ${formatEur(order.total_cents)} (${order.customer_name || "Customer"})`,
          html,
          text,
        });
      }
    };

    await Promise.race([
      dispatchTask(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Confirmation email dispatch timed out after 7s")), 7000)
      ),
    ]);

    order.confirmation_email_sent = true;
    await persistOrderRecord(order);
    console.log(`[Email Sent] Order confirmation email dispatched for ${order.id}`);
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Non-fatal confirmation email error for ${order.id}:`, err.message || "Unknown error");
    return false;
  }
}

// =====================================================================
// 2. ORDER SHIPPED
// =====================================================================

export function generateOrderShippedHtml(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;
  const carrier = order.carrier || "DHL Express / PostNL";
  const trackingNumber = order.tracking_number || "";
  const trackingUrl =
    order.tracking_url && (order.tracking_url.startsWith("https://") || order.tracking_url.startsWith("http://"))
      ? order.tracking_url
      : orderUrl;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped — #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK DISPATCH NOTICE</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">YOUR ORDER IS ON ITS WAY</h1>
              <p style="color: #D9CBB0; font-size: 12px; margin: 8px 0 0; letter-spacing: 0.1em; font-family: monospace;">
                #${order.id}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #065F46; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px;">
                SHIPPED
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px 15px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #2B1D14; line-height: 1.6;">
                Dear <strong>${order.customer_name || "Customer"}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                Great news! Your tailored garments have finished craftsmanship and are now on their way to you.
              </p>

              <!-- Tracking Details Box -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; border: 1px solid #D9CBB0; border-radius: 4px; margin: 20px 0; padding: 18px 20px;">
                <tr>
                  <td>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A695C; font-weight: 600; display: block; margin-bottom: 4px;">Carrier</span>
                    <strong style="font-size: 14px; color: #2B1D14; text-transform: uppercase;">${carrier}</strong>
                  </td>
                </tr>
                ${
                  trackingNumber
                    ? `<tr>
                  <td style="padding-top: 14px;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A695C; font-weight: 600; display: block; margin-bottom: 4px;">Tracking Number</span>
                    <span style="font-family: monospace; font-size: 15px; font-weight: bold; color: #6E1F2B; letter-spacing: 0.05em;">${trackingNumber}</span>
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding-top: 20px; text-align: center;">
                    <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                      TRACK PACKAGE &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                <tr>
                  <td style="padding: 14px 0; border-top: 1px solid #E8DFD5;">
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #6E1F2B; margin: 0 0 6px;">Delivery Address</h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.5;">
                      ${order.shipping_address?.street || ""}<br/>
                      ${order.shipping_address?.postalCode || ""} ${order.shipping_address?.city || ""}<br/>
                      <strong>${order.shipping_address?.country || "Netherlands"}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 12px; color: #7A695C; line-height: 1.6; text-align: center;">
                You can also view this order at any time in your <a href="${orderUrl}" style="color: #6E1F2B; text-decoration: underline;">YUPEK Account</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateOrderShippedText(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;
  const carrier = order.carrier || "DHL Express / PostNL";
  const trackingNumber = order.tracking_number || "Not assigned";
  const trackingUrl =
    order.tracking_url && (order.tracking_url.startsWith("https://") || order.tracking_url.startsWith("http://"))
      ? order.tracking_url
      : orderUrl;

  return `YUPEK — YOUR ORDER HAS SHIPPED
Order: #${order.id}
Status: Shipped

Dear ${order.customer_name || "Customer"},

Your YUPEK order is on its way.

Carrier: ${carrier}
Tracking Number: ${trackingNumber}
Track Package: ${trackingUrl}

DELIVERY DESTINATION:
${order.shipping_address?.street || ""}
${order.shipping_address?.postalCode || ""} ${order.shipping_address?.city || ""}
${order.shipping_address?.country || "Netherlands"}

View your order:
${orderUrl}

YUPEK — Eastern Heritage, European Style — Amsterdam
`;
}

export async function sendOrderShippedEmail(order: OrderRecord): Promise<boolean> {
  if (order.shipped_email_sent) {
    console.log(`[Email Skipped] Shipment email already sent for order ${order.id}.`);
    return true;
  }

  if (!order.customer_email) {
    return false;
  }

  const transport = getEmailTransporter();
  if (!transport) {
    console.log(`[Email Notice] SMTP not configured. Skipped shipment email for ${order.id}.`);
    return false;
  }

  try {
    const html = generateOrderShippedHtml(order);
    const text = generateOrderShippedText(order);

    const dispatchTask = async () => {
      await transport.transporter.sendMail({
        from: transport.sender,
        to: order.customer_email,
        subject: `YUPEK — Your Order #${order.id} Has Shipped`,
        html,
        text,
      });
    };

    await Promise.race([
      dispatchTask(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Shipment email dispatch timed out after 7s")), 7000)
      ),
    ]);

    order.shipped_email_sent = true;
    await persistOrderRecord(order);
    console.log(`[Email Sent] Shipment email dispatched for ${order.id}`);
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Non-fatal shipment email error for ${order.id}:`, err.message || "Unknown error");
    return false;
  }
}

// =====================================================================
// 3. ORDER DELIVERED
// =====================================================================

export function generateOrderDeliveredHtml(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Been Delivered — #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK DELIVERY NOTICE</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">YOUR ORDER HAS BEEN DELIVERED</h1>
              <p style="color: #D9CBB0; font-size: 12px; margin: 8px 0 0; letter-spacing: 0.1em; font-family: monospace;">
                #${order.id}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #166534; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px;">
                DELIVERED
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px 20px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #2B1D14; line-height: 1.6;">
                Dear <strong>${order.customer_name || "Customer"}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                Your YUPEK order <strong>#${order.id}</strong> has been successfully delivered. We hope your new garments bring you enduring joy and elegance.
              </p>

              ${
                order.delivered_at
                  ? `<p style="margin: 0 0 20px; font-size: 12px; color: #7A695C;">
                  Delivered on: <strong>${new Date(order.delivered_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
                </p>`
                  : ""
              }

              <div style="text-align: center; margin: 25px 0;">
                <a href="${orderUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                  VIEW ORDER IN ACCOUNT &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam<br/>
              Need assistance? Email <a href="mailto:support@yupek.shop" style="color: #6E1F2B; text-decoration: underline;">support@yupek.shop</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateOrderDeliveredText(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;

  return `YUPEK — YOUR ORDER HAS BEEN DELIVERED
Order: #${order.id}
Status: Delivered

Dear ${order.customer_name || "Customer"},

Your YUPEK order #${order.id} has been delivered.
${order.delivered_at ? `Delivered on: ${new Date(order.delivered_at).toLocaleDateString("en-GB")}\n` : ""}
View your order:
${orderUrl}

YUPEK — Eastern Heritage, European Style — Amsterdam
Customer Support: support@yupek.shop
`;
}

export async function sendOrderDeliveredEmail(order: OrderRecord): Promise<boolean> {
  if (order.delivered_email_sent) {
    console.log(`[Email Skipped] Delivery email already sent for order ${order.id}.`);
    return true;
  }

  if (!order.customer_email) {
    return false;
  }

  const transport = getEmailTransporter();
  if (!transport) {
    console.log(`[Email Notice] SMTP not configured. Skipped delivery email for ${order.id}.`);
    return false;
  }

  try {
    const html = generateOrderDeliveredHtml(order);
    const text = generateOrderDeliveredText(order);

    const dispatchTask = async () => {
      await transport.transporter.sendMail({
        from: transport.sender,
        to: order.customer_email,
        subject: `YUPEK — Your Order #${order.id} Has Been Delivered`,
        html,
        text,
      });
    };

    await Promise.race([
      dispatchTask(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Delivery email dispatch timed out after 7s")), 7000)
      ),
    ]);

    order.delivered_email_sent = true;
    await persistOrderRecord(order);
    console.log(`[Email Sent] Delivery email dispatched for ${order.id}`);
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Non-fatal delivery email error for ${order.id}:`, err.message || "Unknown error");
    return false;
  }
}

// =====================================================================
// 4. PAYMENT FAILED
// =====================================================================

export function generatePaymentFailedHtml(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const retryUrl = `${siteUrl}/checkout?retry=${encodeURIComponent(order.id)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed — Order #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK PAYMENT NOTICE</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">PAYMENT COULD NOT BE COMPLETED</h1>
              <p style="color: #D9CBB0; font-size: 12px; margin: 8px 0 0; letter-spacing: 0.1em; font-family: monospace;">
                #${order.id}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #991B1B; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px;">
                PAYMENT FAILED
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px 20px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #2B1D14; line-height: 1.6;">
                Dear <strong>${order.customer_name || "Customer"}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                We couldn't complete your payment for order <strong>#${order.id}</strong>. Your chosen payment method was not charged.
              </p>
              <p style="margin: 0 0 24px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                Your items and shipping details are safely preserved. You can complete your purchase by retrying your payment below.
              </p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${retryUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                  RETRY PAYMENT &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam<br/>
              Need help? Contact <a href="mailto:support@yupek.shop" style="color: #6E1F2B; text-decoration: underline;">support@yupek.shop</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generatePaymentFailedText(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const retryUrl = `${siteUrl}/checkout?retry=${encodeURIComponent(order.id)}`;

  return `YUPEK — PAYMENT COULD NOT BE COMPLETED
Order: #${order.id}
Status: Payment failed

Dear ${order.customer_name || "Customer"},

We couldn't complete your payment for order #${order.id}.

Your order details have been saved. You can safely retry your payment here:
${retryUrl}

YUPEK — Eastern Heritage, European Style — Amsterdam
Customer Support: support@yupek.shop
`;
}

export async function sendPaymentFailedEmail(order: OrderRecord): Promise<boolean> {
  if (order.failed_email_sent) {
    console.log(`[Email Skipped] Failed payment email already sent for order ${order.id}.`);
    return true;
  }

  if (!order.customer_email) {
    return false;
  }

  const transport = getEmailTransporter();
  if (!transport) {
    console.log(`[Email Notice] SMTP not configured. Skipped payment failed email for ${order.id}.`);
    return false;
  }

  try {
    const html = generatePaymentFailedHtml(order);
    const text = generatePaymentFailedText(order);

    const dispatchTask = async () => {
      await transport.transporter.sendMail({
        from: transport.sender,
        to: order.customer_email,
        subject: `YUPEK — Payment Could Not Be Completed (Order #${order.id})`,
        html,
        text,
      });
    };

    await Promise.race([
      dispatchTask(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Payment failed email dispatch timed out after 7s")), 7000)
      ),
    ]);

    order.failed_email_sent = true;
    await persistOrderRecord(order);
    console.log(`[Email Sent] Payment failed email dispatched for ${order.id}`);
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Non-fatal payment failed email error for ${order.id}:`, err.message || "Unknown error");
    return false;
  }
}

// =====================================================================
// 5. REFUND CONFIRMED
// =====================================================================

export function generateRefundConfirmationHtml(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Confirmed — Order #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK REFUND NOTICE</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">REFUND CONFIRMED</h1>
              <p style="color: #D9CBB0; font-size: 12px; margin: 8px 0 0; letter-spacing: 0.1em; font-family: monospace;">
                #${order.id}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #B45309; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px;">
                REFUND PROCESSED
              </span>
              <span style="font-size: 14px; color: #2B1D14; font-weight: 600; margin-left: 8px;">
                Amount: <span style="color: #6E1F2B; font-size: 16px;">${formatEur(order.total_cents)}</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px 20px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #2B1D14; line-height: 1.6;">
                Dear <strong>${order.customer_name || "Customer"}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                Your refund for order <strong>#${order.id}</strong> in the amount of <strong>${formatEur(order.total_cents)}</strong> has been processed.
              </p>
              <p style="margin: 0 0 20px; font-size: 12px; color: #7A695C; line-height: 1.6;">
                The time it takes to appear in your account depends on your payment provider (typically 5 to 10 business days).
              </p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${orderUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                  VIEW ORDER IN ACCOUNT &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam<br/>
              Questions? Contact <a href="mailto:support@yupek.shop" style="color: #6E1F2B; text-decoration: underline;">support@yupek.shop</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateRefundConfirmationText(order: OrderRecord): string {
  const siteUrl = getPublicSiteUrl();
  const orderUrl = `${siteUrl}/account/orders/${encodeURIComponent(order.id)}`;

  return `YUPEK — REFUND CONFIRMED
Order: #${order.id}
Status: Refund confirmed
Amount: ${formatEur(order.total_cents)}

Dear ${order.customer_name || "Customer"},

Your refund of ${formatEur(order.total_cents)} for order #${order.id} has been processed.
The time it takes to appear in your account depends on your payment provider.

View your order:
${orderUrl}

YUPEK — Eastern Heritage, European Style — Amsterdam
Customer Support: support@yupek.shop
`;
}

export async function sendRefundConfirmationEmail(order: OrderRecord): Promise<boolean> {
  if (order.refund_email_sent) {
    console.log(`[Email Skipped] Refund email already sent for order ${order.id}.`);
    return true;
  }

  if (!order.customer_email) {
    return false;
  }

  const transport = getEmailTransporter();
  if (!transport) {
    console.log(`[Email Notice] SMTP not configured. Skipped refund email for ${order.id}.`);
    return false;
  }

  try {
    const html = generateRefundConfirmationHtml(order);
    const text = generateRefundConfirmationText(order);

    const dispatchTask = async () => {
      await transport.transporter.sendMail({
        from: transport.sender,
        to: order.customer_email,
        subject: `YUPEK — Refund Confirmed for Order #${order.id}`,
        html,
        text,
      });
    };

    await Promise.race([
      dispatchTask(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Refund email dispatch timed out after 7s")), 7000)
      ),
    ]);

    order.refund_email_sent = true;
    await persistOrderRecord(order);
    console.log(`[Email Sent] Refund email dispatched for ${order.id}`);
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Non-fatal refund email error for ${order.id}:`, err.message || "Unknown error");
    return false;
  }
}

// =====================================================================
// 6. PASSWORD RESET
// =====================================================================

export function generatePasswordResetHtml(email: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your YUPEK Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK ACCOUNT SECURITY</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">PASSWORD RESET REQUEST</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px 20px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #2B1D14; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                We received a request to reset the password for your YUPEK account associated with <strong>${email}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                Click the button below to choose a new secure password. For security reasons, this link is valid for a limited time.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                  RESET PASSWORD &rarr;
                </a>
              </div>
              <p style="margin: 20px 0 0; font-size: 11px; color: #7A695C; line-height: 1.6;">
                If you did not make this request, you can safely ignore this email. Your existing password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam<br/>
              Security Questions? <a href="mailto:support@yupek.shop" style="color: #6E1F2B; text-decoration: underline;">support@yupek.shop</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generatePasswordResetText(email: string, resetUrl: string): string {
  return `YUPEK — PASSWORD RESET REQUEST

We received a request to reset the password for your YUPEK account (${email}).

Reset your password using the link below:
${resetUrl}

If you did not request this, you can safely ignore this message.

YUPEK — Eastern Heritage, European Style — Amsterdam
Customer Support: support@yupek.shop
`;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const transport = getEmailTransporter();
  if (!transport || !email) {
    return false;
  }

  try {
    const html = generatePasswordResetHtml(email, resetUrl);
    const text = generatePasswordResetText(email, resetUrl);

    await transport.transporter.sendMail({
      from: transport.sender,
      to: email,
      subject: "YUPEK — Password Reset Request",
      html,
      text,
    });
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Password reset email error for ${email}:`, err.message);
    return false;
  }
}

// =====================================================================
// 7. ACCOUNT EMAIL CONFIRMATION
// =====================================================================

export function generateAccountConfirmationHtml(email: string, confirmUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your YUPEK Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">WELCOME TO YUPEK</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">CONFIRM YOUR ACCOUNT</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 30px 20px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #2B1D14; line-height: 1.6;">
                Welcome,
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #4A3A2C; line-height: 1.6;">
                Thank you for creating an account with YUPEK. Please verify your email address (<strong>${email}</strong>) to activate your account and access private styling services.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 2px;">
                  CONFIRM EMAIL ADDRESS &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5; font-size: 11px; color: #7A695C;">
              YUPEK &bull; Eastern Heritage, European Style &bull; Amsterdam<br/>
              Questions? <a href="mailto:support@yupek.shop" style="color: #6E1F2B; text-decoration: underline;">support@yupek.shop</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateAccountConfirmationText(email: string, confirmUrl: string): string {
  return `WELCOME TO YUPEK — CONFIRM YOUR ACCOUNT

Thank you for creating an account with YUPEK (${email}).

Please confirm your email address by following the link below:
${confirmUrl}

YUPEK — Eastern Heritage, European Style — Amsterdam
Customer Support: support@yupek.shop
`;
}

export async function sendAccountConfirmationEmail(email: string, confirmUrl: string): Promise<boolean> {
  const transport = getEmailTransporter();
  if (!transport || !email) {
    return false;
  }

  try {
    const html = generateAccountConfirmationHtml(email, confirmUrl);
    const text = generateAccountConfirmationText(email, confirmUrl);

    await transport.transporter.sendMail({
      from: transport.sender,
      to: email,
      subject: "YUPEK — Confirm Your Account",
      html,
      text,
    });
    return true;
  } catch (err: any) {
    console.warn(`[Email Notice] Account confirmation email error for ${email}:`, err.message);
    return false;
  }
}

