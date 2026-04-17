import { getStoredFingerprint } from "@/app/hooks/useDeviceFingerprint";

export interface PortalTokenKeys {
  accessToken: string;
  refreshToken: string;
}

export class PortalTokenStore {
  private accessTokenValue: string | null = null;
  private refreshTokenValue: string | null = null;
  private rememberMeValue = false;

  constructor(private readonly keys: PortalTokenKeys) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") return;
    const localAccess = localStorage.getItem(this.keys.accessToken);
    const sessionAccess = sessionStorage.getItem(this.keys.accessToken);

    if (localAccess) {
      this.accessTokenValue = localAccess;
      this.refreshTokenValue = localStorage.getItem(this.keys.refreshToken);
      this.rememberMeValue = true;
    } else if (sessionAccess) {
      this.accessTokenValue = sessionAccess;
      this.refreshTokenValue = sessionStorage.getItem(this.keys.refreshToken);
      this.rememberMeValue = false;
    }
  }

  accessToken(): string | null {
    if (!this.accessTokenValue) this.loadFromStorage();
    return this.accessTokenValue;
  }

  refreshToken(): string | null {
    if (!this.refreshTokenValue) this.loadFromStorage();
    return this.refreshTokenValue;
  }

  rememberMe(): boolean {
    return this.rememberMeValue;
  }

  isAuthenticated(): boolean {
    return this.accessToken() !== null;
  }

  setTokens(accessToken: string, refreshToken: string, rememberMe = false) {
    this.accessTokenValue = accessToken;
    this.refreshTokenValue = refreshToken;
    this.rememberMeValue = rememberMe;
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") return;
    const primary = rememberMe ? localStorage : sessionStorage;
    const secondary = rememberMe ? sessionStorage : localStorage;
    secondary.removeItem(this.keys.accessToken);
    secondary.removeItem(this.keys.refreshToken);
    primary.setItem(this.keys.accessToken, accessToken);
    primary.setItem(this.keys.refreshToken, refreshToken);
  }

  updateAccessToken(accessToken: string) {
    this.accessTokenValue = accessToken;
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") return;
    const storage = this.rememberMeValue ? localStorage : sessionStorage;
    storage.setItem(this.keys.accessToken, accessToken);
  }

  clear() {
    this.accessTokenValue = null;
    this.refreshTokenValue = null;
    this.rememberMeValue = false;
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.keys.accessToken);
    localStorage.removeItem(this.keys.refreshToken);
    sessionStorage.removeItem(this.keys.accessToken);
    sessionStorage.removeItem(this.keys.refreshToken);
  }

  authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.accessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const fingerprint = getStoredFingerprint();
    if (fingerprint) headers["x-device-fingerprint"] = fingerprint;
    return headers;
  }
}
