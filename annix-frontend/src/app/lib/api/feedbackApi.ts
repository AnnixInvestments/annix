import {
  createFeedbackClient,
  type FeedbackAuthContext as FeedbackAuthContextContract,
  type FeedbackStatusResponse,
  type FeedbackSubmissionPayload,
  type FeedbackSubmitResponse,
} from "@annix/feedback-sdk";
import { isUndefined } from "es-toolkit/compat";
import { createApiClient } from "@/app/lib/api/createApiClient";
import { customerTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export type FeedbackAuthContext = FeedbackAuthContextContract;
export type SubmitFeedbackDto = FeedbackSubmissionPayload;
export type SubmitFeedbackResponse = FeedbackSubmitResponse;

const COOKIE_AUTH_CONTEXTS: FeedbackAuthContext[] = ["comply-sa"];

const AUTH_TOKEN_KEYS: Record<string, string> = {
  customer: "customerAccessToken",
  admin: "adminAccessToken",
  "stock-control": "stockControlAccessToken",
  "au-rubber": "auRubberAccessToken",
  supplier: "supplierAccessToken",
  "cv-assistant": "cvAssistantAccessToken",
  "annix-rep": "annixRepAccessToken",
};

function usesCookieAuth(authContext: FeedbackAuthContext): boolean {
  return COOKIE_AUTH_CONTEXTS.includes(authContext);
}

function resolveToken(authContext: FeedbackAuthContext): string | null {
  if (usesCookieAuth(authContext)) {
    return null;
  }
  if (isUndefined(window)) {
    return null;
  }
  const key = AUTH_TOKEN_KEYS[authContext];
  if (!key) {
    return null;
  }
  const localToken = localStorage.getItem(key);
  return localToken || sessionStorage.getItem(key);
}

function resolveFeedbackAuth(authContext: FeedbackAuthContext) {
  const isCookieAuth = usesCookieAuth(authContext);
  const token = resolveToken(authContext);

  if (!isCookieAuth && !token) {
    throw new Error("Not authenticated");
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    headers,
    credentials: isCookieAuth
      ? ("include" as RequestCredentials)
      : ("same-origin" as RequestCredentials),
  };
}

const customerClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: customerTokenStore,
  refreshUrl: `${API_BASE_URL}/customer/auth/refresh`,
});

export const customerFeedbackApi = {
  submitFeedback: async (dto: SubmitFeedbackDto): Promise<SubmitFeedbackResponse> => {
    return customerClient.post<SubmitFeedbackResponse>("/customer/feedback", dto);
  },
};

const generalFeedbackClient = createFeedbackClient({
  apiBaseUrl: API_BASE_URL,
  resolveAuth: resolveFeedbackAuth,
});

export async function submitFeedbackWithAttachments(
  dto: SubmitFeedbackDto & { appContext?: string },
  files: File[],
  authContext: FeedbackAuthContext,
): Promise<SubmitFeedbackResponse> {
  const appContext = dto.appContext;

  return generalFeedbackClient.submitFeedback({
    authContext,
    payload: {
      ...dto,
      appContext: appContext || authContext,
    },
    files,
  });
}

export async function fetchFeedbackStatus(
  feedbackId: number,
  authContext: FeedbackAuthContext,
): Promise<FeedbackStatusResponse> {
  return generalFeedbackClient.getFeedbackStatus({
    authContext,
    feedbackId,
  });
}
