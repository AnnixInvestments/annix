import { ApiError } from "./apiError";
import { insightsTokenStore } from "./portalTokenStores";

export interface InsightsLoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface InsightsAuthSuccess {
  accessToken: string;
  refreshToken: string;
}

export interface InsightsUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
}

interface DecodedJwt {
  sub: number;
  email?: string;
  username?: string;
  roles?: string[];
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = envApiUrl ?? "";
const INSIGHTS_ROLE = "insights";

function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded =
      typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export const insightsApi = {
  async login(input: InsightsLoginInput): Promise<InsightsAuthSuccess> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const serverMessage = body?.message;
      const message = serverMessage ?? "Invalid email or password";
      throw new ApiError({
        status: response.status,
        message,
        meta: body,
      });
    }

    const data = await response.json();
    const accessToken: string = data.access_token;
    const refreshToken: string = data.refresh_token;

    const decoded = decodeJwt(accessToken);
    const decodedRoles = decoded?.roles;
    const roles = decodedRoles ?? [];
    if (!roles.includes(INSIGHTS_ROLE)) {
      throw new ApiError({
        status: 403,
        message: "This account does not have access to Annix Insights.",
      });
    }

    const remember = input.rememberMe;
    const rememberMe = remember ?? false;
    insightsTokenStore.setTokens(accessToken, refreshToken, rememberMe);
    return { accessToken, refreshToken };
  },

  currentUser(): InsightsUser | null {
    const token = insightsTokenStore.accessToken();
    if (!token) return null;
    const decoded = decodeJwt(token);
    if (!decoded) return null;
    const decodedRoles = decoded.roles;
    const roles = decodedRoles ?? [];
    if (!roles.includes(INSIGHTS_ROLE)) return null;
    const decodedEmail = decoded.email;
    const email = decodedEmail ?? "";
    return {
      id: decoded.sub,
      email,
      firstName: null,
      lastName: null,
      roles,
    };
  },

  logout() {
    insightsTokenStore.clear();
  },
};
