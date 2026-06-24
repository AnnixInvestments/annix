import { useQuery } from "@tanstack/react-query";
import { sortBy, uniqBy } from "es-toolkit/compat";
import { useMemo } from "react";
import type { JobCard, PendingBackgroundStep } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";
import { usePendingApprovals } from "./useStockControlDashboard";

const PENDING_STALE_MS = 30_000;

export interface NextActionableJobCard {
  id: number;
  label: string;
}

function jobCardLabel(jobCard: JobCard): string {
  const jcNumber = jobCard.jcNumber;
  const base = jcNumber ? jcNumber : jobCard.jobNumber;
  const jt = jobCard.jtDnNumber;
  return jt ? `${base} / ${jt}` : base;
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
 * outstanding action — a foreground approval OR a background task — merged from
 * the two existing "pending for me" endpoints. Drives the "Next job card" button
 * on the job-card detail page. Ordered by id ascending, picking the first card
 * after the current one (wrapping to the start) so repeated clicks cycle the queue.
 *
 * Also reports `currentCardHasMyAction`: whether the current card is itself in the
 * user's pending lists. These lists are assignment-based and admin-override-free,
 * so an admin (who can approve any card) is not falsely treated as having an
 * action on every card they open.
 */
export function useNextActionableJobCard(excludeJobCardId: number | null): {
  next: NextActionableJobCard | null;
  remainingCount: number;
  currentCardHasMyAction: boolean;
} {
  const approvals = usePendingApprovals();
  const backgroundSteps = usePendingBackgroundSteps();

  const approvalData = approvals.data;
  const backgroundData = backgroundSteps.data;

  return useMemo(() => {
    const approvalList = approvalData ? approvalData : [];
    const backgroundList = backgroundData ? backgroundData : [];

    const currentCardHasMyAction =
      excludeJobCardId !== null &&
      (approvalList.some((jobCard) => jobCard.id === excludeJobCardId) ||
        backgroundList.some((step) => step.jobCardId === excludeJobCardId));

    const fromApprovals = approvalList
      .filter((jobCard) => jobCard.id !== excludeJobCardId)
      .map((jobCard) => ({ id: jobCard.id, label: jobCardLabel(jobCard) }));
    const fromBackground = backgroundList
      .filter((step) => step.jobCardId !== excludeJobCardId)
      .map((step) => ({ id: step.jobCardId, label: step.jobCardNumber }));

    const actionable = sortBy(
      uniqBy([...fromApprovals, ...fromBackground], (card) => card.id),
      [(card) => card.id],
    );

    if (actionable.length === 0) {
      return { next: null, remainingCount: 0, currentCardHasMyAction };
    }

    const nextHigher =
      excludeJobCardId === null
        ? actionable[0]
        : actionable.find((card) => card.id > excludeJobCardId);
    const next = nextHigher ? nextHigher : actionable[0];

    return { next, remainingCount: actionable.length, currentCardHasMyAction };
  }, [approvalData, backgroundData, excludeJobCardId]);
}
