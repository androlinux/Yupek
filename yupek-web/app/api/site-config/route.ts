import { NextRequest, NextResponse } from "next/server";
import { defaultSiteConfig, SiteConfig, ProductOverride } from "@/lib/siteConfig";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

import { verifyAdminAuth } from "@/lib/adminAuth";

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "site-config.json");

// Helper to determine whether the caller has verified admin authorization
async function isCallerAdmin(req: NextRequest, body?: any, currentConfig?: SiteConfig): Promise<boolean> {
  const authRes = await verifyAdminAuth(req);
  if (authRes.authorized) return true;

  // Check if body contains matching admin password
  if (body && currentConfig) {
    const enteredPass = String(body.adminPassword || "").trim();
    const envAdmin = process.env.YUPEK_ADMIN_KEY?.trim();
    const isProd = process.env.NODE_ENV === "production";
    const configuredPass = String(envAdmin || currentConfig.adminPassword || (isProd ? "" : "yupek2026")).trim();
    if (enteredPass && configuredPass && enteredPass === configuredPass) {
      return true;
    }
    if (!isProd && enteredPass && (enteredPass === "yupek2026" || enteredPass === "admin")) {
      return true;
    }
  }

  return false;
}

// Sanitize configuration for public visitors: hide sensitive admin credentials & SMTP keys
function sanitizePublicConfig(config: SiteConfig): SiteConfig {
  return {
    ...config,
    adminPassword: "",
    smtpPass: "",
  };
}

// GET: Storefront & Admin read endpoint
export async function GET(request: NextRequest) {
  try {
    const { config } = await getOrMigrateSiteConfig();
    const isAdmin = await isCallerAdmin(request, undefined, config);

    if (isAdmin) {
      return NextResponse.json(config);
    }

    return NextResponse.json(sanitizePublicConfig(config));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error reading config";
    console.error("[SiteConfig GET Error]:", message);
    return NextResponse.json(sanitizePublicConfig(defaultSiteConfig));
  }
}

// POST: CMS "Save & Publish" endpoint
export async function POST(request: NextRequest) {
  try {
    const body: Partial<SiteConfig> = await request.json();
    const { config: currentConfig } = await getOrMigrateSiteConfig();

    // Enforce Admin Authentication
    if (!(await isCallerAdmin(request, body, currentConfig))) {
      return NextResponse.json(
        { error: "Unauthorized: Admin authentication is required to save site configuration." },
        { status: 401 }
      );
    }

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
      customProducts:
        body.customProducts !== undefined ? body.customProducts : currentConfig.customProducts || [],
      storeOrders:
        body.storeOrders !== undefined ? body.storeOrders : currentConfig.storeOrders || [],
      contactSubmissions:
        body.contactSubmissions !== undefined
          ? body.contactSubmissions
          : currentConfig.contactSubmissions || [],
      updatedAt: new Date().toISOString(),
    };

    // 1. PRIMARY PERSISTENCE: Save to Supabase (sole persistent source of truth)
    const supabase = getSupabaseServerClient();
    const { error: sbError } = await supabase.from("site_config").upsert({
      key: "global",
      value: updatedConfig,
      updated_at: new Date().toISOString(),
    });

    const isServerlessOrProd =
      Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

    if (sbError) {
      console.error("[SiteConfig Supabase Save Error]:", sbError);

      // In local dev ONLY, fallback to JSON file if Supabase table is missing or DB is offline
      if (!isServerlessOrProd) {
        try {
          await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
          await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(updatedConfig, null, 2), "utf-8");
          return NextResponse.json({
            ok: true,
            config: updatedConfig,
            persisted: "local_json_fallback",
            warning:
              "Supabase table 'site_config' not found. Persisted to local development JSON fallback. Please run supabase/migrations/002_site_config.sql in Supabase SQL Editor.",
          });
        } catch (diskErr) {
          console.error("[SiteConfig] Local disk fallback failed:", diskErr);
        }
      }

      if (sbError.code === "PGRST205") {
        return NextResponse.json(
          {
            error:
              "Supabase table 'site_config' not found. Please create it in Supabase SQL Editor using supabase/migrations/002_site_config.sql.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Database persistence error: ${sbError.message}` },
        { status: 500 }
      );
    }


    if (!isServerlessOrProd) {
      try {
        await fs.mkdir(path.dirname(CONFIG_FILE_PATH), { recursive: true });
        await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(updatedConfig, null, 2), "utf-8");
      } catch (diskErr) {
        // Non-fatal: disk write is optional local mirror only
        console.warn("[SiteConfig] Local disk mirror skipped:", diskErr);
      }
    }

    return NextResponse.json({ ok: true, config: updatedConfig, persisted: "supabase" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid configuration";
    console.error("[SiteConfig POST Error]:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
