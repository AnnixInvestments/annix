import {
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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
  return (...args: TArgs) =>
    useQuery<TData>({
      queryKey: keyFn(...args),
      queryFn: () => queryFn(...args),
      ...(options?.enabled ? { enabled: options.enabled(...args) } : {}),
      ...(options?.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
      ...(options?.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
      ...(options?.refetchInterval !== undefined
        ? { refetchInterval: options.refetchInterval }
        : {}),
    });
}

export function createArrayQueryHook<TItem, TArgs extends unknown[] = []>(
  keyFn: (...args: TArgs) => QueryKey,
  queryFn: (...args: TArgs) => Promise<TItem[]>,
  options?: {
    enabled?: (...args: TArgs) => boolean;
  } & QueryOptions,
): (...args: TArgs) => UseQueryResult<TItem[], Error> {
  return (...args: TArgs) =>
    useQuery<TItem[]>({
      queryKey: keyFn(...args),
      queryFn: async () => {
        const data = await queryFn(...args);
        return Array.isArray(data) ? data : [];
      },
      ...(options?.enabled ? { enabled: options.enabled(...args) } : {}),
      ...(options?.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
      ...(options?.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
      ...(options?.refetchInterval !== undefined
        ? { refetchInterval: options.refetchInterval }
        : {}),
    });
}

export function createMutationHook<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys?:
    | readonly QueryKey[]
    | ((data: TData, variables: TVariables) => readonly QueryKey[]),
): () => UseMutationResult<TData, Error, TVariables> {
  return () => {
    const queryClient = useQueryClient();
    return useMutation<TData, Error, TVariables>({
      mutationFn,
      retry: false,
      ...(invalidateKeys
        ? {
            onSuccess: (data: TData, variables: TVariables) => {
              const keys =
                typeof invalidateKeys === "function"
                  ? invalidateKeys(data, variables)
                  : invalidateKeys;
              keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
            },
          }
        : {}),
    });
  };
}

export function createInvalidationHook(key: QueryKey): () => () => void {
  return () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: key });
  };
}
