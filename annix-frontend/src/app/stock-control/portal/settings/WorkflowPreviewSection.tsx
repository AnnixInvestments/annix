"use client";

import { useMemo, useState } from "react";
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

interface WalkItem {
  type: "fg" | "bg";
  key: string;
  label: string;
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

  const walkOrder: WalkItem[] = useMemo(() => {
    if (fgSteps.length === 0 && bgStepConfigs.length === 0) return [];

    const bgByTrigger = bgStepConfigs.reduce<Record<string, WorkflowStepConfig[]>>((acc, bg) => {
      const triggerKey = bg.triggerAfterStep || "__root__";
      return { ...acc, [triggerKey]: [...(acc[triggerKey] || []), bg] };
    }, {});

    const sortedBgByTrigger = Object.fromEntries(
      Object.entries(bgByTrigger).map(([k, arr]) => [
        k,
        [...arr].sort((a, b) => a.sortOrder - b.sortOrder),
      ]),
    );

    const visited = new Set<string>();

    const collectBgChain = (triggerKey: string): WalkItem[] => {
      const bgs = sortedBgByTrigger[triggerKey] || [];
      return bgs.reduce<WalkItem[]>((acc, bg) => {
        if (visited.has(bg.key)) return acc;
        visited.add(bg.key);
        return [...acc, { type: "bg", key: bg.key, label: bg.label }, ...collectBgChain(bg.key)];
      }, []);
    };

    const rootBgs = collectBgChain("__root__");
    const fgWalk = fgSteps.flatMap<WalkItem>((fg) => [
      { type: "fg", key: fg.key, label: fg.label },
      ...collectBgChain(fg.key),
    ]);
    const orphanedBgs = bgStepConfigs
      .filter((c) => !visited.has(c.key))
      .map<WalkItem>((c) => ({ type: "bg", key: c.key, label: c.label }));

    return [...rootBgs, ...fgWalk, ...orphanedBgs];
  }, [fgSteps, bgStepConfigs]);

  const maxPosition = walkOrder.length + 1;
  const clampedPosition = Math.min(Math.max(0, position), maxPosition);

  const simulation = useMemo(() => {
    const pos = clampedPosition;
    const walkIdx = pos - 1;
    const totalWalk = walkOrder.length;

    const focusItem: WalkItem | null = pos > 0 && pos <= totalWalk ? walkOrder[walkIdx] : null;

    const fgKeySet = new Set(fgSteps.map((s) => s.key));

    const currentFgKey: string = (() => {
      if (pos === 0) return "draft";
      if (pos > totalWalk) return "file_closed";
      if (focusItem && focusItem.type === "fg") return focusItem.key;
      const precedingFgs = walkOrder.slice(0, walkIdx).filter((w) => w.type === "fg");
      const last = precedingFgs[precedingFgs.length - 1];
      return last ? last.key : "draft";
    })();

    const currentFgIdx = fgSteps.findIndex((s) => s.key === currentFgKey);

    const approvedFgKeys: Set<string> =
      pos > totalWalk
        ? new Set(fgSteps.map((s) => s.key))
        : new Set(fgSteps.slice(0, currentFgIdx >= 0 ? currentFgIdx : 0).map((s) => s.key));

    const approvalsList: JobCardApproval[] = Array.from(approvedFgKeys).map((key, i) => ({
      id: i + 1,
      jobCardId: 0,
      step: key,
      status: "approved",
      approvedByName: "Preview",
      signatureUrl: null,
      comments: null,
      rejectedReason: null,
      approvedAt: nowISO(),
      createdAt: nowISO(),
    }));

    const completedBgKeys = new Set(
      walkOrder
        .slice(0, Math.max(0, walkIdx))
        .filter((w) => w.type === "bg")
        .map((w) => w.key),
    );
    if (pos > totalWalk) {
      bgStepConfigs.forEach((c) => completedBgKeys.add(c.key));
    }

    const bgList: BackgroundStepStatus[] = bgStepConfigs.map((c) => {
      const isComplete = completedBgKeys.has(c.key);
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
      currentStatus: currentFgKey,
      approvals: approvalsList,
      backgroundSteps: bgList,
      focusItem,
      fgKeySet,
    };
  }, [clampedPosition, walkOrder, fgSteps, bgStepConfigs]);

  const positionLabel: string = (() => {
    if (clampedPosition === 0) return "Draft (not started)";
    if (clampedPosition > walkOrder.length) return "File Closed";
    const focus = simulation.focusItem;
    if (!focus) return "";
    const prefix = focus.type === "fg" ? "FG" : "BG";
    return `${prefix}: ${focus.label}`;
  })();

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
          ) : walkOrder.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">
              No workflow steps configured yet. Add steps above to preview them here.
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
                    Step {clampedPosition} / {walkOrder.length}
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
                Read-only preview of your configured workflow. Click Next to walk through every
                foreground and background task in order, verifying the SVG connections, branch
                routing, and task placement as you build the workflow above.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
