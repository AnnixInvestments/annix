"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  BackgroundStepStatus,
  JobCardApproval,
  WorkflowStepConfig,
} from "@/app/lib/api/stockControlApi";
import { nowISO } from "@/app/lib/datetime";
import { useBackgroundStepConfigs, useWorkflowStepConfigs } from "@/app/lib/query/hooks";
import { WorkflowStepper } from "../../components/WorkflowStatus";

interface PreviewForegroundStep {
  key: string;
  label: string;
  sortOrder: number;
  actionLabel: string | null;
}

export function WorkflowPreviewSection() {
  const { data: fgConfigs, isLoading: fgLoading, refetch: refetchFg } = useWorkflowStepConfigs();
  const { data: bgConfigs, isLoading: bgLoading, refetch: refetchBg } = useBackgroundStepConfigs();

  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState(0);

  const loading = fgLoading || bgLoading;

  const fgSteps: PreviewForegroundStep[] = useMemo(() => {
    const list = fgConfigs || [];
    return list
      .filter((c) => !c.isBackground)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        key: c.key,
        label: c.label,
        sortOrder: c.sortOrder,
        actionLabel: c.actionLabel,
      }));
  }, [fgConfigs]);

  const allConfigs: WorkflowStepConfig[] = useMemo(() => {
    const fg = fgConfigs || [];
    const bg = bgConfigs || [];
    const merged = [...fg];
    bg.forEach((b) => {
      if (!merged.some((m) => m.key === b.key)) {
        merged.push(b);
      }
    });
    return merged;
  }, [fgConfigs, bgConfigs]);

  const bgStepConfigs: WorkflowStepConfig[] = useMemo(
    () => allConfigs.filter((c) => c.isBackground),
    [allConfigs],
  );

  const fgIndexByKey = useMemo(
    () => fgSteps.reduce<Record<string, number>>((acc, s, i) => ({ ...acc, [s.key]: i }), {}),
    [fgSteps],
  );

  const resolveBgRootFgIndex = useCallback(
    (bgKey: string): number => {
      const walk = (key: string, visited: Set<string>): number => {
        if (visited.has(key)) return -1;
        const step = allConfigs.find((c) => c.key === key);
        if (!step || !step.triggerAfterStep) return -1;
        const parentKey = step.triggerAfterStep;
        const fgIdx = fgIndexByKey[parentKey];
        if (fgIdx !== undefined) return fgIdx;
        return walk(parentKey, new Set([...visited, key]));
      };
      return walk(bgKey, new Set());
    },
    [allConfigs, fgIndexByKey],
  );

  const maxPosition = fgSteps.length;
  const clampedPosition = Math.min(Math.max(0, position), maxPosition);

  const simulation = useMemo(() => {
    const pos = clampedPosition;
    const currentFgStep = pos > 0 && pos <= fgSteps.length ? fgSteps[pos - 1] : null;
    const currentStatusValue: string = currentFgStep ? currentFgStep.key : "draft";

    const completedCount = Math.max(0, pos - 1);
    const approvalsList: JobCardApproval[] = fgSteps.slice(0, completedCount).map((s, i) => ({
      id: i + 1,
      jobCardId: 0,
      step: s.key,
      status: "approved",
      approvedByName: "Preview",
      signatureUrl: null,
      comments: null,
      rejectedReason: null,
      approvedAt: nowISO(),
      createdAt: nowISO(),
    }));

    const bgList: BackgroundStepStatus[] = bgStepConfigs.map((c) => {
      const rootFgIdx = resolveBgRootFgIndex(c.key);
      const isComplete = pos - 1 > rootFgIdx;
      return {
        stepKey: c.key,
        label: c.label,
        triggerAfterStep: c.triggerAfterStep,
        completedAt: isComplete ? nowISO() : null,
        completedByName: isComplete ? "Preview" : null,
        notes: null,
        actionLabel: c.actionLabel,
        completionType: null,
        branchColor: c.branchColor,
        stepOutcomes: c.stepOutcomes,
        rejoinAtStep: c.rejoinAtStep,
      };
    });

    return {
      currentStatus: currentStatusValue,
      approvals: approvalsList,
      backgroundSteps: bgList,
    };
  }, [clampedPosition, fgSteps, bgStepConfigs, resolveBgRootFgIndex]);

  const currentFgForLabel =
    clampedPosition > 0 && clampedPosition <= fgSteps.length ? fgSteps[clampedPosition - 1] : null;
  const positionLabel = currentFgForLabel
    ? `At: ${currentFgForLabel.label}`
    : clampedPosition === 0
      ? "Draft (not started)"
      : "File Closed";

  const handlePrev = () => setPosition((p) => Math.max(0, p - 1));
  const handleNext = () => setPosition((p) => Math.min(maxPosition, p + 1));
  const handleReset = () => setPosition(0);
  const handleRefresh = () => {
    refetchFg();
    refetchBg();
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Workflow Preview & Simulator</h3>
          <span className="text-[10px] text-gray-400 hidden sm:inline">
            Test workflow changes without a job card
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!collapsed && (
            <button
              type="button"
              onClick={handleRefresh}
              className="px-2 py-1 text-[10px] text-teal-600 hover:text-teal-800 font-medium"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-center py-6 text-xs text-gray-500">
              Loading workflow preview...
            </div>
          ) : fgSteps.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">
              No foreground steps configured yet. Add steps above to preview them here.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={clampedPosition === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={clampedPosition >= maxPosition}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <div className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">{positionLabel}</span>
                  <span className="ml-2 text-gray-400">
                    Step {clampedPosition} / {maxPosition}
                  </span>
                </div>
              </div>
              <div className="border border-gray-200 rounded-md p-2 overflow-auto bg-white">
                <WorkflowStepper
                  currentStatus={simulation.currentStatus}
                  approvals={simulation.approvals}
                  stepAssignments={{}}
                  foregroundSteps={fgSteps}
                  backgroundSteps={simulation.backgroundSteps}
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Read-only preview of your configured workflow. Click Next to advance a simulated job
                card through each step and verify the SVG connections, branch routing, and
                background task placement as you build the workflow above.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
