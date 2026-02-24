import { del, entries, get, keys, set, type UseStore } from "idb-keyval";
import { nowISO } from "@/app/lib/datetime";
import {
  deliveryNotesStore,
  jobCardsStore,
  pendingActionsStore,
  photosStore,
  saveSyncMeta,
  stockItemsStore,
  syncMeta,
} from "./db";

export interface StockItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  minStockLevel: number;
  location: string | null;
  photoUrl: string | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobCard {
  id: number;
  jobNumber: string;
  description: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
  client: string | null;
  expectedOuterDiameter: number | null;
  expectedLength: number | null;
  expectedQty: number | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNote {
  id: number;
  deliveryNumber: string;
  supplierName: string | null;
  receivedBy: string | null;
  notes: string | null;
  photoUrl: string | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PendingPhoto {
  id: string;
  entityType: "stockItem" | "jobCard" | "allocation" | "delivery";
  entityId: number;
  blob: Blob;
  filename: string;
  uploadUrl: string;
  authHeader: string;
  synced: boolean;
  createdAt: string;
}

export interface PendingAction {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retryCount: number;
}

function createTypedStore<T extends { id: number | string }>(store: UseStore) {
  return {
    async byId(id: number | string): Promise<T | undefined> {
      return get<T>(String(id), store);
    },

    async save(item: T): Promise<void> {
      await set(String(item.id), item, store);
    },

    async saveAll(items: T[]): Promise<void> {
      await Promise.all(items.map((item) => set(String(item.id), item, store)));
    },

    async remove(id: number | string): Promise<void> {
      await del(String(id), store);
    },

    async all(): Promise<T[]> {
      const allEntries = await entries<string, T>(store);
      return allEntries.map(([, value]) => value);
    },

    async allKeys(): Promise<string[]> {
      const allKeys = await keys<string>(store);
      return allKeys;
    },

    async count(): Promise<number> {
      const allKeys = await keys(store);
      return allKeys.length;
    },
  };
}

export const offlineStockItems = createTypedStore<StockItem>(stockItemsStore);
export const offlineJobCards = createTypedStore<JobCard>(jobCardsStore);
export const offlineDeliveryNotes = createTypedStore<DeliveryNote>(deliveryNotesStore);

export const offlinePhotos = {
  async save(photo: PendingPhoto): Promise<void> {
    await set(photo.id, photo, photosStore);
  },

  async byId(id: string): Promise<PendingPhoto | undefined> {
    return get<PendingPhoto>(id, photosStore);
  },

  async unsyncedPhotos(): Promise<PendingPhoto[]> {
    const allEntries = await entries<string, PendingPhoto>(photosStore);
    return allEntries.map(([, value]) => value).filter((photo) => !photo.synced);
  },

  async markSynced(id: string): Promise<void> {
    const photo = await get<PendingPhoto>(id, photosStore);
    if (photo) {
      photo.synced = true;
      await set(id, photo, photosStore);
    }
  },

  async remove(id: string): Promise<void> {
    await del(id, photosStore);
  },

  async count(): Promise<number> {
    const allKeys = await keys(photosStore);
    return allKeys.length;
  },

  async unsyncedCount(): Promise<number> {
    const unsynced = await this.unsyncedPhotos();
    return unsynced.length;
  },
};

export const offlinePendingActions = {
  async add(action: Omit<PendingAction, "id" | "timestamp" | "retryCount">): Promise<string> {
    const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pendingAction: PendingAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await set(id, pendingAction, pendingActionsStore);
    return id;
  },

  async all(): Promise<PendingAction[]> {
    const allEntries = await entries<string, PendingAction>(pendingActionsStore);
    return allEntries.map(([, value]) => value).sort((a, b) => a.timestamp - b.timestamp);
  },

  async byId(id: string): Promise<PendingAction | undefined> {
    return get<PendingAction>(id, pendingActionsStore);
  },

  async remove(id: string): Promise<void> {
    await del(id, pendingActionsStore);
  },

  async incrementRetry(id: string): Promise<number> {
    const action = await get<PendingAction>(id, pendingActionsStore);
    if (action) {
      action.retryCount += 1;
      await set(id, action, pendingActionsStore);
      return action.retryCount;
    }
    return 0;
  },

  async count(): Promise<number> {
    const allKeys = await keys(pendingActionsStore);
    return allKeys.length;
  },
};

export const offlineSyncMeta = {
  async lastSyncTime(entity: string): Promise<string | null> {
    const meta = await syncMeta(entity);
    return meta?.lastSync ?? null;
  },

  async updateLastSync(entity: string): Promise<void> {
    await saveSyncMeta(entity, {
      lastSync: nowISO(),
      version: "1",
    });
  },
};
