import { browserBaseUrl, getAuthHeaders } from "@/lib/api-config";

export async function opsApiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${browserBaseUrl()}${path}`;
  const extraHeaders = options?.headers;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(extraHeaders || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export function platformContactsUrl(companyId: number, path?: string): string {
  const base = `/platform/companies/${companyId}/contacts`;
  return path ? `${base}/${path}` : base;
}
