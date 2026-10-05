import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBaseOrigin } from "@/lib/authEnv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  // Dynamically resolve base origin:
  // - Production -> https://www.yupek.shop
  // - Local development -> http://localhost:3000
  const baseOrigin = getBaseOrigin(request);

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://umopnncjoswyilibslep.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_xGCmb036JS-dQiAi0KxWVw_LKUjQyfB",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure target destination is safe relative path
      const targetPath = next.startsWith("/") ? next : `/${next}`;
      return NextResponse.redirect(`${baseOrigin}${targetPath}`);
    } else {
      console.error("[Auth Callback] Exchange code error:", error.message);
    }
  }

  // Return the user to home with auth_error indicator using the environment base origin
  return NextResponse.redirect(`${baseOrigin}/?auth_error=1`);
}
