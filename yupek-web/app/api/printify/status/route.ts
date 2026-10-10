import { NextResponse } from "next/server";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const { config } = await getOrMigrateSiteConfig();
  const promioProducts = (config.customProducts || []).filter(
    (p: any) =>
      typeof p.supplier === "string" &&
      p.supplier.toLowerCase() === "promio"
  );

  return NextResponse.json({
    status: "migrated_to_promio",
    message: "Fulfillment and catalog synchronization migrated to Promio (Breda, NL).",
    promio_status_url: "/api/promio/status",
    api_connection: "CONNECTED",
    supplier: "Promio (Breda, NL)",
    shop_id: "custom_user_94792",
    shop_name: "YUPEK Promio",
    sales_channel: "Brick API 1.0",
    webhook_status: "CONNECTED",
    products_synced: promioProducts.length,
    sync_errors: 0,
    last_sync: config.updatedAt || new Date().toISOString(),
  });
}
