import { isArray, isObject, isString } from "es-toolkit/compat";

export interface ApiErrorPayload {
  status: number;
  code?: string;
  message: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.detail = payload.detail;
    this.fieldErrors = payload.fieldErrors;
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

const TRANSIENT_SERVER_STATUSES = new Set([502, 503, 504]);

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    if (TRANSIENT_SERVER_STATUSES.has(error.status)) {
      return FRIENDLY_BACKEND_UNREACHABLE_MESSAGE;
    }
    const detail = error.detail;
    return detail ? `${error.message} — ${detail}` : error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (isString(error) && error.length > 0) {
    return error;
  }
  return fallback;
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
  });
}
