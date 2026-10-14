import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import { ContactSubmission, SiteConfig } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateInquiryAdminHtml(submission: ContactSubmission): string {
  const safeName = escapeHtml(submission.name);
  const safeEmail = escapeHtml(submission.email);
  const safePhone = escapeHtml(submission.phone || "");
  const safeSubject = escapeHtml(submission.subject);
  const safeMessage = escapeHtml(submission.message).replace(/\n/g, "<br/>");
  const cleanPhone = (submission.phone || "").replace(/[^0-9+]/g, "").replace(/^\+/, "");
  const formattedDate = new Date(submission.createdAt).toLocaleString("en-GB", {
    timeZone: "Europe/Amsterdam",
    dateStyle: "full",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Inquiry from ${safeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">

          <!-- Brand Header -->
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 28px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">
                YUPEK &bull; CLIENT CONCIERGE
              </span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; margin: 0; font-weight: normal; letter-spacing: 0.06em;">
                NEW CLIENT INQUIRY
              </h1>
              <p style="color: #D9CBB0; font-size: 11px; margin: 8px 0 0; letter-spacing: 0.08em; font-family: monospace;">
                ${formattedDate} CET
              </p>
            </td>
          </tr>

          <!-- Summary Alert Banner -->
          <tr>
            <td style="background-color: #FAF6F0; padding: 18px 28px; border-bottom: 1px solid #E8DFD5; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #2B1D14; line-height: 1.5;">
                A visitor has sent a new message via the <strong style="color: #6E1F2B;">Client Concierge</strong> form on your website.
              </p>
            </td>
          </tr>

          <!-- Client Details Grid -->
          <tr>
            <td style="padding: 28px;">
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; font-weight: bold; display: block; margin-bottom: 12px;">
                Client Information
              </span>

              <table role="presentation" width="100%" style="background-color: #FDFBF8; border: 1px solid #E8DFD5; border-radius: 3px; font-size: 13px; color: #2B1D14;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E8DFD5; width: 35%; color: #7A695C; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">
                    Full Name
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E8DFD5; font-weight: 600;">
                    ${safeName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E8DFD5; color: #7A695C; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">
                    Email Address
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E8DFD5;">
                    <a href="mailto:${safeEmail}" style="color: #6E1F2B; font-weight: 600; text-decoration: underline;">
                      ${safeEmail}
                    </a>
                  </td>
                </tr>
                ${
                  safePhone
                    ? `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E8DFD5; color: #7A695C; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">
                    Phone Number
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E8DFD5;">
                    <a href="tel:${safePhone.replace(/\s+/g, "")}" style="color: #2B1D14; text-decoration: none; font-weight: 600;">
                      ${safePhone}
                    </a>
                    ${
                      cleanPhone
                        ? ` &bull; <a href="https://wa.me/${cleanPhone}" target="_blank" style="color: #128C7E; font-weight: 600; text-decoration: underline; font-size: 12px;">Open WhatsApp &rarr;</a>`
                        : ""
                    }
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 12px 16px; color: #7A695C; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">
                    Subject
                  </td>
                  <td style="padding: 12px 16px; font-weight: 600; color: #6E1F2B;">
                    ${safeSubject}
                  </td>
                </tr>
              </table>

              <!-- Message Section -->
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #6E1F2B; font-weight: bold; display: block; margin: 24px 0 10px;">
                Client Message
              </span>
              <div style="background-color: #FAF6F0; border-left: 3px solid #C49A45; padding: 18px 20px; font-size: 13px; line-height: 1.7; color: #2B1D14; font-family: Georgia, serif;">
                ${safeMessage}
              </div>

              <!-- Quick Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="border-radius: 2px; background-color: #2B1D14;">
                          <a href="mailto:${safeEmail}?subject=Re:%20YUPEK%20Concierge%20%E2%80%94%20${encodeURIComponent(submission.subject)}" style="font-size: 11px; font-family: -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.15em; color: #F6F1E7; text-decoration: none; padding: 13px 26px; display: inline-block; font-weight: 600;">
                            ✉️ Reply to ${safeName}
                          </a>
                        </td>
                        ${
                          cleanPhone
                            ? `
                        <td style="width: 12px;"></td>
                        <td align="center" style="border-radius: 2px; background-color: #128C7E;">
                          <a href="https://wa.me/${cleanPhone}" target="_blank" style="font-size: 11px; font-family: -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.15em; color: #FFFFFF; text-decoration: none; padding: 13px 22px; display: inline-block; font-weight: 600;">
                            💬 WhatsApp
                          </a>
                        </td>`
                            : ""
                        }
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; font-size: 11px; color: #7A695C; margin: 16px 0 0;">
                💡 <em>Tip: You can hit <strong>Reply</strong> directly in Gmail to respond straight to ${safeName}.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #2B1D14; padding: 22px 28px; text-align: center; border-top: 1px solid #4A3528;">
              <p style="font-size: 11px; color: #D9CBB0; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">
                YUPEK &bull; Eastern Roots / European Style
              </p>
              <p style="font-size: 10px; color: #9A8778; margin: 0; line-height: 1.5;">
                Inquiries are also archived inside your <a href="https://www.yupek.shop/admin" style="color: #C49A45; text-decoration: underline;">Admin Panel</a> under the Inquiries tab.
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

function generateInquiryClientHtml(submission: ContactSubmission, storePhone?: string): string {
  const safeName = escapeHtml(submission.name);
  const safeSubject = escapeHtml(submission.subject);
  const safeMessage = escapeHtml(submission.message).replace(/\n/g, "<br/>");
  const phoneText = storePhone || "+31 6 44154126";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YUPEK Client Concierge</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F1E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F1E7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #D9CBB0; box-shadow: 0 4px 20px rgba(43,29,20,0.08); border-radius: 4px; overflow: hidden;" cellspacing="0" cellpadding="0">

          <!-- Header -->
          <tr>
            <td style="background-color: #2B1D14; padding: 32px 28px; text-align: center; border-bottom: 3px solid #C49A45;">
              <span style="font-size: 10px; letter-spacing: 0.35em; color: #C49A45; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 6px;">
                YUPEK &bull; AMSTERDAM
              </span>
              <h1 style="color: #F6F1E7; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; margin: 0; font-weight: normal; letter-spacing: 0.06em;">
                CLIENT CONCIERGE
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px; font-size: 13px; line-height: 1.7; color: #2B1D14;">
              <p style="margin: 0 0 16px; font-size: 15px; font-family: Georgia, serif; color: #2B1D14;">
                Dear ${safeName},
              </p>
              <p style="margin: 0 0 16px;">
                Thank you for contacting the <strong>YUPEK Client Concierge</strong>. We have received your inquiry regarding <strong>${safeSubject}</strong>.
              </p>
              <p style="margin: 0 0 20px; color: #554438;">
                Our concierge team reviews every inquiry personally and typically responds within two hours during customer care hours (Monday – Saturday, 10:00 – 19:00 CET).
              </p>

              <!-- Message Copy -->
              <div style="background-color: #FAF6F0; border-left: 3px solid #C49A45; padding: 16px 20px; margin: 24px 0; font-size: 12px; color: #4A3A2F;">
                <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A695C; font-weight: bold; display: block; margin-bottom: 6px;">
                  Copy of Your Message:
                </span>
                <div style="font-family: Georgia, serif; font-style: italic; line-height: 1.6;">
                  ${safeMessage}
                </div>
              </div>

              <p style="margin: 20px 0 0; font-size: 12px; color: #7A695C;">
                If your question is urgent, you may also reach our concierge by telephone at <a href="tel:${phoneText.replace(/\s+/g, "")}" style="color: #6E1F2B; text-decoration: underline;">${phoneText}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF6F0; padding: 22px 28px; text-align: center; border-top: 1px solid #E8DFD5;">
              <p style="font-size: 11px; color: #6E1F2B; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600;">
                YUPEK &bull; Eastern Roots / European Style
              </p>
              <p style="font-size: 11px; color: #7A695C; margin: 0;">
                Online Boutique &bull; <a href="https://www.yupek.shop" style="color: #2B1D14; text-decoration: underline;">www.yupek.shop</a>
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const submission: ContactSubmission = {
      id: `sub-${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : "",
      subject: subject ? String(subject).trim() : "General Inquiry",
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    // 1. Fetch site configuration from Supabase
    const { config } = await getOrMigrateSiteConfig();

    // 2. Persist to Supabase dedicated table and site_config table
    try {
      const supabase = getSupabaseServerClient();

      // Insert into dedicated contact_submissions table
      await supabase.from("contact_submissions").insert({
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        subject: submission.subject,
        message: submission.message,
      });

      // Update site_config.value.contactSubmissions so the Admin Panel immediately displays it
      const { data: configRow } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "global")
        .maybeSingle();

      if (configRow?.value && typeof configRow.value === "object") {
        const curConfig = configRow.value as SiteConfig;
        const curList = curConfig.contactSubmissions || [];
        const updatedList = [
          submission,
          ...curList.filter((s: any) => s && s.id !== submission.id),
        ].slice(0, 100);

        await supabase
          .from("site_config")
          .update({
            value: {
              ...curConfig,
              contactSubmissions: updatedList,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("key", "global");
      }
    } catch (dbErr) {
      console.warn("[Contact DB save notice]:", dbErr);
    }

    // 3. Dispatch Email Notifications
    const recipientEmail =
      config.orderNotificationEmail ||
      config.contactEmail ||
      process.env.NOTIFICATION_GMAIL ||
      process.env.GMAIL_USER ||
      "daniyarow16@gmail.com";

    const gmailUser = (
      config.smtpUser ||
      process.env.GMAIL_USER ||
      recipientEmail
    ).trim();

    const gmailPass = (
      config.smtpPass ||
      process.env.GMAIL_APP_PASSWORD ||
      ""
    ).trim().replace(/\s+/g, "");

    let emailSent = false;
    let emailError: string | null = null;

    if (gmailPass && gmailUser) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        // A. Send Instant Alert to Store Owner
        await transporter.sendMail({
          from: `"YUPEK Client Concierge" <${gmailUser}>`,
          to: recipientEmail,
          replyTo: `"${submission.name}" <${submission.email}>`,
          subject: `💬 Client Concierge Inquiry: ${submission.subject} — ${submission.name}`,
          html: generateInquiryAdminHtml(submission),
        });

        emailSent = true;

        // B. Send Confirmation Receipt to Client
        try {
          await transporter.sendMail({
            from: `"YUPEK Client Concierge" <${gmailUser}>`,
            to: submission.email,
            subject: `We have received your message — YUPEK Client Concierge`,
            html: generateInquiryClientHtml(submission, config.contactPhone),
          });
        } catch (clientMailErr) {
          console.warn("[Client auto-receipt notice]:", clientMailErr);
        }
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : "Email dispatch failed";
        console.error("[Contact notification email error]:", emailError);
      }
    } else {
      console.warn("[Contact notice]: Gmail SMTP password not configured, skipped email dispatch.");
    }

    return NextResponse.json({
      ok: true,
      submission,
      emailSent,
      emailError,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Error processing inquiry";
    console.error("[Contact route error]:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
