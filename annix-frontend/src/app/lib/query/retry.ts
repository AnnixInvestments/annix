export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 503, 502, 504],
};

export interface RetryableFetchOptions extends RequestInit {
  retryConfig?: Partial<RetryConfig>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * config.backoffMultiplier ** attempt;
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, config.maxDelayMs);
}

export async function retryableFetch(
  url: string,
  options: RetryableFetchOptions = {},
): Promise<Response> {
  const { retryConfig: customConfig, ...fetchOptions } = options;
  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...customConfig };

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok) {
        return response;
      }

      if (config.retryableStatuses.includes(response.status) && attempt < config.maxRetries) {
        lastResponse = response;

        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000 || calculateDelay(attempt, config)
          : calculateDelay(attempt, config);

        console.warn(
          `Request to ${url} failed with status ${response.status}. ` +
            `Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${config.maxRetries})`,
        );

        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        const delayMs = calculateDelay(attempt, config);
        console.warn(
          `Request to ${url} failed with error: ${lastError.message}. ` +
            `Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${config.maxRetries})`,
        );
        await sleep(delayMs);
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error(`Request to ${url} failed after ${config.maxRetries} retries`);
}
