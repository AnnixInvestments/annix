import {
  type DeliveryNote,
  type JobCard,
  offlineDeliveryNotes,
  offlineJobCards,
  offlinePendingActions,
  offlineStockItems,
  offlineSyncMeta,
  type StockItem,
} from "./stores";

export interface OfflineResponse<T> {
  data: T;
  fromCache: boolean;
  error?: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  authHeaders: () => Record<string, string>;
}

export function createOfflineApiClient(options: ApiClientOptions) {
  const { baseUrl, authHeaders } = options;

  async function fetchWithCache<T>(
    path: string,
    cacheKey: string,
    cacheGetter: () => Promise<T | undefined>,
    cacheSetter: (data: T) => Promise<void>,
  ): Promise<OfflineResponse<T>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      await cacheSetter(data);
      await offlineSyncMeta.updateLastSync(cacheKey);

      return { data, fromCache: false };
    } catch (error) {
      const cached = await cacheGetter();
      if (cached !== undefined) {
        return { data: cached, fromCache: true };
      }
      throw error;
    }
  }

  async function fetchListWithCache<T extends { id: number }>(
    path: string,
    cacheKey: string,
    store: {
      all: () => Promise<T[]>;
      saveAll: (items: T[]) => Promise<void>;
    },
  ): Promise<OfflineResponse<T[]>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseData = await response.json();
      const items = responseData.items ?? responseData.data ?? responseData;

      if (Array.isArray(items)) {
        await store.saveAll(items);
        await offlineSyncMeta.updateLastSync(cacheKey);
      }

      return { data: items, fromCache: false };
    } catch (error) {
      const cached = await store.all();
      if (cached.length > 0) {
        return { data: cached, fromCache: true };
      }
      throw error;
    }
  }

  async function mutateWithQueue<T>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<OfflineResponse<T>> {
    const headers = {
      ...authHeaders(),
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data, fromCache: false };
    } catch (error) {
      await offlinePendingActions.add({
        url: `${baseUrl}${path}`,
        method,
        headers,
        body: body ? JSON.stringify(body) : "",
      });

      return {
        data: { queued: true } as T,
        fromCache: false,
        error: "Action queued for sync when online",
      };
    }
  }

  return {
    stockItems: {
      async list(params?: {
        category?: string;
        search?: string;
        belowMinStock?: boolean;
      }): Promise<OfflineResponse<StockItem[]>> {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set("category", params.category);
        if (params?.search) searchParams.set("search", params.search);
        if (params?.belowMinStock) searchParams.set("belowMinStock", "true");

        const query = searchParams.toString();
        const path = `/stock-control/inventory${query ? `?${query}` : ""}`;

        return fetchListWithCache(path, "stockItems", offlineStockItems);
      },

      async byId(id: number): Promise<OfflineResponse<StockItem>> {
        return fetchWithCache(
          `/stock-control/inventory/${id}`,
          `stockItem-${id}`,
          () => offlineStockItems.byId(id),
          (data) => offlineStockItems.save(data),
        );
      },

      async create(data: Partial<StockItem>): Promise<OfflineResponse<StockItem>> {
        return mutateWithQueue("/stock-control/inventory", "POST", data);
      },

      async update(id: number, data: Partial<StockItem>): Promise<OfflineResponse<StockItem>> {
        return mutateWithQueue(`/stock-control/inventory/${id}`, "PUT", data);
      },

      async delete(id: number): Promise<OfflineResponse<void>> {
        const result = await mutateWithQueue<void>(`/stock-control/inventory/${id}`, "DELETE");
        if (!result.error) {
          await offlineStockItems.remove(id);
        }
        return result;
      },
    },

    jobCards: {
      async list(params?: { status?: string }): Promise<OfflineResponse<JobCard[]>> {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set("status", params.status);

        const query = searchParams.toString();
        const path = `/stock-control/job-cards${query ? `?${query}` : ""}`;

        return fetchListWithCache(path, "jobCards", offlineJobCards);
      },

      async byId(id: number): Promise<OfflineResponse<JobCard>> {
        return fetchWithCache(
          `/stock-control/job-cards/${id}`,
          `jobCard-${id}`,
          () => offlineJobCards.byId(id),
          (data) => offlineJobCards.save(data),
        );
      },

      async create(data: Partial<JobCard>): Promise<OfflineResponse<JobCard>> {
        return mutateWithQueue("/stock-control/job-cards", "POST", data);
      },

      async update(id: number, data: Partial<JobCard>): Promise<OfflineResponse<JobCard>> {
        return mutateWithQueue(`/stock-control/job-cards/${id}`, "PUT", data);
      },
    },

    deliveryNotes: {
      async list(): Promise<OfflineResponse<DeliveryNote[]>> {
        return fetchListWithCache(
          "/stock-control/deliveries",
          "deliveryNotes",
          offlineDeliveryNotes,
        );
      },

      async byId(id: number): Promise<OfflineResponse<DeliveryNote>> {
        return fetchWithCache(
          `/stock-control/deliveries/${id}`,
          `deliveryNote-${id}`,
          () => offlineDeliveryNotes.byId(id),
          (data) => offlineDeliveryNotes.save(data),
        );
      },

      async create(data: Partial<DeliveryNote>): Promise<OfflineResponse<DeliveryNote>> {
        return mutateWithQueue("/stock-control/deliveries", "POST", data);
      },
    },

    sync: {
      async pendingActionsCount(): Promise<number> {
        return offlinePendingActions.count();
      },

      async lastSyncTime(entity: string): Promise<string | null> {
        return offlineSyncMeta.lastSyncTime(entity);
      },
    },
  };
}

export type OfflineApiClient = ReturnType<typeof createOfflineApiClient>;
