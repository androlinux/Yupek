import nodemailer from "nodemailer";
import { OrderRecord } from "./orderPersistence";

const formatEur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

export function generateOrderConfirmationHtml(order: OrderRecord): string {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E8DFD5;">
      <td style="padding: 14px 10px; font-size: 13px; color: #2B1D14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <strong style="text-transform: uppercase; letter-spacing: 0.05em;">${item.title || "YUPEK Garment"}</strong><br/>
        <span style="font-size: 11px; color: #7A695C;">
          Size: <strong>${item.size || "M"}</strong> &bull; Color: ${item.color || "Default"} &bull; Qty: ${item.quantity}
        </span>
      </td>
      <td style="padding: 14px 10px; text-align: right; font-size: 13px; color: #2B1D14; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${formatEur(item.unit_price_cents * item.quantity)}
      </td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation ${order.id}</title>
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
                ${order.id} &bull; ${new Date().toLocaleDateString("en-GB")} CET
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #166534; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-right: 8px;">
                PAYMENT CONFIRMED
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
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 0 0 10px; font-weight: 700;">Client Details</h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.6;">
                      <strong>${order.customer_name}</strong><br/>
                      ${order.customer_email}<br/>
                      ${order.shipping_address.phone}
                    </p>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 15px;">
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 0 0 10px; font-weight: 700;">Shipping Destination</h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.6;">
                      ${order.shipping_address.street}<br/>
                      ${order.shipping_address.postalCode} ${order.shipping_address.city}<br/>
                      <strong>${order.shipping_address.country}</strong>
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
                    <td style="padding: 12px 10px; font-size: 14px; font-weight: bold; color: #2B1D14;">Total (incl. VAT)</td>
                    <td align="right" style="padding: 12px 10px; font-size: 16px; font-weight: bold; color: #6E1F2B;">${formatEur(order.total_cents)}</td>
                  </tr>
                </tbody>
              </table>
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
</html>
  `;
}

export async function sendOrderConfirmationEmail(order: OrderRecord): Promise<void> {
  const gmailUser = (process.env.GMAIL_USER || process.env.NOTIFICATION_GMAIL || "").trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || "").trim().replace(/\s+/g, "");

  if (!gmailUser || !gmailPass) {
    console.log(`[Email Notice] Gmail credentials not set. Skipped email dispatch for ${order.id}.`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const html = generateOrderConfirmationHtml(order);

    // Send to customer
    if (order.customer_email) {
      await transporter.sendMail({
        from: `"YUPEK" <${gmailUser}>`,
        to: order.customer_email,
        subject: `YUPEK — Order #${order.id} Confirmed (€${(order.total_cents / 100).toFixed(2)})`,
        html,
      });
    }

    // Send to store owner
    const storeOwnerEmail = process.env.NOTIFICATION_GMAIL || gmailUser;
    if (storeOwnerEmail && storeOwnerEmail !== order.customer_email) {
      await transporter.sendMail({
        from: `"YUPEK Orders" <${gmailUser}>`,
        to: storeOwnerEmail,
        subject: `🛒 New Paid Order ${order.id} — €${(order.total_cents / 100).toFixed(2)} (${order.customer_name})`,
        html,
      });
    }

    console.log(`[Email Sent] Confirmation email dispatched for ${order.id}`);
  } catch (err: any) {
    console.error(`[Email Error] Failed to send email for ${order.id}:`, err.message);
  }
}
