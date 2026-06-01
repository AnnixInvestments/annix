import { toPairs as entries, isArray, isString, keys } from "es-toolkit/compat";
import { ApiError, FRIENDLY_BACKEND_UNREACHABLE_MESSAGE, throwIfNotOk } from "./apiError";

export interface ApiClientTokenStore {
  accessToken(): string | null;
  refreshToken(): string | null;
  authHeaders(): Record<string, string>;
  updateAccessToken(token: string): void;
  clear(): void;
}

export interface ApiClientOptions {
  baseURL: string;
  tokenStore: ApiClientTokenStore;
  refreshUrl?: string;
  refreshHandler?: () => Promise<boolean>;
  onUnauthorized?: () => void;
}

export interface ApiClient {
  baseURL: string;
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
  get<T>(endpoint: string, options?: RequestInit): Promise<T>;
  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T>;
  patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T>;
  put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T>;
  delete<T>(endpoint: string, options?: RequestInit): Promise<T>;
  requestBlob(endpoint: string, options?: RequestInit): Promise<Blob>;
  uploadFile<T>(
    endpoint: string,
    file: File,
    extraFields?: Record<string, string>,
    onProgress?: (fraction: number) => void,
  ): Promise<T>;
  downloadBlob(endpoint: string, filename: string): Promise<void>;
  fetchBlobUrl(endpoint: string): Promise<string>;
  refreshAccessToken(): Promise<boolean>;
  triggerDownload(blob: Blob, filename: string): void;
}

const safeParseJson = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The server returned an unexpected response. Please try again.");
  }
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }
  return safeParseJson<T>(text);
};

export const createApiClient = (options: ApiClientOptions): ApiClient => {
  const { baseURL, tokenStore, refreshUrl, refreshHandler, onUnauthorized } = options;

  if (!refreshHandler && !refreshUrl) {
    throw new Error("createApiClient requires either refreshUrl or refreshHandler");
  }

  let refreshPromise: Promise<boolean> | null = null;

  const defaultRefresh = async (): Promise<boolean> => {
    try {
      const response = await fetch(refreshUrl as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokenStore.refreshToken() }),
      });
      if (response.status === 401 || response.status === 403) {
        tokenStore.clear();
        onUnauthorized?.();
        return false;
      }
      if (!response.ok) {
        return false;
      }
      const data = (await response.json()) as { accessToken?: string };
      if (data.accessToken) {
        tokenStore.updateAccessToken(data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!tokenStore.refreshToken()) return false;
    if (refreshPromise) return refreshPromise;

    refreshPromise = (refreshHandler ?? defaultRefresh)();

    const result = await refreshPromise;
    refreshPromise = null;
    return result;
  };

  const buildConfig = (init: RequestInit): RequestInit => {
    const callerHeaders = (init.headers as Record<string, string>) ?? {};
    const hasContentType = keys(callerHeaders).some((key) => key.toLowerCase() === "content-type");
    const shouldDefaultJson = isString(init.body) && !hasContentType;
    return {
      ...init,
      headers: {
        ...tokenStore.authHeaders(),
        ...(shouldDefaultJson ? { "Content-Type": "application/json" } : {}),
        ...callerHeaders,
      },
    };
  };

  const throwTransientUnreachable = (): never => {
    throw new ApiError({ status: 503, message: FRIENDLY_BACKEND_UNREACHABLE_MESSAGE });
  };

  const request = async <T>(endpoint: string, init: RequestInit = {}): Promise<T> => {
    const url = `${baseURL}${endpoint}`;
    const config = buildConfig(init);
    const response = await fetch(url, config);

    if (response.status === 401 && tokenStore.refreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, buildConfig(init));
        await throwIfNotOk(retryResponse);
        return parseResponse<T>(retryResponse);
      }
      if (tokenStore.refreshToken()) {
        throwTransientUnreachable();
      }
    }

    await throwIfNotOk(response);
    return parseResponse<T>(response);
  };

  const requestBlob = async (endpoint: string, init: RequestInit = {}): Promise<Blob> => {
    const url = `${baseURL}${endpoint}`;
    const response = await fetch(url, buildConfig(init));

    if (response.status === 401 && tokenStore.refreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, buildConfig(init));
        await throwIfNotOk(retryResponse);
        return retryResponse.blob();
      }
      if (tokenStore.refreshToken()) {
        throwTransientUnreachable();
      }
    }

    await throwIfNotOk(response);
    return response.blob();
  };

  const uploadFile = async <T>(
    endpoint: string,
    file: File,
    extraFields?: Record<string, string>,
    onProgress?: (fraction: number) => void,
  ): Promise<T> => {
    const formData = new FormData();
    formData.append("file", file);
    if (extraFields) {
      entries(extraFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const url = `${baseURL}${endpoint}`;
    const buildUploadHeaders = (token: string | null): Record<string, string> => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    };

    // fetch() cannot report upload progress; when a caller wants a real progress
    // bar we send via XMLHttpRequest, which exposes upload.onprogress. The
    // happy/error paths still reuse throwIfNotOk + safeParseJson for consistency.
    if (onProgress) {
      const sendViaXhr = (token: string | null): Promise<{ status: number; text: string }> =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", url);
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(event.loaded / event.total);
          };
          xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
          xhr.onerror = () => reject(new Error("Network error during upload. Please try again."));
          xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
          xhr.send(formData);
        });

      let result = await sendViaXhr(tokenStore.accessToken());
      if (result.status === 401 && tokenStore.refreshToken()) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          result = await sendViaXhr(tokenStore.accessToken());
        } else if (tokenStore.refreshToken()) {
          throwTransientUnreachable();
        }
      }
      if (result.status >= 200 && result.status < 300) {
        onProgress(1);
        const text = result.text;
        if (!text || text.trim() === "") return {} as T;
        return safeParseJson<T>(text);
      }
      if (result.status === 0) {
        throw new Error("Upload was interrupted. Please check your connection and try again.");
      }
      await throwIfNotOk(new Response(result.text, { status: result.status }));
      return {} as T;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: buildUploadHeaders(tokenStore.accessToken()),
      body: formData,
    });

    if (response.status === 401 && tokenStore.refreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: buildUploadHeaders(tokenStore.accessToken()),
          body: formData,
        });
        await throwIfNotOk(retryResponse);
        return parseResponse<T>(retryResponse);
      }
      if (tokenStore.refreshToken()) {
        throwTransientUnreachable();
      }
    }

    await throwIfNotOk(response);
    return parseResponse<T>(response);
  };

  const triggerDownload = (blob: Blob, filename: string): void => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const downloadBlob = async (endpoint: string, filename: string): Promise<void> => {
    const blob = await requestBlob(endpoint);
    triggerDownload(blob, filename);
  };

  const fetchBlobUrl = async (endpoint: string): Promise<string> => {
    const blob = await requestBlob(endpoint);
    return URL.createObjectURL(blob);
  };

  const withBody = (body: unknown, init: RequestInit = {}): RequestInit => ({
    ...init,
    body: body !== undefined && body !== null ? JSON.stringify(body) : init.body,
  });

  return {
    baseURL,
    request,
    get: <T>(endpoint: string, init?: RequestInit) =>
      request<T>(endpoint, { ...init, method: "GET" }),
    post: <T>(endpoint: string, body?: unknown, init?: RequestInit) =>
      request<T>(endpoint, withBody(body, { ...init, method: "POST" })),
    patch: <T>(endpoint: string, body?: unknown, init?: RequestInit) =>
      request<T>(endpoint, withBody(body, { ...init, method: "PATCH" })),
    put: <T>(endpoint: string, body?: unknown, init?: RequestInit) =>
      request<T>(endpoint, withBody(body, { ...init, method: "PUT" })),
    delete: <T>(endpoint: string, init?: RequestInit) =>
      request<T>(endpoint, { ...init, method: "DELETE" }),
    requestBlob,
    uploadFile,
    downloadBlob,
    fetchBlobUrl,
    refreshAccessToken,
    triggerDownload,
  };
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

export interface EndpointConfig<TArgs extends unknown[], TResponse> {
  path: string | ((...args: TArgs) => string);
  query?: (...args: TArgs) => QueryParams;
  body?: (...args: TArgs) => unknown;
  formData?: (...args: TArgs) => FormData;
  transform?: (raw: unknown) => TResponse;
  /** Response type. Defaults to "json" (parsed via client.request). Use "blob" for file downloads. */
  responseType?: "json" | "blob";
}

export type Endpoint<TArgs extends unknown[], TResponse> = (...args: TArgs) => Promise<TResponse>;

const buildQueryString = (params: QueryParams): string => {
  const search = new URLSearchParams();
  entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined) search.append(key, String(item));
      });
    } else {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export function createEndpoint<TArgs extends unknown[] = [], TResponse = unknown>(
  client: ApiClient,
  method: HttpMethod,
  config: EndpointConfig<TArgs, TResponse>,
): Endpoint<TArgs, TResponse> {
  const fn = async (...args: TArgs): Promise<TResponse> => {
    const basePath = typeof config.path === "function" ? config.path(...args) : config.path;
    const queryString = config.query ? buildQueryString(config.query(...args)) : "";
    const fullPath = `${basePath}${queryString}`;

    const init: RequestInit = { method };

    if (config.formData) {
      init.body = config.formData(...args);
    } else if (config.body) {
      const bodyValue = config.body(...args);
      if (bodyValue !== undefined && bodyValue !== null) {
        init.body = JSON.stringify(bodyValue);
        init.headers = { "Content-Type": "application/json" };
      }
    }

    const raw =
      config.responseType === "blob"
        ? await client.requestBlob(fullPath, init)
        : await client.request<unknown>(fullPath, init);
    return (config.transform ? config.transform(raw) : raw) as TResponse;
  };

  return fn;
}
