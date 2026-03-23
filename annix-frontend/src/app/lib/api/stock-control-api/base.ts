import { API_BASE_URL } from "@/lib/api-config";

export const TOKEN_KEYS = {
  accessToken: "stockControlAccessToken",
  refreshToken: "stockControlRefreshToken",
} as const;

export class StockControlApiClient {
  baseURL: string;
  accessToken: string | null = null;
  refreshToken: string | null = null;
  rememberMe: boolean = true;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    if (typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ||
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ||
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
  }

  setRememberMe(remember: boolean) {
    this.rememberMe = remember;
  }

  headers(): Record<string, string> {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ||
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ||
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }

    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      h["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return h;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== "undefined") {
      const storage = this.rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEYS.accessToken, accessToken);
      storage.setItem(TOKEN_KEYS.refreshToken, refreshToken);
    }
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
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEYS.accessToken);
      localStorage.removeItem(TOKEN_KEYS.refreshToken);
      sessionStorage.removeItem(TOKEN_KEYS.accessToken);
      sessionStorage.removeItem(TOKEN_KEYS.refreshToken);
    }
    this.clearCompanyCookie();
  }

  isAuthenticated(): boolean {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ||
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ||
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
    return !!this.accessToken;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...this.headers(),
          ...(options.headers as Record<string, string>),
        };
        const retryResponse = await fetch(url, config);
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`API Error (${retryResponse.status}): ${errorText}`);
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error (${response.status}): ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use raw error text if not JSON
      }

      throw new Error(errorMessage);
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  async requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...this.headers(),
          ...(options.headers as Record<string, string>),
        };
        const retryResponse = await fetch(url, config);
        if (!retryResponse.ok) {
          throw new Error(`PDF download failed (${retryResponse.status})`);
        }
        return retryResponse.blob();
      }
    }

    if (!response.ok) {
      throw new Error(`PDF download failed (${response.status})`);
    }

    return response.blob();
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    extraFields?: Record<string, string>,
  ): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    if (extraFields) {
      Object.entries(extraFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const url = `${this.baseURL}${endpoint}`;
    const authHeader = { Authorization: `Bearer ${this.accessToken}` };

    const response = await fetch(url, {
      method: "POST",
      headers: authHeader,
      body: formData,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: formData,
        });
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`Upload failed (${retryResponse.status}): ${errorText}`);
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Upload failed (${response.status}): ${errorText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use raw error text if not JSON
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.executeRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async executeRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/stock-control/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      if (typeof window !== "undefined") {
        if (localStorage.getItem(TOKEN_KEYS.refreshToken)) {
          localStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
        } else {
          sessionStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
        }
      }
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  triggerDownload(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  async downloadBlob(endpoint: string, filename: string): Promise<void> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: { ...this.headers() },
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, {
          headers: { ...this.headers() },
        });
        if (!retryResponse.ok) {
          throw new Error(`Download failed (${retryResponse.status})`);
        }
        const blob = await retryResponse.blob();
        this.triggerDownload(blob, filename);
        return;
      }
    }

    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    this.triggerDownload(blob, filename);
  }

  authHeaders(): Record<string, string> {
    return this.headers();
  }

  companyIdParam(): string {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sc_user") : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return String(parsed.companyId ?? "0");
      } catch {
        return "0";
      }
    }
    return "0";
  }
}
