import { nowMillis } from "@/app/lib/datetime";

interface WaitOptions<T> {
  ids: Set<number>;
  baselineByIdString: Record<string, string>;
  total: number;
  fetcher: () => Promise<T>;
  toItems: (response: T) => Array<{ id: number; updatedAtIso: string }>;
  onProgress?: (done: number, total: number) => void;
  pollIntervalMs?: number;
  timeoutMs?: number;
  animationStepMs?: number;
}

export async function waitForReExtractionComplete<T>(opts: WaitOptions<T>): Promise<void> {
  const {
    ids,
    baselineByIdString,
    total,
    fetcher,
    toItems,
    onProgress,
    pollIntervalMs = 3000,
    timeoutMs = 600000,
    animationStepMs = 300,
  } = opts;
  if (total === 0) return;

  const deadlineMs = nowMillis() + timeoutMs;
  const completedIds = new Set<number>();
  const maxIterations = Math.ceil(timeoutMs / pollIntervalMs) + 1;
  let displayedDone = 0;
  onProgress?.(0, total);

  const animateDisplayedTo = async (target: number) => {
    const steps = Math.max(0, target - displayedDone);
    await Array.from({ length: steps }).reduce<Promise<void>>(async (chain) => {
      await chain;
      await new Promise((resolve) => setTimeout(resolve, animationStepMs));
      displayedDone += 1;
      onProgress?.(displayedDone, total);
    }, Promise.resolve());
  };

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
          const baseline = baselineByIdString[String(item.id)];
          if (baseline === undefined) return;
          if (item.updatedAtIso !== baseline) {
            completedIds.add(item.id);
          }
        });
        await animateDisplayedTo(completedIds.size);
        if (completedIds.size >= total) return true;
      } catch {
        // Ignore polling errors and try again — extraction is still running on the backend.
      }
      return false;
    },
    Promise.resolve(false),
  );

  if (completedIds.size < total) {
    const remaining = total - completedIds.size;
    const missingIds = Array.from(ids)
      .filter((id) => !completedIds.has(id))
      .sort((a, b) => a - b);
    throw new Error(
      `Re-extraction completed ${completedIds.size} of ${total} document(s). ${remaining} did not finish — IDs: ${missingIds.join(", ")}. Check the backend logs for failures or try Re-extract All again.`,
    );
  }
  await animateDisplayedTo(total);
}
