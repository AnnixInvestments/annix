"use client";

import { Check, Circle, Clock, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackgroundStepStatus, JobCardApproval } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

interface ForegroundStep {
  key: string;
  label: string;
  sortOrder: number;
  actionLabel: string | null;
}

const DEFAULT_FOREGROUND_STEPS: ForegroundStep[] = [
  { key: "admin_approval", label: "Admin", sortOrder: 1, actionLabel: "Accept JC" },
  { key: "manager_approval", label: "Manager", sortOrder: 2, actionLabel: "Release to Factory" },
  { key: "quality_check", label: "Quality", sortOrder: 3, actionLabel: "Quality Approved" },
  { key: "dispatched", label: "Dispatched", sortOrder: 4, actionLabel: "Dispatched" },
];

const LEGACY_STATUS_TO_STEP: Record<string, string> = {
  document_uploaded: "admin_approval",
  admin_approved: "manager_approval",
  manager_approved: "quality_check",
  requisition_sent: "quality_check",
  stock_allocated: "quality_check",
  manager_final: "dispatched",
  ready_for_dispatch: "dispatched",
};

const resolveCurrentStepIndex = (currentStatus: string, allSteps: ForegroundStep[]): number => {
  if (currentStatus === "draft") return -1;
  if (currentStatus === "file_closed") return allSteps.length;

  const directIdx = allSteps.findIndex((s) => s.key === currentStatus);
  if (directIdx !== -1) return directIdx;

  const mappedKey = LEGACY_STATUS_TO_STEP[currentStatus];
  if (mappedKey) {
    const mappedIdx = allSteps.findIndex((s) => s.key === mappedKey);
    if (mappedIdx !== -1) return mappedIdx;
  }

  return -1;
};

type StepState = "completed" | "current" | "rejected" | "pending";

const resolveStepState = (
  stepKey: string,
  index: number,
  currentStepIndex: number,
  approvalByStep: Record<string, JobCardApproval>,
): StepState => {
  const approval = approvalByStep[stepKey];

  if (index < currentStepIndex) {
    return approval?.status === "rejected" ? "rejected" : "completed";
  } else if (index === currentStepIndex) {
    return approval?.status === "rejected" ? "rejected" : "current";
  } else {
    return "pending";
  }
};

const buildApprovalMap = (approvals: JobCardApproval[]): Record<string, JobCardApproval> =>
  approvals.reduce(
    (acc, approval) => ({ ...acc, [approval.step]: approval }),
    {} as Record<string, JobCardApproval>,
  );

interface StepPopoverProps {
  approval: JobCardApproval;
  onClose: () => void;
}

function StepPopover(props: StepPopoverProps) {
  const { approval, onClose } = props;
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px] transition-opacity duration-200"
    >
      <div className="text-xs space-y-1.5">
        {approval.approvedByName && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Approved by</span>
            <span className="font-medium text-gray-900">{approval.approvedByName}</span>
          </div>
        )}
        {approval.approvedAt && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-gray-900">
              {formatDateLongZA(approval.approvedAt)}
            </span>
          </div>
        )}
        {approval.signatureUrl && (
          <div className="pt-1.5 border-t border-gray-100">
            <span className="text-gray-500 text-xs">Signature</span>
            <div className="mt-1 bg-white rounded border border-gray-200 p-1.5">
              <img
                src={approval.signatureUrl}
                alt={`Signature by ${approval.approvedByName}`}
                className="max-h-12 w-full object-contain"
              />
            </div>
          </div>
        )}
        {approval.comments && (
          <div className="pt-1 border-t border-gray-100">
            <span className="text-gray-500">Notes:</span>
            <p className="text-gray-700 italic mt-0.5">{approval.comments}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RejectionTooltipProps {
  reason: string | null;
  approvedByName: string | null;
}

function RejectionTooltip(props: RejectionTooltipProps) {
  const { reason, approvedByName } = props;

  return (
    <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-50 rounded-lg shadow-lg border border-red-200 p-3 min-w-[180px] transition-opacity duration-200">
      <div className="text-xs space-y-1">
        {approvedByName && <p className="text-red-700 font-medium">Rejected by {approvedByName}</p>}
        {reason && <p className="text-red-600 italic">{reason}</p>}
      </div>
    </div>
  );
}

interface StepAssignmentUser {
  name: string;
  isPrimary: boolean;
}

const assignedNameForStep = (
  stepKey: string,
  stepAssignments: Record<string, StepAssignmentUser[]>,
): string | null => {
  const users = stepAssignments[stepKey];
  if (!users || users.length === 0) return null;
  const primary = users.find((u) => u.isPrimary);
  return primary ? primary.name : users[0].name;
};

interface StepNodeProps {
  state: StepState;
  onStepClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function StepNode(props: StepNodeProps) {
  const { state, onStepClick, onMouseEnter, onMouseLeave } = props;

  return (
    <button
      type="button"
      onClick={onStepClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
        state === "completed"
          ? "bg-green-500 cursor-pointer hover:bg-green-600 hover:ring-2 hover:ring-green-200"
          : state === "current"
            ? "bg-teal-100 border-2 border-teal-500 animate-pulse"
            : state === "rejected"
              ? "bg-red-100 border-2 border-red-500 cursor-pointer hover:bg-red-200"
              : "bg-gray-100 border-2 border-gray-300"
      }`}
    >
      {state === "completed" && <Check className="h-4 w-4 text-white" />}
      {state === "current" && <Clock className="h-4 w-4 text-teal-600" />}
      {state === "rejected" && <X className="h-4 w-4 text-red-600" />}
      {state === "pending" && <Circle className="h-3 w-3 text-gray-400" />}
    </button>
  );
}

const bgNodeState = (
  bg: BackgroundStepStatus,
  fgIndex: number,
  currentStepIndex: number,
): "completed" | "active" | "pending" => {
  if (bg.completedAt !== null) return "completed";
  if (fgIndex <= currentStepIndex) return "active";
  return "pending";
};

interface BranchSegment {
  triggerFgKey: string;
  triggerFgIdx: number;
  nextFgIdx: number;
  bgSteps: BackgroundStepStatus[];
}

const collectBranches = (
  allSteps: ForegroundStep[],
  backgroundSteps: BackgroundStepStatus[],
  bgByTrigger: Record<string, BackgroundStepStatus[]>,
): BranchSegment[] => {
  const bgStepKeySet = new Set(backgroundSteps.map((bg) => bg.stepKey));

  const resolveBgChain = (trigger: string): BackgroundStepStatus[] => {
    const direct = bgByTrigger[trigger] || [];
    return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
      const rest = bgStepKeySet.has(bg.stepKey) ? resolveBgChain(bg.stepKey) : [];
      return [...chain, bg, ...rest];
    }, []);
  };

  return allSteps.reduce<BranchSegment[]>((branches, step, index) => {
    const chain = resolveBgChain(step.key);
    if (chain.length > 0) {
      const nextFgIdx = index + 1 < allSteps.length ? index + 1 : index;
      return [
        ...branches,
        { triggerFgKey: step.key, triggerFgIdx: index, nextFgIdx, bgSteps: chain },
      ];
    }
    return branches;
  }, []);
};

interface DesktopTransitMapProps {
  allSteps: ForegroundStep[];
  currentStepIndex: number;
  approvalByStep: Record<string, JobCardApproval>;
  bgByTrigger: Record<string, BackgroundStepStatus[]>;
  backgroundSteps: BackgroundStepStatus[];
  stepAssignments: Record<string, StepAssignmentUser[]>;
  currentUserName: string | null;
  expandedStep: string | null;
  hoveredRejection: string | null;
  onStepClick: (stepKey: string, state: StepState) => void;
  onSetExpandedStep: (key: string | null) => void;
  onSetHoveredRejection: (key: string | null) => void;
}

function DesktopTransitMap(props: DesktopTransitMapProps) {
  const {
    allSteps,
    currentStepIndex,
    approvalByStep,
    backgroundSteps,
    bgByTrigger,
    stepAssignments,
    currentUserName,
    expandedStep,
    hoveredRejection,
    onStepClick,
    onSetExpandedStep,
    onSetHoveredRejection,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const fgNodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bgNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [svgPaths, setSvgPaths] = useState<Array<{ d: string; color: string; key: string }>>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [branchPositions, setBranchPositions] = useState<
    Record<string, { left: number; right: number }>
  >({});

  const allBranches = useMemo(
    () => collectBranches(allSteps, backgroundSteps, bgByTrigger),
    [allSteps, backgroundSteps, bgByTrigger],
  );

  const { docUploadStep, branches } = useMemo(() => {
    let found: BackgroundStepStatus | null = null;
    const filtered = allBranches
      .map((branch) => {
        const remaining = branch.bgSteps.filter((bg) => {
          if (bg.stepKey === "document_upload") {
            found = bg;
            return false;
          }
          return true;
        });
        return { ...branch, bgSteps: remaining };
      })
      .filter((b) => b.bgSteps.length > 0);
    return { docUploadStep: found as BackgroundStepStatus | null, branches: filtered };
  }, [allBranches]);

  const hasBranches = branches.length > 0 || docUploadStep !== null;

  const branchLanes = useMemo(() => {
    const laneEnds: number[] = [];
    return branches.reduce<Record<string, number>>((acc, branch) => {
      const effectiveStart = branch.triggerFgIdx;
      const effectiveEnd = branch.nextFgIdx;
      const laneIdx = laneEnds.findIndex((end) => end <= effectiveStart);
      if (laneIdx >= 0) {
        laneEnds[laneIdx] = effectiveEnd;
        return { ...acc, [branch.triggerFgKey]: laneIdx };
      }
      laneEnds.push(effectiveEnd);
      return { ...acc, [branch.triggerFgKey]: laneEnds.length - 1 };
    }, {});
  }, [branches]);

  const laneCount = branches.length > 0 ? Math.max(...Object.values(branchLanes)) + 1 : 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const computePaths = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const paths: Array<{ d: string; color: string; key: string }> = [];
      const r = 14;

      if (docUploadStep) {
        const authNode = fgNodeRefs.current[0];
        const docNode = bgNodeRefs.current["document_upload"];
        if (authNode && docNode) {
          const docComplete = docUploadStep.completedAt !== null;
          const strokeColor = docComplete ? "#f59e0b" : "#d1d5db";
          const aRect = authNode.getBoundingClientRect();
          const dRect = docNode.getBoundingClientRect();
          const ax = aRect.left + aRect.width / 2 - rect.left;
          const ay = aRect.top + aRect.height / 2 - rect.top;
          const dx = dRect.left + dRect.width / 2 - rect.left;
          const dy = dRect.top + dRect.height / 2 - rect.top;

          paths.push({
            key: "pre-doc-upload",
            color: strokeColor,
            d: `M ${dx} ${dy} L ${ax - r} ${dy} Q ${ax} ${dy} ${ax} ${dy - r} L ${ax} ${ay}`,
          });
        }
      }

      branches.forEach((branch) => {
        const startNode = fgNodeRefs.current[branch.triggerFgIdx];
        const endNode = fgNodeRefs.current[branch.nextFgIdx];
        const firstBg = bgNodeRefs.current[branch.bgSteps[0].stepKey];
        const lastBg = bgNodeRefs.current[branch.bgSteps[branch.bgSteps.length - 1].stepKey];

        if (!startNode || !endNode || !firstBg || !lastBg) return;

        const branchActive = branch.triggerFgIdx <= currentStepIndex;
        const allComplete = branch.bgSteps.every((bg) => bg.completedAt !== null);
        const strokeColor = branchActive ? "#f59e0b" : "#d1d5db";
        const mergeColor = branchActive && allComplete ? "#f59e0b" : "#d1d5db";

        const sRect = startNode.getBoundingClientRect();
        const fbRect = firstBg.getBoundingClientRect();
        const sx = sRect.left + sRect.width / 2 - rect.left;
        const sy = sRect.top + sRect.height / 2 - rect.top;
        const fx = fbRect.left + fbRect.width / 2 - rect.left;
        const fy = fbRect.top + fbRect.height / 2 - rect.top;

        paths.push({
          key: `fork-${branch.triggerFgKey}`,
          color: strokeColor,
          d: `M ${sx} ${sy} L ${sx} ${fy - r} Q ${sx} ${fy} ${sx + r} ${fy} L ${fx} ${fy}`,
        });

        if (branch.triggerFgIdx !== branch.nextFgIdx) {
          const eRect = endNode.getBoundingClientRect();
          const lbRect = lastBg.getBoundingClientRect();
          const ex = eRect.left + eRect.width / 2 - rect.left;
          const ey = eRect.top + eRect.height / 2 - rect.top;
          const lx = lbRect.left + lbRect.width / 2 - rect.left;
          const ly = lbRect.top + lbRect.height / 2 - rect.top;

          paths.push({
            key: `merge-${branch.triggerFgKey}`,
            color: mergeColor,
            d: `M ${lx} ${ly} L ${ex - r} ${ly} Q ${ex} ${ly} ${ex} ${ly - r} L ${ex} ${ey}`,
          });
        }

        branch.bgSteps.forEach((bg, bgIdx) => {
          if (bgIdx === 0) return;
          const prevEl = bgNodeRefs.current[branch.bgSteps[bgIdx - 1].stepKey];
          const currEl = bgNodeRefs.current[bg.stepKey];
          if (!prevEl || !currEl) return;

          const pRect = prevEl.getBoundingClientRect();
          const cRect = currEl.getBoundingClientRect();
          const prevCompleted = branch.bgSteps[bgIdx - 1].completedAt !== null;
          const lineColor = branchActive && prevCompleted ? "#f59e0b" : "#d1d5db";

          paths.push({
            key: `bg-line-${bg.stepKey}`,
            color: lineColor,
            d: `M ${pRect.left + pRect.width / 2 - rect.left} ${pRect.top + pRect.height / 2 - rect.top} L ${cRect.left + cRect.width / 2 - rect.left} ${cRect.top + cRect.height / 2 - rect.top}`,
          });
        });
      });

      const positions: Record<string, { left: number; right: number }> = {};
      branches.forEach((branch) => {
        const sNode = fgNodeRefs.current[branch.triggerFgIdx];
        const eNode = fgNodeRefs.current[branch.nextFgIdx];
        if (sNode && eNode) {
          const sR = sNode.getBoundingClientRect();
          const eR = eNode.getBoundingClientRect();
          const isLastBranch = branch.triggerFgIdx === branch.nextFgIdx;
          positions[branch.triggerFgKey] = {
            left: sR.left + sR.width / 2 - rect.left,
            right: isLastBranch ? 8 : rect.width - (eR.left + eR.width / 2 - rect.left),
          };
        }
      });
      setBranchPositions(positions);

      setSvgPaths(paths);
    };

    const frameId = requestAnimationFrame(computePaths);
    const settledId = setTimeout(computePaths, 100);

    const observer = new ResizeObserver(computePaths);
    observer.observe(container);

    const branchContainer = container.querySelector("[data-branch-container]");
    if (branchContainer) {
      observer.observe(branchContainer);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(settledId);
      observer.disconnect();
    };
  }, [branches, docUploadStep, currentStepIndex, allSteps, backgroundSteps]);

  if (allSteps.length === 0) {
    return <p className="text-sm text-gray-500">No workflow steps configured</p>;
  }

  const hasDocPre = docUploadStep !== null;

  return (
    <div
      ref={containerRef}
      className="relative min-h-[80px]"
      style={{ paddingLeft: hasDocPre ? "60px" : undefined, paddingTop: "60px" }}
    >
      {svgPaths.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none z-20"
          width={containerSize.width}
          height={containerSize.height}
          style={{ overflow: "visible" }}
        >
          {svgPaths.map((path) => (
            <path
              key={path.key}
              d={path.d}
              fill="none"
              stroke={path.color}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      <div className="flex items-start">
        {allSteps.map((step, index) => {
          const state = resolveStepState(step.key, index, currentStepIndex, approvalByStep);
          const approval = approvalByStep[step.key];
          const isFirst = index === 0;
          const isLast = index === allSteps.length - 1;
          const lineCompleted = index < currentStepIndex;

          const assignedName =
            state === "current" || state === "pending"
              ? assignedNameForStep(step.key, stepAssignments)
              : null;

          const isNarrowFirst = isFirst && hasDocPre;
          const prevBranch = index > 0 ? branches.find((b) => b.triggerFgIdx === index - 1) : null;
          const bgCount = prevBranch ? prevBranch.bgSteps.length : 0;
          const rawGrow = Math.max(1, bgCount);
          const flexGrow = isNarrowFirst
            ? 0
            : isLast
              ? Math.max(1, Math.ceil(rawGrow / 3))
              : rawGrow;

          return (
            <div
              key={step.key}
              className={`${isNarrowFirst ? "flex-none" : ""} flex flex-col items-center min-w-0`}
              style={isNarrowFirst ? { width: "80px" } : { flexGrow }}
            >
              <div className="flex items-center w-full relative">
                {!isFirst && (
                  <div
                    className="flex-1"
                    style={{
                      height: "3px",
                      backgroundColor:
                        state === "completed" || state === "current"
                          ? "#22c55e"
                          : state === "rejected"
                            ? "#fca5a5"
                            : "#e5e7eb",
                    }}
                  />
                )}

                <div
                  ref={(el) => {
                    fgNodeRefs.current[index] = el;
                  }}
                  className="relative"
                  style={{ zIndex: 30 }}
                >
                  <StepNode
                    state={state}
                    onStepClick={() => onStepClick(step.key, state)}
                    onMouseEnter={() => {
                      if (state === "rejected") onSetHoveredRejection(step.key);
                    }}
                    onMouseLeave={() => onSetHoveredRejection(null)}
                  />

                  <div
                    className="absolute text-center"
                    style={{
                      bottom: "calc(100% + 4px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {assignedName && (
                      <p className="text-[10px] font-medium text-gray-500">{assignedName}</p>
                    )}
                    <p
                      className={`text-[11px] font-medium ${
                        state === "completed"
                          ? "text-green-700"
                          : state === "current"
                            ? "text-teal-600"
                            : state === "rejected"
                              ? "text-red-600"
                              : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    {state === "current" && (
                      <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                        Awaiting
                      </span>
                    )}
                    {state === "completed" && approval?.approvedByName && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{approval.approvedByName}</p>
                    )}
                  </div>

                  {expandedStep === step.key && approval && (
                    <StepPopover approval={approval} onClose={() => onSetExpandedStep(null)} />
                  )}

                  {hoveredRejection === step.key && state === "rejected" && approval && (
                    <RejectionTooltip
                      reason={approval.rejectedReason}
                      approvedByName={approval.approvedByName}
                    />
                  )}
                </div>

                {!isLast && (
                  <div
                    className="flex-1"
                    style={{
                      height: "3px",
                      backgroundColor: lineCompleted ? "#22c55e" : "#e5e7eb",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {(() => {
          const lastBranch = branches.find((b) => b.triggerFgIdx === allSteps.length - 1);
          const trailingGrow = lastBranch ? Math.max(2, lastBranch.bgSteps.length) : 2;
          return <div style={{ flexGrow: trailingGrow }} />;
        })()}
      </div>

      {docUploadStep &&
        (() => {
          const docState = bgNodeState(docUploadStep, 0, currentStepIndex);

          return (
            <div
              className="mt-2"
              style={{ position: "absolute", left: 0, transform: "translateX(0)" }}
            >
              <div className="flex flex-col items-center" style={{ width: "60px" }}>
                <div
                  ref={(el) => {
                    bgNodeRefs.current["document_upload"] = el;
                  }}
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-20 ${
                    docState === "completed"
                      ? "bg-amber-500"
                      : docState === "active"
                        ? "bg-amber-100 border-2 border-amber-400 animate-pulse"
                        : "bg-gray-100 border-2 border-gray-300"
                  }`}
                >
                  {docState === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
                  {docState === "active" && <Clock className="h-2.5 w-2.5 text-amber-600" />}
                  {docState === "pending" && <Circle className="h-2 w-2 text-gray-400" />}
                </div>
                <p
                  className={`mt-0.5 text-[9px] font-medium whitespace-nowrap ${
                    docState === "completed"
                      ? "text-amber-700"
                      : docState === "active"
                        ? "text-amber-600"
                        : "text-gray-400"
                  }`}
                >
                  {docUploadStep.label || "Doc Upload"}
                </p>
                {docState === "completed" && docUploadStep.completedByName && (
                  <p className="text-[8px] text-gray-400 truncate max-w-[60px]">
                    {docUploadStep.completedByName}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

      {branches.length > 0 && (
        <div data-branch-container className="mt-2 relative" style={{ height: `${laneCount * 52}px` }}>
          {branches.map((branch) => {
            const pos = branchPositions[branch.triggerFgKey];
            const lane = branchLanes[branch.triggerFgKey] || 0;

            return (
              <div
                key={`bg-row-${branch.triggerFgKey}`}
                className="absolute flex items-start"
                style={{
                  left: pos ? `${pos.left}px` : "0",
                  right: pos ? `${pos.right}px` : "0",
                  top: `${lane * 52}px`,
                }}
              >
                {branch.bgSteps.map((bg) => {
                  const state = bgNodeState(bg, branch.triggerFgIdx, currentStepIndex);
                  const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
                  const bgDisplayName = state === "completed" ? bg.completedByName : bgAssigned;

                  return (
                    <div key={bg.stepKey} className="flex-1 flex flex-col items-center">
                      <div
                        ref={(el) => {
                          bgNodeRefs.current[bg.stepKey] = el;
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-20 ${
                          state === "completed"
                            ? "bg-amber-500"
                            : state === "active"
                              ? "bg-amber-100 border-2 border-amber-400 animate-pulse"
                              : "bg-gray-100 border-2 border-gray-300"
                        }`}
                      >
                        {state === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
                        {state === "active" && <Clock className="h-2.5 w-2.5 text-amber-600" />}
                        {state === "pending" && <Circle className="h-2 w-2 text-gray-400" />}
                      </div>

                      <p
                        className={`mt-0.5 text-[9px] font-medium whitespace-nowrap ${
                          state === "completed"
                            ? "text-amber-700"
                            : state === "active"
                              ? "text-amber-600"
                              : "text-gray-400"
                        }`}
                      >
                        {bg.label}
                      </p>
                      {bgDisplayName && (
                        <p className="text-[8px] text-gray-400 truncate max-w-[60px]">
                          {bgDisplayName}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MobileTransitMapProps {
  allSteps: ForegroundStep[];
  currentStepIndex: number;
  approvalByStep: Record<string, JobCardApproval>;
  bgByTrigger: Record<string, BackgroundStepStatus[]>;
  backgroundSteps: BackgroundStepStatus[];
  stepAssignments: Record<string, StepAssignmentUser[]>;
  currentUserName: string | null;
  expandedStep: string | null;
  hoveredRejection: string | null;
  onStepClick: (stepKey: string, state: StepState) => void;
  onSetExpandedStep: (key: string | null) => void;
  onSetHoveredRejection: (key: string | null) => void;
}

function MobileTransitMap(props: MobileTransitMapProps) {
  const {
    allSteps,
    currentStepIndex,
    approvalByStep,
    backgroundSteps,
    bgByTrigger,
    stepAssignments,
    currentUserName,
    expandedStep,
    hoveredRejection,
    onStepClick,
    onSetExpandedStep,
    onSetHoveredRejection,
  } = props;

  const allBranches = useMemo(
    () => collectBranches(allSteps, backgroundSteps, bgByTrigger),
    [allSteps, backgroundSteps, bgByTrigger],
  );

  const { docUploadStep, branches } = useMemo(() => {
    let found: BackgroundStepStatus | null = null;
    const filtered = allBranches
      .map((branch) => {
        const remaining = branch.bgSteps.filter((bg) => {
          if (bg.stepKey === "document_upload") {
            found = bg;
            return false;
          }
          return true;
        });
        return { ...branch, bgSteps: remaining };
      })
      .filter((b) => b.bgSteps.length > 0);
    return { docUploadStep: found as BackgroundStepStatus | null, branches: filtered };
  }, [allBranches]);

  const branchForStep = useMemo(
    () =>
      branches.reduce<Record<string, BranchSegment>>((acc, branch) => {
        return { ...acc, [branch.triggerFgKey]: branch };
      }, {}),
    [branches],
  );

  if (allSteps.length === 0) {
    return <p className="text-sm text-gray-500">No workflow steps configured</p>;
  }

  return (
    <div className="relative">
      {docUploadStep &&
        (() => {
          const docState = bgNodeState(docUploadStep, 0, currentStepIndex);
          const bgAssigned = assignedNameForStep("document_upload", stepAssignments);
          const bgDisplayName =
            docState === "completed" ? docUploadStep.completedByName : bgAssigned;

          return (
            <div className="flex items-start mb-1">
              <div className="flex flex-col items-center" style={{ width: "32px" }}>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    docState === "completed"
                      ? "bg-amber-500"
                      : docState === "active"
                        ? "bg-amber-100 border-2 border-amber-400 animate-pulse"
                        : "bg-gray-100 border-2 border-gray-300"
                  }`}
                >
                  {docState === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
                  {docState === "active" && <Clock className="h-2.5 w-2.5 text-amber-600" />}
                  {docState === "pending" && <Circle className="h-2 w-2 text-gray-400" />}
                </div>
                <div
                  className="w-0.5 flex-1 mt-1"
                  style={{
                    backgroundColor: docState === "completed" ? "#f59e0b" : "#d1d5db",
                    minHeight: "12px",
                  }}
                />
              </div>
              <div className="ml-2 min-w-0 pt-0.5">
                <p
                  className={`text-xs font-medium ${
                    docState === "completed"
                      ? "text-amber-700"
                      : docState === "active"
                        ? "text-amber-600"
                        : "text-gray-400"
                  }`}
                >
                  {docUploadStep.label || "Doc Upload"}
                </p>
                {bgDisplayName && <p className="text-[10px] text-gray-500">{bgDisplayName}</p>}
              </div>
            </div>
          );
        })()}

      {allSteps.map((step, index) => {
        const state = resolveStepState(step.key, index, currentStepIndex, approvalByStep);
        const approval = approvalByStep[step.key];
        const isLast = index === allSteps.length - 1;
        const lineCompleted = index < currentStepIndex;
        const branch = branchForStep[step.key];

        const assignedName =
          state === "current" || state === "pending"
            ? assignedNameForStep(step.key, stepAssignments)
            : null;

        return (
          <div key={step.key}>
            <div className="flex items-start">
              <div className="flex flex-col items-center" style={{ width: "32px" }}>
                <div className="relative">
                  <StepNode
                    state={state}
                    onStepClick={() => onStepClick(step.key, state)}
                    onMouseEnter={() => {
                      if (state === "rejected") onSetHoveredRejection(step.key);
                    }}
                    onMouseLeave={() => onSetHoveredRejection(null)}
                  />

                  {expandedStep === step.key && approval && (
                    <StepPopover approval={approval} onClose={() => onSetExpandedStep(null)} />
                  )}

                  {hoveredRejection === step.key && state === "rejected" && approval && (
                    <RejectionTooltip
                      reason={approval.rejectedReason}
                      approvedByName={approval.approvedByName}
                    />
                  )}
                </div>

                {!isLast && (
                  <div
                    className="w-0.5 flex-1 mt-1"
                    style={{
                      backgroundColor: lineCompleted ? "#22c55e" : "#e5e7eb",
                      minHeight: branch ? "8px" : "24px",
                    }}
                  />
                )}
              </div>

              <div className="ml-3 min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      state === "completed"
                        ? "text-green-700"
                        : state === "current"
                          ? "text-teal-600"
                          : state === "rejected"
                            ? "text-red-600"
                            : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  {state === "current" && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                      Awaiting
                    </span>
                  )}
                </div>

                {assignedName && (state === "current" || state === "pending") && (
                  <p className="text-[10px] text-gray-500">{assignedName}</p>
                )}

                {state === "completed" && approval?.approvedByName && (
                  <p className="text-[10px] text-gray-500">
                    {approval.approvedByName}
                    {approval.approvedAt ? ` - ${formatDateLongZA(approval.approvedAt)}` : ""}
                  </p>
                )}

                {state === "rejected" && approval && (
                  <div className="mt-0.5">
                    <span className="text-[10px] text-red-600">
                      Rejected by {approval.approvedByName}
                    </span>
                    {approval.rejectedReason && (
                      <p className="text-[10px] text-red-500 italic">{approval.rejectedReason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {branch && (
              <div className="flex items-stretch" style={{ minHeight: "24px" }}>
                <div className="flex flex-col items-center" style={{ width: "32px" }}>
                  <div
                    className="w-0.5 flex-1"
                    style={{
                      backgroundColor: lineCompleted ? "#22c55e" : "#e5e7eb",
                    }}
                  />
                </div>

                <div className="ml-1 pl-3 border-l-2 border-dashed border-amber-300 py-1 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {branch.bgSteps.map((bg) => {
                      const bgState = bgNodeState(bg, branch.triggerFgIdx, currentStepIndex);
                      const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
                      const bgDisplayName =
                        bgState === "completed" ? bg.completedByName : bgAssigned;

                      return (
                        <div key={bg.stepKey} className="flex items-center gap-1.5">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                              bgState === "completed"
                                ? "bg-amber-500"
                                : bgState === "active"
                                  ? "bg-amber-100 border-2 border-amber-400 animate-pulse"
                                  : "bg-gray-100 border border-gray-300"
                            }`}
                          >
                            {bgState === "completed" && <Check className="h-2 w-2 text-white" />}
                            {bgState === "active" && <Clock className="h-2 w-2 text-amber-600" />}
                            {bgState === "pending" && (
                              <Circle className="h-1.5 w-1.5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[10px] font-medium leading-tight ${
                                bgState === "completed"
                                  ? "text-amber-700"
                                  : bgState === "active"
                                    ? "text-amber-600"
                                    : "text-gray-400"
                              }`}
                            >
                              {bg.label}
                            </p>
                            {bgDisplayName && (
                              <p className="text-[9px] text-gray-400 leading-tight">
                                {bgDisplayName}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface WorkflowStepperProps {
  currentStatus: string;
  approvals: JobCardApproval[];
  stepAssignments: Record<string, StepAssignmentUser[]>;
  foregroundSteps: ForegroundStep[];
  backgroundSteps: BackgroundStepStatus[];
  currentUserName?: string | null;
}

export function WorkflowStepper(props: WorkflowStepperProps) {
  const {
    currentStatus,
    approvals,
    stepAssignments,
    foregroundSteps,
    backgroundSteps,
    currentUserName = null,
  } = props;

  const filteredFgSteps = foregroundSteps.filter((s) => s.key !== "draft");
  const allSteps: ForegroundStep[] =
    filteredFgSteps.length > 0 ? filteredFgSteps : DEFAULT_FOREGROUND_STEPS;

  const currentStepIndex = resolveCurrentStepIndex(currentStatus, allSteps);
  const approvalByStep = buildApprovalMap(approvals);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [hoveredRejection, setHoveredRejection] = useState<string | null>(null);

  const firstFgKey = allSteps.length > 0 ? allSteps[0].key : "draft";

  const isDocUploadFg = allSteps.some((s) => s.key === "document_upload");
  const docUploadApproval = approvalByStep["document_upload"];
  const docUploadFromBg = backgroundSteps.find((bg) => bg.stepKey === "document_upload");

  const effectiveBgSteps: BackgroundStepStatus[] = isDocUploadFg
    ? backgroundSteps
    : [
        {
          ...(docUploadFromBg || {
            stepKey: "document_upload",
            label: "Doc Upload",
            completedByName: null,
            notes: null,
            actionLabel: null,
          }),
          triggerAfterStep: null,
          completedAt: docUploadFromBg?.completedAt || docUploadApproval?.approvedAt || null,
          completedByName:
            docUploadFromBg?.completedByName || docUploadApproval?.approvedByName || null,
        },
        ...backgroundSteps.filter((bg) => bg.stepKey !== "document_upload"),
      ];

  const fgKeySet = new Set(allSteps.map((s) => s.key));
  const bgKeySet = new Set(effectiveBgSteps.map((s) => s.stepKey));
  const bgByTrigger = effectiveBgSteps.reduce<Record<string, BackgroundStepStatus[]>>((acc, bg) => {
    const raw = bg.triggerAfterStep;
    const isFgTrigger = raw !== null && fgKeySet.has(raw);
    const isBgChain = raw !== null && bgKeySet.has(raw);
    const trigger = isFgTrigger || isBgChain ? raw : firstFgKey;
    return { ...acc, [trigger]: [...(acc[trigger] || []), bg] };
  }, {});

  const [diagramKey, setDiagramKey] = useState(0);

  const handleStepClick = useCallback(
    (stepKey: string, state: StepState) => {
      if (state === "completed" && approvalByStep[stepKey]) {
        setExpandedStep(expandedStep === stepKey ? null : stepKey);
      }
    },
    [approvalByStep, expandedStep],
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Workflow Progress</h3>
        <button
          type="button"
          onClick={() => setDiagramKey((k) => k + 1)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh diagram"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="hidden md:block">
        <DesktopTransitMap
          key={`desktop-${diagramKey}`}
          allSteps={allSteps}
          currentStepIndex={currentStepIndex}
          approvalByStep={approvalByStep}
          bgByTrigger={bgByTrigger}
          backgroundSteps={effectiveBgSteps}
          stepAssignments={stepAssignments}
          currentUserName={currentUserName}
          expandedStep={expandedStep}
          hoveredRejection={hoveredRejection}
          onStepClick={handleStepClick}
          onSetExpandedStep={setExpandedStep}
          onSetHoveredRejection={setHoveredRejection}
        />
      </div>

      <div className="md:hidden">
        <MobileTransitMap
          allSteps={allSteps}
          currentStepIndex={currentStepIndex}
          approvalByStep={approvalByStep}
          bgByTrigger={bgByTrigger}
          backgroundSteps={effectiveBgSteps}
          stepAssignments={stepAssignments}
          currentUserName={currentUserName}
          expandedStep={expandedStep}
          hoveredRejection={hoveredRejection}
          onStepClick={handleStepClick}
          onSetExpandedStep={setExpandedStep}
          onSetHoveredRejection={setHoveredRejection}
        />
      </div>
    </div>
  );
}

interface CompactWorkflowStepperProps {
  workflowStatus: string;
  foregroundSteps?: ForegroundStep[];
}

export function CompactWorkflowStepper(props: CompactWorkflowStepperProps) {
  const { workflowStatus } = props;
  const steps =
    props.foregroundSteps && props.foregroundSteps.length > 0
      ? props.foregroundSteps
      : DEFAULT_FOREGROUND_STEPS;
  const currentStepIndex = resolveCurrentStepIndex(workflowStatus, steps);

  return (
    <div className="flex items-center gap-0.5 w-fit">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            <div className="group relative">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                      ? "bg-teal-500 ring-2 ring-teal-200"
                      : "bg-gray-300"
                }`}
              />
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-gray-300 ml-1">
                    {isCompleted ? "(Done)" : isCurrent ? "(Current)" : "(Pending)"}
                  </span>
                </div>
              </div>
            </div>
            {!isLast && (
              <div
                className={`w-2.5 h-px transition-colors duration-300 ${
                  isCompleted ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const WorkflowStatus = WorkflowStepper;
