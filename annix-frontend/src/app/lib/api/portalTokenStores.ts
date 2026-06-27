import { PortalTokenStore } from "./portalTokenStore";

export const adminTokenStore = new PortalTokenStore(
  {
    accessToken: "adminAccessToken",
    refreshToken: "adminRefreshToken",
  },
  { crossTabRelay: true },
);

export const customerTokenStore = new PortalTokenStore(
  {
    accessToken: "customerAccessToken",
    refreshToken: "customerRefreshToken",
  },
  { crossTabRelay: true },
);

export const supplierTokenStore = new PortalTokenStore(
  {
    accessToken: "supplierAccessToken",
    refreshToken: "supplierRefreshToken",
  },
  { crossTabRelay: true },
);

export const stockControlTokenStore = new PortalTokenStore(
  {
    accessToken: "stockControlAccessToken",
    refreshToken: "stockControlRefreshToken",
  },
  { crossTabRelay: true },
);

export const auRubberTokenStore = new PortalTokenStore(
  {
    accessToken: "auRubberAccessToken",
    refreshToken: "auRubberRefreshToken",
  },
  { crossTabRelay: true },
);

export const teacherAssistantTokenStore = new PortalTokenStore(
  {
    accessToken: "teacherAssistantAccessToken",
    refreshToken: "teacherAssistantRefreshToken",
  },
  { crossTabRelay: true },
);

export const annixRepTokenStore = new PortalTokenStore(
  {
    accessToken: "annixRepAccessToken",
    refreshToken: "annixRepRefreshToken",
  },
  { crossTabRelay: true },
);

export const annixOrbitTokenStore = new PortalTokenStore(
  {
    accessToken: "annixOrbitAccessToken",
    refreshToken: "annixOrbitRefreshToken",
  },
  { crossTabRelay: true },
);

export const insightsTokenStore = new PortalTokenStore(
  {
    accessToken: "insightsAccessToken",
    refreshToken: "insightsRefreshToken",
  },
  { crossTabRelay: true },
);

/**
 * Every portal-scoped token store, in priority order. Cross-cutting clients
 * (e.g. Nix, which is invoked from any portal) iterate this list to find
 * whichever store currently holds an access token, instead of maintaining a
 * parallel list of localStorage key names.
 */
export const ALL_PORTAL_TOKEN_STORES: readonly PortalTokenStore[] = [
  stockControlTokenStore,
  customerTokenStore,
  supplierTokenStore,
  adminTokenStore,
  annixRepTokenStore,
  auRubberTokenStore,
  annixOrbitTokenStore,
  teacherAssistantTokenStore,
  insightsTokenStore,
];

/**
 * Maps the first segment of the current URL pathname to the portal token
 * store that owns that surface. Lets cross-cutting clients (Nix) prefer
 * the *current portal's* token over a stale one left behind by an earlier
 * login to a different portal — which used to surface as a stray 401 →
 * SessionExpiredModal pop-up the moment a user signed back into a portal
 * they hadn't used most recently.
 */
const PORTAL_ROUTE_TO_STORE: ReadonlyArray<{ prefix: string; store: PortalTokenStore }> = [
  { prefix: "/stock-control", store: stockControlTokenStore },
  { prefix: "/au-rubber", store: auRubberTokenStore },
  { prefix: "/annix/orbit", store: annixOrbitTokenStore },
  { prefix: "/admin", store: adminTokenStore },
  { prefix: "/supplier", store: supplierTokenStore },
  { prefix: "/customer", store: customerTokenStore },
  { prefix: "/rfq", store: customerTokenStore },
  { prefix: "/annix-rep", store: annixRepTokenStore },
  { prefix: "/teacher-assistant", store: teacherAssistantTokenStore },
  { prefix: "/insights", store: insightsTokenStore },
  { prefix: "/core/portal/stock-control", store: stockControlTokenStore },
  { prefix: "/core/portal/au-rubber", store: auRubberTokenStore },
];

/**
 * Active portal store override for the unified `/core/portal` shell. Defaults
 * to null — every legacy caller (and every path outside `/core`) resolves auth
 * exactly as before. The `/core` portal context is the only thing that sets
 * this, making per-app auth deterministic on the shared shell instead of
 * leaking a foreign portal's token.
 */
let activePortalStore: PortalTokenStore | null = null;

export function setActivePortalStore(store: PortalTokenStore | null): void {
  activePortalStore = store;
}

export function portalAuthHeadersFor(app: "stock-control" | "au-rubber"): Record<string, string> {
  if (app === "stock-control") {
    return stockControlTokenStore.authHeaders();
  }
  return auRubberTokenStore.authHeaders();
}

/**
 * Returns Authorization (and any other auth-related) headers for the most
 * appropriate portal token store. Prefers the store matching the current
 * URL prefix; falls back to the first authenticated store if no prefix
 * match is found. Empty object when nothing is authenticated.
 */
export function anyPortalAuthHeaders(): Record<string, string> {
  const active = activePortalStore;
  if (active?.isAuthenticated()) {
    return active.authHeaders();
  }
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const match = PORTAL_ROUTE_TO_STORE.find((p) => path.startsWith(p.prefix));
    if (match) {
      // On a known portal surface, use ONLY that portal's token. If it isn't
      // authenticated, send no Authorization header rather than another
      // portal's token — a foreign token is always rejected with a 401, which
      // is what produced the stray "session expired / please log in" prompts
      // when moving between apps.
      return match.store.isAuthenticated() ? match.store.authHeaders() : {};
    }
    // Fail closed on the unified shell: a `/core` surface with no prefix match
    // must NOT borrow the first authenticated portal's token (the H2 bug).
    if (path.startsWith("/core")) {
      return {};
    }
  }
  for (const store of ALL_PORTAL_TOKEN_STORES) {
    if (store.isAuthenticated()) {
      return store.authHeaders();
    }
  }
  return {};
}
