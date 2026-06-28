"use client";

/**
 * Invisible Cloudflare Turnstile (proof-of-human) for the anon Nix funnel's
 * first cost-bearing action. Ships DORMANT: when NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is absent every export is a NO-OP — no widget renders and no header is sent.
 *
 * Flow when active: the first anonymous cost-bearing call executes an invisible
 * widget, gets a token, and sends it as `cf-turnstile-response`; the backend
 * verifies it and returns a 30-min session token in `x-nix-turnstile-session`,
 * which we cache and present on subsequent calls (no re-challenge).
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SESSION_STORAGE_KEY = "nix_turnstile_session";
const SESSION_HEADER = "x-nix-turnstile-session";
const TOKEN_HEADER = "cf-turnstile-response";
const EXECUTE_TIMEOUT_MS = 15000;

interface TurnstileApi {
  render: (container: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (widgetId: string, opts?: Record<string, unknown>) => void;
  remove: (widgetId: string) => void;
}

function turnstileApi(): TurnstileApi | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; window may be undefined
  if (typeof window === "undefined") {
    return null;
  }
  const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
  return api ?? null;
}

export function nixTurnstileEnabled(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; window may be undefined
  return typeof window !== "undefined" && Boolean(SITE_KEY);
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  const existingPromise = scriptPromise;
  if (existingPromise) {
    return existingPromise;
  }
  const created = new Promise<void>((resolve, reject) => {
    if (turnstileApi()) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Turnstile script failed to load")));
    document.head.appendChild(script);
  });
  scriptPromise = created;
  return created;
}

async function executeInvisibleTurnstile(): Promise<string | null> {
  const siteKey = SITE_KEY;
  if (!siteKey) {
    return null;
  }
  try {
    await loadTurnstileScript();
    const api = turnstileApi();
    if (!api) {
      return null;
    }
    return await new Promise<string | null>((resolve) => {
      const container = document.createElement("div");
      container.style.display = "none";
      document.body.appendChild(container);
      let settled = false;
      const finish = (token: string | null, widgetId?: string) => {
        if (settled) {
          return;
        }
        settled = true;
        if (widgetId) {
          try {
            api.remove(widgetId);
          } catch {
            // best-effort cleanup
          }
        }
        container.remove();
        resolve(token);
      };
      const widgetId = api.render(container, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token: string) => finish(token, widgetId),
        "error-callback": () => finish(null, widgetId),
        "timeout-callback": () => finish(null, widgetId),
      });
      try {
        api.execute(widgetId);
      } catch {
        finish(null, widgetId);
      }
      setTimeout(() => finish(null, widgetId), EXECUTE_TIMEOUT_MS);
    });
  } catch {
    return null;
  }
}

/**
 * Headers to attach to an anonymous cost-bearing Nix request. NO-OP ({}) when
 * Turnstile is disabled. Reuses a cached session token when present; otherwise
 * executes the invisible widget once and sends the fresh token.
 */
export async function nixTurnstileRequestHeaders(): Promise<Record<string, string>> {
  if (!nixTurnstileEnabled()) {
    return {};
  }
  const cachedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (cachedSession) {
    return { [SESSION_HEADER]: cachedSession };
  }
  const token = await executeInvisibleTurnstile();
  if (token) {
    return { [TOKEN_HEADER]: token };
  }
  return {};
}

/** Caches the backend-issued Turnstile session token from a response, if any. */
export function captureNixTurnstileSession(response: Response): void {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; window may be undefined
  if (typeof window === "undefined") {
    return;
  }
  const session = response.headers.get(SESSION_HEADER);
  if (session) {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, session);
    } catch {
      // session storage unavailable — challenge again next call, no crash
    }
  }
}
