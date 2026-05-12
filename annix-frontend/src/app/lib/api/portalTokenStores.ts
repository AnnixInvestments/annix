import { PortalTokenStore } from "./portalTokenStore";

export const adminTokenStore = new PortalTokenStore({
  accessToken: "adminAccessToken",
  refreshToken: "adminRefreshToken",
});

export const customerTokenStore = new PortalTokenStore({
  accessToken: "customerAccessToken",
  refreshToken: "customerRefreshToken",
});

export const supplierTokenStore = new PortalTokenStore({
  accessToken: "supplierAccessToken",
  refreshToken: "supplierRefreshToken",
});

export const stockControlTokenStore = new PortalTokenStore({
  accessToken: "stockControlAccessToken",
  refreshToken: "stockControlRefreshToken",
});

export const auRubberTokenStore = new PortalTokenStore({
  accessToken: "auRubberAccessToken",
  refreshToken: "auRubberRefreshToken",
});

export const teacherAssistantTokenStore = new PortalTokenStore({
  accessToken: "teacherAssistantAccessToken",
  refreshToken: "teacherAssistantRefreshToken",
});

export const annixRepTokenStore = new PortalTokenStore({
  accessToken: "annixRepAccessToken",
  refreshToken: "annixRepRefreshToken",
});

export const cvAssistantTokenStore = new PortalTokenStore({
  accessToken: "cvAssistantAccessToken",
  refreshToken: "cvAssistantRefreshToken",
});

export const insightsTokenStore = new PortalTokenStore({
  accessToken: "insightsAccessToken",
  refreshToken: "insightsRefreshToken",
});

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
  cvAssistantTokenStore,
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
  { prefix: "/cv-assistant", store: cvAssistantTokenStore },
  { prefix: "/admin", store: adminTokenStore },
  { prefix: "/supplier", store: supplierTokenStore },
  { prefix: "/customer", store: customerTokenStore },
  { prefix: "/annix-rep", store: annixRepTokenStore },
  { prefix: "/teacher-assistant", store: teacherAssistantTokenStore },
  { prefix: "/insights", store: insightsTokenStore },
];

/**
 * Returns Authorization (and any other auth-related) headers for the most
 * appropriate portal token store. Prefers the store matching the current
 * URL prefix; falls back to the first authenticated store if no prefix
 * match is found. Empty object when nothing is authenticated.
 */
export function anyPortalAuthHeaders(): Record<string, string> {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const match = PORTAL_ROUTE_TO_STORE.find((p) => path.startsWith(p.prefix));
    if (match?.store.isAuthenticated()) {
      return match.store.authHeaders();
    }
  }
  for (const store of ALL_PORTAL_TOKEN_STORES) {
    if (store.isAuthenticated()) {
      return store.authHeaders();
    }
  }
  return {};
}
