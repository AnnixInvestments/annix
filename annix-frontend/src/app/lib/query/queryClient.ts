import { QueryClient } from "@tanstack/react-query";
import { isUndefined } from "es-toolkit/compat";
import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { SessionExpiredError } from "@/app/lib/api/client";

function isClientError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status >= 400 && error.status < 500;
  }
  if (error instanceof Error && "status" in error) {
    const status = (error as Error & { status: number }).status;
    return status >= 400 && status < 500;
  }
  return false;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return false;
  }
  return !isClientError(error);
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof SessionExpiredError) {
            return false;
          }
          if (isClientError(error)) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
      },
      mutations: {
        retry: (failureCount, error) => {
          if (error instanceof SessionExpiredError) {
            return false;
          }
          if (!isNetworkError(error)) {
            return false;
          }
          return failureCount < 1;
        },
        retryDelay: 1000,
        onError: (error) => {
          if (error instanceof SessionExpiredError) {
            sessionExpiredEvent.emit();
          }
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | null = null;

export function queryClient(): QueryClient {
  if (isUndefined(globalThis.window)) {
    return createQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
}
