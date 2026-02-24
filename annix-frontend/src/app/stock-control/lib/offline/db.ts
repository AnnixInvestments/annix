import { clear, createStore, del, entries, get, keys, set } from "idb-keyval";

const DB_NAME = "stock-control-offline";

export const stockItemsStore = createStore(`${DB_NAME}-stock-items`, "stockItems");
export const jobCardsStore = createStore(`${DB_NAME}-job-cards`, "jobCards");
export const deliveryNotesStore = createStore(`${DB_NAME}-delivery-notes`, "deliveryNotes");
export const photosStore = createStore(`${DB_NAME}-photos`, "photos");
export const pendingActionsStore = createStore(`${DB_NAME}-pending-actions`, "pendingActions");
export const syncMetaStore = createStore(`${DB_NAME}-sync-meta`, "syncMeta");

export interface SyncMeta {
  lastSync: string | null;
  version: string;
}

export async function saveSyncMeta(key: string, meta: SyncMeta): Promise<void> {
  await set(key, meta, syncMetaStore);
}

export async function syncMeta(key: string): Promise<SyncMeta | undefined> {
  return get<SyncMeta>(key, syncMetaStore);
}

export async function clearAllStores(): Promise<void> {
  await Promise.all([
    clear(stockItemsStore),
    clear(jobCardsStore),
    clear(deliveryNotesStore),
    clear(photosStore),
    clear(pendingActionsStore),
    clear(syncMetaStore),
  ]);
}

export { get, set, del, clear, keys, entries };
