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

function matchesAdminSecret(
  candidate?: string | null,
  envKey?: string,
  customPass?: string
): boolean {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;

  // 1. Check against environment secret (YUPEK_ADMIN_KEY / ADMIN_KEY)
  if (envKey && safeCompare(trimmed, envKey)) return true;

  // 2. Check against custom site config password saved in Supabase
  if (customPass && safeCompare(trimmed, customPass)) return true;

  // 3. Check against default admin passwords
  if (safeCompare(trimmed, "yupek2026") || safeCompare(trimmed, "admin")) return true;

  return false;
}

/**
 * Verify whether a request has valid server-side administrator authorization.
 *
 * Accepted:
 * 1. Admin key header (x-yupek-admin-key) matching env key, custom password, or default admin key
 * 2. Bearer token matching admin secret
 * 3. Authenticated Supabase session or Bearer JWT where app_metadata.role === "admin" or owner email
 *
 * Strictly REJECTED:
 * - Client boolean flags (e.g. x-yupek-admin-auth: true)
 * - Query parameters (?role=admin, ?is_admin=true)
 * - Non-admin customer sessions
 * - Unauthenticated requests
 */
export async function verifyAdminAuth(req: NextRequest): Promise<{
  authorized: boolean;
  errorStatus?: number;
  errorMessage?: string;
}> {
  const { config } = await getOrMigrateSiteConfig();
  const envAdminKey = (
    process.env.YUPEK_ADMIN_KEY ||
    process.env.ADMIN_KEY ||
    process.env.ADMIN_PASSWORD
  )?.trim();
  const customPass = config.adminPassword?.trim();

  // 1. Check verified admin key header (constant-time comparison)
  const adminKey = req.headers.get("x-yupek-admin-key")?.trim();
  if (adminKey && matchesAdminSecret(adminKey, envAdminKey, customPass)) {
    return { authorized: true };
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && matchesAdminSecret(token, envAdminKey, customPass)) {
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
        if (user.app_metadata?.role === "admin" || user.email === "daniyarow16@gmail.com") {
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
      if (user.app_metadata?.role === "admin" || user.email === "daniyarow16@gmail.com") {
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
