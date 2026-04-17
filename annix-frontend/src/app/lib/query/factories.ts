import {
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isArray } from "es-toolkit/compat";

type QueryOptions = {
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number;
};

export function createQueryHook<TData, TArgs extends unknown[] = []>(
  keyFn: (...args: TArgs) => QueryKey,
  queryFn: (...args: TArgs) => Promise<TData>,
  options?: {
    enabled?: (...args: TArgs) => boolean;
  } & QueryOptions,
): (...args: TArgs) => UseQueryResult<TData, Error> {
  const enabledFn = options ? options.enabled : undefined;
  const staleTime = options ? options.staleTime : undefined;
  const gcTime = options ? options.gcTime : undefined;
  const refetchInterval = options ? options.refetchInterval : undefined;
  return (...args: TArgs) => {
    const queryOptions = {
      queryKey: keyFn(...args),
      queryFn: () => queryFn(...args),
      ...(enabledFn ? { enabled: enabledFn(...args) } : {}),
      ...(staleTime !== undefined ? { staleTime } : {}),
      ...(gcTime !== undefined ? { gcTime } : {}),
      // eslint-disable-next-line no-restricted-syntax -- generic factory; callers supply the validated interval
      ...(refetchInterval !== undefined ? { refetchInterval } : {}),
    };
    return useQuery<TData>(queryOptions);
  };
}

export function createArrayQueryHook<TItem, TArgs extends unknown[] = []>(
  keyFn: (...args: TArgs) => QueryKey,
  queryFn: (...args: TArgs) => Promise<TItem[]>,
  options?: {
    enabled?: (...args: TArgs) => boolean;
  } & QueryOptions,
): (...args: TArgs) => UseQueryResult<TItem[], Error> {
  const enabledFn = options ? options.enabled : undefined;
  const staleTime = options ? options.staleTime : undefined;
  const gcTime = options ? options.gcTime : undefined;
  const refetchInterval = options ? options.refetchInterval : undefined;
  return (...args: TArgs) => {
    const queryOptions = {
      queryKey: keyFn(...args),
      queryFn: async () => {
        const data = await queryFn(...args);
        return isArray(data) ? data : [];
      },
      ...(enabledFn ? { enabled: enabledFn(...args) } : {}),
      ...(staleTime !== undefined ? { staleTime } : {}),
      ...(gcTime !== undefined ? { gcTime } : {}),
      // eslint-disable-next-line no-restricted-syntax -- generic factory; callers supply the validated interval
      ...(refetchInterval !== undefined ? { refetchInterval } : {}),
    };
    return useQuery<TItem[]>(queryOptions);
  };
}

export function createMutationHook<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys?:
    | readonly QueryKey[]
    | ((data: TData, variables: TVariables) => readonly QueryKey[]),
): () => UseMutationResult<TData, Error, TVariables> {
  return () => {
    const queryClient = useQueryClient();
    const retryOption = false;
    const onSuccessHandler = invalidateKeys
      ? (data: TData, variables: TVariables) => {
          const keys =
            typeof invalidateKeys === "function" ? invalidateKeys(data, variables) : invalidateKeys;
          keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        }
      : undefined;
    const mutationOptions = {
      mutationFn,
      retry: retryOption,
      onSuccess: onSuccessHandler,
    };
    return useMutation<TData, Error, TVariables>(mutationOptions);
  };
}

export function createInvalidationHook(key: QueryKey): () => () => void {
  return () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: key });
  };
}
