import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getOrderRecordById } from "@/lib/orderPersistence";
import { sanitizeCustomerOrder } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://umopnncjoswyilibslep.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_xGCmb036JS-dQiAi0KxWVw_LKUjQyfB",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    let activeUser = (await supabase.auth.getUser()).data.user;

    if (!activeUser) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        activeUser = (await supabase.auth.getUser(token)).data.user;
      }
    }

    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await getOrderRecordById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Security check: Customer A must NEVER access Customer B's order
    const isOwner =
      order.user_id === activeUser.id ||
      (activeUser.email && order.customer_email.toLowerCase() === activeUser.email.toLowerCase());

    const isAdmin = activeUser.app_metadata?.role === "admin";

    if (!isOwner && !isAdmin) {
      // Return 404 to avoid leaking order existence
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const sanitizedOrder = sanitizeCustomerOrder(order);

    return NextResponse.json({
      success: true,
      order: sanitizedOrder,
    });
  } catch (err: any) {
    console.error("[Customer Order Detail GET Error]", err);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
