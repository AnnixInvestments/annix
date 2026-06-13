import { getStoredFingerprint } from "@/app/hooks/useDeviceFingerprint";

export interface PortalTokenKeys {
  accessToken: string;
  refreshToken: string;
}

export interface PortalTokenStoreOptions {
  /**
   * When true, the store can share a live session with other open tabs of
   * the same portal via BroadcastChannel. A fresh tab (e.g. opened from an
   * email link) whose sessionStorage is empty can then adopt the session of
   * an already-signed-in tab instead of bouncing to login. The session is
   * still tab-scoped — closing every tab/the browser ends it.
   */
  crossTabRelay?: boolean;
}

export class PortalTokenStore {
  private accessTokenValue: string | null = null;
  private refreshTokenValue: string | null = null;
  private rememberMeValue = false;
  private relayChannel: BroadcastChannel | null = null;

  constructor(
    private readonly keys: PortalTokenKeys,
    options: PortalTokenStoreOptions = {},
  ) {
    this.loadFromStorage();
    if (options.crossTabRelay) this.setupCrossTabRelay();
  }

  private setupCrossTabRelay() {
    // eslint-disable-next-line no-restricted-syntax -- SSR + feature guard
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`portal-token-relay:${this.keys.accessToken}`);
    channel.addEventListener("message", (event) => {
      if (event.data?.type !== "request") return;
      const access = this.accessToken();
      const refresh = this.refreshToken();
      if (access && refresh) {
        channel.postMessage({
          type: "response",
          accessToken: access,
          refreshToken: refresh,
          rememberMe: this.rememberMeValue,
        });
      }
    });
    this.relayChannel = channel;
  }

  /**
   * Ask other open tabs of the same portal for their session. Resolves true
   * if a live session was adopted into this tab, false if no tab answered
   * within the timeout. Lets a fresh tab bootstrap an existing login.
   */
  adoptSessionFromOtherTab(timeoutMs = 500): Promise<boolean> {
    const channel = this.relayChannel;
    if (!channel) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const onMessage = (event: MessageEvent) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type !== "response") return;
        const access = msg.accessToken;
        const refresh = msg.refreshToken;
        if (!access || !refresh) return;
        this.setTokens(access, refresh, Boolean(msg.rememberMe));
        finish(true);
      };
      const finish = (adopted: boolean) => {
        if (settled) return;
        settled = true;
        channel.removeEventListener("message", onMessage);
        clearTimeout(timer);
        resolve(adopted);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      channel.addEventListener("message", onMessage);
      channel.postMessage({ type: "request" });
    });
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

  // Set the persistence preference BEFORE login stores tokens, so setTokens
  // (which reads rememberMe()) writes them to localStorage (survives browser
  // close) rather than sessionStorage. Without this, a ticked "Remember me"
  // box was silently ignored and every returning visit forced a re-login.
  setRememberMe(remember: boolean) {
    this.rememberMeValue = remember;
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
