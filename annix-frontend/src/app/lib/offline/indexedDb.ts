const DB_NAME = "annix-rep-offline";
const DB_VERSION = 1;

export interface PendingAction {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retryCount?: number;
}

export interface SyncMeta {
  key: string;
  lastSyncAt: number;
  etag?: string;
}

let dbInstance: IDBDatabase | null = null;

export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("pendingActions")) {
        const store = db.createObjectStore("pendingActions", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains("prospects")) {
        const store = db.createObjectStore("prospects", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("meetings")) {
        const store = db.createObjectStore("meetings", { keyPath: "id" });
        store.createIndex("scheduledStart", "scheduledStart", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains("visits")) {
        const store = db.createObjectStore("visits", { keyPath: "id" });
        store.createIndex("prospectId", "prospectId", { unique: false });
      }

      if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "key" });
      }
    };
  });
}

async function getStore(
  storeName: string,
  mode: IDBTransactionMode = "readonly",
): Promise<IDBObjectStore> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export async function addPendingAction(action: Omit<PendingAction, "id">): Promise<number> {
  const store = await getStore("pendingActions", "readwrite");

  return new Promise((resolve, reject) => {
    const request = store.add({ ...action, retryCount: 0 });
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function pendingActions(): Promise<PendingAction[]> {
  const store = await getStore("pendingActions", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function pendingActionCount(): Promise<number> {
  const store = await getStore("pendingActions", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingAction(id: number): Promise<void> {
  const store = await getStore("pendingActions", "readwrite");

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updatePendingActionRetry(id: number): Promise<void> {
  const store = await getStore("pendingActions", "readwrite");

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const action = getRequest.result as PendingAction;
      if (action) {
        action.retryCount = (action.retryCount || 0) + 1;
        const putRequest = store.put(action);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function saveProspects<T extends { id: number }>(prospects: T[]): Promise<void> {
  const store = await getStore("prospects", "readwrite");

  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    if (prospects.length === 0) {
      resolve();
      return;
    }

    for (const prospect of prospects) {
      const request = store.put(prospect);
      request.onsuccess = () => {
        completed++;
        if (completed === prospects.length && !hasError) {
          resolve();
        }
      };
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
    }
  });
}

export async function offlineProspects<T>(): Promise<T[]> {
  const store = await getStore("prospects", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function offlineProspect<T>(id: number): Promise<T | null> {
  const store = await getStore("prospects", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMeetings<T extends { id: number }>(meetings: T[]): Promise<void> {
  const store = await getStore("meetings", "readwrite");

  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    if (meetings.length === 0) {
      resolve();
      return;
    }

    for (const meeting of meetings) {
      const request = store.put(meeting);
      request.onsuccess = () => {
        completed++;
        if (completed === meetings.length && !hasError) {
          resolve();
        }
      };
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
    }
  });
}

export async function offlineMeetings<T>(): Promise<T[]> {
  const store = await getStore("meetings", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function offlineMeeting<T>(id: number): Promise<T | null> {
  const store = await getStore("meetings", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVisits<T extends { id: number }>(visits: T[]): Promise<void> {
  const store = await getStore("visits", "readwrite");

  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    if (visits.length === 0) {
      resolve();
      return;
    }

    for (const visit of visits) {
      const request = store.put(visit);
      request.onsuccess = () => {
        completed++;
        if (completed === visits.length && !hasError) {
          resolve();
        }
      };
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
    }
  });
}

export async function offlineVisits<T>(): Promise<T[]> {
  const store = await getStore("visits", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function syncMeta(key: string): Promise<SyncMeta | null> {
  const store = await getStore("syncMeta", "readonly");

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function updateSyncMeta(meta: SyncMeta): Promise<void> {
  const store = await getStore("syncMeta", "readwrite");

  return new Promise((resolve, reject) => {
    const request = store.put(meta);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const store = await getStore(storeName, "readwrite");

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    clearStore("prospects"),
    clearStore("meetings"),
    clearStore("visits"),
    clearStore("syncMeta"),
  ]);
}
