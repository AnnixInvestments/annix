"use client";

import { useEffect } from "react";
import {
  useAdvanceWalkthrough,
  useBackWalkthrough,
  useSkipWalkthrough,
  useStopWalkthrough,
  useWalkthroughCurrentStep,
} from "@/app/lib/query/hooks";

export interface NixWalkthroughBarProps {
  sessionId: number | null;
  /**
   * Bump to re-check walkthrough state — pass the chat's message count
   * so a walkthrough started or moved via chat verbs ("next", "stop")
   * is reflected without a polling interval.
   */
  refreshKey?: number;
}

// The distinct visual treatment for walkthrough mode (issue #262
// Phase 4 carry-over): a pinned card above the chat messages with a
// step counter, progress bar, the current step body, and
// Back / Skip / Next / Stop controls. Renders nothing when the
// session has no active walkthrough, so it can be mounted
// unconditionally in the shared chat panel.
export function NixWalkthroughBar(props: NixWalkthroughBarProps) {
  const sessionId = props.sessionId;
  const refreshKey = props.refreshKey;
  const stepQuery = useWalkthroughCurrentStep(sessionId);
  const advanceMutation = useAdvanceWalkthrough();
  const backMutation = useBackWalkthrough();
  const skipMutation = useSkipWalkthrough();
  const stopMutation = useStopWalkthrough();

  const refetch = stepQuery.refetch;
  useEffect(() => {
    if (sessionId !== null && sessionId > 0) void refetch();
  }, [sessionId, refreshKey, refetch]);

  const view = stepQuery.data;
  if (!sessionId || !view) return null;

  const advancePending = advanceMutation.isPending;
  const backPending = backMutation.isPending;
  const skipPending = skipMutation.isPending;
  const stopPending = stopMutation.isPending;
  const busy = advancePending || backPending || skipPending || stopPending;
  const progressPercent = Math.round((view.step / Math.max(view.totalSteps, 1)) * 100);

  const controlButton =
    "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="mx-4 mt-3 rounded-lg border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-sm">
      <div className="px-3 pt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-full px-2 py-0.5 whitespace-nowrap">
            Walkthrough
          </span>
          <span className="text-xs text-gray-600 truncate" title={view.capabilityLabel}>
            {view.capabilityLabel}
          </span>
        </div>
        <span className="text-xs font-semibold text-indigo-800 whitespace-nowrap">
          Step {view.step} of {view.totalSteps}
        </span>
      </div>

      <div className="px-3 mt-2">
        <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-gray-900">{view.title}</p>
        <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{view.body}</p>
      </div>

      <div className="px-3 pb-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={busy || view.step <= 1}
          onClick={() => backMutation.mutate({ sessionId })}
          className={`${controlButton} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => stopMutation.mutate({ sessionId, reason: "stopped" })}
            className={`${controlButton} border-red-200 bg-white text-red-600 hover:bg-red-50`}
          >
            Stop
          </button>
          <button
            type="button"
            disabled={busy || view.isLast}
            onClick={() => skipMutation.mutate({ sessionId })}
            className={`${controlButton} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
          >
            Skip
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              view.isLast
                ? stopMutation.mutate({ sessionId, reason: "completed" })
                : advanceMutation.mutate({ sessionId })
            }
            className={`${controlButton} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            {view.isLast ? "Finish ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
