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

export async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  const errorText = await response.text().catch(() => "");
  const fallbackMessage = errorText
    ? `API Error (${response.status}): ${errorText}`
    : `HTTP ${response.status}`;

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = errorText ? (JSON.parse(errorText) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const message =
    parsed && typeof parsed.message === "string"
      ? parsed.message
      : parsed && Array.isArray(parsed.message)
        ? (parsed.message as string[]).join(", ")
        : fallbackMessage;

  throw new ApiError({
    status: response.status,
    code: parsed && typeof parsed.code === "string" ? (parsed.code as string) : undefined,
    message,
    detail: parsed && typeof parsed.detail === "string" ? (parsed.detail as string) : undefined,
    fieldErrors:
      parsed?.fieldErrors && typeof parsed.fieldErrors === "object"
        ? (parsed.fieldErrors as Record<string, string[]>)
        : undefined,
  });
}
