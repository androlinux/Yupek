import crypto from "crypto";
import { NextRequest } from "next/server";
import { getOrMigrateSiteConfig } from "@/lib/siteConfigServer";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function safeCompare(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a.trim());
  const bufB = Buffer.from(b.trim());
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify whether a request has valid server-side administrator authorization.
 *
 * Accepted:
 * 1. Admin key header (x-yupek-admin-key) matching configured secret
 * 2. Bearer token matching admin key
 * 3. Authenticated Supabase session or Bearer JWT where app_metadata.role === "admin"
 *
 * Strictly REJECTED:
 * - Client boolean flags (e.g. x-yupek-admin-auth: true)
 * - Query parameters (?role=admin, ?is_admin=true)
 * - User metadata (user_metadata.role: admin)
 * - Client cookies (admin=true)
 * - Default development passwords in production
 */
export async function verifyAdminAuth(req: NextRequest): Promise<{
  authorized: boolean;
  errorStatus?: number;
  errorMessage?: string;
}> {
  const isProd =
    Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

  const { config } = await getOrMigrateSiteConfig();
  const envAdminKey = process.env.YUPEK_ADMIN_KEY?.trim();
  const configuredPass = (
    envAdminKey ||
    (config.adminPassword && config.adminPassword.trim()) ||
    (isProd ? "" : "yupek2026")
  ).trim();

  // 1. Check verified admin key header (constant-time comparison)
  const adminKey = req.headers.get("x-yupek-admin-key")?.trim();
  if (adminKey) {
    if (configuredPass && safeCompare(adminKey, configuredPass)) {
      return { authorized: true };
    }
    if (!isProd && (adminKey === "yupek2026" || adminKey === "admin")) {
      return { authorized: true };
    }
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (configuredPass && safeCompare(token, configuredPass)) {
      return { authorized: true };
    }
    if (!isProd && (token === "yupek2026" || token === "admin")) {
      return { authorized: true };
    }

    // Attempt to verify Supabase JWT token
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
          "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          "placeholder-key",
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll() {},
          },
        }
      );
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        if (user.app_metadata?.role === "admin") {
          return { authorized: true };
        }
        return {
          authorized: false,
          errorStatus: 403,
          errorMessage:
            "Forbidden: Customer cannot perform administrator operations.",
        };
      }
    } catch {}
  }

  // 3. Attempt to check active Supabase cookie session
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "placeholder-key",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      if (user.app_metadata?.role === "admin") {
        return { authorized: true };
      }
      return {
        authorized: false,
        errorStatus: 403,
        errorMessage:
          "Forbidden: Customer cannot perform administrator operations.",
      };
    }
  } catch {}

  return {
    authorized: false,
    errorStatus: 401,
    errorMessage: "Unauthorized: Administrator authentication required.",
  };
}
