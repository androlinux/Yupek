import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getUserOrders } from "@/lib/orderPersistence";
import { sanitizeCustomerOrder } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Also check Authorization header bearer token
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: userFromToken } = await supabase.auth.getUser(token);
        if (!userFromToken?.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const orders = await getUserOrders(userFromToken.user.id, userFromToken.user.email);
        const sanitizedOrders = (orders || []).map(sanitizeCustomerOrder);
        return NextResponse.json({ success: true, orders: sanitizedOrders });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getUserOrders(user.id, user.email);
    const sanitizedOrders = (orders || []).map(sanitizeCustomerOrder);

    return NextResponse.json({
      success: true,
      orders: sanitizedOrders,
    });
  } catch (err: any) {
    console.error("[Customer Orders GET Error]", err);
    return NextResponse.json({ error: "Failed to retrieve orders" }, { status: 500 });
  }
}
