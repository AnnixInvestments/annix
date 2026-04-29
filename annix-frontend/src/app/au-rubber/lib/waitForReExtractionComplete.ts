import { fromISO, nowMillis } from "@/app/lib/datetime";

interface WaitOptions<T> {
  ids: Set<number>;
  startedAtIso: string;
  total: number;
  fetcher: () => Promise<T>;
  toItems: (response: T) => Array<{ id: number; updatedAtIso: string }>;
  onProgress?: (done: number, total: number) => void;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export async function waitForReExtractionComplete<T>(opts: WaitOptions<T>): Promise<void> {
  const {
    ids,
    startedAtIso,
    total,
    fetcher,
    toItems,
    onProgress,
    pollIntervalMs = 5000,
    timeoutMs = 600000,
  } = opts;
  if (total === 0) return;

  const startedAtMs = fromISO(startedAtIso).toMillis();
  const deadlineMs = nowMillis() + timeoutMs;
  const completedIds = new Set<number>();
  const maxIterations = Math.ceil(timeoutMs / pollIntervalMs) + 1;

  await Array.from({ length: maxIterations }).reduce<Promise<boolean>>(
    async (chain, _unused, idx) => {
      const alreadyDone = await chain;
      if (alreadyDone) return true;
      if (idx > 0) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
      if (nowMillis() >= deadlineMs) return true;
      try {
        const response = await fetcher();
        const items = toItems(response);
        items.forEach((item) => {
          if (!ids.has(item.id) || completedIds.has(item.id)) return;
          const itemMs = fromISO(item.updatedAtIso).toMillis();
          if (itemMs >= startedAtMs) {
            completedIds.add(item.id);
          }
        });
        onProgress?.(completedIds.size, total);
        if (completedIds.size >= total) return true;
      } catch {
        // Ignore polling errors and try again — extraction is still running on the backend.
      }
      return false;
    },
    Promise.resolve(false),
  );
}
