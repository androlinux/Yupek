import { NextResponse } from "next/server";
import { defaultSiteConfig, SiteConfig, ProductOverride } from "@/lib/siteConfig";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "site-config.json");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://umopnncjoswyilibslep.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_xGCmb036JS-dQiAi0KxWVw_LKUjQyfB";

// Read configuration from persistent disk file
async function readConfigFromDisk(): Promise<SiteConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultSiteConfig,
      ...parsed,
      productOverrides: {
        ...(defaultSiteConfig.productOverrides || {}),
        ...(parsed.productOverrides || {}),
      },
      storeOrders: parsed.storeOrders || defaultSiteConfig.storeOrders || [],
      contactSubmissions: parsed.contactSubmissions || defaultSiteConfig.contactSubmissions || [],
    };
  } catch {
    // If file doesn't exist yet, create it with defaultSiteConfig
    try {
      await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
      await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(defaultSiteConfig, null, 2), "utf-8");
    } catch {
      // ignore
    }
    return { ...defaultSiteConfig };
  }
}

// Write configuration to persistent disk file
async function writeConfigToDisk(config: SiteConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET() {
  try {
    const diskConfig = await readConfigFromDisk();
    return NextResponse.json(diskConfig);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error reading config";
    console.error("[SiteConfig GET Error]:", message);
    return NextResponse.json(defaultSiteConfig);
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<SiteConfig> = await request.json();
    const currentConfig = await readConfigFromDisk();

    // Deep merge product overrides per slug
    let mergedOverrides: Record<string, ProductOverride> = {
      ...(currentConfig.productOverrides || {}),
    };

    if (body.productOverrides !== undefined) {
      if (Object.keys(body.productOverrides).length === 0 && (body as any)._reset) {
        mergedOverrides = {};
      } else {
        for (const [slug, override] of Object.entries(body.productOverrides)) {
          if (override === null || (override as any)._clear) {
            delete mergedOverrides[slug];
          } else {
            mergedOverrides[slug] = {
              ...(mergedOverrides[slug] || {}),
              ...override,
            };
          }
        }
      }
    }

    const updatedConfig: SiteConfig = {
      ...currentConfig,
      ...body,
      productOverrides: mergedOverrides,
      storeOrders: body.storeOrders !== undefined ? body.storeOrders : currentConfig.storeOrders || [],
      contactSubmissions:
        body.contactSubmissions !== undefined ? body.contactSubmissions : currentConfig.contactSubmissions || [],
      updatedAt: new Date().toISOString(),
    };

    // 1. Write to persistent local disk file
    await writeConfigToDisk(updatedConfig);

    // 2. Try to sync to Supabase if table exists
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      await supabase.from("site_config").upsert({
        key: "global",
        value: updatedConfig,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Supabase is optional; local file is guaranteed source of truth
    }

    return NextResponse.json({ ok: true, config: updatedConfig });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid config";
    console.error("[SiteConfig POST Error]:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
