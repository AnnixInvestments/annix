import { useQuery } from "@tanstack/react-query";
import { sortBy } from "es-toolkit/compat";
import { useMemo } from "react";
import type { ActionableJobCard, PendingBackgroundStep } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

const PENDING_STALE_MS = 30_000;

export interface NextActionableJobCard {
  id: number;
  label: string;
}

export function usePendingBackgroundSteps() {
  return useQuery<PendingBackgroundStep[]>({
    queryKey: stockControlKeys.dashboard.pendingBackgroundSteps(),
    queryFn: () => stockControlApiClient.pendingBackgroundSteps(),
    staleTime: PENDING_STALE_MS,
  });
}

/**
 * The next job card (other than `excludeJobCardId`) where the current user has an
 * outstanding action — a foreground approval step they are ASSIGNED to, or a
 * background task awaiting them. Sourced from `/workflow/actionable-job-cards`,
 * which filters by the user's step assignments (NOT company-wide), so the button
 * only ever routes to cards genuinely awaiting this specific user. Ordered by id
 * ascending, picking the first card after the current one (wrapping to the start)
 * so repeated clicks cycle the queue.
 *
 * Also reports `currentCardHasMyAction`: whether the current card is itself in the
 * user's actionable list — used to keep the button hidden while the user still has
 * an action here (and admin-override-free, so an admin who can approve any card is
 * not falsely treated as having an action on every card they open).
 */
export function useNextActionableJobCard(excludeJobCardId: number | null): {
  next: NextActionableJobCard | null;
  remainingCount: number;
  currentCardHasMyAction: boolean;
} {
  const query = useQuery<ActionableJobCard[]>({
    queryKey: stockControlKeys.dashboard.actionableJobCards(),
    queryFn: () => stockControlApiClient.actionableJobCards(),
    staleTime: PENDING_STALE_MS,
  });

  const data = query.data;

  return useMemo(() => {
    const list = data ? data : [];

    const currentCardHasMyAction =
      excludeJobCardId !== null && list.some((card) => card.id === excludeJobCardId);

    const others = sortBy(
      list.filter((card) => card.id !== excludeJobCardId),
      [(card) => card.id],
    );

    if (others.length === 0) {
      return { next: null, remainingCount: 0, currentCardHasMyAction };
    }

    const nextHigher =
      excludeJobCardId === null ? others[0] : others.find((card) => card.id > excludeJobCardId);
    const next = nextHigher ? nextHigher : others[0];

    return { next, remainingCount: others.length, currentCardHasMyAction };
  }, [data, excludeJobCardId]);
}
