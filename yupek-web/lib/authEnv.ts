/**
 * Environment-aware URL resolver for Yupek Authentication and OAuth.
 *
 * Requirements:
 * - Production -> https://www.yupek.shop
 * - Local development -> http://localhost:3000
 * - Production OAuth redirect -> https://www.yupek.shop/auth/callback
 * - Local OAuth redirect -> http://localhost:3000/auth/callback
 */

export const PRODUCTION_ORIGIN = "https://www.yupek.shop";
export const LOCAL_DEV_ORIGIN = "http://localhost:3000";

/**
 * Checks whether the current context is running in local development.
 * Safely inspects the browser window or the incoming server Request.
 */
export function isLocalDev(request?: Request): boolean {
  // Browser context
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local")
    );
  }

  // Server context with Request
  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    if (
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      host.includes("0.0.0.0")
    ) {
      return true;
    }
  }

  // Node environment check
  return process.env.NODE_ENV === "development";
}

/**
 * Resolves the base origin URL for the current environment.
 * - In local development: returns the local origin (e.g. http://localhost:3000).
 * - In production: returns https://www.yupek.shop.
 */
export function getBaseOrigin(request?: Request): string {
  // 1. Client-side evaluation
  if (typeof window !== "undefined") {
    if (isLocalDev()) {
      return window.location.origin || LOCAL_DEV_ORIGIN;
    }
    return PRODUCTION_ORIGIN;
  }

  // 2. Server-side evaluation with Request
  if (request) {
    if (isLocalDev(request)) {
      const host =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "localhost:3000";
      const proto =
        request.headers.get("x-forwarded-proto") || "http";
      return `${proto}://${host}`;
    }
    return PRODUCTION_ORIGIN;
  }

  // 3. Server-side fallback without Request
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_SITE_URL || LOCAL_DEV_ORIGIN;
  }

  return PRODUCTION_ORIGIN;
}

/**
 * Generates the OAuth redirect URL for Supabase signInWithOAuth.
 * - In Production: https://www.yupek.shop/auth/callback
 * - In Local Development: http://localhost:3000/auth/callback (or current local origin)
 */
export function getOAuthRedirectUrl(nextPath?: string): string {
  const origin = getBaseOrigin();
  const callbackUrl = `${origin}/auth/callback`;
  if (
    nextPath &&
    nextPath !== "/account" &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//") &&
    !nextPath.startsWith("/\\") &&
    !nextPath.includes("\\")
  ) {
    return `${callbackUrl}?next=${encodeURIComponent(nextPath)}`;
  }
  return callbackUrl;
}
