import { keys } from "es-toolkit/compat";
import { useCallback, useMemo } from "react";
import type {
  BackgroundStepStatus,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";

interface UseWorkflowActionsParams {
  workflowStatus: WorkflowStatusData | null;
  backgroundSteps: BackgroundStepStatus[];
  currentStatus: string | null;
  currentStep: string | null;
  userName: string | null | undefined;
  effectiveName: string | null;
  userRole: string;
  isPreviewActive: boolean;
  isAdminView: boolean;
}

export function useWorkflowActions(params: UseWorkflowActionsParams) {
  const {
    workflowStatus,
    backgroundSteps,
    currentStatus,
    currentStep,
    userName,
    effectiveName,
    userRole,
    isPreviewActive,
    isAdminView,
  } = params;

  const canApprove = useMemo(() => {
    if (!currentStep || !workflowStatus) return false;
    const jcStatus = workflowStatus.jobCardStatus;
    if (jcStatus !== "active") return false;

    if (isPreviewActive) {
      const checkName = effectiveName;
      if (!checkName) return false;
      const allAssignments = workflowStatus.stepAssignments;
      const assigned = allAssignments ? allAssignments[currentStep] : null;
      if (!assigned || assigned.length === 0) return false;
      return assigned.some((u) => u.name === checkName);
    }

    if (userRole === "admin") return true;

    return workflowStatus.canApprove;
  }, [currentStep, workflowStatus, isPreviewActive, effectiveName, userRole]);

  const isQualityUser = useMemo(() => {
    if (!workflowStatus) return false;
    if (workflowStatus.jobCardStatus !== "active") return false;
    const checkName = isPreviewActive ? effectiveName : userName;
    if (!checkName) return false;
    const stepAssignments = workflowStatus.stepAssignments;
    const assignments = stepAssignments || {};
    const qualityKeys = keys(assignments).filter(
      (k) => k.includes("quality") || k === "qa_review" || k === "qa_final_check",
    );
    return qualityKeys.some((k) => {
      const assigned = assignments[k];
      return assigned?.some((u) => u.name === checkName);
    });
  }, [workflowStatus, userName, effectiveName, isPreviewActive]);

  const canAcceptDraft = useMemo(() => {
    if (!workflowStatus || workflowStatus.jobCardStatus !== "draft") return false;
    if (userRole === "admin" && !isPreviewActive) return true;
    const checkName = effectiveName || userName;
    if (!checkName) return false;
    const assigned = workflowStatus.stepAssignments?.["document_upload"];
    if (!assigned || assigned.length === 0) return false;
    return assigned.some((u) => u.name === checkName);
  }, [workflowStatus, userName, effectiveName, userRole, isPreviewActive]);

  const userPendingBgSteps = useMemo(() => {
    const checkName = effectiveName || userName;
    if (!workflowStatus || !checkName) return [];
    if (workflowStatus.jobCardStatus === "draft") return [];
    const foregroundSteps = workflowStatus.foregroundSteps;
    const fgSteps = foregroundSteps || [];
    const fgKeys = fgSteps.filter((s) => s.key !== "draft").map((s) => s.key);
    const fgKeySet = new Set(fgKeys);
    const currentFgIdx = fgKeys.indexOf(currentStatus || "");
    const completedKeys = new Set(
      backgroundSteps.filter((bg) => bg.completedAt !== null).map((bg) => bg.stepKey),
    );
    const stepAssignments = workflowStatus.stepAssignments;
    const assignments = stepAssignments || {};
    const bgKeySet = new Set(backgroundSteps.map((bg) => bg.stepKey));

    const triggerGroups = backgroundSteps.reduce<Record<string, BackgroundStepStatus[]>>(
      (acc, bg) => {
        const triggerAfterStep = bg.triggerAfterStep;
        const trigger = triggerAfterStep || "__root__";
        return { ...acc, [trigger]: [...(acc[trigger] ? acc[trigger] : []), bg] };
      },
      {},
    );

    const resolveOriginFgIdx = (trigger: string, visited: Set<string> = new Set()): number => {
      if (trigger === "__root__") return 0;
      if (fgKeySet.has(trigger)) return fgKeys.indexOf(trigger);
      if (visited.has(trigger)) return 0;
      visited.add(trigger);
      const parentBg = backgroundSteps.find((bg) => bg.stepKey === trigger);
      if (parentBg) {
        const parentTriggerAfterStep = parentBg.triggerAfterStep;
        return resolveOriginFgIdx(parentTriggerAfterStep || "__root__", visited);
      }
      return 0;
    };

    const bgByKey = new Map(backgroundSteps.map((bg) => [bg.stepKey, bg]));
    const isInColoredBranch = (stepKey: string, visited: Set<string> = new Set()): boolean => {
      if (visited.has(stepKey)) return false;
      visited.add(stepKey);
      const step = bgByKey.get(stepKey);
      if (!step) return false;
      if (step.branchColor) return true;
      const parent = step.triggerAfterStep;
      if (parent && bgKeySet.has(parent)) return isInColoredBranch(parent, visited);
      return false;
    };

    const coloredSteps = backgroundSteps.filter((bg) => isInColoredBranch(bg.stepKey));
    const hasIncompleteColored = coloredSteps.some((bg) => bg.completedAt === null);

    const qaReviewPending = backgroundSteps.some(
      (bg) => bg.stepKey === "qa_review" && bg.completedAt === null,
    );

    const allActionable = backgroundSteps.filter((bg) => {
      if (bg.completedAt !== null) return false;

      if (qaReviewPending && (bg.stepKey === "qc_repairs" || bg.stepKey === "qa_final_check")) {
        return false;
      }

      const triggerAfterStep = bg.triggerAfterStep;
      const trigger = triggerAfterStep || "__root__";
      const originFgIdx = resolveOriginFgIdx(trigger);
      const isColored = isInColoredBranch(bg.stepKey);
      const coloredAtTrigger = isColored && originFgIdx === currentFgIdx;
      const currentFgKey = fgKeys[currentFgIdx];
      const rawCompletions = workflowStatus.actionCompletions;
      const completions = rawCompletions || [];
      const phase1Done = currentFgKey
        ? completions.some((ac) => ac.stepKey === currentFgKey && ac.actionType === "primary")
        : false;
      const coloredUnlocked = coloredAtTrigger && phase1Done;
      const effectiveOrigin = coloredUnlocked
        ? originFgIdx
        : isColored
          ? originFgIdx + 1
          : originFgIdx;

      const isNonBlocking = bg.rejoinAtStep !== null;

      if (isAdminView) {
        if (effectiveOrigin >= currentFgIdx && !isNonBlocking && !coloredUnlocked) return false;
      } else {
        if (effectiveOrigin >= currentFgIdx && !isNonBlocking && !coloredUnlocked) return false;

        if (hasIncompleteColored && !isInColoredBranch(bg.stepKey) && !isNonBlocking) {
          const originKey = fgKeys[resolveOriginFgIdx(trigger)];
          const coloredOrigin =
            coloredSteps.length > 0
              ? (() => {
                  const coloredStepTriggerAfterStep = coloredSteps[0].triggerAfterStep;
                  return fgKeys[resolveOriginFgIdx(coloredStepTriggerAfterStep || "__root__")];
                })()
              : null;
          if (originKey === coloredOrigin) return false;
        }
      }

      if (bgKeySet.has(trigger) && !completedKeys.has(trigger)) return false;

      const isNonBlockingBranch = bg.rejoinAtStep !== null;
      if (!isNonBlockingBranch) {
        const allSiblings = triggerGroups[trigger] ? triggerGroups[trigger] : [];
        const sameBranchSiblings = allSiblings.filter((s) => {
          const siblingBranchColor = s.branchColor;
          const branchColor = bg.branchColor;
          return (siblingBranchColor || null) === (branchColor || null);
        });
        const myIdx = sameBranchSiblings.findIndex((s) => s.stepKey === bg.stepKey);
        if (myIdx > 0) {
          const allPriorComplete = sameBranchSiblings
            .slice(0, myIdx)
            .every((s) => completedKeys.has(s.stepKey));
          if (!allPriorComplete) return false;
        }
      }

      const assigned = assignments[bg.stepKey];
      if (!assigned || assigned.length === 0) return false;
      if (!isAdminView && !assigned.some((u) => u.name === checkName)) {
        return false;
      }

      return true;
    });

    if (isAdminView || allActionable.length <= 1) return allActionable;

    const firstActionableTriggerAfterStep = allActionable[0].triggerAfterStep;
    const firstOriginIdx = resolveOriginFgIdx(firstActionableTriggerAfterStep || "__root__");

    return allActionable.filter((bg) => {
      if (bg.rejoinAtStep !== null) return true;
      const triggerAfterStep = bg.triggerAfterStep;
      const originIdx = resolveOriginFgIdx(triggerAfterStep || "__root__");
      return originIdx === firstOriginIdx;
    });
  }, [
    workflowStatus,
    backgroundSteps,
    currentStatus,
    userName,
    effectiveName,
    userRole,
    isPreviewActive,
    isAdminView,
  ]);

  const activeBgStepKeys = useMemo(
    () => new Set(userPendingBgSteps.map((bg) => bg.stepKey)),
    [userPendingBgSteps],
  );

  const currentStepPhaseInfo = useMemo(() => {
    if (!workflowStatus || !currentStep) {
      return {
        isMultiPhase: false,
        currentPhase: 1,
        phase1ActionLabel: null as string | null,
        phase2ActionLabel: null as string | null,
        phase1Complete: false,
        phase1ActionDone: false,
        actionLabel: null as string | null,
      };
    }

    const actionCompletions = workflowStatus.actionCompletions;
    const completions = actionCompletions || [];
    const phase1ActionDone = completions.some(
      (ac) => ac.stepKey === currentStep && ac.actionType === "primary",
    );

    const foregroundSteps = workflowStatus.foregroundSteps;
    const fgSteps = foregroundSteps || [];
    const stepConfig = fgSteps.find((s) => s.key === currentStep);
    const actionLabel = stepConfig?.actionLabel ? stepConfig.actionLabel : null;

    const phaseEntry = workflowStatus.phaseInfo?.[currentStep];
    if (!phaseEntry || phaseEntry.phases.length <= 1) {
      return {
        isMultiPhase: false,
        currentPhase: 1,
        phase1ActionLabel: null,
        phase2ActionLabel: null,
        phase1Complete: false,
        phase1ActionDone: phase1ActionDone,
        actionLabel,
      };
    }

    const backgroundWorkflowSteps = workflowStatus.backgroundSteps;
    const bgSteps: BackgroundStepStatus[] = backgroundWorkflowSteps || [];
    const phase1Keys = new Set(phaseEntry.phases[0].bgStepKeys);
    const phase1BgSteps = bgSteps.filter((bg) => phase1Keys.has(bg.stepKey));
    const phase1Complete =
      phase1BgSteps.length > 0 && phase1BgSteps.every((bg) => bg.completedAt !== null);

    return {
      isMultiPhase: true,
      currentPhase: phaseEntry.currentPhase,
      phase1ActionLabel: phaseEntry.phases[0].actionLabel,
      phase2ActionLabel: phaseEntry.phases[1].actionLabel,
      phase1Complete,
      phase1ActionDone: phase1ActionDone,
      actionLabel,
    };
  }, [workflowStatus, currentStep]);

  const prevStepBgPending = useMemo(() => {
    if (!workflowStatus || !currentStep) return false;
    const foregroundSteps = workflowStatus.foregroundSteps;
    const fgSteps = foregroundSteps || [];
    const currentIdx = fgSteps.findIndex((s) => s.key === currentStep);
    if (currentIdx <= 0) return false;
    const prevStepKey = fgSteps[currentIdx - 1].key;
    const backgroundWorkflowSteps = workflowStatus.backgroundSteps;
    const bgSteps: BackgroundStepStatus[] = backgroundWorkflowSteps || [];
    const fgKeySet = new Set(fgSteps.map((s) => s.key));
    const bgKeySet = new Set(bgSteps.map((bg) => bg.stepKey));
    const bgByTrigger = bgSteps.reduce<Record<string, BackgroundStepStatus[]>>((acc, bg) => {
      const raw = bg.triggerAfterStep;
      const isFgTrigger = raw !== null && fgKeySet.has(raw);
      const isBgChain = raw !== null && bgKeySet.has(raw);
      const firstFgKey = fgSteps[0]?.key;
      const fallbackTrigger = firstFgKey ? firstFgKey : "";
      const trigger = isFgTrigger || isBgChain ? raw : fallbackTrigger;
      return { ...acc, [trigger]: [...(acc[trigger] ? acc[trigger] : []), bg] };
    }, {});
    const resolveChain = (trigger: string): BackgroundStepStatus[] => {
      const direct = bgByTrigger[trigger] ? bgByTrigger[trigger] : [];
      return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
        const rest = bgKeySet.has(bg.stepKey) ? resolveChain(bg.stepKey) : [];
        return [...chain, bg, ...rest];
      }, []);
    };
    const prevBgTasks = resolveChain(prevStepKey).filter((bg) => bg.rejoinAtStep === null);
    return prevBgTasks.length > 0 && prevBgTasks.some((bg) => bg.completedAt === null);
  }, [workflowStatus, currentStep]);

  const currentStepBgPending = useMemo(() => {
    if (!workflowStatus || !currentStep) return false;
    const rawFg = workflowStatus.foregroundSteps;
    const rawBg: BackgroundStepStatus[] | undefined = workflowStatus.backgroundSteps;
    const fgSteps = rawFg ? rawFg : [];
    const bgSteps: BackgroundStepStatus[] = rawBg ? rawBg : [];
    const fgKeySet = new Set(fgSteps.map((s) => s.key));
    const bgKeySet = new Set(bgSteps.map((bg) => bg.stepKey));
    const bgByTrigger = bgSteps.reduce<Record<string, BackgroundStepStatus[]>>((acc, bg) => {
      const raw = bg.triggerAfterStep;
      const isFgTrigger = raw !== null && fgKeySet.has(raw);
      const isBgChain = raw !== null && bgKeySet.has(raw);
      const firstFgKey = fgSteps[0]?.key;
      const fallbackTrigger = firstFgKey ? firstFgKey : "";
      const trigger = isFgTrigger || isBgChain ? raw : fallbackTrigger;
      return { ...acc, [trigger]: [...(acc[trigger] ? acc[trigger] : []), bg] };
    }, {});
    const resolveChain = (trigger: string): BackgroundStepStatus[] => {
      const direct = bgByTrigger[trigger] ? bgByTrigger[trigger] : [];
      return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
        const rest = bgKeySet.has(bg.stepKey) ? resolveChain(bg.stepKey) : [];
        return [...chain, bg, ...rest];
      }, []);
    };
    const currentBgTasks = resolveChain(currentStep).filter(
      (bg) => bg.rejoinAtStep === currentStep,
    );
    return currentBgTasks.length > 0 && currentBgTasks.some((bg) => bg.completedAt === null);
  }, [workflowStatus, currentStep]);

  const fgActionAssignedToOther = useMemo(() => {
    const currentStepActionLabel = currentStepPhaseInfo.isMultiPhase
      ? currentStepPhaseInfo.phase1ActionLabel
      : currentStepPhaseInfo.actionLabel;
    if (!currentStepPhaseInfo.isMultiPhase) return false;
    if (userRole === "admin" && !isPreviewActive) return false;
    const checkName = effectiveName || userName;
    if (!workflowStatus || !currentStep || !checkName) return false;
    if (!currentStepActionLabel) return false;
    const rawFgaAssignments = workflowStatus.stepAssignments;
    const assignments = rawFgaAssignments || {};
    const fgStepAssigned = assignments[currentStep];
    if (!fgStepAssigned || fgStepAssigned.length === 0) return false;
    return !fgStepAssigned.some((u) => u.name === checkName);
  }, [
    workflowStatus,
    currentStep,
    currentStepPhaseInfo,
    userName,
    effectiveName,
    userRole,
    isPreviewActive,
  ]);

  const isReceptionStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "reception" ||
      bg.stepKey === "custom_reception" ||
      bg.label?.toLowerCase() === "reception",
    [],
  );

  const receptionIsPending = useMemo(() => {
    return userPendingBgSteps.some(isReceptionStep);
  }, [userPendingBgSteps, isReceptionStep]);

  const isRequisitionStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "requisition" || bg.label?.toLowerCase() === "requisition",
    [],
  );

  const isReqAuthStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "custom_req_auth" || bg.label?.toLowerCase().includes("req auth"),
    [],
  );

  const isOrderPlacementStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "custom_order_placement" ||
      bg.label?.toLowerCase().includes("order placement"),
    [],
  );

  const isStockAllocStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "stock_allocation" || bg.label?.toLowerCase().includes("stock alloc"),
    [],
  );

  const isReadyStep = useCallback(
    (bg: BackgroundStepStatus) => bg.stepKey === "ready" || bg.label?.toLowerCase() === "ready",
    [],
  );

  const isQaReviewStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "qa_review" || bg.label?.toLowerCase() === "qa review",
    [],
  );

  const isQcRepairsStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "qc_repairs" || bg.label?.toLowerCase().includes("repair"),
    [],
  );

  const isQaChainStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "qa_review" || bg.stepKey === "qc_repairs" || bg.stepKey === "qa_final_check",
    [],
  );

  const isQaFinalCheckStep = useCallback(
    (bg: BackgroundStepStatus) => bg.stepKey === "qa_final_check",
    [],
  );

  const isInspectionBookingStep = useCallback(
    (bg: BackgroundStepStatus) => bg.stepKey === "book_3rd_party_inspections",
    [],
  );

  const isDataBookStep = useCallback(
    (bg: BackgroundStepStatus) => bg.stepKey === "compile_data_book",
    [],
  );

  const isJobFileReviewStep = useCallback(
    (bg: BackgroundStepStatus) => bg.stepKey === "job_file_review",
    [],
  );

  const isDocUploadStep = useCallback(
    (bg: BackgroundStepStatus) => bg.stepKey === "upload_source_documents",
    [],
  );

  const requisitionIsPending = useMemo(() => {
    if (userPendingBgSteps.some(isRequisitionStep)) return true;
    const checkName = effectiveName || userName;
    if (!workflowStatus || !checkName) return false;
    const reqStep = backgroundSteps.find(
      (bg) =>
        (bg.stepKey === "requisition" || bg.label?.toLowerCase() === "requisition") &&
        bg.completedAt === null,
    );
    if (!reqStep) return false;
    const assigned = workflowStatus.stepAssignments?.[reqStep.stepKey];
    return !!assigned && assigned.some((u) => u.name === checkName);
  }, [
    userPendingBgSteps,
    isRequisitionStep,
    workflowStatus,
    backgroundSteps,
    userName,
    effectiveName,
  ]);

  const adminBlockedFromStep = useCallback(
    (stepKey: string | null | undefined) => {
      if (!isAdminView || !stepKey || !workflowStatus) return false;
      const assigned = workflowStatus.stepAssignments?.[stepKey];
      if (!assigned || assigned.length === 0) return true;
      return !assigned.some((u) => u.name === userName);
    },
    [isAdminView, workflowStatus, userName],
  );

  return {
    canApprove,
    isQualityUser,
    canAcceptDraft,
    userPendingBgSteps,
    activeBgStepKeys,
    currentStepPhaseInfo,
    prevStepBgPending,
    currentStepBgPending,
    fgActionAssignedToOther,
    receptionIsPending,
    requisitionIsPending,
    adminBlockedFromStep,
    isReceptionStep,
    isRequisitionStep,
    isReqAuthStep,
    isOrderPlacementStep,
    isStockAllocStep,
    isReadyStep,
    isQaReviewStep,
    isQcRepairsStep,
    isQaChainStep,
    isQaFinalCheckStep,
    isInspectionBookingStep,
    isDataBookStep,
    isJobFileReviewStep,
    isDocUploadStep,
  };
}
