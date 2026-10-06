/**
 * Centralized API & Backend URL Resolver for YUPEK.
 *
 * Rules:
 * 1. Checks BACKEND_URL (server-only) and NEXT_PUBLIC_API_BASE_URL (public/universal).
 * 2. In production (NODE_ENV === "production"), NEVER returns or defaults to 127.0.0.1 or localhost.
 * 3. In local development (NODE_ENV === "development"), falls back to "http://127.0.0.1:8000" if unconfigured.
 * 4. Strips trailing slashes to guarantee clean endpoint URL concatenation.
 */

export function getBackendApiUrl(): string | null {
  const rawUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  if (rawUrl && typeof rawUrl === "string" && rawUrl.trim().length > 0) {
    const trimmed = rawUrl.trim().replace(/\/+$/, "");

    // Enforce production security: Never allow localhost or 127.0.0.1 in production builds
    if (process.env.NODE_ENV === "production") {
      if (trimmed.includes("127.0.0.1") || trimmed.includes("localhost")) {
        console.warn(
          "[API Config] Ignored localhost backend URL in production environment:",
          trimmed
        );
        return null;
      }
    }

    return trimmed;
  }

  // Development-only fallback
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }

  return null;
}
