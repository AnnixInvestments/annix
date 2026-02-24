import { offlinePendingActions, type PendingAction } from "./stores";

export interface QueuedMutation {
  id: string;
  type: "create" | "update" | "delete";
  entity: "stockItem" | "jobCard" | "deliveryNote" | "allocation";
  entityId?: number;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

export type MutationStatus = "pending" | "processing" | "success" | "failed";

interface MutationQueueListener {
  onMutationQueued?: (mutation: QueuedMutation) => void;
  onMutationProcessed?: (id: string, status: MutationStatus, error?: string) => void;
  onQueueCountChanged?: (count: number) => void;
}

const listeners: Set<MutationQueueListener> = new Set();

export function addMutationQueueListener(listener: MutationQueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(event: keyof MutationQueueListener, ...args: unknown[]) {
  listeners.forEach((listener) => {
    const handler = listener[event];
    if (handler) {
      (handler as (...args: unknown[]) => void)(...args);
    }
  });
}

export async function queueMutation(
  type: QueuedMutation["type"],
  entity: QueuedMutation["entity"],
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  data?: unknown,
  headers?: Record<string, string>,
): Promise<string> {
  const id = await offlinePendingActions.add({
    url,
    method,
    headers: headers ?? { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : "",
  });

  const count = await offlinePendingActions.count();
  notifyListeners("onQueueCountChanged", count);

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      if ("sync" in registration) {
        (
          registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> };
          }
        ).sync.register("sync-pending-actions");
      }
    });
  }

  return id;
}

export async function pendingMutations(): Promise<PendingAction[]> {
  return offlinePendingActions.all();
}

export async function pendingMutationCount(): Promise<number> {
  return offlinePendingActions.count();
}

export async function removeMutation(id: string): Promise<void> {
  await offlinePendingActions.remove(id);
  const count = await offlinePendingActions.count();
  notifyListeners("onQueueCountChanged", count);
}

export async function retryMutation(id: string): Promise<PendingAction | null> {
  const action = await offlinePendingActions.byId(id);
  if (!action) return null;

  const retryCount = await offlinePendingActions.incrementRetry(id);

  if (retryCount > 5) {
    await removeMutation(id);
    notifyListeners("onMutationProcessed", id, "failed", "Max retries exceeded");
    return null;
  }

  const updated = await offlinePendingActions.byId(id);
  return updated ?? null;
}

export async function processMutation(action: PendingAction): Promise<boolean> {
  try {
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body || undefined,
    });

    if (response.ok) {
      await removeMutation(action.id);
      notifyListeners("onMutationProcessed", action.id, "success");
      return true;
    }

    await retryMutation(action.id);
    notifyListeners("onMutationProcessed", action.id, "failed", `HTTP ${response.status}`);
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    await retryMutation(action.id);
    notifyListeners("onMutationProcessed", action.id, "failed", errorMessage);
    return false;
  }
}
