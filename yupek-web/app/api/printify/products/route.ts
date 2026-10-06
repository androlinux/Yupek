import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/apiConfig";

export const dynamic = "force-dynamic";

function normalizeRawProduct(raw: any) {
  const pid = String(raw.id || "");
  const title = (raw.title || "Untitled Product").trim();
  const rawVariants = raw.variants || [];
  const activePrices: number[] = [];

  const normVariants = rawVariants.map((v: any) => {
    const priceCents = Number(v.price || 0);
    const priceEur = Math.round(priceCents) / 100;
    const isEnabled = v.is_enabled !== false;
    const isAvailable = v.is_available !== false;
    if (isEnabled && isAvailable && priceEur > 0) {
      activePrices.push(priceEur);
    }
    return {
      variant_id: v.id,
      title: v.title || "",
      sku: v.sku || "",
      price: priceEur,
      price_cents: priceCents,
      is_enabled: isEnabled,
      is_available: isAvailable,
      options: v.options || [],
    };
  });

  const basePrice =
    activePrices.length > 0
      ? Math.min(...activePrices)
      : normVariants[0]?.price || 0;

  const rawImages = raw.images || [];
  const normImages = rawImages.map((img: any, idx: number) => ({
    src: img.src || "",
    position: img.position ?? idx,
    variant_ids: img.variant_ids || [],
    is_default: Boolean(img.is_default ?? idx === 0),
  }));

  const cleanSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    printify_product_id: pid,
    title,
    slug: `${cleanSlug}-${pid}`,
    description: raw.description || "",
    tags: raw.tags || [],
    price: basePrice,
    currency: "EUR",
    images: normImages,
    variants: normVariants,
    sku: normVariants[0]?.sku || "",
    available: activePrices.length > 0 && raw.visible !== false,
    visible: raw.visible !== false,
    blueprint_id: raw.blueprint_id,
    print_provider_id: raw.print_provider_id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export async function GET(req: NextRequest) {
  const backendUrl = getBackendApiUrl();
  const { searchParams } = new URL(req.url);

  // 1. If backend URL is configured, forward request to FastAPI backend
  if (backendUrl) {
    try {
      const url = new URL(`${backendUrl}/api/printify/products`);
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });

      const res = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      } else {
        console.warn(`[Printify API] Backend at ${backendUrl} returned HTTP ${res.status}. Attempting direct server-side query.`);
      }
    } catch (error: any) {
      console.error(`[Printify API] Backend error at ${backendUrl}:`, error.message);
    }
  }

  // 2. Resilient Server-Side Fallback:
  // Query Printify API directly on server runtime using PRINTIFY_API_TOKEN.
  // Never exposes the token to client or response.
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = searchParams.get("shop_id") || process.env.PRINTIFY_SHOP_ID || "29215191";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  if (token) {
    try {
      const pfyUrl = `https://api.printify.com/v1/shops/${shopId}/products.json?page=${page}&limit=${limit}`;
      const pfyRes = await fetch(pfyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
        },
        cache: "no-store",
      });

      if (pfyRes.ok) {
        const rawData = await pfyRes.json();
        const rawList = rawData.data || (Array.isArray(rawData) ? rawData : []);
        const normalized = rawList.map(normalizeRawProduct);

        return NextResponse.json({
          products: normalized,
          total: Number(rawData.total || rawList.length),
          page: Number(rawData.current_page || page),
          last_page: Number(rawData.last_page || 1),
          per_page: Number(rawData.per_page || limit),
        });
      }
    } catch (err: any) {
      console.error("[Printify API] Direct query fallback error:", err.message);
    }
  }

  // 3. Clean production-safe error
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
