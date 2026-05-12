import { anyPortalAuthHeaders } from "@/app/lib/api/portalTokenStores";
import { browserBaseUrl } from "@/lib/api-config";
import { createMutationHook, createQueryHook } from "../../factories";
import { retryableFetch } from "../../retry";

const STOCK_CONTROL_CUSTOMER_KEYS = {
  all: ["stock-control", "customers"] as const,
  list: (q: string | undefined) => [...STOCK_CONTROL_CUSTOMER_KEYS.all, "list", q ?? ""] as const,
};

export interface QuoteCustomer {
  id: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
}

export type NewCustomerInput = Omit<QuoteCustomer, "id">;

async function stockControlCustomerRequest<TResponse>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    errorLabel: string;
  },
): Promise<TResponse> {
  const headers: Record<string, string> = { ...anyPortalAuthHeaders() };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const method = options.method;
  const response = await retryableFetch(`${browserBaseUrl()}${path}`, {
    method: method ?? "GET",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    throw new Error(`${options.errorLabel}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Customer-picker autocomplete for the QuoteSpecsEditor customer card.
 * Server filters by name prefix (case-insensitive). Empty `q` returns the
 * first 50 customers alphabetically.
 */
export const useStockControlCustomers = createQueryHook(
  (q: string | undefined) => STOCK_CONTROL_CUSTOMER_KEYS.list(q),
  (q: string | undefined) => {
    const params = new URLSearchParams();
    const trimmed = (q ?? "").trim();
    if (trimmed.length > 0) params.set("q", trimmed);
    const qs = params.toString();
    return stockControlCustomerRequest<QuoteCustomer[]>(
      `/stock-control/customers${qs ? `?${qs}` : ""}`,
      { errorLabel: "Failed to list customers" },
    );
  },
  {
    enabled: () => true,
    staleTime: 60_000,
  },
);

/**
 * Creates a customer in the master `companies` table with
 * `companyType = CUSTOMER`. Used by the "Save for future use" tick on the
 * inline new-customer form.
 */
export const useCreateStockControlCustomer = createMutationHook<QuoteCustomer, NewCustomerInput>(
  (body) =>
    stockControlCustomerRequest<QuoteCustomer>("/stock-control/customers", {
      method: "POST",
      body,
      errorLabel: "Failed to save customer",
    }),
  () => [STOCK_CONTROL_CUSTOMER_KEYS.all],
);
