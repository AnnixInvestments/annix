import { fieldflowApi, type Meeting, type Visit } from "@/app/lib/api/fieldflowApi";
import {
  addPendingAction,
  pendingActions,
  removePendingAction,
  saveMeetings,
  saveProspects,
  saveVisits,
  syncMeta,
  updatePendingActionRetry,
  updateSyncMeta,
} from "./indexedDb";

const MAX_RETRY_COUNT = 5;
const SYNC_INTERVAL = 5 * 60 * 1000;

type SyncCallback = (status: SyncStatus) => void;

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  error: null,
};

const listeners: Set<SyncCallback> = new Set();

export function onSyncStatusChange(callback: SyncCallback): () => void {
  listeners.add(callback);
  callback(syncStatus);
  return () => listeners.delete(callback);
}

function notifyListeners(): void {
  listeners.forEach((callback) => callback(syncStatus));
}

function updateStatus(updates: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...updates };
  notifyListeners();
}

export function currentSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

export async function queueOfflineAction(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string,
): Promise<void> {
  await addPendingAction({
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
  });

  const actions = await pendingActions();
  updateStatus({ pendingCount: actions.length });

  if (syncStatus.isOnline && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      await (
        registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }
      ).sync.register("sync-pending-actions");
    }
  }
}

export async function syncPendingActions(): Promise<{ synced: number; failed: number }> {
  if (syncStatus.isSyncing || !syncStatus.isOnline) {
    return { synced: 0, failed: 0 };
  }

  updateStatus({ isSyncing: true, error: null });

  const actions = await pendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    if ((action.retryCount || 0) >= MAX_RETRY_COUNT) {
      await removePendingAction(action.id!);
      failed++;
      continue;
    }

    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });

      if (response.ok) {
        await removePendingAction(action.id!);
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        await removePendingAction(action.id!);
        failed++;
      } else {
        await updatePendingActionRetry(action.id!);
        failed++;
      }
    } catch (error) {
      await updatePendingActionRetry(action.id!);
      failed++;
    }
  }

  const remainingActions = await pendingActions();
  updateStatus({
    isSyncing: false,
    pendingCount: remainingActions.length,
    lastSyncAt: new Date(),
  });

  return { synced, failed };
}

export async function syncProspectsToOffline(): Promise<void> {
  if (!syncStatus.isOnline) return;

  try {
    const prospects = await fieldflowApi.prospects.list();
    await saveProspects(prospects);
    await updateSyncMeta({
      key: "prospects",
      lastSyncAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to sync prospects to offline:", error);
  }
}

export async function syncMeetingsToOffline(): Promise<void> {
  if (!syncStatus.isOnline) return;

  try {
    const [allMeetings, todaysMeetings, upcomingMeetings] = await Promise.all([
      fieldflowApi.meetings.list(),
      fieldflowApi.meetings.today(),
      fieldflowApi.meetings.upcoming(7),
    ]);

    const meetingsMap = new Map<number, Meeting>();
    [...allMeetings, ...todaysMeetings, ...upcomingMeetings].forEach((m) => {
      meetingsMap.set(m.id, m);
    });

    await saveMeetings(Array.from(meetingsMap.values()));
    await updateSyncMeta({
      key: "meetings",
      lastSyncAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to sync meetings to offline:", error);
  }
}

export async function syncVisitsToOffline(): Promise<void> {
  if (!syncStatus.isOnline) return;

  try {
    const [allVisits, todaysVisits] = await Promise.all([
      fieldflowApi.visits.list(),
      fieldflowApi.visits.today(),
    ]);

    const visitsMap = new Map<number, Visit>();
    [...allVisits, ...todaysVisits].forEach((v) => {
      visitsMap.set(v.id, v);
    });

    await saveVisits(Array.from(visitsMap.values()));
    await updateSyncMeta({
      key: "visits",
      lastSyncAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to sync visits to offline:", error);
  }
}

export async function syncAllToOffline(): Promise<void> {
  updateStatus({ isSyncing: true, error: null });

  try {
    await Promise.all([syncProspectsToOffline(), syncMeetingsToOffline(), syncVisitsToOffline()]);

    updateStatus({
      isSyncing: false,
      lastSyncAt: new Date(),
    });
  } catch (error) {
    updateStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : "Sync failed",
    });
  }
}

export async function lastSyncTime(key: string): Promise<Date | null> {
  const meta = await syncMeta(key);
  return meta ? new Date(meta.lastSyncAt) : null;
}

let syncIntervalId: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSync(): void {
  if (syncIntervalId) return;

  syncAllToOffline();

  syncIntervalId = setInterval(() => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      syncAllToOffline();
      syncPendingActions();
    }
  }, SYNC_INTERVAL);
}

export function stopBackgroundSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    updateStatus({ isOnline: true });
    syncPendingActions();
    syncAllToOffline();
  });

  window.addEventListener("offline", () => {
    updateStatus({ isOnline: false });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.type === "SYNC_SUCCESS") {
        pendingActions().then((actions) => {
          updateStatus({ pendingCount: actions.length });
        });
      }
    });
  }
}
