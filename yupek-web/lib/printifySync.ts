import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { defaultSiteConfig, SiteConfig } from "@/lib/siteConfig";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isExcludedSize } from "@/lib/catalog";

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "site-config.json");
const STATUS_FILE_PATH = path.join(process.cwd(), "data", "printify-sync-status.json");


export interface PrintifySyncMetadata {
  processed_event_ids: string[];
  last_webhook_received: string | null;
  last_sync: string | null;
  products_synced: number;
  sync_errors: number;
  events: Array<{
    event_id: string;
    event_type: string;
    shop_id: string;
    resource_id?: string;
    status: string;
    time: string;
  }>;
}

export function verifyPrintifySignature(
  rawBody: Buffer | string,
  signatureHeader: string | null,
  secret?: string
): boolean {
  const signingSecret = secret || process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!signingSecret || !signatureHeader) return false;

  try {
    const hmac = crypto.createHmac("sha256", signingSecret);
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf-8");
    const expected = hmac.update(bodyBuffer).digest("hex");

    let candidate = signatureHeader.trim();
    if (candidate.toLowerCase().startsWith("sha256=")) {
      candidate = candidate.slice(7).trim();
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected.toLowerCase()),
      Buffer.from(candidate.toLowerCase())
    );
  } catch {
    return false;
  }
}

export async function readSyncMetadata(): Promise<PrintifySyncMetadata> {
  try {
    const raw = await fs.readFile(STATUS_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      processed_event_ids: [],
      last_webhook_received: null,
      last_sync: null,
      products_synced: 0,
      sync_errors: 0,
      events: [],
    };
  }
}

export async function saveSyncMetadata(meta: PrintifySyncMetadata): Promise<void> {
  const isServerlessOrProd =
    Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  if (isServerlessOrProd) {
    return;
  }
  try {
    await fs.mkdir(path.dirname(STATUS_FILE_PATH), { recursive: true });
    // Keep bounded history
    if (meta.processed_event_ids.length > 200) {
      meta.processed_event_ids = meta.processed_event_ids.slice(-200);
    }
    if (meta.events.length > 50) {
      meta.events = meta.events.slice(-50);
    }
    await fs.writeFile(STATUS_FILE_PATH, JSON.stringify(meta, null, 2), "utf-8");
  } catch {
    // ignore in read-only serverless if non-fatal
  }
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .limit(1);
    if (data && data.length > 0) {
      return true;
    }
  } catch {}
  const meta = await readSyncMetadata();
  return meta.processed_event_ids.includes(eventId);
}

export async function recordEvent(
  eventId: string,
  eventType: string,
  shopId: string,
  resourceId?: string,
  status = "processed",
  errorMessage?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const meta = await readSyncMetadata();
  if (eventId && !meta.processed_event_ids.includes(eventId)) {
    meta.processed_event_ids.push(eventId);
  }
  meta.last_webhook_received = nowIso;
  meta.events.push({
    event_id: eventId,
    event_type: eventType,
    shop_id: shopId,
    resource_id: resourceId,
    status,
    time: nowIso,
  });
  if (status === "error") {
    meta.sync_errors = (meta.sync_errors || 0) + 1;
  }
  await saveSyncMetadata(meta);

  // Sync to Supabase if table exists
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("webhook_events").upsert({
      event_id: eventId,
      event_type: eventType,
      shop_id: shopId,
      resource_id: resourceId || "",
      status,
      error_message: errorMessage,
      processed_at: nowIso,
    });
  } catch {}
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function inferCategory(title: string, tags: string[]): "tees" | "shirts" | "sweatshirts" | "trousers" | "denim" | "accessories" {
  const content = `${title.toLowerCase()} ${tags.join(" ").toLowerCase()}`;
  if (content.includes("hoodie") || content.includes("sweatshirt") || content.includes("fleece")) {
    return "sweatshirts";
  }
  if (content.includes("woven shirt") || content.includes("button") || content.includes("silk-inspired")) {
    return "shirts";
  }
  if (content.includes("t-shirt") || content.includes("tee") || content.includes("tank")) {
    return "tees";
  }
  if (content.includes("trouser") || content.includes("pant") || content.includes("chino")) {
    return "trousers";
  }
  if (content.includes("denim") || content.includes("jean")) {
    return "denim";
  }
  if (content.includes("tote") || content.includes("bag") || content.includes("cap") || content.includes("hat") || content.includes("accessory")) {
    return "accessories";
  }
  return "tees";
}

async function readSiteConfig(): Promise<SiteConfig> {
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "global")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      return {
        ...defaultSiteConfig,
        ...(data.value as any),
      };
    }
  } catch {}

  try {
    const raw = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { ...defaultSiteConfig };
  }
}

async function writeSiteConfig(cfg: SiteConfig): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("site_config").upsert({
      key: "global",
      value: cfg,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[printifySync] Supabase config upsert error:", err);
  }

  const isServerlessOrProd =
    Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  if (!isServerlessOrProd) {
    try {
      await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
      await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    } catch {}
  }
}

export async function syncPrintifyProductLocal(
  productId: string,
  eventType: string = "manual",
  shopId: string = "29215191"
): Promise<{ status: string; action: string; productId: string; title?: string }> {
  // Validate shop: Only 29215191
  if (shopId !== "29215191") {
    return { status: "ignored", action: "shop_mismatch", productId };
  }

  const nowIso = new Date().toISOString();
  const cfg = await readSiteConfig();
  const customProducts = cfg.customProducts || [];
  const overrides = cfg.productOverrides || {};

  // Handle SOFT DELETE
  if (eventType === "product:deleted") {
    for (const p of customProducts) {
      if (String(p.supplierProductId) === String(productId) || p.id === `printify-${productId}`) {
        if (p.slug) {
          overrides[p.slug] = {
            ...(overrides[p.slug] || {}),
            deleted: true,
          };
        }
      }
    }
    cfg.productOverrides = overrides;
    cfg.updatedAt = nowIso;
    await writeSiteConfig(cfg);

    const meta = await readSyncMetadata();
    meta.last_sync = nowIso;
    await saveSyncMetadata(meta);

    return { status: "archived", action: "soft_deleted", productId };
  }

  // Fetch product from Printify API
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error("PRINTIFY_API_TOKEN is not configured.");
  }

  const res = await fetch(`https://api.printify.com/v1/shops/29215191/products/${productId}.json`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Printify API error ${res.status}: ${errText.slice(0, 150)}`);
  }

  const raw = await res.json();
  const title = (raw.title || "Untitled Product").trim();
  const slug = slugify(`${title}-${productId}`);
  const tags: string[] = raw.tags || [];
  const category = inferCategory(title, tags);

  // Extract variants & prices using actual Printify option metadata
  const variants = raw.variants || [];
  const activePrices: number[] = [];

  const colorOpt = (raw.options || []).find((o: any) => o.type === "color" || /color/i.test(o.name));
  const sizeOpt = (raw.options || []).find((o: any) => o.type === "size" || /size/i.test(o.name));

  const colorMap = new Map<number, string>();
  if (colorOpt?.values) {
    for (const val of colorOpt.values) {
      colorMap.set(val.id, String(val.title).trim());
    }
  }

  const sizeMap = new Map<number, string>();
  if (sizeOpt?.values) {
    for (const val of sizeOpt.values) {
      sizeMap.set(val.id, String(val.title).trim());
    }
  }

  const normVariants: any[] = [];

  for (const v of variants) {
    const priceEur = Math.round((v.price || 0)) / 100;
    const isEnabled = v.is_enabled !== false;
    const isAvailable = v.is_available !== false;
    if (isEnabled && isAvailable && priceEur > 0) {
      activePrices.push(priceEur);
    }

    let color = "";
    let size = "";

    if (Array.isArray(v.options)) {
      for (const optId of v.options) {
        if (colorMap.has(optId)) {
          color = colorMap.get(optId)!;
        }
        if (sizeMap.has(optId)) {
          size = sizeMap.get(optId)!;
        }
      }
    }

    // Resilient fallback only if options ID didn't resolve
    if (!color || !size) {
      const parts = String(v.title || "").split("/").map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!color && Array.from(colorMap.values()).includes(p)) {
          color = p;
        } else if (!size && Array.from(sizeMap.values()).includes(p)) {
          size = p;
        }
      }
    }

    // Completely exclude oversized garments (3XL, 4XL, 5XL)
    if (isExcludedSize(size) || isExcludedSize(v.title)) {
      continue;
    }

    normVariants.push({
      variant_id: v.id,
      title: v.title,
      size,
      color,
      price_cents: v.price || 0,
      is_enabled: isEnabled,
      is_available: isAvailable,
      sku: v.sku,
      options: v.options || [],
    });
  }

  const enabledVariants = normVariants.filter((v) => v.is_enabled && v.is_available);

  // Natural ordered sizes from sizeOpt.values
  let distinctSizes: string[] = [];
  if (sizeOpt?.values) {
    const presentSizes = new Set(enabledVariants.map((v) => v.size).filter(Boolean));
    distinctSizes = sizeOpt.values
      .map((v: any) => String(v.title).trim())
      .filter((t: string) => presentSizes.has(t));
  }
  if (distinctSizes.length === 0) {
    distinctSizes = Array.from(new Set(enabledVariants.map((v) => v.size).filter(Boolean)));
  }
  distinctSizes = distinctSizes.filter((s) => !isExcludedSize(s));
  if (distinctSizes.length === 0) {
    distinctSizes = ["S", "M", "L", "XL"];
  }

  // Natural ordered colors from colorOpt.values
  let distinctColors: string[] = [];
  if (colorOpt?.values) {
    const presentColors = new Set(enabledVariants.map((v) => v.color).filter(Boolean));
    distinctColors = colorOpt.values
      .map((v: any) => String(v.title).trim())
      .filter((t: string) => presentColors.has(t));
  }
  if (distinctColors.length === 0) {
    distinctColors = Array.from(new Set(enabledVariants.map((v) => v.color).filter(Boolean)));
  }
  if (distinctColors.length === 0) {
    distinctColors = ["White"];
  }

  const detailedImages = (raw.images || [])
    .map((img: any) => ({
      src: img.src,
      variant_ids: img.variant_ids || [],
      position: img.position || "front",
      is_default: Boolean(img.is_default),
    }))
    .filter((img: any) => Boolean(img.src));

  const imageUrls = detailedImages.map((img: any) => img.src);
  const basePrice = activePrices.length > 0 ? Math.min(...activePrices) : 49;
  const firstSku = variants[0]?.sku || "YPK-PFY";
  const isPublishReview = eventType === "product:publish:started";

  const newOrUpdatedProduct = {
    id: `printify-${productId}`,
    slug,
    name: title,
    descriptor: "",
    price: basePrice,
    currency: "EUR" as const,
    category,
    gender: "unisex" as const,
    sizes: distinctSizes,
    colors: distinctColors,
    description: raw.description || "Contemporary garment crafted from premium textiles with Eastern heritage and European tailoring.",
    material: "100% premium quality fabric tailored for modern living.",
    images: imageUrls,
    detailedImages,
    options: (raw.options || []).map((opt: any) => {
      const isSizeOpt = opt.type?.toLowerCase() === "size" || opt.name?.toLowerCase() === "size";
      if (!isSizeOpt || !opt.values) return opt;
      return {
        ...opt,
        values: opt.values.filter((val: any) => !isExcludedSize(val.title)),
      };
    }),
    variants: normVariants,
    featured: false,
    newArrival: true,
    badge: eventType === "product:created" ? "NEW" : undefined,
    tags,
    supplier: "Printify",
    supplierProductId: String(productId),
    supplierPrice: basePrice,
    inventory: 50,
  };

  const existingIdx = customProducts.findIndex(
    (p) => String(p.supplierProductId) === String(productId) || p.slug === slug
  );

  let action = "created";
  if (existingIdx >= 0) {
    customProducts[existingIdx] = {
      ...customProducts[existingIdx],
      ...newOrUpdatedProduct,
    };
    if (overrides[slug]?.deleted) {
      overrides[slug].deleted = false;
    }
    action = "updated";
  } else {
    customProducts.push(newOrUpdatedProduct);
  }

  // If publish started, admin will review before public visibility
  if (isPublishReview) {
    action = "awaiting_review";
  }

  cfg.customProducts = customProducts;
  cfg.productOverrides = overrides;
  cfg.updatedAt = nowIso;
  await writeSiteConfig(cfg);

  // Sync to Supabase if configured
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("products").upsert({
      slug,
      name: title,
      description: raw.description || "",
      category,
      gender: "unisex",
      tags,
      status: isPublishReview ? "draft" : "active",
      supplier_product_id: String(productId),
      printify_product_id: String(productId),
      supplier_price_cents: Math.round(basePrice * 100),
    });
  } catch {}

  const meta = await readSyncMetadata();
  meta.last_sync = nowIso;
  meta.products_synced = customProducts.filter((p) => p.supplier === "Printify").length;
  await saveSyncMetadata(meta);

  return { status: "success", action, productId, title };
}
