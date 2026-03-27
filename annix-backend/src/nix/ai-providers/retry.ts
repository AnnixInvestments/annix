import { Logger } from "@nestjs/common";

const MAX_RETRIES = 3;
const RETRYABLE_STATUS_PATTERNS = [/\b429\b/, /\b529\b/, /\b503\b/, /overloaded/i, /rate.?limit/i];

function isRetryableError(error: Error): boolean {
  return RETRYABLE_STATUS_PATTERNS.some((pattern) => pattern.test(error.message));
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
