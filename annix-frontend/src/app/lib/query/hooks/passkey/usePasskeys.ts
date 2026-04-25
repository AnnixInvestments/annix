import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PasskeySummary } from "@/app/lib/passkey";
import { registerPasskey } from "@/app/lib/passkey";
import { browserBaseUrl, getAuthHeaders } from "@/lib/api-config";
import { passkeyKeys } from "../../keys/passkeyKeys";

interface PasskeyHookOptions {
  authHeaders?: Record<string, string>;
  enabled?: boolean;
}

function resolveHeaders(opts: PasskeyHookOptions): Record<string, string> {
  const override = opts.authHeaders;
  if (override) return override;
  return getAuthHeaders();
}

async function fetchPasskeys(authHeaders: Record<string, string>): Promise<PasskeySummary[]> {
  const response = await fetch(`${browserBaseUrl()}/auth/passkey`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to load passkeys");
  }

  return response.json();
}

export function usePasskeys(opts: PasskeyHookOptions = {}) {
  const headers = resolveHeaders(opts);
  return useQuery<PasskeySummary[]>({
    queryKey: passkeyKeys.list(),
    queryFn: () => fetchPasskeys(headers),
    enabled: opts.enabled !== false,
  });
}

export function useRegisterPasskey(opts: PasskeyHookOptions = {}) {
  const queryClient = useQueryClient();
  const headers = resolveHeaders(opts);

  return useMutation({
    mutationFn: (deviceName: string | null) => registerPasskey(deviceName, headers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeyKeys.all });
    },
  });
}

export function useRenamePasskey(opts: PasskeyHookOptions = {}) {
  const queryClient = useQueryClient();
  const headers = resolveHeaders(opts);

  return useMutation({
    mutationFn: async ({ id, deviceName }: { id: number; deviceName: string }) => {
      const response = await fetch(`${browserBaseUrl()}/auth/passkey/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ deviceName }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Rename failed" }));
        const message = error.message;
        throw new Error(message || "Rename failed");
      }

      return (await response.json()) as PasskeySummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeyKeys.all });
    },
  });
}

export function useDeletePasskey(opts: PasskeyHookOptions = {}) {
  const queryClient = useQueryClient();
  const headers = resolveHeaders(opts);

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${browserBaseUrl()}/auth/passkey/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Revoke failed" }));
        const message = error.message;
        throw new Error(message || "Revoke failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeyKeys.all });
    },
  });
}
