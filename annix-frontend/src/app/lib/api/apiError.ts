import { isArray, isObject, isString } from "es-toolkit/compat";

export interface ApiErrorPayload {
  status: number;
  code?: string;
  message: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly meta?: Record<string, unknown>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.detail = payload.detail;
    this.fieldErrors = payload.fieldErrors;
    this.meta = payload.meta;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isConflict(): boolean {
    return this.status === 409;
  }

  isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError || (error instanceof Error && error.name === "ApiError");

export const FRIENDLY_BACKEND_UNREACHABLE_MESSAGE =
  "We're having trouble reaching the server. Please wait a moment and try again.";

export const FRIENDLY_UNAUTHORIZED_MESSAGE =
  "Your session has expired. Please sign in again to continue.";

export const FRIENDLY_FORBIDDEN_MESSAGE =
  "You don't have permission to do that. Contact your administrator if you think this is wrong.";

const TRANSIENT_SERVER_STATUSES = new Set([502, 503, 504]);

const NETWORK_ERROR_MESSAGES = new Set([
  "Failed to fetch",
  "Network request failed",
  "Load failed",
  "fetch failed",
  "Backend unavailable",
]);

const RAW_API_ERROR_RE = /^API Error \(\d+\):/i;

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    if (TRANSIENT_SERVER_STATUSES.has(error.status)) {
      return FRIENDLY_BACKEND_UNREACHABLE_MESSAGE;
    }
    if (error.status === 401) {
      return FRIENDLY_UNAUTHORIZED_MESSAGE;
    }
    if (error.status === 403) {
      return FRIENDLY_FORBIDDEN_MESSAGE;
    }
    const detail = error.detail;
    return detail ? `${error.message} — ${detail}` : error.message;
  }
  if (error instanceof Error) {
    if (NETWORK_ERROR_MESSAGES.has(error.message)) {
      return FRIENDLY_BACKEND_UNREACHABLE_MESSAGE;
    }
    if (RAW_API_ERROR_RE.test(error.message)) {
      return fallback;
    }
    return error.message;
  }
  if (isString(error) && error.length > 0) {
    return error;
  }
  return fallback;
}

type ShowToastFn = (
  message: string,
  type?: "success" | "error" | "warning" | "info",
  duration?: number,
) => void;

export function toastError(showToast: ShowToastFn, error: unknown, fallback: string): void {
  showToast(extractErrorMessage(error, fallback), "error");
}

export async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  const errorText = await response.text().catch(() => "");

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = errorText ? (JSON.parse(errorText) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const isTransient = TRANSIENT_SERVER_STATUSES.has(response.status);

  const fallbackMessage = isTransient
    ? FRIENDLY_BACKEND_UNREACHABLE_MESSAGE
    : `Server error (HTTP ${response.status})`;

  const message = isTransient
    ? FRIENDLY_BACKEND_UNREACHABLE_MESSAGE
    : parsed && isString(parsed.message)
      ? parsed.message
      : parsed && isArray(parsed.message)
        ? (parsed.message as string[]).join(", ")
        : parsed && isString(parsed.error)
          ? (parsed.error as string)
          : fallbackMessage;

  throw new ApiError({
    status: response.status,
    code: parsed && isString(parsed.code) ? (parsed.code as string) : undefined,
    message,
    detail:
      isTransient || !(parsed && isString(parsed.detail)) ? undefined : (parsed.detail as string),
    fieldErrors:
      parsed?.fieldErrors && isObject(parsed.fieldErrors)
        ? (parsed.fieldErrors as Record<string, string[]>)
        : undefined,
    meta: parsed && isObject(parsed) ? (parsed as Record<string, unknown>) : undefined,
  });
}
