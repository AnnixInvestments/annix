export type AiErrorCode = "rate_limit" | "auth" | "bad_request" | "provider_down" | "unknown";

export const AI_UNAVAILABLE_MESSAGE =
  "The AI service is temporarily unavailable. Please try again shortly.";
export const AI_RATE_LIMIT_MESSAGE =
  "The AI service is busy (rate limit reached). Please try again shortly.";

const RATE_LIMIT_MARKERS = [
  "rate limit",
  "resource_exhausted",
  "quota",
  "429",
  "too many requests",
];

const PROGRAMMER_ERROR_NAMES = new Set([
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "EvalError",
]);

export function userMessageForAiErrorCode(code: AiErrorCode): string {
  return code === "rate_limit" ? AI_RATE_LIMIT_MESSAGE : AI_UNAVAILABLE_MESSAGE;
}

export class AiUnavailableError extends Error {
  readonly code: AiErrorCode;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(code: AiErrorCode, options?: { cause?: unknown }) {
    super(userMessageForAiErrorCode(code));
    this.name = "AiUnavailableError";
    this.code = code;
    this.userMessage = userMessageForAiErrorCode(code);
    this.cause = options?.cause;
  }
}

function numericStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/\b([45]\d\d)\b/);
  return match ? Number(match[1]) : null;
}

export function classifyAiError(error: unknown): AiErrorCode {
  const status = numericStatus(error);
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status === 400) return "bad_request";
  if (status !== null && (status >= 500 || status === 404 || status === 408)) {
    return "provider_down";
  }

  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (RATE_LIMIT_MARKERS.some((marker) => message.includes(marker))) return "rate_limit";
  if (
    ["overloaded", "api error", "503", "529", "econnreset", "etimedout", "fetch failed"].some(
      (marker) => message.includes(marker),
    )
  ) {
    return "provider_down";
  }
  return "unknown";
}

export function isProgrammerError(error: unknown): boolean {
  return error instanceof Error && PROGRAMMER_ERROR_NAMES.has(error.name);
}

export function aiUnavailableError(error: unknown): Error {
  if (error instanceof AiUnavailableError) return error;
  if (isProgrammerError(error)) return error as Error;
  return new AiUnavailableError(classifyAiError(error), { cause: error });
}
