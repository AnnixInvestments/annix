import { nowISO } from "@/app/lib/datetime";
import { pendingMutationCount, processMutation } from "./mutationQueue";
import { pendingPhotoCount, syncPendingPhotos } from "./photoSync";
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

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingMutations: number;
  pendingPhotos: number;
  lastSyncAt: string | null;
  error: string | null;
}

type SyncStatusListener = (status: SyncStatus) => void;

const statusListeners: Set<SyncStatusListener> = new Set();
let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingMutations: 0,
  pendingPhotos: 0,
  lastSyncAt: null,
  error: null,
};

let syncInterval: NodeJS.Timeout | null = null;

export function syncStatus(): SyncStatus {
  return { ...currentStatus };
}

export function onSyncStatusChange(listener: SyncStatusListener): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => statusListeners.delete(listener);
}

function updateStatus(partial: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  statusListeners.forEach((listener) => listener(currentStatus));
}

async function refreshPendingCounts() {
  const [mutations, photos] = await Promise.all([pendingMutationCount(), pendingPhotoCount()]);
  updateStatus({ pendingMutations: mutations, pendingPhotos: photos });
}

export async function syncData(
  apiBaseUrl: string,
  authHeader: string,
): Promise<{ success: boolean; error?: string }> {
  if (currentStatus.isSyncing) {
    return { success: false, error: "Sync already in progress" };
  }

  updateStatus({ isSyncing: true, error: null });

  try {
    const pendingActions = await offlinePendingActions.all();

    for (const action of pendingActions) {
      await processMutation(action);
    }

    await syncPendingPhotos(authHeader);

    await Promise.all([
      syncStockItems(apiBaseUrl, authHeader),
      syncJobCards(apiBaseUrl, authHeader),
      syncDeliveryNotes(apiBaseUrl, authHeader),
    ]);

    await refreshPendingCounts();
    updateStatus({
      isSyncing: false,
      lastSyncAt: nowISO(),
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    updateStatus({ isSyncing: false, error: message });
    return { success: false, error: message };
  }
}

async function syncStockItems(apiBaseUrl: string, authHeader: string): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl}/stock-control/inventory`, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) return;

    const data = await response.json();
    const items: StockItem[] = data.items || data;

    await offlineStockItems.saveAll(items);
    await offlineSyncMeta.updateLastSync("stockItems");
  } catch (error) {
    console.error("Failed to sync stock items:", error);
  }
}

async function syncJobCards(apiBaseUrl: string, authHeader: string): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl}/stock-control/job-cards`, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) return;

    const items: JobCard[] = await response.json();
    await offlineJobCards.saveAll(items);
    await offlineSyncMeta.updateLastSync("jobCards");
  } catch (error) {
    console.error("Failed to sync job cards:", error);
  }
}

async function syncDeliveryNotes(apiBaseUrl: string, authHeader: string): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl}/stock-control/deliveries`, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) return;

    const items: DeliveryNote[] = await response.json();
    await offlineDeliveryNotes.saveAll(items);
    await offlineSyncMeta.updateLastSync("deliveryNotes");
  } catch (error) {
    console.error("Failed to sync delivery notes:", error);
  }
}

export function startBackgroundSync(
  apiBaseUrl: string,
  authHeaderGetter: () => string,
  intervalMs: number = 5 * 60 * 1000,
): void {
  stopBackgroundSync();

  if (typeof window === "undefined") return;

  const handleOnline = () => {
    updateStatus({ isOnline: true });
    syncData(apiBaseUrl, authHeaderGetter());
  };

  const handleOffline = () => {
    updateStatus({ isOnline: false });
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  updateStatus({ isOnline: navigator.onLine });

  refreshPendingCounts();

  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      syncData(apiBaseUrl, authHeaderGetter());
    }
  }, intervalMs);

  if (navigator.onLine) {
    syncData(apiBaseUrl, authHeaderGetter());
  }
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function forceSync(
  apiBaseUrl: string,
  authHeader: string,
): Promise<{ success: boolean; error?: string }> {
  return syncData(apiBaseUrl, authHeader);
}
