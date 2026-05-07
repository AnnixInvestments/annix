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
];

/**
 * Returns Authorization (and any other auth-related) headers for the first
 * portal token store with an active access token. Empty object when none
 * are authenticated. Used by Nix client code so a Stock Control session,
 * an Admin session, an AU Rubber session, etc. can all hit Nix endpoints
 * without each client re-implementing the storage-key lookup.
 */
export function anyPortalAuthHeaders(): Record<string, string> {
  for (const store of ALL_PORTAL_TOKEN_STORES) {
    if (store.isAuthenticated()) {
      return store.authHeaders();
    }
  }
  return {};
}
