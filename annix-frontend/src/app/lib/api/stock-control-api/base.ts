import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { stockControlTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export const TOKEN_KEYS = {
  accessToken: "stockControlAccessToken",
  refreshToken: "stockControlRefreshToken",
} as const;

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: stockControlTokenStore,
  refreshUrl: `${API_BASE_URL}/stock-control/auth/refresh`,
  onUnauthorized: () => {
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/stock-control/login")
    ) {
      window.location.href = "/stock-control/login?expired=1";
    }
  },
});

export class StockControlApiClient {
  baseURL = API_BASE_URL;

  get accessToken(): string | null {
    return stockControlTokenStore.accessToken();
  }

  get refreshToken(): string | null {
    return stockControlTokenStore.refreshToken();
  }

  rememberMe: boolean = true;

  setRememberMe(remember: boolean) {
    this.rememberMe = remember;
  }

  headers(): Record<string, string> {
    return stockControlTokenStore.authHeaders();
  }

  authHeaders(): Record<string, string> {
    return stockControlTokenStore.authHeaders();
  }

  setTokens(accessToken: string, refreshToken: string) {
    stockControlTokenStore.setTokens(accessToken, refreshToken, this.rememberMe);
  }

  setCompanyCookie(companyId: number) {
    if (typeof document !== "undefined") {
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not universally supported
      document.cookie = `sc_company_id=${companyId};path=/stock-control;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
  }

  clearCompanyCookie() {
    if (typeof document !== "undefined") {
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not universally supported
      document.cookie = "sc_company_id=;path=/stock-control;max-age=0;SameSite=Lax";
    }
  }

  clearTokens() {
    stockControlTokenStore.clear();
    this.clearCompanyCookie();
  }

  isAuthenticated(): boolean {
    return stockControlTokenStore.isAuthenticated();
  }

  request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    return apiClient.requestBlob(endpoint, options);
  }

  uploadFile<T>(endpoint: string, file: File, extraFields?: Record<string, string>): Promise<T> {
    return apiClient.uploadFile<T>(endpoint, file, extraFields);
  }

  refreshAccessToken(): Promise<boolean> {
    return apiClient.refreshAccessToken();
  }

  triggerDownload(blob: Blob, filename: string): void {
    apiClient.triggerDownload(blob, filename);
  }

  async downloadBlob(endpoint: string, filename: string): Promise<void> {
    return apiClient.downloadBlob(endpoint, filename);
  }

  async fetchBlobUrl(endpoint: string): Promise<string> {
    return apiClient.fetchBlobUrl(endpoint);
  }

  companyIdParam(): string {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sc_user") : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const rawCompanyId = parsed.companyId;
        return String(rawCompanyId || "0");
      } catch {
        return "0";
      }
    }
    return "0";
  }
}
