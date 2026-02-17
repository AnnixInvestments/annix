import { fieldflowAuthHeaders } from "@/lib/api-config";

const API_URL = "http://localhost:4001";

export interface FieldFlowAuthUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  setupCompleted: boolean;
}

export interface FieldFlowAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  setupCompleted?: boolean;
}

export interface FieldFlowRegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface FieldFlowLoginDto {
  email: string;
  password: string;
}

export interface FieldFlowProfileResponse {
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

export const fieldflowAuthApi = {
  register: async (dto: FieldFlowRegisterDto): Promise<FieldFlowAuthResponse> => {
    const response = await fetch(`${API_URL}/fieldflow/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<FieldFlowAuthResponse>(response);
    localStorage.setItem("fieldflowAccessToken", data.accessToken);
    localStorage.setItem("fieldflowRefreshToken", data.refreshToken);
    return data;
  },

  login: async (dto: FieldFlowLoginDto): Promise<FieldFlowAuthResponse> => {
    const response = await fetch(`${API_URL}/fieldflow/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    const data = await handleResponse<FieldFlowAuthResponse>(response);
    localStorage.setItem("fieldflowAccessToken", data.accessToken);
    localStorage.setItem("fieldflowRefreshToken", data.refreshToken);
    return data;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem("fieldflowAccessToken");
    if (token) {
      await fetch(`${API_URL}/fieldflow/auth/logout`, {
        method: "POST",
        headers: fieldflowAuthHeaders(),
      }).catch(() => {});
    }
    localStorage.removeItem("fieldflowAccessToken");
    localStorage.removeItem("fieldflowRefreshToken");
  },

  refresh: async (): Promise<FieldFlowAuthResponse | null> => {
    const refreshToken = localStorage.getItem("fieldflowRefreshToken");
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/fieldflow/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        localStorage.removeItem("fieldflowAccessToken");
        localStorage.removeItem("fieldflowRefreshToken");
        return null;
      }

      const data = await response.json();
      localStorage.setItem("fieldflowAccessToken", data.accessToken);
      localStorage.setItem("fieldflowRefreshToken", data.refreshToken);
      return data;
    } catch {
      localStorage.removeItem("fieldflowAccessToken");
      localStorage.removeItem("fieldflowRefreshToken");
      return null;
    }
  },

  profile: async (): Promise<FieldFlowProfileResponse> => {
    const response = await fetch(`${API_URL}/fieldflow/auth/profile`, {
      headers: fieldflowAuthHeaders(),
    });
    return handleResponse<FieldFlowProfileResponse>(response);
  },

  checkEmailAvailable: async (email: string): Promise<boolean> => {
    const response = await fetch(
      `${API_URL}/fieldflow/auth/check-email?email=${encodeURIComponent(email)}`,
    );
    const data = await handleResponse<{ available: boolean }>(response);
    return data.available;
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("fieldflowAccessToken");
  },
};
