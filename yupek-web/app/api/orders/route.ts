import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { promises as fs } from "fs";
import path from "path";
import { StoreOrder, defaultSiteConfig, SiteConfig } from "@/lib/siteConfig";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Helper to format currency
const formatEur = (val: number) => `€${val.toFixed(2)}`;

// Generates luxury branded HTML email for new order
function generateOrderHtml(order: StoreOrder): string {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E8DFD5;">
      <td style="padding: 14px 10px; font-size: 13px; color: #2B1D14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <strong style="text-transform: uppercase; letter-spacing: 0.05em;">${item.name}</strong><br/>
        <span style="font-size: 11px; color: #7A695C;">
          Size: <strong>${item.size}</strong> &bull; Color: ${item.color} &bull; Qty: ${item.qty}
        </span>
      </td>
      <td style="padding: 14px 10px; text-align: right; font-size: 13px; color: #2B1D14; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${formatEur(item.price * item.qty)}
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
  <title>New Order ${order.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 30px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">YUPEK ORDER NOTIFICATION</span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0; font-weight: normal; letter-spacing: 0.08em;">NEW ORDER RECEIVED</h1>
              <p style="color: #D9CBB0; font-size: 12px; margin: 8px 0 0; letter-spacing: 0.1em; font-family: monospace;">
                ${order.orderNumber} &bull; ${new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Europe/Amsterdam" })} CET
              </p>
            </td>
          </tr>

          <!-- Summary Alert Banner -->
          <tr>
            <td style="background-color: #FBF8F3; padding: 18px 30px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <span style="display: inline-block; background-color: #6E1F2B; color: #FFFFFF; font-size: 10px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-right: 8px;">
                NEW SALE
              </span>
              <span style="font-size: 14px; color: #2B1D14; font-weight: 600;">
                Total Amount: <span style="color: #6E1F2B; font-size: 16px;">${formatEur(order.total)}</span>
              </span>
            </td>
          </tr>

          <!-- Customer & Delivery Info -->
          <tr>
            <td style="padding: 26px 30px 10px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" valign="top" style="padding-right: 15px;">
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 0 0 10px; font-weight: 700;">
                      Client Details
                    </h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.6;">
                      <strong>${order.customer.firstName} ${order.customer.lastName}</strong><br/>
                      <a href="mailto:${order.customer.email}" style="color: #6E1F2B; text-decoration: underline;">${order.customer.email}</a><br/>
                      <a href="tel:${order.customer.phone}" style="color: #2B1D14; text-decoration: none;">${order.customer.phone}</a>
                    </p>
                  </td>
                  <td width="50%" valign="top" style="padding-left: 15px;">
                    <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 0 0 10px; font-weight: 700;">
                      Shipping Destination
                    </h3>
                    <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.6;">
                      ${order.customer.street}<br/>
                      ${order.customer.postalCode} ${order.customer.city}<br/>
                      <strong>${order.customer.country}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered Table -->
          <tr>
            <td style="padding: 10px 30px 20px;">
              <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; margin: 20px 0 12px; font-weight: 700; border-top: 1px solid #E8DFD5; padding-top: 20px;">
                Ordered Items (${order.items.length})
              </h3>
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #2B1D14; text-align: left;">
                    <th style="padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A695C;">Item</th>
                    <th style="padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A695C; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #FBF8F3; border: 1px solid #E8DFD5; padding: 15px; border-radius: 4px;">
                <tr>
                  <td style="font-size: 12px; color: #7A695C; padding: 4px 0;">Subtotal</td>
                  <td style="font-size: 12px; color: #2B1D14; font-weight: 600; text-align: right; padding: 4px 0;">${formatEur(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #7A695C; padding: 4px 0;">Delivery (${order.deliveryMethod})</td>
                  <td style="font-size: 12px; color: #2B1D14; font-weight: 600; text-align: right; padding: 4px 0;">
                    ${order.shipping === 0 ? "FREE" : formatEur(order.shipping)}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #7A695C; padding: 4px 0;">Payment Method</td>
                  <td style="font-size: 12px; color: #2B1D14; font-weight: 600; text-align: right; padding: 4px 0; text-transform: uppercase;">
                    ${order.paymentMethod}
                  </td>
                </tr>
                <tr style="border-top: 1px solid #D9CBB0;">
                  <td style="font-size: 14px; color: #2B1D14; font-weight: 700; padding: 10px 0 4px; text-transform: uppercase;">Total</td>
                  <td style="font-size: 18px; color: #6E1F2B; font-weight: 700; text-align: right; padding: 10px 0 4px;">
                    ${formatEur(order.total)}
                  </td>
                </tr>
              </table>

              <!-- Action Link -->
              <div style="text-align: center; margin-top: 25px;">
                <a href="mailto:${order.customer.email}?subject=YUPEK Order ${order.orderNumber}" style="display: inline-block; background-color: #2B1D14; color: #F6F1E7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 600; padding: 12px 24px; text-decoration: none; border-radius: 2px;">
                  Reply to Customer &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F6F1E7; padding: 20px 30px; text-align: center; border-top: 1px solid #E8DFD5;">
              <p style="font-size: 11px; color: #7A695C; margin: 0; line-height: 1.5;">
                YUPEK &bull; Eastern Roots / European Style<br/>
                Online Boutique &bull; concierge@yupek.eu
              </p>
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Handle Test Email request from Admin Panel
    if (body.action === "test_email") {
      const recipient =
        body.recipient ||
        process.env.NOTIFICATION_GMAIL ||
        process.env.GMAIL_USER ||
        "daniyarow16@gmail.com";

      const gmailUser = (body.smtpUser || process.env.GMAIL_USER || "").trim();
      const gmailPass = (body.smtpPass || process.env.GMAIL_APP_PASSWORD || "").trim().replace(/\s+/g, "");

      if (!gmailUser || !gmailPass) {
        return NextResponse.json({
          success: false,
          error: "Gmail address and Google App Password are required to send emails.",
          help: "To create a 16-character App Password, go to Google Account -> Security -> 2-Step Verification -> App Passwords.",
        }, { status: 400 });
      }

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        await transporter.verify();

        await transporter.sendMail({
          from: `"YUPEK" <${gmailUser}>`,
          to: recipient,
          subject: "✓ YUPEK — Gmail Order Notifications Active",
          html: `
            <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #D9CBB0; background: #FAF7F2; color: #2B1D14;">
              <h2 style="color: #6E1F2B; margin-top: 0;">GMAIL NOTIFICATIONS ACTIVE</h2>
              <p style="font-size: 14px; line-height: 1.6;">
                This test confirms that your Gmail (<strong>${recipient}</strong>) is successfully connected to your YUPEK online store!
              </p>
              <p style="font-size: 13px; color: #555;">
                Whenever a customer places an order on your website, you will instantly receive an email here with customer contact details, delivery address, items, and payment total.
              </p>
              <hr style="border: 0; border-top: 1px solid #D9CBB0; margin: 20px 0;" />
              <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #888;">
                YUPEK &bull; Amsterdam
              </p>
            </div>
          `,
        });

        return NextResponse.json({
          success: true,
          message: `Test email successfully sent to ${recipient}! Check your inbox.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send test email";
        return NextResponse.json({
          success: false,
          error: msg,
          hint: "Ensure 2-Step Verification is enabled in your Google Account and that you are using a 16-character Google App Password (not your regular Gmail login password).",
        }, { status: 400 });
      }
    }

    // 2. Handle actual Customer Order submission
    const { customer, items, subtotal, shipping, deliveryMethod, paymentMethod, total } = body;

    if (!customer || !customer.email || !customer.firstName || !items || !items.length) {
      return NextResponse.json({ error: "Missing required order information" }, { status: 400 });
    }

    const orderNumber = `YPK-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: StoreOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      customer: {
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        street: customer.street || "",
        city: customer.city || "",
        postalCode: customer.postalCode || "",
        country: customer.country || "Netherlands",
      },
      items: items.map((i: any) => ({
        slug: i.slug || "",
        name: i.name || "Garment",
        size: i.size || "M",
        color: i.color || "Default",
        qty: Number(i.qty) || 1,
        price: Number(i.price) || 0,
        image: i.image || "",
      })),
      subtotal: Number(subtotal) || 0,
      shipping: Number(shipping) || 0,
      deliveryMethod: deliveryMethod || "Standard Courier",
      paymentMethod: paymentMethod || "Card",
      total: Number(total) || 0,
      status: "New",
      emailNotificationSent: false,
    };

    // Determine Gmail recipient
    const recipientEmail =
      body.notificationEmail ||
      process.env.NOTIFICATION_GMAIL ||
      process.env.GMAIL_USER ||
      "daniyarow16@gmail.com";

    newOrder.emailNotificationRecipient = recipientEmail;

    // Credentials for sending
    const gmailUser = (body.smtpUser || process.env.GMAIL_USER || recipientEmail).trim();
    const gmailPass = (body.smtpPass || process.env.GMAIL_APP_PASSWORD || "").trim().replace(/\s+/g, "");

    let emailError: string | null = null;

    if (gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        const htmlContent = generateOrderHtml(newOrder);

        // Send notification to Owner's Gmail
        await transporter.sendMail({
          from: `"YUPEK Orders" <${gmailUser}>`,
          to: recipientEmail,
          subject: `🛒 New Order ${newOrder.orderNumber} — €${newOrder.total.toFixed(2)} (${newOrder.customer.firstName} ${newOrder.customer.lastName})`,
          html: htmlContent,
        });

        // Also send copy/confirmation to customer
        try {
          await transporter.sendMail({
            from: `"YUPEK" <${gmailUser}>`,
            to: newOrder.customer.email,
            subject: `Thank you for your order ${newOrder.orderNumber} — YUPEK`,
            html: htmlContent,
          });
        } catch {
          // non-critical if client confirmation fails
        }

        newOrder.emailNotificationSent = true;
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : "SMTP sending failed";
        newOrder.emailNotificationError = emailError;
        console.error("[Order Email Notification Error]:", emailError);
      }
    } else {
      newOrder.emailNotificationError = "Gmail App Password not yet configured. Order saved to store database.";
      console.log(`[ORDER PLACED] ${newOrder.orderNumber} by ${newOrder.customer.firstName} ${newOrder.customer.lastName} (€${newOrder.total}). Waiting for Gmail credentials.`);
    }

    // 1. Persist order to Supabase site_config
    try {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "global")
        .maybeSingle();

      if (data?.value && typeof data.value === "object") {
        const currentCfg = data.value as any;
        const existingOrders = Array.isArray(currentCfg.storeOrders) ? currentCfg.storeOrders : [];
        const updatedOrders = [
          newOrder,
          ...existingOrders.filter(
            (o: any) => o.id !== newOrder.id && o.orderNumber !== newOrder.orderNumber
          ),
        ];

        await supabase.from("site_config").upsert({
          key: "global",
          value: {
            ...currentCfg,
            storeOrders: updatedOrders,
          },
          updated_at: new Date().toISOString(),
        });
      }
    } catch (sbErr) {
      console.warn("[Orders save to Supabase notice]", sbErr);
    }

    // 2. Local development disk mirror only (NEVER on Vercel / production)
    const isServerlessOrProd =
      Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

    if (!isServerlessOrProd) {
      try {
        const configPath = path.join(process.cwd(), "data", "site-config.json");
        const raw = await fs.readFile(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        const orders = Array.isArray(parsed.storeOrders) ? parsed.storeOrders : [];
        parsed.storeOrders = [
          newOrder,
          ...orders.filter(
            (o: any) => o.id !== newOrder.id && o.orderNumber !== newOrder.orderNumber
          ),
        ];
        await fs.writeFile(configPath, JSON.stringify(parsed, null, 2), "utf-8");
      } catch (saveErr) {
        console.warn("[Orders save to disk warning]", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      emailSent: newOrder.emailNotificationSent,
      emailRecipient: recipientEmail,
      emailError: newOrder.emailNotificationError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error placing order";
    console.error("[Orders API Error]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
