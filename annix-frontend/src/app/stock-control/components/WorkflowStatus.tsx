"use client";

import { Check, Circle, Clock, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackgroundStepStatus, JobCardApproval } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

interface ForegroundStep {
  key: string;
  label: string;
  sortOrder: number;
}

const FALLBACK_FOREGROUND_STEPS: ForegroundStep[] = [
  { key: "draft", label: "Draft", sortOrder: 0 },
  { key: "document_upload", label: "Documents", sortOrder: 1 },
  { key: "admin_approval", label: "Admin", sortOrder: 2 },
  { key: "manager_approval", label: "Manager", sortOrder: 3 },
  { key: "requisition_sent", label: "Requisition", sortOrder: 4 },
  { key: "stock_allocation", label: "Allocation", sortOrder: 5 },
  { key: "manager_final", label: "Final Sign-off", sortOrder: 6 },
  { key: "ready_for_dispatch", label: "Dispatch Ready", sortOrder: 7 },
  { key: "dispatched", label: "Dispatched", sortOrder: 8 },
];

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  draft: 0,
  document_uploaded: 2,
  admin_approved: 3,
  manager_approved: 4,
  requisition_sent: 5,
  stock_allocated: 6,
  manager_final: 7,
  ready_for_dispatch: 8,
  dispatched: 9,
};

type StepState = "completed" | "current" | "rejected" | "pending";

const resolveStepState = (
  stepKey: string,
  index: number,
  currentStepIndex: number,
  approvalByStep: Record<string, JobCardApproval>,
): StepState => {
  const approval = approvalByStep[stepKey];

  if (approval?.status === "rejected") {
    return "rejected";
  } else if (approval?.status === "approved") {
    return "completed";
  } else if (index === currentStepIndex) {
    return "current";
  } else if (index < currentStepIndex) {
    return "completed";
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
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
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

const STEP_ACTION_LABELS: Record<string, string> = {
  quality_check: "Confirm Quality Checked",
  quality_inspection: "Confirm Inspection Done",
  documentation_review: "Confirm Docs Reviewed",
  safety_check: "Confirm Safety Cleared",
  coating_inspection: "Confirm Coating Inspected",
  material_verification: "Confirm Material Verified",
  client_notification: "Confirm Client Notified",
  packaging: "Confirm Packed",
  labelling: "Confirm Labelled",
  weighing: "Confirm Weighed",
  photography: "Confirm Photos Taken",
  certificate_generation: "Confirm Certificate Generated",
  loading: "Confirm Loaded",
};

const actionLabelForStep = (stepKey: string, label: string): string =>
  STEP_ACTION_LABELS[stepKey] || `Complete ${label}`;

const isUserAssignedToStep = (
  stepKey: string,
  currentUserName: string | null,
  stepAssignments: Record<string, StepAssignmentUser[]>,
): boolean => {
  if (!currentUserName) return false;
  const assigned = stepAssignments[stepKey];
  if (!assigned || assigned.length === 0) return true;
  return assigned.some((u) => u.name === currentUserName);
};

type TimelineNode =
  | { type: "foreground"; step: ForegroundStep; index: number }
  | { type: "bg-branch"; steps: BackgroundStepStatus[]; triggerStepKey: string };

const buildTimeline = (
  allSteps: ForegroundStep[],
  backgroundSteps: BackgroundStepStatus[],
  bgByTrigger: Record<string, BackgroundStepStatus[]>,
): TimelineNode[] => {
  const bgStepKeySet = new Set(backgroundSteps.map((bg) => bg.stepKey));

  const resolveBgChain = (trigger: string): BackgroundStepStatus[] => {
    const direct = bgByTrigger[trigger] || [];
    return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
      const rest = bgStepKeySet.has(bg.stepKey) ? resolveBgChain(bg.stepKey) : [];
      return [...chain, bg, ...rest];
    }, []);
  };

  const bgTriggeredByForeground = allSteps.reduce<Record<string, BackgroundStepStatus[]>>(
    (acc, step) => {
      const chain = resolveBgChain(step.key);
      if (chain.length > 0) {
        return { ...acc, [step.key]: chain };
      }
      return acc;
    },
    {},
  );

  return allSteps.reduce<TimelineNode[]>((nodes, step, index) => {
    const fgNode: TimelineNode = { type: "foreground", step, index };
    const bgChain = bgTriggeredByForeground[step.key];
    if (bgChain && bgChain.length > 0) {
      return [...nodes, fgNode, { type: "bg-branch", steps: bgChain, triggerStepKey: step.key }];
    }
    return [...nodes, fgNode];
  }, []);
};

const bgNodeState = (
  bg: BackgroundStepStatus,
  fgIndex: number,
  currentStepIndex: number,
): "completed" | "active" | "pending" => {
  if (bg.completedAt !== null) return "completed";
  if (fgIndex < currentStepIndex || fgIndex === currentStepIndex) return "active";
  return "pending";
};

interface DesktopTransitMapProps {
  allSteps: ForegroundStep[];
  currentStepIndex: number;
  approvalByStep: Record<string, JobCardApproval>;
  bgByTrigger: Record<string, BackgroundStepStatus[]>;
  backgroundSteps: BackgroundStepStatus[];
  stepAssignments: Record<string, StepAssignmentUser[]>;
  currentUserName: string | null;
  onCompleteBackgroundStep?: (stepKey: string) => void;
  completingStepKey: string | null;
  expandedStep: string | null;
  hoveredRejection: string | null;
  onStepClick: (stepKey: string, state: StepState) => void;
  onSetExpandedStep: (key: string | null) => void;
  onSetHoveredRejection: (key: string | null) => void;
}

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

function DesktopTransitMap(props: DesktopTransitMapProps) {
  const {
    allSteps,
    currentStepIndex,
    approvalByStep,
    backgroundSteps,
    bgByTrigger,
    stepAssignments,
    currentUserName,
    onCompleteBackgroundStep,
    completingStepKey,
    expandedStep,
    hoveredRejection,
    onStepClick,
    onSetExpandedStep,
    onSetHoveredRejection,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const fgNodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bgNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [svgPaths, setSvgPaths] = useState<
    Array<{
      d: string;
      color: string;
      key: string;
    }>
  >([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const branches = useMemo(
    () => collectBranches(allSteps, backgroundSteps, bgByTrigger),
    [allSteps, backgroundSteps, bgByTrigger],
  );
  const hasBranches = branches.length > 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || branches.length === 0) return;

    const computePaths = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const paths: Array<{ d: string; color: string; key: string }> = [];

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

        const r = 12;
        paths.push({
          key: `fork-${branch.triggerFgKey}`,
          color: strokeColor,
          d: `M ${sx} ${sy} L ${sx} ${fy - r} Q ${sx} ${fy} ${sx + r} ${fy} L ${fx} ${fy}`,
        });

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

      setSvgPaths(paths);
    };

    const frameId = requestAnimationFrame(computePaths);

    const observer = new ResizeObserver(computePaths);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [branches, currentStepIndex, allSteps, backgroundSteps]);

  return (
    <div className="hidden lg:block overflow-x-auto">
      <div ref={containerRef} className="relative min-w-[600px]">
        {svgPaths.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
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
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          </svg>
        )}

        <div className="flex items-center">
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

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center min-w-0">
                <p
                  className={`text-[10px] mb-1 truncate max-w-[90px] font-medium ${
                    assignedName ? "text-gray-500" : "text-transparent"
                  }`}
                >
                  {assignedName || "\u00A0"}
                </p>

                <div className="flex items-center w-full">
                  {!isFirst && (
                    <div
                      className={`flex-1 h-[3px] transition-colors duration-500 ${
                        state === "completed" || state === "current"
                          ? "bg-green-500"
                          : state === "rejected"
                            ? "bg-red-300"
                            : "bg-gray-200"
                      }`}
                    />
                  )}

                  <div
                    ref={(el) => {
                      fgNodeRefs.current[index] = el;
                    }}
                    className="relative"
                  >
                    <StepNode
                      state={state}
                      onStepClick={() => onStepClick(step.key, state)}
                      onMouseEnter={() => {
                        if (state === "rejected") onSetHoveredRejection(step.key);
                      }}
                      onMouseLeave={() => onSetHoveredRejection(null)}
                    />

                    {expandedStep === step.key && approval && (
                      <StepPopover
                        approval={approval}
                        onClose={() => onSetExpandedStep(null)}
                      />
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
                      className={`flex-1 h-[3px] transition-colors duration-500 ${
                        lineCompleted ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-medium transition-colors duration-300 ${
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
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                      Awaiting
                    </span>
                  )}

                  {state === "completed" && approval?.approvedByName && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[80px] mx-auto">
                      {approval.approvedByName}
                    </p>
                  )}

                  {state === "completed" && approval?.approvedAt && (
                    <p className="text-[10px] text-gray-400 truncate max-w-[80px] mx-auto">
                      {formatDateLongZA(approval.approvedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasBranches && (
          <div className="mt-4">
            {branches.map((branch) => {
              const branchActive = branch.triggerFgIdx <= currentStepIndex;
              const totalColumns = allSteps.length;
              const startCol = branch.triggerFgIdx;
              const endCol = branch.nextFgIdx;
              const spanCols = endCol - startCol;

              return (
                <div
                  key={`bg-row-${branch.triggerFgKey}`}
                  className="flex items-center"
                  style={{
                    paddingLeft: `${(startCol / totalColumns) * 100}%`,
                    paddingRight: `${((totalColumns - endCol) / totalColumns) * 100}%`,
                  }}
                >
                  {branch.bgSteps.map((bg, bgIdx) => {
                    const state = bgNodeState(bg, branch.triggerFgIdx, currentStepIndex);
                    const canComplete =
                      state === "active" &&
                      isUserAssignedToStep(bg.stepKey, currentUserName, stepAssignments);
                    const isCompleting = completingStepKey === bg.stepKey;

                    return (
                      <div
                        key={bg.stepKey}
                        className="flex flex-col items-center"
                        style={{
                          flex: `1 1 ${100 / branch.bgSteps.length}%`,
                        }}
                      >
                        <div
                          ref={(el) => {
                            bgNodeRefs.current[bg.stepKey] = el;
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            state === "completed"
                              ? "bg-amber-500"
                              : state === "active"
                                ? "bg-amber-100 border-2 border-amber-500 animate-pulse"
                                : "bg-gray-100 border-2 border-gray-300"
                          }`}
                        >
                          {state === "completed" && <Check className="h-3 w-3 text-white" />}
                          {state === "active" && <Clock className="h-3 w-3 text-amber-600" />}
                          {state === "pending" && <Circle className="h-2 w-2 text-gray-400" />}
                        </div>

                        <div className="mt-1 text-center">
                          <p
                            className={`text-[10px] font-medium whitespace-nowrap ${
                              state === "completed"
                                ? "text-amber-700"
                                : state === "active"
                                  ? "text-amber-600"
                                  : "text-gray-400"
                            }`}
                          >
                            {bg.label}
                          </p>
                          {state === "completed" && bg.completedByName && (
                            <p className="text-[9px] text-gray-400 truncate max-w-[70px] mx-auto">
                              {bg.completedByName}
                            </p>
                          )}
                          {canComplete && onCompleteBackgroundStep && (
                            <button
                              type="button"
                              onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                              disabled={isCompleting}
                              className="mt-0.5 px-2 py-0.5 text-[9px] font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              {isCompleting ? "..." : actionLabelForStep(bg.stepKey, bg.label)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  onCompleteBackgroundStep?: (stepKey: string) => void;
  completingStepKey?: string | null;
}

export function WorkflowStepper(props: WorkflowStepperProps) {
  const {
    currentStatus,
    approvals,
    stepAssignments,
    foregroundSteps,
    backgroundSteps,
    currentUserName = null,
    onCompleteBackgroundStep,
    completingStepKey = null,
  } = props;

  const allSteps: ForegroundStep[] =
    foregroundSteps.length > 0
      ? [{ key: "draft", label: "Draft", sortOrder: 0 }, ...foregroundSteps]
      : FALLBACK_FOREGROUND_STEPS;

  const currentStepIndex = STATUS_TO_STEP_INDEX[currentStatus] ?? 0;
  const approvalByStep = buildApprovalMap(approvals);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [hoveredRejection, setHoveredRejection] = useState<string | null>(null);

  const bgByTrigger = backgroundSteps.reduce<Record<string, BackgroundStepStatus[]>>((acc, bg) => {
    const trigger = bg.triggerAfterStep || "draft";
    return { ...acc, [trigger]: [...(acc[trigger] || []), bg] };
  }, {});

  const handleStepClick = useCallback(
    (stepKey: string, state: StepState) => {
      if (state === "completed" && approvalByStep[stepKey]) {
        setExpandedStep(expandedStep === stepKey ? null : stepKey);
      }
    },
    [approvalByStep, expandedStep],
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Progress</h3>

      <DesktopTransitMap
        allSteps={allSteps}
        currentStepIndex={currentStepIndex}
        approvalByStep={approvalByStep}
        bgByTrigger={bgByTrigger}
        backgroundSteps={backgroundSteps}
        stepAssignments={stepAssignments}
        currentUserName={currentUserName}
        onCompleteBackgroundStep={onCompleteBackgroundStep}
        completingStepKey={completingStepKey}
        expandedStep={expandedStep}
        hoveredRejection={hoveredRejection}
        onStepClick={handleStepClick}
        onSetExpandedStep={setExpandedStep}
        onSetHoveredRejection={setHoveredRejection}
      />

      <div className="lg:hidden">
        <div className="relative">
          {allSteps.map((step, index) => {
            const state = resolveStepState(step.key, index, currentStepIndex, approvalByStep);
            const approval = approvalByStep[step.key];
            const isLast = index === allSteps.length - 1;
            const bgForStep = bgByTrigger[step.key] || [];

            const mobileAssignedName =
              state === "current" || state === "pending"
                ? assignedNameForStep(step.key, stepAssignments)
                : null;

            return (
              <div key={step.key} className="relative pb-6 last:pb-0">
                {!isLast && (
                  <div
                    className={`absolute left-4 top-8 -ml-px h-full w-0.5 transition-colors duration-500 ${
                      state === "completed"
                        ? "bg-green-500"
                        : state === "rejected"
                          ? "bg-red-300"
                          : "bg-gray-200"
                    }`}
                  />
                )}

                <div className="relative flex items-start">
                  <div className="flex-shrink-0 relative">
                    <StepNode
                      state={state}
                      onStepClick={() => handleStepClick(step.key, state)}
                      onMouseEnter={() => {
                        if (state === "rejected") setHoveredRejection(step.key);
                      }}
                      onMouseLeave={() => setHoveredRejection(null)}
                    />

                    {hoveredRejection === step.key && state === "rejected" && approval && (
                      <RejectionTooltip
                        reason={approval.rejectedReason}
                        approvedByName={approval.approvedByName}
                      />
                    )}
                  </div>

                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium transition-colors duration-300 ${
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Awaiting
                        </span>
                      )}
                    </div>

                    {mobileAssignedName && (state === "current" || state === "pending") && (
                      <p className="mt-0.5 text-xs text-gray-500">Assigned: {mobileAssignedName}</p>
                    )}

                    {approval && state === "completed" && (
                      <div className="mt-1 text-xs text-gray-500">
                        <span>{approval.approvedByName}</span>
                        {approval.approvedAt && (
                          <span> - {formatDateLongZA(approval.approvedAt)}</span>
                        )}
                        {approval.signatureUrl && (
                          <div className="mt-1 bg-white rounded border border-gray-200 p-1.5 inline-block">
                            <img
                              src={approval.signatureUrl}
                              alt={`Signature by ${approval.approvedByName}`}
                              className="max-h-10 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {approval?.comments && (
                      <p className="mt-1 text-xs text-gray-600 italic">{approval.comments}</p>
                    )}

                    {approval && state === "rejected" && (
                      <div className="mt-1">
                        <span className="text-xs text-red-600">
                          Rejected by {approval.approvedByName}
                        </span>
                        {approval.rejectedReason && (
                          <p className="mt-0.5 text-xs text-red-500 italic">
                            {approval.rejectedReason}
                          </p>
                        )}
                      </div>
                    )}

                    {bgForStep.length > 0 && (
                      <div className="mt-2 ml-2 pl-3 border-l-2 border-dashed border-amber-300 space-y-2">
                        {bgForStep.map((bg) => {
                          const bgCompleted = bg.completedAt !== null;
                          const bgTriggered =
                            index < currentStepIndex || index === currentStepIndex;
                          const bgActive = bgTriggered && !bgCompleted;
                          const canComplete =
                            bgActive &&
                            isUserAssignedToStep(bg.stepKey, currentUserName, stepAssignments);
                          const isCompleting = completingStepKey === bg.stepKey;

                          return (
                            <div key={bg.stepKey} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    bgCompleted
                                      ? "bg-amber-500"
                                      : bgActive
                                        ? "bg-teal-100 border-2 border-teal-500"
                                        : "bg-gray-100 border border-gray-300"
                                  }`}
                                >
                                  {bgCompleted && <Check className="h-3 w-3 text-white" />}
                                  {bgActive && <Clock className="h-3 w-3 text-teal-600" />}
                                  {!bgCompleted && !bgActive && (
                                    <Circle className="h-2 w-2 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span
                                    className={`text-xs font-medium ${
                                      bgCompleted
                                        ? "text-amber-700"
                                        : bgActive
                                          ? "text-teal-600"
                                          : "text-gray-400"
                                    }`}
                                  >
                                    {bg.label}
                                  </span>
                                  {bgCompleted && bg.completedByName && (
                                    <p className="text-[10px] text-gray-400">
                                      {bg.completedByName}
                                      {bg.completedAt
                                        ? ` - ${formatDateLongZA(bg.completedAt)}`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {canComplete && onCompleteBackgroundStep && (
                                <button
                                  type="button"
                                  onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                                  disabled={isCompleting}
                                  className="ml-7 px-3 py-1 text-xs font-semibold rounded bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isCompleting
                                    ? "Saving..."
                                    : actionLabelForStep(bg.stepKey, bg.label)}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CompactWorkflowStepperProps {
  workflowStatus: string;
}

export function CompactWorkflowStepper(props: CompactWorkflowStepperProps) {
  const { workflowStatus } = props;
  const currentStepIndex = STATUS_TO_STEP_INDEX[workflowStatus] ?? 0;

  return (
    <div className="flex items-center gap-0.5 w-fit">
      {FALLBACK_FOREGROUND_STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isLast = index === FALLBACK_FOREGROUND_STEPS.length - 1;

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
