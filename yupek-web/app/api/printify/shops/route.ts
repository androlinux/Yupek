import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const backendUrl = getBackendApiUrl();
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "true";

  // 1. If backend URL is configured, forward to FastAPI backend
  if (backendUrl) {
    try {
      const url = new URL(`${backendUrl}/api/printify/shops`);
      if (refresh) url.searchParams.set("refresh", "true");

      const res = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to fetch shops from backend" }));
        return NextResponse.json(err, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (error: any) {
      console.error(`[Printify API] Error contacting backend at ${backendUrl}:`, error.message);
      // Fall through to resilient server-side fallback if available
    }
  }

  // 2. Resilient Server-Side Fallback:
  // If backend is not yet deployed or temporarily unreachable, query Printify API directly
  // from Next.js server runtime using PRINTIFY_API_TOKEN.
  // CRITICAL: The token is ONLY held and executed on the server, never exposed to the client.
  const token = process.env.PRINTIFY_API_TOKEN;
  if (token) {
    try {
      const pfyRes = await fetch("https://api.printify.com/v1/shops.json", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
        },
        cache: "no-store",
      });

      if (pfyRes.ok) {
        const rawShops = await pfyRes.json();
        const sanitized = Array.isArray(rawShops)
          ? rawShops.map((s: any) => ({
              id: s.id,
              title: s.title,
              sales_channel: s.sales_channel,
            }))
          : [];
        return NextResponse.json(sanitized);
      }
    } catch (err: any) {
      console.error("[Printify API] Server fallback error:", err.message);
    }
  }

  // 3. Diagnostic response (never exposes localhost/127.0.0.1 in production)
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json(
    {
      detail: isDev
        ? "Unable to connect to local backend on http://127.0.0.1:8000. Please start yupek-backend."
        : "Backend API is not reachable and PRINTIFY_API_TOKEN is not configured. Please configure BACKEND_URL or NEXT_PUBLIC_API_BASE_URL in your Vercel settings.",
    },
    { status: 502 }
  );
}
