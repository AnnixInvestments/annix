"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  BackgroundStepStatus,
  JobCard,
  JobCardApproval,
  Requisition,
  StaffMember,
  StockAllocation,
  StockItem,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA, nowMillis } from "@/app/lib/datetime";
import { useInvalidateJobCards } from "@/app/lib/query/hooks";
import { ApprovalModal } from "@/app/stock-control/components/ApprovalModal";
import { JobCardNextAction } from "@/app/stock-control/components/NextActionBanner";
import { WorkflowStatus } from "@/app/stock-control/components/WorkflowStatus";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";
import { CoatingAnalysisTab } from "./components/CoatingAnalysisTab";
import { DetailsTab } from "./components/DetailsTab";
import DispatchTab from "./components/DispatchTab";
import { DocumentUploadGate } from "./components/DocumentUploadGate";
import { InspectionBookingModal } from "./components/InspectionBookingModal";
import {
  JobCardTabs,
  type TabDefinition,
  TabPanel,
  useJobCardTabs,
} from "./components/JobCardTabs";
import { JobFileTab } from "./components/JobFileTab";
import { LineItemsTab } from "./components/LineItemsTab";
import { QualityTab } from "./components/QualityTab";
import { ReconciliationTab } from "./components/ReconciliationTab";
import { RequisitionTab } from "./components/RequisitionTab";
import { RubberAllocationGuard } from "./components/RubberAllocation";
import { StockIssuesTab } from "./components/StockIssuesTab";
import { useJobCardCoating } from "./hooks/useJobCardCoating";
import { useJobCardDocuments } from "./hooks/useJobCardDocuments";
import { useJobCardJobFiles } from "./hooks/useJobCardJobFiles";
import { isValidLineItem, STATUS_TRANSITIONS, statusBadgeColor } from "./lib/helpers";

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authContext = useStockControlAuth();
  const user = authContext.user;
  const profile = authContext.profile;
  const { confirm, ConfirmDialog } = useConfirm();
  const invalidateJobCardsList = useInvalidateJobCards();
  const jobId = Number(params.id);

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusData | null>(null);
  const [approvals, setApprovals] = useState<JobCardApproval[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentApprovalStep, setCurrentApprovalStep] = useState("");
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    stockItemId: 0,
    quantityUsed: 1,
    notes: "",
    staffMemberId: 0,
  });
  const [isAllocating, setIsAllocating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [approvingAllocationId, setApprovingAllocationId] = useState<number | null>(null);
  const [rejectingAllocationId, setRejectingAllocationId] = useState<number | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [backgroundSteps, setBackgroundSteps] = useState<BackgroundStepStatus[]>([]);
  const [completingStepKey, setCompletingStepKey] = useState<string | null>(null);
  const [deliveryJobCards, setDeliveryJobCards] = useState<JobCard[]>([]);
  const [adjacentIds, setAdjacentIds] = useState<{
    previousId: number | null;
    nextId: number | null;
  }>({ previousId: null, nextId: null });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobData, allocationsData] = await Promise.all([
        stockControlApiClient.jobCardById(jobId),
        stockControlApiClient.jobCardAllocations(jobId),
      ]);
      setJobCard(jobData);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setError(null);

      stockControlApiClient
        .requisitions()
        .then((reqs) => {
          const match = reqs.find((r) => r.jobCardId === jobId && r.status !== "cancelled");
          setRequisition(match || null);
        })
        .catch(() => setRequisition(null));

      stockControlApiClient
        .deliveryJobCards(jobId)
        .then((data) => setDeliveryJobCards(data))
        .catch(() => setDeliveryJobCards([]));

      stockControlApiClient
        .workflowStatus(jobId)
        .then((data) => setWorkflowStatus(data))
        .catch(() => setWorkflowStatus(null));

      stockControlApiClient
        .approvalHistory(jobId)
        .then((data) => setApprovals(data))
        .catch(() => setApprovals([]));

      stockControlApiClient
        .backgroundStepsForJobCard(jobId)
        .then((data) => setBackgroundSteps(data))
        .catch(() => setBackgroundSteps([]));

      stockControlApiClient
        .jobCardAdjacentIds(jobId)
        .then((data) => setAdjacentIds(data))
        .catch(() => setAdjacentIds({ previousId: null, nextId: null }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load job card"));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const refreshWorkflowState = useCallback(() => {
    if (document.hidden) return;
    Promise.all([
      stockControlApiClient.jobCardById(jobId).then((data) => setJobCard(data)),
      stockControlApiClient.workflowStatus(jobId).then((data) => setWorkflowStatus(data)),
      stockControlApiClient.approvalHistory(jobId).then((data) => setApprovals(data)),
      stockControlApiClient
        .backgroundStepsForJobCard(jobId)
        .then((data) => setBackgroundSteps(data)),
    ]).catch((err) => {
      console.error("Failed to refresh workflow state:", err);
    });
  }, [jobId]);

  const documents = useJobCardDocuments(jobId, fetchData, confirm);
  const coating = useJobCardCoating(jobId);
  const jobFilesHook = useJobCardJobFiles(jobId, confirm);

  useEffect(() => {
    fetchData();
    documents.loadDocuments();
    coating.loadCoatingAnalysis();
    jobFilesHook.loadJobFiles();
  }, [fetchData, documents.loadDocuments, coating.loadCoatingAnalysis, jobFilesHook.loadJobFiles]);

  useEffect(() => {
    const interval = setInterval(refreshWorkflowState, 15000);
    return () => clearInterval(interval);
  }, [refreshWorkflowState]);

  const fetchStockItems = async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stock items"));
    }
  };

  const openAllocateModal = async () => {
    await fetchStockItems();
    try {
      const staff = await stockControlApiClient.staffMembers({ active: "true" });
      setActiveStaff(Array.isArray(staff) ? staff : []);
    } catch {
      setActiveStaff([]);
    }
    setAllocateForm({ stockItemId: 0, quantityUsed: 1, notes: "", staffMemberId: 0 });
    setCapturedFile(null);
    setShowAllocateModal(true);
  };

  const handleAllocate = async () => {
    if (!allocateForm.stockItemId) return;
    try {
      setIsAllocating(true);
      const allocation = await stockControlApiClient.allocateStock(jobId, {
        stockItemId: allocateForm.stockItemId,
        quantityUsed: allocateForm.quantityUsed,
        notes: allocateForm.notes || undefined,
        staffMemberId: allocateForm.staffMemberId || undefined,
      });
      if (capturedFile) {
        await stockControlApiClient.uploadAllocationPhoto(jobId, allocation.id, capturedFile);
      }
      setShowAllocateModal(false);
      setCapturedFile(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to allocate stock"));
    } finally {
      setIsAllocating(false);
    }
  };

  const handleApproveAllocation = async (allocationId: number) => {
    try {
      setApprovingAllocationId(allocationId);
      await stockControlApiClient.approveOverAllocation(jobId, allocationId);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to approve allocation"));
    } finally {
      setApprovingAllocationId(null);
    }
  };

  const handleRejectAllocation = async (allocationId: number, reason: string) => {
    if (!reason.trim()) return;
    try {
      setRejectingAllocationId(allocationId);
      await stockControlApiClient.rejectOverAllocation(jobId, allocationId, reason);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reject allocation"));
    } finally {
      setRejectingAllocationId(null);
    }
  };

  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handlePrintQr = async () => {
    try {
      setIsDownloadingQr(true);
      setDownloadError(null);
      await stockControlApiClient.downloadJobCardQrPdf(jobId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download job card PDF");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "active") {
      const activateWithStatus = async () => {
        try {
          setIsUpdatingStatus(true);
          await stockControlApiClient.updateJobCard(jobId, { status: "active" });
          invalidateJobCardsList();
          fetchData();
        } catch (err) {
          setError(err instanceof Error ? err : new Error("Failed to update status"));
        } finally {
          setIsUpdatingStatus(false);
        }
      };
      const hasUnverified = await coating.checkUnverifiedProducts(activateWithStatus);
      if (hasUnverified) return;
      await activateWithStatus();
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await stockControlApiClient.updateJobCard(jobId, { status: newStatus });
      invalidateJobCardsList();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const activateJobCard = async () => {
    try {
      setIsUpdatingStatus(true);
      await stockControlApiClient.updateJobCard(jobId, { status: "active" });
      invalidateJobCardsList();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to activate job card"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDraftAccepted = async () => {
    const hasUnverified = await coating.checkUnverifiedProducts(activateJobCard);
    if (hasUnverified) {
      handleTabChange("coating");
      return;
    }

    await activateJobCard();
  };

  const handleApprove = async (signatureDataUrl?: string, comments?: string) => {
    await stockControlApiClient.approveWorkflowStep(jobId, {
      signatureDataUrl,
      comments,
    });
    invalidateJobCardsList();
    fetchData();
  };

  const handleReject = async (reason: string) => {
    await stockControlApiClient.rejectWorkflowStep(jobId, reason);
    invalidateJobCardsList();
    fetchData();
  };

  const [bgStepError, setBgStepError] = useState<string | null>(null);
  const handleCompleteBackgroundStep = async (stepKey: string, outcomeKey?: string) => {
    try {
      setCompletingStepKey(stepKey);
      setBgStepError(null);
      await stockControlApiClient.completeBackgroundStep(jobId, stepKey, undefined, outcomeKey);
      fetchData();
    } catch (err) {
      setBgStepError(err instanceof Error ? err.message : "Failed to complete background step");
    } finally {
      setCompletingStepKey(null);
    }
  };

  const [isCompletingFgAction, setIsCompletingFgAction] = useState(false);
  const handleCompleteFgAction = async () => {
    if (!currentStep) return;
    try {
      setIsCompletingFgAction(true);
      await stockControlApiClient.completeAction(jobId, currentStep, "primary");
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to complete action";
      alert(msg);
    } finally {
      setIsCompletingFgAction(false);
    }
  };

  const handleSaveNotes = async (editedNotes: string) => {
    const originalNotes = jobCard?.notes || null;
    await stockControlApiClient.updateJobCard(jobId, { notes: editedNotes });
    if (editedNotes !== (originalNotes || "")) {
      await stockControlApiClient
        .saveJobCardCorrection(jobId, {
          fieldName: "notes",
          originalValue: originalNotes,
          correctedValue: editedNotes,
        })
        .catch(() => null);
    }
    fetchData();
  };

  const [isReExtractingNotes, setIsReExtractingNotes] = useState(false);
  const handleReExtractNotes = async () => {
    try {
      setIsReExtractingNotes(true);
      await stockControlApiClient.reExtractJobCardNotes(jobId);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to re-extract notes"));
    } finally {
      setIsReExtractingNotes(false);
    }
  };

  const openApprovalModal = (stepName: string) => {
    setCurrentApprovalStep(stepName);
    setShowApprovalModal(true);
  };

  const handlePrintSignedPdf = async () => {
    try {
      setDownloadError(null);
      await stockControlApiClient.downloadSignedJobCardPdf(jobId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download signed PDF");
    }
  };

  const currentStatus = workflowStatus?.currentStatus || null;
  const currentStep = workflowStatus?.currentStep || null;
  const userRole = user?.role || null;

  const canApprove = useMemo(() => {
    if (!currentStep || !workflowStatus) return false;
    if (workflowStatus.jobCardStatus !== "active") return false;

    return workflowStatus.canApprove;
  }, [currentStep, workflowStatus]);

  const canAcceptDraft = useMemo(() => {
    if (!workflowStatus || workflowStatus.jobCardStatus !== "draft") return false;
    if (!user?.name) return false;
    const assigned = workflowStatus.stepAssignments?.["document_upload"];
    if (!assigned || assigned.length === 0) return false;
    return assigned.some((u) => u.name === user.name);
  }, [workflowStatus, user?.name]);
  const pipingLossPct = profile?.pipingLossFactorPct || 45;

  const validLineItemCount = useMemo(
    () => (jobCard?.lineItems ? jobCard.lineItems.filter(isValidLineItem).length : 0),
    [jobCard],
  );

  const tabDefinitions: TabDefinition[] = useMemo(() => {
    const status = jobCard?.status?.toLowerCase() || "draft";
    return [
      {
        id: "details",
        label: "Details",
        badge: validLineItemCount > 0 ? validLineItemCount : null,
      },
      { id: "coating", label: "Coating Analysis" },
      { id: "rubber-analysis", label: "Rubber Analysis" },
      { id: "requisition", label: "Requisition" },
      {
        id: "stock-issues",
        label: "Stock Issues",
        badge:
          allocations.filter((a) => !a.undone).length > 0
            ? allocations.filter((a) => !a.undone).length
            : null,
      },
      { id: "quality", label: "Quality", hidden: !profile?.qcEnabled },
      {
        id: "dispatch",
        label: "Dispatch",
        hidden: status === "draft" && currentStatus !== "dispatched",
      },
      { id: "reconciliation", label: "Tracking" },
      {
        id: "job-files",
        label: "Job Files",
        badge: jobFilesHook.jobFiles.length > 0 ? jobFilesHook.jobFiles.length : null,
      },
    ];
  }, [jobCard, validLineItemCount, allocations.length, currentStatus]);

  const userPendingBgSteps = useMemo(() => {
    if (!workflowStatus || !user?.name) return [];
    if (workflowStatus.jobCardStatus === "draft") return [];
    const fgSteps = workflowStatus.foregroundSteps || [];
    const fgKeys = fgSteps.filter((s) => s.key !== "draft").map((s) => s.key);
    const fgKeySet = new Set(fgKeys);
    const currentFgIdx = fgKeys.indexOf(currentStatus || "");
    const completedKeys = new Set(
      backgroundSteps.filter((bg) => bg.completedAt !== null).map((bg) => bg.stepKey),
    );
    const assignments = workflowStatus.stepAssignments || {};
    const bgKeySet = new Set(backgroundSteps.map((bg) => bg.stepKey));

    const triggerGroups = backgroundSteps.reduce<Record<string, BackgroundStepStatus[]>>(
      (acc, bg) => {
        const trigger = bg.triggerAfterStep || "__root__";
        return { ...acc, [trigger]: [...(acc[trigger] || []), bg] };
      },
      {},
    );

    const resolveOriginFgIdx = (trigger: string, visited: Set<string> = new Set()): number => {
      if (trigger === "__root__") return 0;
      if (fgKeySet.has(trigger)) return fgKeys.indexOf(trigger);
      if (visited.has(trigger)) return 0;
      visited.add(trigger);
      const parentBg = backgroundSteps.find((bg) => bg.stepKey === trigger);
      if (parentBg) return resolveOriginFgIdx(parentBg.triggerAfterStep || "__root__", visited);
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

      const trigger = bg.triggerAfterStep || "__root__";
      const originFgIdx = resolveOriginFgIdx(trigger);
      const isColored = isInColoredBranch(bg.stepKey);
      if (isColored ? originFgIdx > currentFgIdx : originFgIdx >= currentFgIdx) return false;

      if (hasIncompleteColored && !isInColoredBranch(bg.stepKey)) {
        const originKey = fgKeys[resolveOriginFgIdx(trigger)];
        const coloredOrigin =
          coloredSteps.length > 0
            ? fgKeys[resolveOriginFgIdx(coloredSteps[0].triggerAfterStep || "__root__")]
            : null;
        if (originKey === coloredOrigin) return false;
      }

      if (bgKeySet.has(trigger) && !completedKeys.has(trigger)) return false;

      const allSiblings = triggerGroups[trigger] || [];
      const sameBranchSiblings = allSiblings.filter(
        (s) => (s.branchColor || null) === (bg.branchColor || null),
      );
      const myIdx = sameBranchSiblings.findIndex((s) => s.stepKey === bg.stepKey);
      if (myIdx > 0) {
        const allPriorComplete = sameBranchSiblings
          .slice(0, myIdx)
          .every((s) => completedKeys.has(s.stepKey));
        if (!allPriorComplete) return false;
      }

      const assigned = assignments[bg.stepKey];
      if (!assigned || assigned.length === 0 || !assigned.some((u) => u.name === user.name)) {
        return false;
      }

      return true;
    });

    if (allActionable.length <= 1) return allActionable;

    const firstOriginIdx = resolveOriginFgIdx(allActionable[0].triggerAfterStep || "__root__");

    return allActionable.filter((bg) => {
      const originIdx = resolveOriginFgIdx(bg.triggerAfterStep || "__root__");
      return originIdx === firstOriginIdx;
    });
  }, [workflowStatus, backgroundSteps, currentStatus, user?.name]);

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

    const completions = workflowStatus.actionCompletions || [];
    const phase1ActionDone = completions.some(
      (ac) => ac.stepKey === currentStep && ac.actionType === "primary",
    );

    const fgSteps = workflowStatus.foregroundSteps || [];
    const stepConfig = fgSteps.find((s) => s.key === currentStep);
    const actionLabel = stepConfig?.actionLabel || null;

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

    const bgSteps: BackgroundStepStatus[] = workflowStatus.backgroundSteps || [];
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

  const currentStepActionCompleted = currentStepPhaseInfo.phase1ActionDone;

  const currentStepActionLabel = currentStepPhaseInfo.isMultiPhase
    ? currentStepPhaseInfo.phase1ActionLabel
    : currentStepPhaseInfo.actionLabel;

  const specsNeedReview = useMemo(() => {
    if (!currentStep || currentStep !== "manager_approval") return false;
    const ca = coating.coatingAnalysis;
    const coatingPending = ca && ca.coats.length > 0 && ca.status !== "accepted";
    const rubberPending = ca?.hasInternalLining && ca.status !== "accepted";
    return coatingPending || rubberPending || false;
  }, [currentStep, coating.coatingAnalysis]);

  const prevStepBgPending = useMemo(() => {
    if (!workflowStatus || !currentStep) return false;
    const fgSteps = workflowStatus.foregroundSteps || [];
    const currentIdx = fgSteps.findIndex((s) => s.key === currentStep);
    if (currentIdx <= 0) return false;
    const prevStepKey = fgSteps[currentIdx - 1].key;
    const bgSteps: BackgroundStepStatus[] = workflowStatus.backgroundSteps || [];
    const fgKeySet = new Set(fgSteps.map((s) => s.key));
    const bgKeySet = new Set(bgSteps.map((bg) => bg.stepKey));
    const bgByTrigger = bgSteps.reduce<Record<string, BackgroundStepStatus[]>>((acc, bg) => {
      const raw = bg.triggerAfterStep;
      const isFgTrigger = raw !== null && fgKeySet.has(raw);
      const isBgChain = raw !== null && bgKeySet.has(raw);
      const trigger = isFgTrigger || isBgChain ? raw : fgSteps[0]?.key || "";
      return { ...acc, [trigger]: [...(acc[trigger] || []), bg] };
    }, {});
    const resolveChain = (trigger: string): BackgroundStepStatus[] => {
      const direct = bgByTrigger[trigger] || [];
      return direct.reduce<BackgroundStepStatus[]>((chain, bg) => {
        const rest = bgKeySet.has(bg.stepKey) ? resolveChain(bg.stepKey) : [];
        return [...chain, bg, ...rest];
      }, []);
    };
    const prevBgTasks = resolveChain(prevStepKey).filter((bg) => bg.rejoinAtStep === null);
    return prevBgTasks.length > 0 && prevBgTasks.some((bg) => bg.completedAt === null);
  }, [workflowStatus, currentStep]);

  const currentStepBlueBgPending =
    currentStepPhaseInfo.isMultiPhase && !currentStepPhaseInfo.phase1Complete;

  const hasBlueLineTasks = currentStepPhaseInfo.isMultiPhase;

  const fgActionAssignedToOther = useMemo(() => {
    if (!workflowStatus || !currentStep || !user?.name) return false;
    if (!currentStepActionLabel) return false;
    const assignments = workflowStatus.stepAssignments || {};
    const bgSteps: BackgroundStepStatus[] = workflowStatus.backgroundSteps || [];
    const currentStepBgTasks = bgSteps.filter(
      (bg) => bg.triggerAfterStep === currentStep && bg.completedAt === null,
    );
    if (currentStepBgTasks.length === 0) return false;
    return currentStepBgTasks.some((bg) => {
      const assigned = assignments[bg.stepKey];
      if (!assigned || assigned.length === 0) return true;
      return !assigned.some((u) => u.name === user.name);
    });
  }, [workflowStatus, currentStep, currentStepActionLabel, user?.name]);

  const isReceptionStep = useCallback(
    (bg: BackgroundStepStatus) =>
      bg.stepKey === "reception" || bg.label?.toLowerCase() === "reception",
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

  const [jobFileGateSatisfied, setJobFileGateSatisfied] = useState(false);
  const [docUploadGateSatisfied, setDocUploadGateSatisfied] = useState(false);

  const docUploadStepPending = useMemo(
    () =>
      backgroundSteps.some(
        (bg) => bg.stepKey === "upload_source_documents" && bg.completedAt === null,
      ),
    [backgroundSteps],
  );

  const docUploadStepActive = docUploadStepPending;

  useEffect(() => {
    const pendingFileReview = backgroundSteps.some(
      (bg) => bg.stepKey === "job_file_review" && bg.completedAt === null,
    );
    if (!pendingFileReview) return;
    stockControlApiClient
      .reconciliationGateStatus(jobId)
      .then((gate) => setJobFileGateSatisfied(gate.satisfied))
      .catch(() => setJobFileGateSatisfied(false));
  }, [backgroundSteps, jobId]);

  useEffect(() => {
    if (!docUploadStepActive) return;
    stockControlApiClient
      .reconciliationGateStatus(jobId)
      .then((gate) => setDocUploadGateSatisfied(gate.satisfied))
      .catch(() => setDocUploadGateSatisfied(false));
  }, [docUploadStepActive, jobId]);

  const hasReadyPhoto = useMemo(
    () =>
      jobFilesHook.jobFiles.some(
        (f) =>
          f.mimeType === "image/jpeg" || f.mimeType === "image/png" || f.mimeType === "image/jpg",
      ),
    [jobFilesHook.jobFiles],
  );

  const readyPhotoInputRef = useRef<HTMLInputElement>(null);
  const readyPhotoVideoRef = useRef<HTMLVideoElement>(null);
  const readyPhotoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isUploadingReadyPhoto, setIsUploadingReadyPhoto] = useState(false);
  const [showReadyPhotoModal, setShowReadyPhotoModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showSourceFileModal, setShowSourceFileModal] = useState(false);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [sourceFileLoading, setSourceFileLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (cameraStream && readyPhotoVideoRef.current) {
      readyPhotoVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraError(null);
  }, [cameraStream]);

  const closeReadyPhotoModal = useCallback(() => {
    stopCamera();
    setShowReadyPhotoModal(false);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (readyPhotoVideoRef.current) {
        readyPhotoVideoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Could not access camera. Use 'Upload from Device' instead.");
    }
  }, []);

  const handleCameraCapture = useCallback(async () => {
    const video = readyPhotoVideoRef.current;
    const canvas = readyPhotoCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return;
    const file = new File([blob], `ready-photo-${nowMillis()}.jpg`, { type: "image/jpeg" });
    try {
      setIsUploadingReadyPhoto(true);
      await stockControlApiClient.uploadReadyPhoto(jobId, file);
      await jobFilesHook.loadJobFiles();
      closeReadyPhotoModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo";
      alert(msg);
    } finally {
      setIsUploadingReadyPhoto(false);
    }
  }, [jobId, jobFilesHook.loadJobFiles, closeReadyPhotoModal]);

  const handleReadyPhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setIsUploadingReadyPhoto(true);
        await stockControlApiClient.uploadReadyPhoto(jobId, file);
        await jobFilesHook.loadJobFiles();
        closeReadyPhotoModal();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to upload photo";
        alert(msg);
      } finally {
        setIsUploadingReadyPhoto(false);
        if (readyPhotoInputRef.current) {
          readyPhotoInputRef.current.value = "";
        }
      }
    },
    [jobId, jobFilesHook.loadJobFiles, closeReadyPhotoModal],
  );

  const hasAllocations = allocations.some((a) => !a.undone);
  const hasUnissuedAllocations = allocations.some((a) => !a.undone && !a.issuedAt);
  const [isConfirmingIssuance, setIsConfirmingIssuance] = useState(false);

  const handleConfirmIssuance = async () => {
    const unissued = allocations.filter((a) => !a.undone && !a.issuedAt);
    if (unissued.length === 0) return;

    const confirmed = await confirm({
      title: "Confirm Issuance",
      message: `Issue ${unissued.length} allocated item(s)? This confirms physical handover.`,
      confirmLabel: "Issue",
      variant: "default",
    });
    if (!confirmed) return;

    try {
      setIsConfirmingIssuance(true);
      await stockControlApiClient.confirmIssuance(
        jobId,
        unissued.map((a) => a.id),
      );
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to confirm issuance"));
    } finally {
      setIsConfirmingIssuance(false);
    }
  };

  const requisitionIsPending = useMemo(
    () => userPendingBgSteps.some(isRequisitionStep),
    [userPendingBgSteps, isRequisitionStep],
  );

  const [batchesSavedLocal, setBatchesSaved] = useState(false);
  const batchesSaved =
    batchesSavedLocal ||
    backgroundSteps.some((bg) => bg.stepKey === "qc_batch_certs" && bg.completedAt !== null);
  const [finalPhotosSaved, setFinalPhotosSaved] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const handlePlaceRequisition = async () => {
    try {
      setIsProcessingDecision(true);
      setDecisionError(null);
      const result = await stockControlApiClient.placeRequisitionDecision(jobId);
      fetchData();
      if (result.requisitionId) {
        router.push(
          `/stock-control/portal/requisitions/${result.requisitionId}?fromJobCard=${jobId}`,
        );
      } else {
        handleTabChange("requisition");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place requisition";
      setDecisionError(message);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const handleUseCurrentStock = async () => {
    try {
      setIsProcessingDecision(true);
      setDecisionError(null);
      await stockControlApiClient.useCurrentStockDecision(jobId);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to use current stock";
      setDecisionError(message);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const { activeTab, visitedTabs, handleTabChange, visibleTabs } = useJobCardTabs(tabDefinitions);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job card...</p>
        </div>
      </div>
    );
  }

  if (error || !jobCard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Job card not found"}</p>
          <Link
            href="/stock-control/portal/job-cards"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Job Cards
          </Link>
        </div>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[jobCard.status.toLowerCase()] || [];

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <input
        ref={readyPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReadyPhotoSelected}
      />
      <canvas ref={readyPhotoCanvasRef} className="hidden" />
      {showInspectionModal && (
        <InspectionBookingModal
          jobCardId={jobId}
          jobNumber={jobCard.jobNumber}
          onClose={() => setShowInspectionModal(false)}
          onBooked={() => {
            setShowInspectionModal(false);
            fetchData();
          }}
          onSkipped={() => {
            setShowInspectionModal(false);
            fetchData();
          }}
        />
      )}
      {showReadyPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Photo of Completed Item(s)</h3>
              <button onClick={closeReadyPhotoModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {cameraStream ? (
                <div className="space-y-3">
                  <video
                    ref={readyPhotoVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-black"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleCameraCapture}
                      disabled={isUploadingReadyPhoto}
                      className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isUploadingReadyPhoto ? "Uploading..." : "Capture Photo"}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-3 text-sm font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cameraError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                      {cameraError}
                    </p>
                  )}
                  <button
                    onClick={startCamera}
                    className="w-full inline-flex items-center justify-center px-4 py-4 text-sm font-medium rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <svg
                      className="w-6 h-6 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Take Photo with Camera
                  </button>
                  <button
                    onClick={() => readyPhotoInputRef.current?.click()}
                    disabled={isUploadingReadyPhoto}
                    className="w-full inline-flex items-center justify-center px-4 py-4 text-sm font-medium rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-6 h-6 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {isUploadingReadyPhoto ? "Uploading..." : "Upload from Device"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-4 min-w-0">
          <Link
            href="/stock-control/portal/job-cards"
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center space-x-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
                {jobCard.jobNumber}
                {jobCard.jcNumber ? ` / ${jobCard.jcNumber}` : null}
                {(() => {
                  const jtNumbers = [
                    ...new Set(
                      (jobCard.lineItems || [])
                        .map((li) => li.jtNo)
                        .filter((jt): jt is string => jt !== null && jt !== ""),
                    ),
                  ];
                  if (jtNumbers.length === 0) return null;
                  return ` / ${jtNumbers.join(", ")}`;
                })()}
              </h1>
              {jobCard.versionNumber && jobCard.versionNumber > 1 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  v{jobCard.versionNumber}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
              >
                {jobCard.status}
              </span>
              {jobCard.parentJobCardId ? (
                <Link
                  href={`/stock-control/portal/job-cards/${jobCard.parentJobCardId}`}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200"
                >
                  Parent JC
                </Link>
              ) : null}
              {jobCard.cpoId ? (
                <Link
                  href={`/stock-control/portal/purchase-orders/${jobCard.cpoId}`}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  CPO Linked
                </Link>
              ) : null}
              {jobCard.workflowCeiling ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                  Up to Requisition
                </span>
              ) : null}
              {jobCard.sourceFilePath ? (
                <button
                  onClick={async () => {
                    setSourceFileLoading(true);
                    try {
                      const result = await stockControlApiClient.sourceFileUrl(jobCard.id);
                      setSourceFileUrl(result.url);
                      setShowSourceFileModal(true);
                    } catch {
                      setSourceFileUrl(null);
                    } finally {
                      setSourceFileLoading(false);
                    }
                  }}
                  disabled={sourceFileLoading}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  {sourceFileLoading ? "Loading..." : "View Original"}
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-500">{jobCard.jobName}</p>
          </div>
        </div>
        {workflowStatus && (
          <div
            id="workflow-actions"
            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <h3 className="text-xs font-semibold text-gray-500 mb-1.5">Workflow Actions</h3>
            <div className="flex flex-wrap items-center gap-2">
              {canApprove && currentStep && specsNeedReview && (
                <>
                  {coating.coatingAnalysis &&
                    coating.coatingAnalysis.coats.length > 0 &&
                    coating.coatingAnalysis.status !== "accepted" && (
                      <button
                        onClick={() => handleTabChange("coating")}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs transition-colors"
                      >
                        Check Coating Spec
                      </button>
                    )}
                  {coating.coatingAnalysis?.hasInternalLining &&
                    coating.coatingAnalysis.status !== "accepted" && (
                      <button
                        onClick={() => handleTabChange("rubber-analysis")}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs transition-colors"
                      >
                        Check Rubber Spec
                      </button>
                    )}
                </>
              )}
              {canApprove &&
                currentStep &&
                !specsNeedReview &&
                !prevStepBgPending &&
                !fgActionAssignedToOther &&
                !currentStepActionCompleted &&
                currentStepActionLabel && (
                  <button
                    onClick={handleCompleteFgAction}
                    disabled={isCompletingFgAction}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCompletingFgAction ? "..." : currentStepActionLabel}
                  </button>
                )}
              {canApprove &&
                currentStep &&
                currentStepActionCompleted &&
                hasBlueLineTasks &&
                !currentStepBlueBgPending &&
                !prevStepBgPending && (
                  <button
                    onClick={() => openApprovalModal(currentStep)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-xs transition-colors"
                  >
                    {currentStepPhaseInfo.phase2ActionLabel || "Release"}
                  </button>
                )}
              {canAcceptDraft && (
                <button
                  onClick={handleDraftAccepted}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingStatus ? "..." : "Draft Accepted"}
                </button>
              )}
              {userPendingBgSteps.length > 0 &&
                (!canApprove || prevStepBgPending || currentStepBlueBgPending) &&
                userPendingBgSteps.map((bg) =>
                  isReceptionStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={async () => {
                        await handlePrintQr();
                        handleCompleteBackgroundStep(bg.stepKey);
                      }}
                      disabled={isDownloadingQr || completingStepKey === bg.stepKey}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                      {isDownloadingQr ? "Generating..." : "Print JC"}
                    </button>
                  ) : isRequisitionStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => handleTabChange("coating")}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      Stock Assessment
                    </button>
                  ) : (isReqAuthStep(bg) || isOrderPlacementStep(bg)) && requisition ? (
                    <button
                      key={bg.stepKey}
                      onClick={() =>
                        router.push(
                          `/stock-control/portal/requisitions/${requisition.id}?fromJobCard=${jobId}&completeStep=${bg.stepKey}`,
                        )
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      View Requisition
                    </button>
                  ) : isStockAllocStep(bg) ? (
                    <div key={bg.stepKey} className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleTabChange("stock-issues")}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        Allocate Stock
                      </button>
                      {hasUnissuedAllocations && (
                        <button
                          onClick={handleConfirmIssuance}
                          disabled={isConfirmingIssuance}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isConfirmingIssuance ? "Issuing..." : "Issue Allocated"}
                        </button>
                      )}
                      {hasAllocations && (
                        <button
                          onClick={() => handleCompleteBackgroundStep(bg.stepKey)}
                          disabled={completingStepKey === bg.stepKey}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {completingStepKey === bg.stepKey
                            ? "..."
                            : bg.actionLabel || `Complete ${bg.label}`}
                        </button>
                      )}
                    </div>
                  ) : isReadyStep(bg) ? (
                    <div key={bg.stepKey} className="flex flex-wrap gap-2">
                      {!hasReadyPhoto ? (
                        <button
                          onClick={() => setShowReadyPhotoModal(true)}
                          disabled={isUploadingReadyPhoto}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {isUploadingReadyPhoto ? "Uploading..." : "Upload / Take Photo"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCompleteBackgroundStep(bg.stepKey)}
                          disabled={completingStepKey === bg.stepKey}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {completingStepKey === bg.stepKey ? "..." : "Complete Ready"}
                        </button>
                      )}
                    </div>
                  ) : isQaReviewStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => {
                        handleTabChange("quality");
                        const scrollToReview = (attempts: number) => {
                          const el = document.getElementById("qa-review-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          } else if (attempts > 0) {
                            setTimeout(() => scrollToReview(attempts - 1), 150);
                          }
                        };
                        setTimeout(() => scrollToReview(20), 100);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      QA Review
                    </button>
                  ) : isQcRepairsStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => {
                        handleTabChange("quality");
                        const scrollToReview = (attempts: number) => {
                          const el = document.getElementById("qa-review-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          } else if (attempts > 0) {
                            setTimeout(() => scrollToReview(attempts - 1), 150);
                          }
                        };
                        setTimeout(() => scrollToReview(20), 100);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      View QA Repairs
                    </button>
                  ) : bg.branchColor &&
                    !batchesSaved &&
                    !isQaChainStep(bg) &&
                    !isInspectionBookingStep(bg) &&
                    !isDataBookStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => {
                        handleTabChange("quality");
                        const scrollToBatch = (attempts: number) => {
                          const el = document.getElementById("defelsko-batch-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          } else if (attempts > 0) {
                            setTimeout(() => scrollToBatch(attempts - 1), 150);
                          }
                        };
                        setTimeout(() => scrollToBatch(20), 100);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Input Batches
                    </button>
                  ) : bg.branchColor &&
                    batchesSaved &&
                    !isQaChainStep(bg) &&
                    !isInspectionBookingStep(bg) &&
                    !isDataBookStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => handleCompleteBackgroundStep(bg.stepKey)}
                      disabled={completingStepKey === bg.stepKey}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {completingStepKey === bg.stepKey ? "..." : "Batches Completed"}
                    </button>
                  ) : isQaFinalCheckStep(bg) && !finalPhotosSaved ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => {
                        handleTabChange("quality");
                        const scrollToPhotos = (attempts: number) => {
                          const el = document.getElementById("qa-final-photos-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          } else if (attempts > 0) {
                            setTimeout(() => scrollToPhotos(attempts - 1), 150);
                          }
                        };
                        setTimeout(() => scrollToPhotos(20), 100);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      Upload Final Photos
                    </button>
                  ) : isInspectionBookingStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => setShowInspectionModal(true)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      Book Inspection
                    </button>
                  ) : isDataBookStep(bg) ? (
                    <button
                      key={bg.stepKey}
                      onClick={() => {
                        handleTabChange("quality");
                        const scrollToDataBook = (attempts: number) => {
                          const el = document.getElementById("data-book-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          } else if (attempts > 0) {
                            setTimeout(() => scrollToDataBook(attempts - 1), 150);
                          }
                        };
                        setTimeout(() => scrollToDataBook(20), 100);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      Review Data Book
                    </button>
                  ) : isJobFileReviewStep(bg) ? (
                    <div key={bg.stepKey} className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleTabChange("job-files")}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Upload Docs
                      </button>
                      {jobFileGateSatisfied && (
                        <button
                          onClick={() => handleCompleteBackgroundStep(bg.stepKey)}
                          disabled={completingStepKey === bg.stepKey}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {completingStepKey === bg.stepKey ? "..." : "Complete File Review"}
                        </button>
                      )}
                    </div>
                  ) : isDocUploadStep(bg) ? (
                    <div key={bg.stepKey} className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleTabChange("job-files")}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Upload Docs
                      </button>
                      {docUploadGateSatisfied && (
                        <button
                          onClick={() => handleCompleteBackgroundStep(bg.stepKey)}
                          disabled={completingStepKey === bg.stepKey}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {completingStepKey === bg.stepKey
                            ? "..."
                            : bg.actionLabel || "Docs Uploaded"}
                        </button>
                      )}
                    </div>
                  ) : bg.stepOutcomes && bg.stepOutcomes.length > 1 ? (
                    bg.stepOutcomes.map((outcome) => {
                      const styleMap: Record<string, string> = {
                        green: "bg-green-600 hover:bg-green-700",
                        red: "bg-red-600 hover:bg-red-700",
                        amber: "bg-amber-600 hover:bg-amber-700",
                        blue: "bg-blue-600 hover:bg-blue-700",
                      };
                      const btnClass = styleMap[outcome.style] || "bg-amber-600 hover:bg-amber-700";
                      return (
                        <button
                          key={`${bg.stepKey}-${outcome.key}`}
                          onClick={() => handleCompleteBackgroundStep(bg.stepKey, outcome.key)}
                          disabled={completingStepKey === bg.stepKey}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${btnClass}`}
                        >
                          {completingStepKey === bg.stepKey ? "..." : outcome.label}
                        </button>
                      );
                    })
                  ) : (
                    <button
                      key={bg.stepKey}
                      onClick={() => handleCompleteBackgroundStep(bg.stepKey)}
                      disabled={completingStepKey === bg.stepKey}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {completingStepKey === bg.stepKey
                        ? "..."
                        : bg.actionLabel || `Complete ${bg.label}`}
                    </button>
                  ),
                )}
              {bgStepError && (
                <span className="text-xs text-red-600">
                  {bgStepError}
                  <button
                    onClick={() => setBgStepError(null)}
                    className="ml-1 font-medium underline"
                  >
                    Dismiss
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <div className="inline-flex rounded-md shadow-sm">
            {adjacentIds.previousId ? (
              <Link
                href={`/stock-control/portal/job-cards/${adjacentIds.previousId}`}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-l-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
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
                Previous JC
              </Link>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-200 rounded-l-md text-sm font-medium text-gray-300 bg-gray-50 cursor-not-allowed">
                <svg
                  className="w-4 h-4 mr-1.5"
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
                Previous JC
              </span>
            )}
            {adjacentIds.nextId ? (
              <Link
                href={`/stock-control/portal/job-cards/${adjacentIds.nextId}`}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-l-0 border-gray-300 rounded-r-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Next JC
                <svg
                  className="w-4 h-4 ml-1.5"
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
              </Link>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-l-0 border-gray-200 rounded-r-md text-sm font-medium text-gray-300 bg-gray-50 cursor-not-allowed">
                Next JC
                <svg
                  className="w-4 h-4 ml-1.5"
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
              </span>
            )}
          </div>
          {jobCard.status.toLowerCase() !== "draft" && !receptionIsPending && (
            <button
              onClick={handlePrintQr}
              disabled={isDownloadingQr}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              {isDownloadingQr ? "Generating..." : "Print JC"}
            </button>
          )}
          {currentStatus === "dispatched" && (
            <button
              onClick={handlePrintSignedPdf}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Signed JC
            </button>
          )}
        </div>
      </div>

      {downloadError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <p className="text-sm text-red-700">{downloadError}</p>
          <button
            onClick={() => setDownloadError(null)}
            className="text-red-500 hover:text-red-700 ml-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {workflowStatus && (
        <WorkflowStatus
          currentStatus={currentStatus!}
          approvals={approvals}
          stepAssignments={workflowStatus.stepAssignments || {}}
          foregroundSteps={workflowStatus.foregroundSteps || []}
          backgroundSteps={backgroundSteps}
          currentUserName={user?.name || null}
        />
      )}

      {!specsNeedReview &&
        !prevStepBgPending &&
        !currentStepBlueBgPending &&
        (currentStepActionCompleted || !currentStepActionLabel) && (
          <JobCardNextAction
            currentStatus={currentStatus}
            canApprove={canApprove}
            currentStep={currentStep}
            userRole={userRole}
            onApprove={currentStep ? () => openApprovalModal(currentStep) : undefined}
            jobCardId={jobId}
            hasLineItems={validLineItemCount > 0}
          />
        )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <JobCardTabs tabs={tabDefinitions} activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="px-4 sm:px-6">
          <TabPanel tabId="details" activeTab={activeTab} visited={visitedTabs.has("details")}>
            <DetailsTab
              jobCard={jobCard}
              versions={documents.versions}
              attachments={documents.attachments}
              lineItemsContent={
                <LineItemsTab
                  jobCard={jobCard}
                  attachments={documents.attachments}
                  canManageLineItems={userRole === "admin" || userRole === "accounts"}
                  onRefresh={fetchData}
                />
              }
              showVersionHistory={documents.showVersionHistory}
              onToggleVersionHistory={() =>
                documents.setShowVersionHistory(!documents.showVersionHistory)
              }
              showAmendmentModal={documents.showAmendmentModal}
              onToggleAmendmentModal={documents.setShowAmendmentModal}
              amendmentNotes={documents.amendmentNotes}
              onAmendmentNotesChange={documents.setAmendmentNotes}
              amendmentFile={documents.amendmentFile}
              onAmendmentFileChange={documents.setAmendmentFile}
              isUploadingAmendment={documents.isUploadingAmendment}
              onAmendmentUpload={documents.handleAmendmentUpload}
              isDraggingAmendment={documents.isDraggingAmendment}
              onAmendmentDrop={documents.handleAmendmentDrop}
              onAmendmentDragOver={documents.handleAmendmentDragOver}
              onAmendmentDragLeave={documents.handleAmendmentDragLeave}
              attachmentFiles={documents.attachmentFiles}
              onAttachmentFilesChange={documents.setAttachmentFiles}
              isUploadingAttachment={documents.isUploadingAttachment}
              onAttachmentUpload={documents.handleAttachmentUpload}
              isDraggingAttachment={documents.isDraggingAttachment}
              onAttachmentDrop={documents.handleAttachmentDrop}
              onAttachmentDragOver={documents.handleAttachmentDragOver}
              onAttachmentDragLeave={documents.handleAttachmentDragLeave}
              onTriggerExtraction={documents.handleTriggerExtraction}
              isExtracting={documents.isExtracting}
              isExtractingAll={documents.isExtractingAll}
              onExtractAll={documents.handleExtractAll}
              onDeleteAttachment={documents.handleDeleteAttachment}
              canEditNotes={userRole === "admin" || userRole === "accounts"}
              onSaveNotes={handleSaveNotes}
              onReExtractNotes={handleReExtractNotes}
              isReExtracting={isReExtractingNotes}
            />

            {documents.versions.length > 0 && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Version History</h3>
                <select
                  value={documents.selectedVersionId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    documents.setSelectedVersionId(val ? Number(val) : null);
                  }}
                  className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Current (v{jobCard.versionNumber})</option>
                  {documents.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} - {v.jobName}
                      {v.amendmentNotes ? ` (${v.amendmentNotes})` : ""}
                    </option>
                  ))}
                </select>

                {documents.selectedVersionId &&
                  (() => {
                    const selectedVersion = documents.versions.find(
                      (v) => v.id === documents.selectedVersionId,
                    );
                    if (!selectedVersion) return null;
                    return (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            Version {selectedVersion.versionNumber}
                          </h4>
                          {selectedVersion.filePath && (
                            <a
                              href={selectedVersion.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-teal-600 hover:text-teal-800 underline"
                            >
                              Download PDF
                            </a>
                          )}
                        </div>
                        {selectedVersion.workflowStatus && (
                          <p className="text-sm text-gray-600">
                            Workflow status: {selectedVersion.workflowStatus}
                          </p>
                        )}
                        {selectedVersion.amendmentNotes && (
                          <p className="text-sm text-gray-600">
                            Notes: {selectedVersion.amendmentNotes}
                          </p>
                        )}
                        {selectedVersion.createdBy && (
                          <p className="text-sm text-gray-500">
                            Archived by: {selectedVersion.createdBy} on{" "}
                            {formatDateZA(selectedVersion.createdAt)}
                          </p>
                        )}
                        {selectedVersion.lineItemsSnapshot &&
                          selectedVersion.lineItemsSnapshot.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                                Line Items
                              </h5>
                              <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                      Code
                                    </th>
                                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                      Description
                                    </th>
                                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                      Qty
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {selectedVersion.lineItemsSnapshot.map((li, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {String(li.itemCode || "-")}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {String(li.itemDescription || "-")}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {li.quantity !== null && li.quantity !== undefined
                                          ? String(li.quantity)
                                          : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    );
                  })()}
              </div>
            )}

            {deliveryJobCards.length > 0 && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Delivery Job Cards ({deliveryJobCards.length})
                </h3>
                <div className="space-y-2">
                  {deliveryJobCards.map((djc) => (
                    <Link
                      key={djc.id}
                      href={`/stock-control/portal/job-cards/${djc.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {djc.jobNumber} / {djc.jtDnNumber || djc.jcNumber}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">{djc.jobName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(djc.status)}`}
                        >
                          {djc.status}
                        </span>
                        <span className="text-xs text-gray-400">{djc.workflowStatus}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </TabPanel>

          <TabPanel tabId="job-files" activeTab={activeTab} visited={visitedTabs.has("job-files")}>
            {docUploadStepActive && (
              <div className="mb-4">
                <DocumentUploadGate
                  jobCardId={jobId}
                  onGateSatisfied={() => {
                    setDocUploadGateSatisfied(true);
                    refreshWorkflowState();
                  }}
                />
              </div>
            )}
            <JobFileTab
              jobFiles={jobFilesHook.jobFiles}
              stagedFiles={jobFilesHook.stagedFiles}
              isUploading={jobFilesHook.isUploading}
              isDragging={jobFilesHook.isDragging}
              viewingFile={jobFilesHook.viewingFile}
              currentUserId={user?.id || null}
              onDrop={jobFilesHook.handleDrop}
              onDragOver={jobFilesHook.handleDragOver}
              onDragLeave={jobFilesHook.handleDragLeave}
              onUpload={jobFilesHook.handleUpload}
              onDelete={jobFilesHook.handleDelete}
              onView={jobFilesHook.handleView}
              onDownload={jobFilesHook.handleDownload}
              onRemoveStaged={jobFilesHook.handleRemoveStaged}
              onCloseViewer={() => jobFilesHook.setViewingFile(null)}
            />
          </TabPanel>

          <TabPanel tabId="coating" activeTab={activeTab} visited={visitedTabs.has("coating")}>
            <CoatingAnalysisTab
              jobId={jobId}
              coatingAnalysis={coating.coatingAnalysis}
              isAnalysing={coating.isAnalysing}
              onRunAnalysis={coating.handleRunAnalysis}
              onCoatingAnalysisChange={coating.setCoatingAnalysis}
              pipingLossPct={pipingLossPct}
              showTdsModal={coating.showTdsModal}
              onShowTdsModal={coating.setShowTdsModal}
              unverifiedProducts={coating.unverifiedProducts}
              onUnverifiedProductsChange={coating.setUnverifiedProducts}
              tdsFile={coating.tdsFile}
              onTdsFileChange={coating.setTdsFile}
              isUploadingTds={coating.isUploadingTds}
              onTdsUpload={coating.handleTdsUpload}
              tdsUploadError={coating.tdsUploadError}
              isAdmin={userRole === "admin"}
              sourceFileUrl={jobCard?.sourceFilePath || null}
              lineItems={jobCard?.lineItems || []}
              showStockDecision={requisitionIsPending}
              onPlaceRequisition={handlePlaceRequisition}
              onUseCurrentStock={handleUseCurrentStock}
              isProcessingDecision={isProcessingDecision}
              decisionError={decisionError}
            />
          </TabPanel>

          <TabPanel
            tabId="rubber-analysis"
            activeTab={activeTab}
            visited={visitedTabs.has("rubber-analysis")}
          >
            <div className="space-y-6">
              <RubberAllocationGuard jobCard={jobCard} onRefresh={fetchData} />
            </div>
          </TabPanel>

          <TabPanel
            tabId="stock-issues"
            activeTab={activeTab}
            visited={visitedTabs.has("stock-issues")}
          >
            <StockIssuesTab jobId={jobId} allocations={allocations} onRefresh={fetchData} />
          </TabPanel>

          <TabPanel tabId="quality" activeTab={activeTab} visited={visitedTabs.has("quality")}>
            <div id="quality-tab-content">
              <QualityTab
                jobCardId={jobId}
                backgroundSteps={backgroundSteps}
                onBatchComplete={
                  userPendingBgSteps.some((bg) => bg.branchColor && bg.stepKey === "qc_batch_certs")
                    ? () => {
                        setBatchesSaved(true);
                        handleTabChange("details");
                        setTimeout(() => {
                          const wfa = document.getElementById("workflow-actions");
                          if (wfa) {
                            wfa.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }, 200);
                      }
                    : null
                }
                onQaReviewSubmitted={() => {
                  fetchData();
                  handleTabChange("details");
                  setTimeout(() => {
                    const wfa = document.getElementById("workflow-actions");
                    if (wfa) {
                      wfa.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }, 200);
                }}
                onFinalPhotosSaved={() => {
                  setFinalPhotosSaved(true);
                }}
              />
            </div>
          </TabPanel>

          <TabPanel
            tabId="reconciliation"
            activeTab={activeTab}
            visited={visitedTabs.has("reconciliation")}
          >
            <ReconciliationTab jobCardId={jobId} />
          </TabPanel>

          <TabPanel tabId="dispatch" activeTab={activeTab} visited={visitedTabs.has("dispatch")}>
            <DispatchTab
              jobId={jobId}
              jobNumber={jobCard.jobNumber}
              jobName={jobCard.jobName}
              onRefreshParent={fetchData}
            />
          </TabPanel>

          <TabPanel
            tabId="requisition"
            activeTab={activeTab}
            visited={visitedTabs.has("requisition")}
          >
            <RequisitionTab requisition={requisition} jobId={jobId} />
          </TabPanel>
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        jobNumber={jobCard.jobNumber}
        stepName={currentApprovalStep.replace(/_/g, " ")}
      />

      {showSourceFileModal && sourceFileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Original Job Card — {jobCard.sourceFileName || "Source File"}
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={sourceFileUrl}
                  download={jobCard.sourceFileName || "source-file"}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700"
                >
                  Download
                </a>
                <button
                  onClick={() => {
                    setShowSourceFileModal(false);
                    setSourceFileUrl(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {(jobCard.sourceFileName || "").toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={sourceFileUrl}
                  className="w-full h-[75vh] border-0 rounded"
                  title="Original Job Card"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg
                    className="w-16 h-16 mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm mb-4">Preview not available for this file type</p>
                  <a
                    href={sourceFileUrl}
                    download={jobCard.sourceFileName || "source-file"}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
