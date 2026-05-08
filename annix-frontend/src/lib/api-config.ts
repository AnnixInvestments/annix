const FALLBACK_BASE_URL = "http://localhost:4001/api";

/**
 * Rewrite any "localhost" inside a URL to "127.0.0.1" for server-side
 * fetches. Node 24's undici resolves "localhost" to ::1 first and can
 * ECONNREFUSED against an IPv4-only NestJS listener; the loopback IP
 * sidesteps the resolution race. Browser-side fetches don't have this
 * problem (the browser uses the OS DNS stack, not undici), so this
 * helper is only needed by API routes / server actions.
 *
 * Idempotent: passing through an already-127.0.0.1 URL is a no-op.
 * Leaves non-loopback hostnames (e.g. annix-backend.fly.dev) untouched.
 */
export function ipv4LocalhostUrl(url: string): string {
  return url.replace(/\blocalhost\b/g, "127.0.0.1");
}

const normalizeOrigin = (origin?: string | null) => {
  if (!origin) {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    }
    return "http://localhost:3000";
  }
  return origin;
};

export const resolveBaseUrl = (originHint?: string | null) => {
  const envValue = process.env.NEXT_PUBLIC_API_URL;
  if (!envValue) {
    return FALLBACK_BASE_URL;
  }

  const trimmed = envValue.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "/undefined" || trimmed === "null") {
    return FALLBACK_BASE_URL;
  }

  if (trimmed.startsWith("/")) {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    if (typeof window !== "undefined") {
      return `${window.location.origin}${trimmed}`;
    }
    const origin = normalizeOrigin(originHint);
    return `${origin}${trimmed}`;
  }

  return trimmed;
};

export function browserBaseUrl(): string {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window !== "undefined") {
    const envValue = process.env.NEXT_PUBLIC_API_URL;
    if (envValue?.startsWith("http") && envValue !== window.location.origin) {
      return `${window.location.origin}/api`;
    }
    return resolveBaseUrl(window.location.origin);
  }
  return resolveBaseUrl();
}

export const API_BASE_URL = browserBaseUrl();

export const apiConfig = {
  basePath: browserBaseUrl(),
};

export const getAuthHeaders = (): Record<string, string> => {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return {};
};

export const annixRepAuthHeaders = (): Record<string, string> => {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("annixRepAccessToken") ?? sessionStorage.getItem("annixRepAccessToken");
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return {};
};
