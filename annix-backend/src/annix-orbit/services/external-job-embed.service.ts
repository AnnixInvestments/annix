import { Injectable, Logger } from "@nestjs/common";
import { nowMillis } from "../../lib/datetime";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ORIGINS = 500;
const PROBE_TIMEOUT_MS = 5000;

// Server-side probes must never be steerable to internal services (SSRF).
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1?\]?$/,
  /\.(local|internal|flycast)$/i,
];

/**
 * Answers "can this external job listing be shown in an iframe?" so the
 * seeker UI can fall back to open-in-new-tab instead of rendering a blank
 * frame. Most job boards (e.g. Adzuna: X-Frame-Options: DENY) refuse
 * embedding; the browser gives no programmatic signal when a cross-origin
 * frame is blocked, so the check has to happen server-side. Results are
 * cached per origin — frame policies are site-wide in practice.
 */
@Injectable()
export class ExternalJobEmbedService {
  private readonly logger = new Logger(ExternalJobEmbedService.name);
  private readonly cache = new Map<string, { embeddable: boolean; expiresAt: number }>();

  async checkEmbeddable(rawUrl: string): Promise<{ embeddable: boolean }> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { embeddable: false };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { embeddable: false };
    }
    if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
      return { embeddable: false };
    }

    const cached = this.cache.get(url.origin);
    if (cached && cached.expiresAt > nowMillis()) {
      return { embeddable: cached.embeddable };
    }

    const embeddable = await this.probe(url);
    if (this.cache.size >= CACHE_MAX_ORIGINS) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(url.origin, { embeddable, expiresAt: nowMillis() + CACHE_TTL_MS });
    return { embeddable };
  }

  private async probe(url: URL): Promise<boolean> {
    const headers = (await this.fetchHeaders(url, "HEAD")) ?? (await this.fetchHeaders(url, "GET"));
    if (!headers) {
      // Unreachable from the server — assume the iframe would fail too.
      return false;
    }
    const frameOptions = headers.get("x-frame-options");
    if (frameOptions && /deny|sameorigin/i.test(frameOptions)) {
      return false;
    }
    const csp = headers.get("content-security-policy");
    if (csp && /frame-ancestors/i.test(csp)) {
      return false;
    }
    return true;
  }

  private async fetchHeaders(url: URL, method: "HEAD" | "GET"): Promise<Headers | null> {
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (method === "GET") {
        void response.body?.cancel().catch(() => undefined);
      }
      // Many sites reject HEAD (405 etc.) while serving GET fine.
      if (method === "HEAD" && !response.ok) {
        return null;
      }
      return response.headers;
    } catch (error) {
      this.logger.debug(`Embed probe ${method} ${url.origin} failed: ${error}`);
      return null;
    }
  }
}
