import { keys } from "es-toolkit/compat";
import {
  activePortalAuthHeaders,
  expireActivePortalSession,
  refreshActivePortalToken,
} from "./portalRefresh";

function mergeHeaders(
  authHeaders: Record<string, string>,
  callerHeaders?: HeadersInit,
): Record<string, string> {
  const caller = (callerHeaders as Record<string, string>) ?? {};
  return { ...authHeaders, ...caller };
}

function hasActiveSession(authHeaders: Record<string, string>): boolean {
  return keys(authHeaders).some((key) => key.toLowerCase() === "authorization");
}

/**
 * Drop-in `fetch` for authenticated portal calls that silently refreshes
 * the access token on a 401 instead of dumping the user to a login
 * screen. Resolves the active portal's auth headers, merges them under
 * the caller's own headers (caller wins, so an explicit Content-Type or
 * override is preserved), performs the request, and on a 401 — when the
 * portal had a session — attempts a portal-aware token refresh and
 * retries the request once with fresh headers.
 *
 * If the refresh fails, it clears the active portal's tokens and emits
 * `sessionExpiredEvent` so the SessionExpiredModal routes the user to the
 * correct portal's login. The original 401 response is returned so the
 * caller's existing error handling still runs.
 *
 * Anonymous calls (no active session) pass straight through with no
 * refresh attempt — a 401 there is a genuine authorization failure, not
 * an expired token.
 */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const authHeaders = activePortalAuthHeaders();
  const hadSession = hasActiveSession(authHeaders);

  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(authHeaders, init.headers),
  });

  if (response.status !== 401 || !hadSession) {
    return response;
  }

  const refreshed = await refreshActivePortalToken();
  if (!refreshed) {
    expireActivePortalSession();
    return response;
  }

  return fetch(url, {
    ...init,
    headers: mergeHeaders(activePortalAuthHeaders(), init.headers),
  });
}
