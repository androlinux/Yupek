import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    const submission = {
      id: `sub-${Date.now()}`,
      name,
      email,
      phone: phone || "",
      subject: subject || "General Inquiry",
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Try saving to Supabase if available
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("contact_submissions").insert({
        name,
        email,
        phone,
        subject: submission.subject,
        message,
      });
    } catch {
      // ignore db error, frontend state handles storage
    }

    return NextResponse.json({ ok: true, submission });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error processing inquiry";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
