import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://umopnncjoswyilibslep.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_xGCmb036JS-dQiAi0KxWVw_LKUjQyfB";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
export { getOAuthRedirectUrl, getBaseOrigin, isLocalDev } from "./authEnv";
