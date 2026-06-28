import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { getStoredFingerprint } from "@/app/hooks/useDeviceFingerprint";
import { API_BASE_URL } from "@/lib/api-config";
import type { PortalTokenStore } from "./portalTokenStore";
import {
  ALL_PORTAL_TOKEN_STORES,
  adminTokenStore,
  annixOrbitTokenStore,
  annixRepTokenStore,
  auRubberTokenStore,
  customerTokenStore,
  insightsTokenStore,
  stockControlTokenStore,
  supplierTokenStore,
  teacherAssistantTokenStore,
} from "./portalTokenStores";

interface PortalRefreshDescriptor {
  prefix: string;
  store: PortalTokenStore;
  refreshUrl: string;
  sendDeviceFingerprint: boolean;
}

const PORTAL_REFRESH_DESCRIPTORS: ReadonlyArray<PortalRefreshDescriptor> = [
  {
    prefix: "/core/portal/stock-control",
    store: stockControlTokenStore,
    refreshUrl: `${API_BASE_URL}/stock-control/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/core/portal/au-rubber",
    store: auRubberTokenStore,
    refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/ops/portal",
    store: auRubberTokenStore,
    refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/stock-control",
    store: stockControlTokenStore,
    refreshUrl: `${API_BASE_URL}/stock-control/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/au-rubber",
    store: auRubberTokenStore,
    refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/annix/orbit",
    store: annixOrbitTokenStore,
    refreshUrl: `${API_BASE_URL}/annix-orbit/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/admin",
    store: adminTokenStore,
    refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/supplier",
    store: supplierTokenStore,
    refreshUrl: `${API_BASE_URL}/supplier/auth/refresh`,
    sendDeviceFingerprint: true,
  },
  {
    prefix: "/customer",
    store: customerTokenStore,
    refreshUrl: `${API_BASE_URL}/customer/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/rfq",
    store: customerTokenStore,
    refreshUrl: `${API_BASE_URL}/customer/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/annix-rep",
    store: annixRepTokenStore,
    refreshUrl: `${API_BASE_URL}/annix-rep/auth/refresh`,
    sendDeviceFingerprint: true,
  },
  {
    prefix: "/teacher-assistant",
    store: teacherAssistantTokenStore,
    refreshUrl: `${API_BASE_URL}/teacher-assistant/auth/refresh`,
    sendDeviceFingerprint: false,
  },
  {
    prefix: "/insights",
    store: insightsTokenStore,
    refreshUrl: `${API_BASE_URL}/auth/refresh`,
    sendDeviceFingerprint: false,
  },
];

function descriptorForPath(path: string): PortalRefreshDescriptor | null {
  const match = PORTAL_REFRESH_DESCRIPTORS.find((descriptor) => path.startsWith(descriptor.prefix));
  return match ?? null;
}

function descriptorForActiveStore(): PortalRefreshDescriptor | null {
  const authenticatedStore = ALL_PORTAL_TOKEN_STORES.find((store) => store.isAuthenticated());
  if (!authenticatedStore) return null;
  return (
    PORTAL_REFRESH_DESCRIPTORS.find((descriptor) => descriptor.store === authenticatedStore) ?? null
  );
}

function activeDescriptor(): PortalRefreshDescriptor | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return null;
  const byPath = descriptorForPath(window.location.pathname);
  if (byPath) return byPath;
  return descriptorForActiveStore();
}

const inFlightRefreshes = new Map<string, Promise<boolean>>();

async function performRefresh(descriptor: PortalRefreshDescriptor): Promise<boolean> {
  const refreshToken = descriptor.store.refreshToken();
  if (!refreshToken) return false;

  const body: Record<string, string> = { refreshToken };
  if (descriptor.sendDeviceFingerprint) {
    const fingerprint = getStoredFingerprint();
    if (fingerprint) body.deviceFingerprint = fingerprint;
  }

  try {
    const response = await fetch(descriptor.refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      descriptor.store.clear();
      return false;
    }
    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as {
      accessToken?: string;
      access_token?: string;
      refreshToken?: string;
      refresh_token?: string;
    };
    const camelAccess = data.accessToken;
    const snakeAccess = data.access_token;
    const accessToken = camelAccess ?? snakeAccess ?? null;
    if (!accessToken) {
      return false;
    }
    const camelRefresh = data.refreshToken;
    const snakeRefresh = data.refresh_token;
    const rotatedRefreshToken = camelRefresh ?? snakeRefresh ?? null;
    if (rotatedRefreshToken) {
      descriptor.store.setTokens(accessToken, rotatedRefreshToken, descriptor.store.rememberMe());
    } else {
      descriptor.store.updateAccessToken(accessToken);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Refreshes the access token for whichever portal currently owns the page.
 * Resolves the portal from the URL prefix (falling back to the first
 * authenticated store), POSTs that portal's refresh endpoint with its
 * refresh token (plus a device fingerprint where the backend requires
 * one), and writes the new access token back to that portal's store.
 *
 * Tolerates both response shapes the platform's auth services emit —
 * camelCase (`accessToken`/`refreshToken`) and snake_case
 * (`access_token`/`refresh_token`) — and rotates the refresh token only
 * when the endpoint returns a fresh one. Single-flight per portal so a
 * burst of 401s triggers a single refresh.
 *
 * Returns true when a fresh access token was stored, false otherwise.
 */
export async function refreshActivePortalToken(): Promise<boolean> {
  const descriptor = activeDescriptor();
  if (!descriptor) return false;

  const existing = inFlightRefreshes.get(descriptor.prefix);
  if (existing) return existing;

  const promise = performRefresh(descriptor);
  inFlightRefreshes.set(descriptor.prefix, promise);
  const result = await promise;
  inFlightRefreshes.delete(descriptor.prefix);
  return result;
}

/**
 * Clears the active portal's tokens and notifies the SessionExpiredModal.
 * Call this when a 401 survives a refresh attempt so the user is sent to
 * the right portal's login instead of being left on a silently broken
 * screen.
 */
export function expireActivePortalSession(): void {
  const descriptor = activeDescriptor();
  descriptor?.store.clear();
  sessionExpiredEvent.emit();
}

export function activePortalAuthHeaders(): Record<string, string> {
  const descriptor = activeDescriptor();
  if (descriptor?.store.isAuthenticated()) {
    return descriptor.store.authHeaders();
  }
  return {};
}
