import {
  type FeedbackAuthConfig,
  type FeedbackClientOptions,
  type FeedbackStatusRequest,
  type FeedbackStatusResponse,
  type FeedbackSubmitRequest,
  type FeedbackSubmitResponse,
} from "./contracts";

export interface FeedbackClient {
  submitFeedback(request: FeedbackSubmitRequest): Promise<FeedbackSubmitResponse>;
  getFeedbackStatus(request: FeedbackStatusRequest): Promise<FeedbackStatusResponse>;
}

function appendField(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    formData.append(key, String(value));
    return;
  }

  if (typeof value === "string" && value.length > 0) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value) || typeof value === "object") {
    formData.append(key, JSON.stringify(value));
  }
}

function createHeaders(authConfig: FeedbackAuthConfig): Record<string, string> {
  return authConfig.headers ? { ...authConfig.headers } : {};
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export function createFeedbackClient(options: FeedbackClientOptions): FeedbackClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async submitFeedback(request: FeedbackSubmitRequest): Promise<FeedbackSubmitResponse> {
      const auth = options.resolveAuth(request.authContext);
      const formData = new FormData();

      appendField(formData, "content", request.payload.content);
      appendField(formData, "source", request.payload.source);
      appendField(formData, "pageUrl", request.payload.pageUrl);
      appendField(formData, "captureUrl", request.payload.captureUrl);
      appendField(formData, "viewportWidth", request.payload.viewportWidth);
      appendField(formData, "viewportHeight", request.payload.viewportHeight);
      appendField(formData, "devicePixelRatio", request.payload.devicePixelRatio);
      appendField(formData, "userAgent", request.payload.userAgent);
      appendField(formData, "previewUserId", request.payload.previewUserId);
      appendField(formData, "previewUserName", request.payload.previewUserName);
      appendField(formData, "previewUserEmail", request.payload.previewUserEmail);
      appendField(formData, "lastUserActions", request.payload.lastUserActions);
      appendField(formData, "consoleErrors", request.payload.consoleErrors);
      appendField(formData, "failedNetworkCalls", request.payload.failedNetworkCalls);
      appendField(formData, "clickedElement", request.payload.clickedElement);
      appendField(formData, "appContext", request.payload.appContext || request.authContext);

      for (const file of request.files ?? []) {
        formData.append("files", file);
      }

      const response = await fetchImpl(`${options.apiBaseUrl}/feedback`, {
        method: "POST",
        headers: createHeaders(auth),
        credentials: auth.credentials ?? "same-origin",
        body: formData,
      });

      return parseJson<FeedbackSubmitResponse>(response);
    },

    async getFeedbackStatus(request: FeedbackStatusRequest): Promise<FeedbackStatusResponse> {
      const auth = options.resolveAuth(request.authContext);
      const response = await fetchImpl(
        `${options.apiBaseUrl}/feedback/${request.feedbackId}/status`,
        {
          method: "GET",
          headers: createHeaders(auth),
          credentials: auth.credentials ?? "same-origin",
        },
      );

      return parseJson<FeedbackStatusResponse>(response);
    },
  };
}
