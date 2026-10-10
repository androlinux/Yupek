import { defaultSiteConfig, SiteConfig } from "@/lib/siteConfig";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import initialSiteConfig from "@/data/site-config.json";

// Fetch site configuration from Supabase (sole source of truth), with automatic migration and local JSON fallback
export async function getOrMigrateSiteConfig(): Promise<{
  config: SiteConfig;
  source: "supabase" | "json_migrated" | "json_fallback";
}> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "global")
      .maybeSingle();

    // 1. Supabase has the persistent configuration
    if (!error && data?.value && typeof data.value === "object") {
      const dbConfig = data.value as Partial<SiteConfig>;
      const merged: SiteConfig = {
        ...defaultSiteConfig,
        ...dbConfig,
        adminPassword: (dbConfig.adminPassword && dbConfig.adminPassword.trim()) || defaultSiteConfig.adminPassword || "yupek2026",
        productOverrides: {
          ...(defaultSiteConfig.productOverrides || {}),
          ...(dbConfig.productOverrides || {}),
        },
        customProducts: dbConfig.customProducts || defaultSiteConfig.customProducts || [],
        storeOrders: dbConfig.storeOrders || defaultSiteConfig.storeOrders || [],
        contactSubmissions: dbConfig.contactSubmissions || defaultSiteConfig.contactSubmissions || [],
      };
      return { config: merged, source: "supabase" };
    }

    // 2. Table exists but row "global" does not exist yet: Auto-migrate initial JSON to Supabase
    if (!error && !data) {
      console.log("[SiteConfig] Row 'global' empty. Migrating site-config.json to Supabase...");
      const initial: SiteConfig = {
        ...defaultSiteConfig,
        ...(initialSiteConfig as unknown as Partial<SiteConfig>),
      };

      try {
        await supabase.from("site_config").upsert({
          key: "global",
          value: initial,
          updated_at: new Date().toISOString(),
        });
        return { config: initial, source: "json_migrated" };
      } catch (upsertErr) {
        console.warn("[SiteConfig] Auto-migration upsert failed:", upsertErr);
        return { config: initial, source: "json_fallback" };
      }
    }

    // 3. Table does not exist or connection failed: fallback to bundled initial config
    if (error) {
      console.warn("[SiteConfig] Supabase query notice:", error.message || error);
    }
  } catch (err: unknown) {
    console.warn("[SiteConfig] Supabase fetch notice:", err instanceof Error ? err.message : err);
  }

  // Fallback to local initialSiteConfig
  return {
    config: {
      ...defaultSiteConfig,
      ...(initialSiteConfig as unknown as Partial<SiteConfig>),
    },
    source: "json_fallback",
  };
}
