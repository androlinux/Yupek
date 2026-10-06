import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = getBackendApiUrl();

  // 1. Try FastAPI backend if configured
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/printify/webhooks`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err: any) {
      console.warn(`[Printify Webhooks] Backend GET failed at ${backendUrl}:`, err.message);
    }
  }

  // 2. Server-side direct Printify query fallback
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "PRINTIFY_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.printify.com/v1/shops/29215191/webhooks.json", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Printify API error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const sanitized = Array.isArray(data)
      ? data.map((h: any) => ({
          id: h.id,
          topic: h.topic,
          url: h.url,
          shop_id: h.shop_id,
        }))
      : [];

    return NextResponse.json(sanitized);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  const backendUrl = getBackendApiUrl();

  // 1. Try FastAPI backend if configured
  if (backendUrl) {
    try {
      const res = await fetch(
        `${backendUrl}/api/printify/webhooks/ensure?shop_id=29215191&url=https://www.yupek.shop/api/printify/webhook`,
        {
          method: "POST",
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err: any) {
      console.warn(`[Printify Webhooks] Backend POST failed at ${backendUrl}:`, err.message);
    }
  }

  // 2. Server-side direct Printify registration fallback
  const token = process.env.PRINTIFY_API_TOKEN;
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { error: "PRINTIFY_API_TOKEN or PRINTIFY_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const topics = [
    "product:created",
    "product:updated",
    "product:deleted",
    "product:publish:started",
  ];
  const targetUrl = "https://www.yupek.shop/api/printify/webhook";

  try {
    const listRes = await fetch("https://api.printify.com/v1/shops/29215191/webhooks.json", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
      },
      cache: "no-store",
    });

    const existing = listRes.ok ? await listRes.json() : [];
    const existingByTopic = new Map<string, any>();
    if (Array.isArray(existing)) {
      for (const h of existing) {
        if (h.url === targetUrl) {
          existingByTopic.set(h.topic, h);
        }
      }
    }

    const registered: any[] = [];
    for (const topic of topics) {
      if (existingByTopic.has(topic)) {
        registered.push(existingByTopic.get(topic));
      } else {
        const createRes = await fetch("https://api.printify.com/v1/shops/29215191/webhooks.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            url: targetUrl,
            secret,
          }),
        });

        if (createRes.ok) {
          const created = await createRes.json();
          registered.push({
            id: created.id,
            topic: created.topic,
            url: created.url,
            shop_id: created.shop_id,
          });
        }
      }
    }

    return NextResponse.json({ status: "ok", webhooks: registered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
