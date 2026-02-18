import { annixRepAuthHeaders } from "@/lib/api-config";

const API_URL = "http://localhost:4001";

export interface AnnixRepAuthUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  setupCompleted: boolean;
}

export interface AnnixRepAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  setupCompleted?: boolean;
}

export interface AnnixRepRegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AnnixRepLoginDto {
  email: string;
  password: string;
}

export interface AnnixRepProfileResponse {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  setupCompleted: boolean;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const annixRepAuthApi = {
  register: async (dto: AnnixRepRegisterDto): Promise<AnnixRepAuthResponse> => {
    const response = await fetch(`${API_URL}/annix-rep/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<AnnixRepAuthResponse>(response);
    localStorage.setItem("annixRepAccessToken", data.accessToken);
    localStorage.setItem("annixRepRefreshToken", data.refreshToken);
    return data;
  },

  login: async (dto: AnnixRepLoginDto): Promise<AnnixRepAuthResponse> => {
    const response = await fetch(`${API_URL}/annix-rep/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<AnnixRepAuthResponse>(response);
    localStorage.setItem("annixRepAccessToken", data.accessToken);
    localStorage.setItem("annixRepRefreshToken", data.refreshToken);
    return data;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem("annixRepAccessToken");
    if (token) {
      await fetch(`${API_URL}/annix-rep/auth/logout`, {
        method: "POST",
        headers: annixRepAuthHeaders(),
      }).catch(() => {});
    }
    localStorage.removeItem("annixRepAccessToken");
    localStorage.removeItem("annixRepRefreshToken");
  },

  refresh: async (): Promise<AnnixRepAuthResponse | null> => {
    const refreshToken = localStorage.getItem("annixRepRefreshToken");
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/annix-rep/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        localStorage.removeItem("annixRepAccessToken");
        localStorage.removeItem("annixRepRefreshToken");
        return null;
      }

      const data = await response.json();
      localStorage.setItem("annixRepAccessToken", data.accessToken);
      localStorage.setItem("annixRepRefreshToken", data.refreshToken);
      return data;
    } catch {
      localStorage.removeItem("annixRepAccessToken");
      localStorage.removeItem("annixRepRefreshToken");
      return null;
    }
  },

  profile: async (): Promise<AnnixRepProfileResponse> => {
    const response = await fetch(`${API_URL}/annix-rep/auth/profile`, {
      headers: annixRepAuthHeaders(),
    });
    return handleResponse<AnnixRepProfileResponse>(response);
  },

  checkEmailAvailable: async (email: string): Promise<boolean> => {
    const response = await fetch(
      `${API_URL}/annix-rep/auth/check-email?email=${encodeURIComponent(email)}`,
    );
    const data = await handleResponse<{ available: boolean }>(response);
    return data.available;
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("annixRepAccessToken");
  },
};
