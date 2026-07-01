import { Logger } from "@nestjs/common";

const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504, 529]);
const RETRYABLE_MESSAGE_PATTERNS = [
  /\b(429|500|502|503|504|529)\b/,
  /overloaded/i,
  /rate.?limit/i,
  /econnreset/i,
  /etimedout/i,
  /econnrefused/i,
  /enotfound/i,
  /eai_again/i,
  /socket hang ?up/i,
  /fetch failed/i,
];
const RETRYABLE_ERROR_CODES = /^(ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN)$/i;

export function isRetryableError(error: Error): boolean {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && RETRYABLE_STATUSES.has(status)) {
    return true;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && RETRYABLE_ERROR_CODES.test(code)) {
    return true;
  }
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message));
}

function retryDelayMs(attempt: number): number {
  const baseMs = 1000;
  const jitter = Math.random() * 500;
  return baseMs * 2 ** attempt + jitter;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  logger: Logger,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES && isRetryableError(lastError)) {
        const delay = retryDelayMs(attempt);
        logger.warn(
          `${label} transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms: ${lastError.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}
