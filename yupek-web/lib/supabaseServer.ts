import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://umopnncjoswyilibslep.supabase.co";

// Use SUPABASE_SERVICE_ROLE_KEY if set on the server, otherwise fallback to anon key
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_xGCmb036JS-dQiAi0KxWVw_LKUjQyfB";

let serverClientInstance: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClientInstance) {
    serverClientInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClientInstance;
}
