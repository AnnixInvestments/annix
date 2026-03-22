"use client";

import { Check, Circle, Clock, Minus, RefreshCw, X } from "lucide-react";
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
  document_upload: "admin_approval",
  admin_approved: "manager_approval",
  manager_approved: "quality_check",
  requisition_sent: "quality_check",
  requisition: "quality_check",
  stock_allocated: "quality_check",
  stock_allocation: "quality_check",
  manager_final: "quality_check",
  ready_for_dispatch: "dispatched",
  ready: "dispatched",
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
  allSteps: ForegroundStep[],
  bgByTrigger: Record<string, BackgroundStepStatus[]>,
  bgKeySet: Set<string>,
): StepState => {
  const approval = approvalByStep[stepKey];

  if (index < currentStepIndex) {
    return approval?.status === "rejected" ? "rejected" : "completed";
  } else if (index === currentStepIndex) {
    if (approval?.status === "rejected") return "rejected";
    if (index > 0) {
      const prevKey = allSteps[index - 1].key;
      const prevBgTasks = resolveBgChainFlat(prevKey, bgByTrigger, bgKeySet);
      const prevBgIncomplete =
        prevBgTasks.length > 0 && prevBgTasks.some((bg) => bg.completedAt === null);
      if (prevBgIncomplete) return "pending";
    }
    return "current";
  } else {
    return "pending";
  }
};

const resolveBgChainFlat = (
  trigger: string,
  bgByTrigger: Record<string, BackgroundStepStatus[]>,
  bgKeySet: Set<string>,
): BackgroundStepStatus[] => {
  const direct = bgByTrigger[trigger] || [];
  return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
    const rest = bgKeySet.has(bg.stepKey)
      ? resolveBgChainFlat(bg.stepKey, bgByTrigger, bgKeySet)
      : [];
    return [...chain, bg, ...rest];
  }, []);
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
  branchBgSteps: BackgroundStepStatus[],
): "completed" | "skipped" | "active" | "pending" => {
  if (bg.completedAt !== null) {
    if (bg.completionType === "skipped") return "skipped";
    return "completed";
  }
  const hasColoredBranch = branchBgSteps.some((b) => b.branchColor !== null);
  const branchReached = hasColoredBranch ? fgIndex <= currentStepIndex : fgIndex < currentStepIndex;
  if (branchReached) {
    const firstIncomplete = branchBgSteps.find((b) => b.completedAt === null);
    if (firstIncomplete && firstIncomplete.stepKey === bg.stepKey) return "active";
    return "pending";
  }
  return "pending";
};

interface BranchSegment {
  triggerFgKey: string;
  triggerFgIdx: number;
  nextFgIdx: number;
  bgSteps: BackgroundStepStatus[];
  branchColor: string | null;
  isLoop: boolean;
}

const collectBranches = (
  allSteps: ForegroundStep[],
  backgroundSteps: BackgroundStepStatus[],
  bgByTrigger: Record<string, BackgroundStepStatus[]>,
): BranchSegment[] => {
  const bgStepKeySet = new Set(backgroundSteps.map((bg) => bg.stepKey));
  const bgByKey = new Map(backgroundSteps.map((bg) => [bg.stepKey, bg]));

  const inheritedColor = (bg: BackgroundStepStatus): string | null => {
    if (bg.branchColor) return bg.branchColor;
    const parent = bgByKey.get(bg.triggerAfterStep || "");
    if (parent) return inheritedColor(parent);
    return null;
  };

  const resolveBgChain = (trigger: string): BackgroundStepStatus[] => {
    const direct = bgByTrigger[trigger] || [];
    return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
      const rest = bgStepKeySet.has(bg.stepKey) ? resolveBgChain(bg.stepKey) : [];
      return [...chain, bg, ...rest];
    }, []);
  };

  return allSteps.reduce<BranchSegment[]>((branches, step, index) => {
    const directChildren = bgByTrigger[step.key] || [];
    if (directChildren.length === 0) return branches;

    const coloredDirect = directChildren.filter((bg) => inheritedColor(bg));
    const regularDirect = directChildren.filter((bg) => !inheritedColor(bg));

    const result = [...branches];

    if (coloredDirect.length > 0) {
      const loopChain = coloredDirect.reduce<BackgroundStepStatus[]>((chain, bg) => {
        const rest = bgStepKeySet.has(bg.stepKey) ? resolveBgChain(bg.stepKey) : [];
        return [...chain, bg, ...rest];
      }, []);
      result.push({
        triggerFgKey: step.key,
        triggerFgIdx: index,
        nextFgIdx: index,
        bgSteps: loopChain,
        branchColor: inheritedColor(coloredDirect[0]) || null,
        isLoop: true,
      });
    }

    if (regularDirect.length > 0) {
      const regularChain = regularDirect.reduce<BackgroundStepStatus[]>((chain, bg) => {
        const rest = bgStepKeySet.has(bg.stepKey) ? resolveBgChain(bg.stepKey) : [];
        return [...chain, bg, ...rest];
      }, []);
      const nextFgIdx = index + 1 < allSteps.length ? index + 1 : index;
      result.push({
        triggerFgKey: step.key,
        triggerFgIdx: index,
        nextFgIdx,
        bgSteps: regularChain,
        branchColor: null,
        isLoop: false,
      });
    }

    return result;
  }, []);
};

const bgNodeClasses = (
  state: "completed" | "skipped" | "active" | "pending",
  branchColor: string | null,
): { circle: string; icon: React.ReactNode; label: string } => {
  const isBlue = branchColor === "#3b82f6";

  if (state === "skipped") {
    return {
      circle: "bg-gray-300",
      icon: <Minus className="h-2.5 w-2.5 text-white" />,
      label: "text-gray-400",
    };
  }
  if (state === "completed") {
    return {
      circle: isBlue ? "bg-blue-500" : "bg-amber-500",
      icon: <Check className="h-2.5 w-2.5 text-white" />,
      label: isBlue ? "text-blue-700" : "text-amber-700",
    };
  }
  if (state === "active") {
    return {
      circle: "bg-red-100 border-2 border-red-500 animate-pulse",
      icon: <Clock className="h-2.5 w-2.5 text-red-600" />,
      label: "text-red-600",
    };
  }
  return {
    circle: "bg-gray-100 border-2 border-gray-300",
    icon: <Circle className="h-2 w-2 text-gray-400" />,
    label: "text-gray-400",
  };
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
  const [loopBottomPositions, setLoopBottomPositions] = useState<
    Record<
      string,
      {
        start: Array<{ x: number; y: number }>;
        end: Array<{ x: number; y: number; originalIdx: number }>;
        totalSteps: number;
      }
    >
  >({});
  const loopBottomCount = (totalSteps: number) => {
    if (totalSteps >= 7) return 2;
    if (totalSteps >= 5) return 1;
    return 0;
  };

  const bgKeySet = useMemo(
    () => new Set(backgroundSteps.map((bg) => bg.stepKey)),
    [backgroundSteps],
  );

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

  const loopBranches = useMemo(() => branches.filter((b) => b.isLoop), [branches]);
  const belowBranches = useMemo(() => branches.filter((b) => !b.isLoop), [branches]);

  const hasBranches = branches.length > 0 || docUploadStep !== null;
  const hasLoopBranches = loopBranches.length > 0;

  const branchLanes = useMemo(() => {
    const laneEnds: number[] = [];
    return belowBranches.reduce<Record<string, number>>((acc, branch) => {
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

  const laneCount = belowBranches.length > 0 ? Math.max(...Object.values(branchLanes)) + 1 : 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const computePaths = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const paths: Array<{ d: string; color: string; key: string }> = [];
      const loopBottomPos: Record<
        string,
        {
          start: Array<{ x: number; y: number }>;
          end: Array<{ x: number; y: number; originalIdx: number }>;
          totalSteps: number;
        }
      > = {};
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

      loopBranches.forEach((branch) => {
        const startNode = fgNodeRefs.current[branch.triggerFgIdx];
        const nextFgNode = fgNodeRefs.current[branch.triggerFgIdx + 1];
        const btmCount = loopBottomCount(branch.bgSteps.length);
        const topFirstKey = branch.bgSteps[btmCount]?.stepKey;
        const topLastKey = branch.bgSteps[branch.bgSteps.length - btmCount - 1]?.stepKey;
        const firstTopBg = topFirstKey ? bgNodeRefs.current[topFirstKey] : null;
        const lastTopBg = topLastKey ? bgNodeRefs.current[topLastKey] : null;

        if (!startNode || !firstTopBg || !lastTopBg) return;

        const branchActive = branch.triggerFgIdx <= currentStepIndex;
        const allComplete = branch.bgSteps.every((bg) => bg.completedAt !== null);
        const activeColor = branch.branchColor || "#f59e0b";
        const strokeColor = branchActive ? activeColor : "#d1d5db";
        const mergeColor = branchActive && allComplete ? activeColor : "#d1d5db";

        const sRect = startNode.getBoundingClientRect();
        const ftRect = firstTopBg.getBoundingClientRect();
        const ltRect = lastTopBg.getBoundingClientRect();
        const sx = sRect.left + sRect.width / 2 - rect.left;
        const sy = sRect.top + sRect.height / 2 - rect.top;
        const fx = ftRect.left + ftRect.width / 2 - rect.left;
        const fy = ftRect.top + ftRect.height / 2 - rect.top;
        const lx = ltRect.left + ltRect.width / 2 - rect.left;

        const bottomEdge = sy - sRect.height / 2 - 6;
        const nextFgX = nextFgNode
          ? nextFgNode.getBoundingClientRect().left +
            nextFgNode.getBoundingClientRect().width / 2 -
            rect.left
          : rect.width - 20;
        const nodeSlot = 80;
        const containerNeeded = branch.bgSteps.length * nodeSlot;
        const rawRight = sx + containerNeeded * 0.5;
        const rightEdge = Math.min(rawRight, nextFgX - 30);
        const leftEdge = Math.max(16, rightEdge - containerNeeded);

        const grayBase = "#d1d5db";

        paths.push({
          key: `loop-fork-${branch.triggerFgKey}`,
          color: grayBase,
          d: `M ${sx + r} ${bottomEdge} L ${rightEdge - r} ${bottomEdge} Q ${rightEdge} ${bottomEdge} ${rightEdge} ${bottomEdge - r} L ${rightEdge} ${fy + r} Q ${rightEdge} ${fy} ${rightEdge - r} ${fy} L ${leftEdge + r} ${fy}`,
        });

        paths.push({
          key: `loop-merge-${branch.triggerFgKey}`,
          color: grayBase,
          d: `M ${leftEdge + r} ${fy} Q ${leftEdge} ${fy} ${leftEdge} ${fy + r} L ${leftEdge} ${bottomEdge - r} Q ${leftEdge} ${bottomEdge} ${leftEdge + r} ${bottomEdge} L ${sx - r} ${bottomEdge}`,
        });

        paths.push({
          key: `loop-connector-left-${branch.triggerFgKey}`,
          color: grayBase,
          d: `M ${sx - r} ${bottomEdge} Q ${sx} ${bottomEdge} ${sx} ${bottomEdge + r} L ${sx} ${sy - r} Q ${sx} ${sy} ${sx + r} ${sy}`,
        });

        paths.push({
          key: `loop-connector-right-${branch.triggerFgKey}`,
          color: grayBase,
          d: `M ${sx + r} ${bottomEdge} Q ${sx} ${bottomEdge} ${sx} ${bottomEdge + r} L ${sx} ${sy - r} Q ${sx} ${sy} ${sx - r} ${sy}`,
        });

        const leftSpan = sx - leftEdge;
        const startPositions = Array.from({ length: btmCount }, (_, i) => ({
          x: sx - (leftSpan * (i + 1)) / (btmCount + 1),
          y: bottomEdge,
        }));
        const rightSpan = rightEdge - sx;
        const totalSteps = branch.bgSteps.length;
        const endPositions = Array.from({ length: btmCount }, (_, i) => ({
          x: sx + (rightSpan * (btmCount - i)) / (btmCount + 1),
          y: bottomEdge,
          originalIdx: totalSteps - btmCount + i,
        }));
        loopBottomPos[branch.triggerFgKey] = {
          start: startPositions,
          end: endPositions,
          totalSteps,
        };

        if (branchActive) {
          const firstIncompleteIdx = branch.bgSteps.findIndex((b) => b.completedAt === null);
          const progressIdx =
            firstIncompleteIdx === -1 ? branch.bgSteps.length : firstIncompleteIdx;

          paths.push({
            key: `loop-progress-entry-${branch.triggerFgKey}`,
            color: activeColor,
            d: `M ${sx - r} ${bottomEdge} Q ${sx} ${bottomEdge} ${sx} ${bottomEdge + r} L ${sx} ${sy - r} Q ${sx} ${sy} ${sx - r} ${sy}`,
          });

          const activeTopIdx = branch.bgSteps.findIndex(
            (b, i) => i >= btmCount && i < totalSteps - btmCount && b.completedAt === null,
          );
          const progressTopEl =
            activeTopIdx >= 0 ? bgNodeRefs.current[branch.bgSteps[activeTopIdx].stepKey] : null;
          const progressTopX = progressTopEl
            ? progressTopEl.getBoundingClientRect().left +
              progressTopEl.getBoundingClientRect().width / 2 -
              rect.left
            : rightEdge - r;

          paths.push({
            key: `loop-progress-left-${branch.triggerFgKey}`,
            color: activeColor,
            d: `M ${sx - r} ${bottomEdge} L ${leftEdge + r} ${bottomEdge} Q ${leftEdge} ${bottomEdge} ${leftEdge} ${bottomEdge - r} L ${leftEdge} ${fy + r} Q ${leftEdge} ${fy} ${leftEdge + r} ${fy} L ${progressTopX} ${fy}`,
          });

          if (allComplete) {
            paths.push({
              key: `loop-progress-right-${branch.triggerFgKey}`,
              color: activeColor,
              d: `M ${sx + r} ${bottomEdge} L ${rightEdge - r} ${bottomEdge} Q ${rightEdge} ${bottomEdge} ${rightEdge} ${bottomEdge - r} L ${rightEdge} ${fy + r} Q ${rightEdge} ${fy} ${rightEdge - r} ${fy}`,
            });
          } else if (progressIdx >= totalSteps - btmCount) {
            const activeEndBtmIdx = progressIdx - (totalSteps - btmCount);
            const endPos = endPositions[activeEndBtmIdx];
            if (endPos) {
              paths.push({
                key: `loop-progress-right-${branch.triggerFgKey}`,
                color: activeColor,
                d: `M ${rightEdge - r} ${fy} Q ${rightEdge} ${fy} ${rightEdge} ${fy + r} L ${rightEdge} ${bottomEdge - r} Q ${rightEdge} ${bottomEdge} ${rightEdge - r} ${bottomEdge} L ${endPos.x} ${bottomEdge}`,
              });
            }
          }

          if (allComplete) {
            paths.push({
              key: `loop-progress-exit-${branch.triggerFgKey}`,
              color: activeColor,
              d: `M ${sx + r} ${bottomEdge} Q ${sx} ${bottomEdge} ${sx} ${bottomEdge + r} L ${sx} ${sy - r} Q ${sx} ${sy} ${sx - r} ${sy}`,
            });
          }
        }

        branch.bgSteps.forEach((bg, bgIdx) => {
          const totalBg = branch.bgSteps.length;
          const btmN = loopBottomCount(totalBg);
          if (bgIdx <= btmN) return;
          if (bgIdx >= totalBg - btmN) return;
          const prevEl = bgNodeRefs.current[branch.bgSteps[bgIdx - 1].stepKey];
          const currEl = bgNodeRefs.current[bg.stepKey];
          if (!prevEl || !currEl) return;

          const pRect = prevEl.getBoundingClientRect();
          const cRect = currEl.getBoundingClientRect();
          const allPriorComplete = branch.bgSteps
            .slice(0, bgIdx)
            .every((b) => b.completedAt !== null);
          const lineColor = branchActive && allPriorComplete ? activeColor : "#d1d5db";

          paths.push({
            key: `bg-line-${bg.stepKey}`,
            color: lineColor,
            d: `M ${pRect.left + pRect.width / 2 - rect.left} ${pRect.top + pRect.height / 2 - rect.top} L ${cRect.left + cRect.width / 2 - rect.left} ${cRect.top + cRect.height / 2 - rect.top}`,
          });
        });
      });
      setLoopBottomPositions(loopBottomPos);

      belowBranches.forEach((branch) => {
        const startNode = fgNodeRefs.current[branch.triggerFgIdx];
        const endNode = fgNodeRefs.current[branch.nextFgIdx];
        const firstBg = bgNodeRefs.current[branch.bgSteps[0].stepKey];
        const lastBg = bgNodeRefs.current[branch.bgSteps[branch.bgSteps.length - 1].stepKey];

        if (!startNode || !endNode || !firstBg || !lastBg) return;

        const isColoredBranch = branch.branchColor !== null;
        const branchActive = isColoredBranch
          ? branch.triggerFgIdx <= currentStepIndex
          : branch.triggerFgIdx < currentStepIndex;
        const allComplete = branch.bgSteps.every((bg) => bg.completedAt !== null);
        const activeColor = branch.branchColor || "#f59e0b";
        const strokeColor = branchActive ? activeColor : "#d1d5db";
        const mergeColor = branchActive && allComplete ? activeColor : "#d1d5db";

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
          const lineColor = branchActive && prevCompleted ? activeColor : "#d1d5db";

          paths.push({
            key: `bg-line-${bg.stepKey}`,
            color: lineColor,
            d: `M ${pRect.left + pRect.width / 2 - rect.left} ${pRect.top + pRect.height / 2 - rect.top} L ${cRect.left + cRect.width / 2 - rect.left} ${cRect.top + cRect.height / 2 - rect.top}`,
          });
        });
      });

      const positions: Record<string, { left: number; right: number }> = {};
      belowBranches.forEach((branch) => {
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
      loopBranches.forEach((branch) => {
        const sNode = fgNodeRefs.current[branch.triggerFgIdx];
        const nextFgN = fgNodeRefs.current[branch.triggerFgIdx + 1];
        if (sNode) {
          const sR = sNode.getBoundingClientRect();
          const triggerX = sR.left + sR.width / 2 - rect.left;
          const nextX = nextFgN
            ? nextFgN.getBoundingClientRect().left +
              nextFgN.getBoundingClientRect().width / 2 -
              rect.left
            : rect.width - 20;
          const nodeSlot = 80;
          const needed = branch.bgSteps.length * nodeSlot;
          const dynRight = Math.min(triggerX + needed * 0.5, nextX - 30);
          const leftBound = Math.max(16, dynRight - needed);
          positions[`loop-${branch.triggerFgKey}`] = {
            left: leftBound,
            right: rect.width - dynRight,
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

    const loopContainer = container.querySelector("[data-loop-container]");
    if (loopContainer) {
      observer.observe(loopContainer);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(settledId);
      observer.disconnect();
    };
  }, [loopBranches, belowBranches, docUploadStep, currentStepIndex, allSteps, backgroundSteps]);

  if (allSteps.length === 0) {
    return <p className="text-sm text-gray-500">No workflow steps configured</p>;
  }

  const hasDocPre = docUploadStep !== null;

  return (
    <div
      ref={containerRef}
      className="relative min-h-[80px]"
      style={{
        paddingLeft: hasDocPre ? "60px" : undefined,
        paddingTop: hasLoopBranches ? "130px" : "60px",
      }}
    >
      {svgPaths.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none z-10"
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

      {loopBranches.map((branch) => {
        const triggerPos = branchPositions[`loop-${branch.triggerFgKey}`];
        const bottomData = loopBottomPositions[branch.triggerFgKey];
        const bottomStartPos = bottomData?.start || [];
        const bottomEndPos = bottomData?.end || [];
        const totalBgSteps = bottomData?.totalSteps || branch.bgSteps.length;
        const containerLeft = triggerPos?.left || 0;

        return (
          <div
            key={`loop-${branch.triggerFgKey}`}
            data-loop-container
            className="absolute z-20"
            style={{
              top: "8px",
              left: triggerPos ? `${triggerPos.left}px` : "0",
              right: triggerPos ? `${triggerPos.right}px` : "0",
            }}
          >
            <div className="flex items-start">
              {branch.bgSteps
                .slice(loopBottomCount(totalBgSteps), totalBgSteps - loopBottomCount(totalBgSteps))
                .map((bg) => {
                  const state = bgNodeState(
                    bg,
                    branch.triggerFgIdx,
                    currentStepIndex,
                    branch.bgSteps,
                  );
                  const classes = bgNodeClasses(state, branch.branchColor);
                  const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
                  const bgDisplayName =
                    state === "completed" || state === "skipped" ? bg.completedByName : bgAssigned;

                  return (
                    <div key={bg.stepKey} className="flex-1 flex flex-col items-center">
                      <p
                        className={`mb-0.5 text-[9px] font-medium whitespace-nowrap ${classes.label}`}
                      >
                        {state === "skipped" ? "Skipped" : bg.label}
                      </p>
                      {bgDisplayName && state !== "skipped" && (
                        <p className="text-[8px] text-gray-400 truncate max-w-[60px] mb-0.5">
                          {bgDisplayName}
                        </p>
                      )}
                      <div
                        ref={(el) => {
                          bgNodeRefs.current[bg.stepKey] = el;
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-20 ${classes.circle}`}
                      >
                        {classes.icon}
                      </div>
                    </div>
                  );
                })}
            </div>
            {branch.bgSteps.slice(0, loopBottomCount(totalBgSteps)).map((bg, bgIdx) => {
              const pos = bottomStartPos[bgIdx];
              if (!pos) return null;
              const state = bgNodeState(bg, branch.triggerFgIdx, currentStepIndex, branch.bgSteps);
              const classes = bgNodeClasses(state, branch.branchColor);
              const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
              const bgDisplayName =
                state === "completed" || state === "skipped" ? bg.completedByName : bgAssigned;

              return (
                <div
                  key={`bottom-${bg.stepKey}`}
                  className="absolute"
                  style={{
                    left: `${pos.x - containerLeft}px`,
                    top: `${pos.y - 8 - 10}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col items-center mb-0.5">
                    <p className={`text-[9px] font-medium whitespace-nowrap ${classes.label}`}>
                      {state === "skipped" ? "Skipped" : bg.label}
                    </p>
                    {bgDisplayName && state !== "skipped" && (
                      <p className="text-[8px] text-gray-400 truncate max-w-[60px]">
                        {bgDisplayName}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-20 ${classes.circle}`}
                  >
                    {classes.icon}
                  </div>
                </div>
              );
            })}
            {loopBottomCount(totalBgSteps) > 0 &&
              branch.bgSteps.slice(-loopBottomCount(totalBgSteps)).map((bg, bgIdx) => {
                const pos = bottomEndPos[bgIdx];
                if (!pos) return null;
                const state = bgNodeState(
                  bg,
                  branch.triggerFgIdx,
                  currentStepIndex,
                  branch.bgSteps,
                );
                const classes = bgNodeClasses(state, branch.branchColor);
                const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
                const bgDisplayName =
                  state === "completed" || state === "skipped" ? bg.completedByName : bgAssigned;

                return (
                  <div
                    key={`bottom-${bg.stepKey}`}
                    className="absolute"
                    style={{
                      left: `${pos.x - containerLeft}px`,
                      top: `${pos.y - 8 - 10}px`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col items-center mb-0.5">
                      <p className={`text-[9px] font-medium whitespace-nowrap ${classes.label}`}>
                        {state === "skipped" ? "Skipped" : bg.label}
                      </p>
                      {bgDisplayName && state !== "skipped" && (
                        <p className="text-[8px] text-gray-400 truncate max-w-[60px]">
                          {bgDisplayName}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-20 ${classes.circle}`}
                    >
                      {classes.icon}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })}

      <div className="flex items-start">
        {allSteps.map((step, index) => {
          const state = resolveStepState(
            step.key,
            index,
            currentStepIndex,
            approvalByStep,
            allSteps,
            bgByTrigger,
            bgKeySet,
          );
          const approval = approvalByStep[step.key];
          const isFirst = index === 0;
          const isLast = index === allSteps.length - 1;
          const lineCompleted = index < currentStepIndex;

          const assignedName =
            state === "current" || state === "pending"
              ? assignedNameForStep(step.key, stepAssignments)
              : null;

          const hasLoopAbove = loopBranches.some((b) => b.triggerFgKey === step.key);
          const isNarrowFirst = isFirst && hasDocPre;
          const prevBelowBranch =
            index > 0 ? belowBranches.find((b) => b.triggerFgIdx === index - 1) : null;
          const prevLoopBranch =
            index > 0 ? loopBranches.find((b) => b.triggerFgIdx === index - 1) : null;
          const belowCount = prevBelowBranch ? prevBelowBranch.bgSteps.length : 0;
          const loopCount = prevLoopBranch ? prevLoopBranch.bgSteps.length : 0;
          const bgCount = Math.max(belowCount, loopCount);
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
                {!isFirst &&
                  (() => {
                    const prevStepKey = allSteps[index - 1]?.key;
                    const prevBgTasks = prevStepKey
                      ? resolveBgChainFlat(prevStepKey, bgByTrigger, bgKeySet)
                      : [];
                    const prevBgAllComplete =
                      prevBgTasks.length === 0 ||
                      prevBgTasks.every((bg) => bg.completedAt !== null);
                    const lineGreen =
                      (state === "completed" || state === "current") && prevBgAllComplete;
                    return (
                      <div
                        className="flex-1"
                        style={{
                          height: "3px",
                          backgroundColor: lineGreen
                            ? "#22c55e"
                            : state === "rejected"
                              ? "#fca5a5"
                              : "#e5e7eb",
                        }}
                      />
                    );
                  })()}

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
                      bottom: hasLoopAbove ? "calc(100% + 20px)" : "calc(100% + 4px)",
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

                {!isLast &&
                  (() => {
                    const thisBgTasks = resolveBgChainFlat(step.key, bgByTrigger, bgKeySet);
                    const thisBgAllComplete =
                      thisBgTasks.length === 0 ||
                      thisBgTasks.every((bg) => bg.completedAt !== null);
                    const rightLineGreen = lineCompleted && thisBgAllComplete;
                    return (
                      <div
                        className="flex-1"
                        style={{
                          height: "3px",
                          backgroundColor: rightLineGreen ? "#22c55e" : "#e5e7eb",
                        }}
                      />
                    );
                  })()}
              </div>
            </div>
          );
        })}
        {(() => {
          const lastBranch = belowBranches.find((b) => b.triggerFgIdx === allSteps.length - 1);
          const trailingGrow = lastBranch ? Math.max(2, lastBranch.bgSteps.length) : 2;
          return <div style={{ flexGrow: trailingGrow }} />;
        })()}
      </div>

      {docUploadStep &&
        (() => {
          const docState = bgNodeState(docUploadStep, 0, currentStepIndex, [docUploadStep]);

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
                        ? "bg-red-100 border-2 border-red-500 animate-pulse"
                        : "bg-gray-100 border-2 border-gray-300"
                  }`}
                >
                  {docState === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
                  {docState === "active" && <Clock className="h-2.5 w-2.5 text-red-600" />}
                  {docState === "pending" && <Circle className="h-2 w-2 text-gray-400" />}
                </div>
                <p
                  className={`mt-0.5 text-[9px] font-medium whitespace-nowrap ${
                    docState === "completed"
                      ? "text-amber-700"
                      : docState === "active"
                        ? "text-red-600"
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

      {belowBranches.length > 0 && (
        <div
          data-branch-container
          className="mt-2 relative"
          style={{ height: `${laneCount * 52}px` }}
        >
          {belowBranches.map((branch) => {
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
                  const state = bgNodeState(
                    bg,
                    branch.triggerFgIdx,
                    currentStepIndex,
                    branch.bgSteps,
                  );
                  const classes = bgNodeClasses(state, branch.branchColor);
                  const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
                  const bgDisplayName =
                    state === "completed" || state === "skipped" ? bg.completedByName : bgAssigned;

                  return (
                    <div key={bg.stepKey} className="flex-1 flex flex-col items-center">
                      <div
                        ref={(el) => {
                          bgNodeRefs.current[bg.stepKey] = el;
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-20 ${classes.circle}`}
                      >
                        {classes.icon}
                      </div>

                      <p
                        className={`mt-0.5 text-[9px] font-medium whitespace-nowrap ${classes.label}`}
                      >
                        {state === "skipped" ? "Skipped" : bg.label}
                      </p>
                      {bgDisplayName && state !== "skipped" && (
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

  const bgKeySet = useMemo(
    () => new Set(backgroundSteps.map((bg) => bg.stepKey)),
    [backgroundSteps],
  );

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

  const branchesForStep = useMemo(
    () =>
      branches.reduce<Record<string, BranchSegment[]>>((acc, branch) => {
        return { ...acc, [branch.triggerFgKey]: [...(acc[branch.triggerFgKey] || []), branch] };
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
          const docState = bgNodeState(docUploadStep, 0, currentStepIndex, [docUploadStep]);
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
                        ? "bg-red-100 border-2 border-red-500 animate-pulse"
                        : "bg-gray-100 border-2 border-gray-300"
                  }`}
                >
                  {docState === "completed" && <Check className="h-2.5 w-2.5 text-white" />}
                  {docState === "active" && <Clock className="h-2.5 w-2.5 text-red-600" />}
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
                        ? "text-red-600"
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
        const state = resolveStepState(
          step.key,
          index,
          currentStepIndex,
          approvalByStep,
          allSteps,
          bgByTrigger,
          bgKeySet,
        );
        const approval = approvalByStep[step.key];
        const isLast = index === allSteps.length - 1;
        const lineCompleted = index < currentStepIndex;
        const stepBranches = branchesForStep[step.key] || [];

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

                {!isLast &&
                  (() => {
                    const thisBgTasks = resolveBgChainFlat(step.key, bgByTrigger, bgKeySet);
                    const thisBgAllComplete =
                      thisBgTasks.length === 0 ||
                      thisBgTasks.every((bg) => bg.completedAt !== null);
                    const mobileLineGreen = lineCompleted && thisBgAllComplete;
                    return (
                      <div
                        className="w-0.5 flex-1 mt-1"
                        style={{
                          backgroundColor: mobileLineGreen ? "#22c55e" : "#e5e7eb",
                          minHeight: stepBranches.length > 0 ? "8px" : "24px",
                        }}
                      />
                    );
                  })()}
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

            {stepBranches.map((branch) => (
              <div
                key={`mb-${branch.triggerFgKey}-${branch.isLoop ? "loop" : "below"}`}
                className="flex items-stretch"
                style={{ minHeight: "24px" }}
              >
                <div className="flex flex-col items-center" style={{ width: "32px" }}>
                  <div
                    className="w-0.5 flex-1"
                    style={{
                      backgroundColor:
                        lineCompleted && branch.bgSteps.every((bg) => bg.completedAt !== null)
                          ? "#22c55e"
                          : "#e5e7eb",
                    }}
                  />
                </div>

                <div
                  className={`ml-1 pl-3 border-l-2 border-dashed py-1 flex-1 min-w-0 ${
                    branch.branchColor === "#3b82f6" ? "border-blue-300" : "border-amber-300"
                  }`}
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {branch.bgSteps.map((bg) => {
                      const bgState = bgNodeState(
                        bg,
                        branch.triggerFgIdx,
                        currentStepIndex,
                        branch.bgSteps,
                      );
                      const mClasses = bgNodeClasses(bgState, branch.branchColor);
                      const bgAssigned = assignedNameForStep(bg.stepKey, stepAssignments);
                      const bgDisplayName =
                        bgState === "completed" || bgState === "skipped"
                          ? bg.completedByName
                          : bgAssigned;

                      return (
                        <div key={bg.stepKey} className="flex items-center gap-1.5">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${mClasses.circle}`}
                          >
                            {mClasses.icon}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[10px] font-medium leading-tight ${mClasses.label}`}
                            >
                              {bgState === "skipped" ? `${bg.label} (Skipped)` : bg.label}
                            </p>
                            {bgDisplayName && bgState !== "skipped" && (
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
            ))}
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
            completionType: null,
            branchColor: null,
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
