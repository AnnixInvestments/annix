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

  /**
   * Returns ONLY auth-identifying headers (Authorization + device
   * fingerprint). Content-Type is the caller's responsibility — set it
   * explicitly for JSON bodies, OR leave it unset so the fetch API
   * auto-derives 'multipart/form-data; boundary=...' for a FormData body.
   *
   * Historically this method hardcoded 'Content-Type: application/json',
   * which silently broke every multipart upload site in the codebase (the
   * JSON content-type overrode the auto-set multipart one, and the backend's
   * JSON body parser then choked on the multipart boundary delimiter, e.g.
   * 'Unexpected token \'-\', "------WebK..." is not valid JSON'). The shared
   * HTTP wrappers (createApiClient.buildConfig, nixRequest) already add the
   * JSON Content-Type when they detect a string body, so removing it here is
   * the architecturally correct fix. Direct fetch callers must set
   * Content-Type for JSON bodies themselves.
   */
  authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.accessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const fingerprint = getStoredFingerprint();
    if (fingerprint) headers["x-device-fingerprint"] = fingerprint;
    return headers;
  }
}
