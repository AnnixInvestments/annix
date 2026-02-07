import { QueryClient } from "@tanstack/react-query";
import { isUndefined } from "es-toolkit/compat";
import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { SessionExpiredError } from "@/app/lib/api/client";

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
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
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
