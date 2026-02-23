"use client";

import { isArray } from "es-toolkit/compat";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PdfPreviewModal } from "@/app/components/PdfPreviewModal";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  BackgroundStepStatus,
  JobCard,
  JobCardApproval,
  QcControlPlanRecord,
  Requisition,
  StockAllocation,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";
// eslint-disable-next-line no-restricted-imports -- Job card detail page has deep inline operations (QC, allocations, signatures) not yet covered by hooks; migrating requires extensive hook scaffolding. Tracked as tech debt per Phase 9 of annix/annix#191.
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useLoadBackgroundStepsForJobCard,
  useLoadControlPlansForJobCard,
  useLoadJobCardAdjacentIds,
  useLoadReconciliationGateStatus,
  useLoadSourceFileUrl,
  useLoadWorkflowStatus,
} from "@/app/lib/query/hooks";
import { ApprovalModal } from "@/app/stock-control/components/ApprovalModal";
import { JobCardNextAction } from "@/app/stock-control/components/NextActionBanner";
import { WorkflowStatus } from "@/app/stock-control/components/WorkflowStatus";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";
import { CoatingAnalysisTab } from "./components/CoatingAnalysisTab";
import { DetailsTab } from "./components/DetailsTab";
import DispatchTab from "./components/DispatchTab";
import { DocumentUploadGate } from "./components/DocumentUploadGate";
import { InspectionBookingModal } from "./components/InspectionBookingModal";
import { InspectionProposalBanner } from "./components/InspectionProposalBanner";
import {
  JobCardTabs,
  type TabDefinition,
  TabPanel,
  useJobCardTabs,
} from "./components/JobCardTabs";
import { JobFileTab } from "./components/JobFileTab";
import { LineItemsTab } from "./components/LineItemsTab";
import { QualityTab } from "./components/QualityTab";
import { ReadyPhotoModal } from "./components/ReadyPhotoModal";
import { ReconciliationTab } from "./components/ReconciliationTab";
import { RequisitionTab } from "./components/RequisitionTab";
import { RubberAllocationGuard } from "./components/RubberAllocation";
import { SourceFileModal } from "./components/SourceFileModal";
import { StockIssuesTab } from "./components/StockIssuesTab";
import { WorkflowActionsBar } from "./components/WorkflowActionsBar";
import { useJobCardActions } from "./hooks/useJobCardActions";
import { useJobCardCoating } from "./hooks/useJobCardCoating";
import { useJobCardDocuments } from "./hooks/useJobCardDocuments";
import { useJobCardJobFiles } from "./hooks/useJobCardJobFiles";
import { useWorkflowActions } from "./hooks/useWorkflowActions";
import { isValidLineItem, statusBadgeColor } from "./lib/helpers";

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authContext = useStockControlAuth();
  const user = authContext.user;
  const profile = authContext.profile;
  const { effectiveRole, isPreviewActive, effectiveName } = useViewAs();
  const { confirm, ConfirmDialog } = useConfirm();
  const jobId = Number(params.id);

  const { mutateAsync: loadWorkflowStatus } = useLoadWorkflowStatus();
  const { mutateAsync: loadBackgroundSteps } = useLoadBackgroundStepsForJobCard();
  const { mutateAsync: loadJobCardAdjacentIds } = useLoadJobCardAdjacentIds();
  const { mutateAsync: loadControlPlans } = useLoadControlPlansForJobCard();
  const { mutateAsync: loadSourceFileUrl } = useLoadSourceFileUrl();
  const { mutateAsync: loadReconciliationGateStatus } = useLoadReconciliationGateStatus();

  const authUserName = user?.name ? user.name : null;
  const authUserId = user?.id ? user.id : null;

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusData | null>(null);
  const [approvals, setApprovals] = useState<JobCardApproval[]>([]);
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundSteps, setBackgroundSteps] = useState<BackgroundStepStatus[]>([]);
  const [controlPlans, setControlPlans] = useState<QcControlPlanRecord[]>([]);
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
      setAllocations(isArray(allocationsData) ? allocationsData : []);

      stockControlApiClient
        .requisitions()
        .then((reqs) => {
          const match = reqs.find((r) => r.jobCardId === jobId && r.status !== "cancelled");
          setRequisition(match ? match : null);
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

      stockControlApiClient
        .controlPlansForJobCard(jobId)
        .then((data) => setControlPlans(data))
        .catch(() => setControlPlans([]));
    } catch (err) {
      actions.setError(err instanceof Error ? err : new Error("Failed to load job card"));
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
    ]).catch(() => null);
  }, [jobId]);

  const coating = useJobCardCoating(jobId);
  const jobFilesHook = useJobCardJobFiles(jobId, confirm);
  const documents = useJobCardDocuments(jobId, fetchData, confirm);

  const currentStatus = workflowStatus?.currentStatus ? workflowStatus.currentStatus : null;
  const currentStep = workflowStatus?.currentStep ? workflowStatus.currentStep : null;
  const userRole = effectiveRole;
  const isAdminView = userRole === "admin" && !isPreviewActive;

  const actions = useJobCardActions({
    jobId,
    currentStep,
    fetchData,
    onTabChange: (tabId: string) => handleTabChange(tabId),
    coating,
  });

  const workflow = useWorkflowActions({
    workflowStatus,
    backgroundSteps,
    currentStatus,
    currentStep,
    userName: user?.name,
    effectiveName,
    userRole,
    isPreviewActive,
    isAdminView,
  });

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

  const scrollToElementId = useCallback((elementId: string) => {
    const findScrollParent = (el: HTMLElement): HTMLElement | Window => {
      const parent = el.parentElement;
      if (!parent) return window;
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        parent.scrollHeight > parent.clientHeight
      ) {
        return parent;
      }
      return findScrollParent(parent);
    };
    const tryScroll = (attempts: number) => {
      const el = document.getElementById(elementId);
      if (el) {
        const container = findScrollParent(el);
        if (container === window) {
          const rect = el.getBoundingClientRect();
          const top = rect.top + window.scrollY - 120;
          window.scrollTo({ top, behavior: "smooth" });
        } else {
          const parent = container as HTMLElement;
          const elRect = el.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const top = elRect.top - parentRect.top + parent.scrollTop - 24;
          parent.scrollTo({ top, behavior: "smooth" });
        }
      } else if (attempts > 0) {
        setTimeout(() => tryScroll(attempts - 1), 200);
      }
    };
    setTimeout(() => tryScroll(25), 200);
  }, []);

  const pipingLossPct = profile?.pipingLossFactorPct ? profile.pipingLossFactorPct : 45;

  const validLineItemCount = useMemo(
    () => (jobCard?.lineItems ? jobCard.lineItems.filter(isValidLineItem).length : 0),
    [jobCard],
  );

  const currentStepLabel = (() => {
    if (!currentStep || !workflowStatus) return null;
    const fgSteps = workflowStatus.foregroundSteps;
    if (!fgSteps) return null;
    const match = fgSteps.find((s) => s.key === currentStep);
    return match ? match.label : null;
  })();

  const tabDefinitions: TabDefinition[] = useMemo(() => {
    const status = jobCard?.status?.toLowerCase() || "draft";
    const lineItems = jobCard?.lineItems ? jobCard.lineItems : [];
    const allLineItemText = [
      jobCard?.notes ? jobCard.notes : "",
      ...lineItems.map((li) => {
        const itemCode = li.itemCode;
        const itemDescription = li.itemDescription;
        const lineItemNotes = li.notes;
        return `${itemCode || ""} ${itemDescription || ""} ${lineItemNotes || ""}`;
      }),
    ]
      .join(" ")
      .toLowerCase();
    const isRubberJob =
      allLineItemText.includes("rubber") ||
      allLineItemText.includes("r/l") ||
      allLineItemText.includes("lining") ||
      allLineItemText.includes("liner") ||
      allLineItemText.includes("lagging");
    const hasM2Items = (jobCard?.lineItems ? jobCard.lineItems : [])
      .filter(isValidLineItem)
      .some((li) => li.m2 !== null && Number(li.m2) > 0);
    return [
      {
        id: "details",
        label: "Details",
        badge: validLineItemCount > 0 ? validLineItemCount : null,
      },
      { id: "coating", label: "Coating Analysis" },
      { id: "rubber-analysis", label: "Rubber Analysis", hidden: !isRubberJob || !hasM2Items },
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

  const qcpsNeedApproval = useMemo(() => {
    if (controlPlans.length === 0) return true;
    return controlPlans.some((plan) => plan.approvalStatus !== "approved");
  }, [controlPlans]);

  const rubberPlanPending = useMemo(() => {
    const ca = coating.coatingAnalysis;
    if (!ca?.hasInternalLining) return false;
    const override = jobCard?.rubberPlanOverride;
    const status = override ? override.status : null;
    return status !== "accepted" && status !== "manual";
  }, [coating.coatingAnalysis, jobCard?.rubberPlanOverride]);

  const specsNeedReview = useMemo(() => {
    if (!currentStep || currentStep !== "manager_approval") return false;
    const ca = coating.coatingAnalysis;
    const coatingPending = ca && ca.coats.length > 0 && ca.status !== "accepted";
    return coatingPending || rubberPlanPending || false;
  }, [currentStep, coating.coatingAnalysis, rubberPlanPending]);

  const currentStepBlueBgPending =
    workflow.currentStepPhaseInfo.isMultiPhase && !workflow.currentStepPhaseInfo.phase1Complete;
  const hasBlueLineTasks = workflow.currentStepPhaseInfo.isMultiPhase;
  const currentStepActionCompleted = workflow.currentStepPhaseInfo.phase1ActionDone;
  const currentStepActionLabel = workflow.currentStepPhaseInfo.isMultiPhase
    ? workflow.currentStepPhaseInfo.phase1ActionLabel
    : workflow.currentStepPhaseInfo.actionLabel;

  const [jobFileGateSatisfied, setJobFileGateSatisfied] = useState(false);
  const [docUploadGateSatisfied, setDocUploadGateSatisfied] = useState(false);
  const [showReadyPhotoModal, setShowReadyPhotoModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showSourceFileModal, setShowSourceFileModal] = useState(false);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [sourceFileLoading, setSourceFileLoading] = useState(false);

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
    loadReconciliationGateStatus(jobId)
      .then((gate) => setJobFileGateSatisfied(gate.satisfied))
      .catch(() => setJobFileGateSatisfied(false));
  }, [backgroundSteps, jobId]);

  useEffect(() => {
    if (!docUploadStepActive) return;
    loadReconciliationGateStatus(jobId)
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

  const hasAllocations = allocations.some((a) => !a.undone);
  const hasUnissuedAllocations = allocations.some((a) => !a.undone && !a.issuedAt);

  const batchesSaved =
    actions.batchesSavedLocal ||
    backgroundSteps.some((bg) => bg.stepKey === "qc_batch_certs" && bg.completedAt !== null);

  const { activeTab, visitedTabs, handleTabChange, visibleTabs } = useJobCardTabs(tabDefinitions);

  const handleConfirmIssuance = async () => {
    const unissued = allocations.filter((a) => !a.undone && !a.issuedAt);
    await actions.handleConfirmIssuance(
      unissued.map((a) => a.id),
      confirm,
    );
  };

  const handlePlaceRequisition = async () => {
    await actions.handlePlaceRequisition(router);
  };

  const handleSaveNotes = async (editedNotes: string) => {
    const jobCardNotes = jobCard?.notes;
    const originalNotes = jobCardNotes ? jobCardNotes : null;
    await actions.handleSaveNotes(editedNotes, originalNotes);
  };

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

  if (actions.error || !jobCard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">
            {actions.error?.message ? actions.error.message : "Job card not found"}
          </p>
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

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <ReadyPhotoModal
        isOpen={showReadyPhotoModal}
        jobCardId={jobId}
        onClose={() => setShowReadyPhotoModal(false)}
        onUploaded={() => jobFilesHook.loadJobFiles()}
      />
      <SourceFileModal
        isOpen={showSourceFileModal}
        sourceFileUrl={sourceFileUrl}
        sourceFileName={jobCard.sourceFileName || null}
        onClose={() => {
          setShowSourceFileModal(false);
          setSourceFileUrl(null);
        }}
      />
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
                  const lineItems = jobCard.lineItems;
                  const jtNumbers = [
                    ...new Set(
                      (lineItems || [])
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
                      const result = await loadSourceFileUrl(jobCard.id);
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
          <WorkflowActionsBar
            jobId={jobId}
            currentStep={currentStep}
            canApprove={workflow.canApprove}
            canAcceptDraft={workflow.canAcceptDraft}
            isAdminView={isAdminView}
            isQualityUser={workflow.isQualityUser}
            specsNeedReview={specsNeedReview}
            prevStepBgPending={workflow.prevStepBgPending}
            currentStepBgPending={workflow.currentStepBgPending}
            currentStepBlueBgPending={currentStepBlueBgPending}
            hasBlueLineTasks={hasBlueLineTasks}
            fgActionAssignedToOther={workflow.fgActionAssignedToOther}
            currentStepActionCompleted={currentStepActionCompleted}
            currentStepActionLabel={currentStepActionLabel}
            receptionIsPending={workflow.receptionIsPending}
            qcpsNeedApproval={qcpsNeedApproval}
            rubberPlanPending={rubberPlanPending}
            userPendingBgSteps={workflow.userPendingBgSteps}
            bgStepError={actions.bgStepError}
            completingStepKey={actions.completingStepKey}
            isDownloadingQr={actions.isDownloadingQr}
            isUpdatingStatus={actions.isUpdatingStatus}
            isCompletingFgAction={actions.isCompletingFgAction}
            isUploadingReadyPhoto={false}
            isConfirmingIssuance={actions.isConfirmingIssuance}
            isProcessingDecision={actions.isProcessingDecision}
            hasAllocations={hasAllocations}
            hasUnissuedAllocations={hasUnissuedAllocations}
            hasReadyPhoto={hasReadyPhoto}
            batchesSaved={batchesSaved}
            finalPhotosSaved={actions.finalPhotosSaved}
            jobFileGateSatisfied={jobFileGateSatisfied}
            docUploadGateSatisfied={docUploadGateSatisfied}
            requisition={requisition}
            coatingAnalysis={coating.coatingAnalysis}
            phase2ActionLabel={workflow.currentStepPhaseInfo.phase2ActionLabel}
            adminBlockedFromStep={workflow.adminBlockedFromStep}
            isReceptionStep={workflow.isReceptionStep}
            isRequisitionStep={workflow.isRequisitionStep}
            isReqAuthStep={workflow.isReqAuthStep}
            isOrderPlacementStep={workflow.isOrderPlacementStep}
            isStockAllocStep={workflow.isStockAllocStep}
            isReadyStep={workflow.isReadyStep}
            isQaReviewStep={workflow.isQaReviewStep}
            isQcRepairsStep={workflow.isQcRepairsStep}
            isQaFinalCheckStep={workflow.isQaFinalCheckStep}
            isInspectionBookingStep={workflow.isInspectionBookingStep}
            isDataBookStep={workflow.isDataBookStep}
            isJobFileReviewStep={workflow.isJobFileReviewStep}
            isDocUploadStep={workflow.isDocUploadStep}
            onPrintQr={actions.handlePrintQr}
            onCompleteFgAction={actions.handleCompleteFgAction}
            onCompleteBackgroundStep={actions.handleCompleteBackgroundStep}
            onOpenApprovalModal={actions.openApprovalModal}
            onDraftAccepted={actions.handleDraftAccepted}
            onConfirmIssuance={handleConfirmIssuance}
            onShowReadyPhotoModal={() => setShowReadyPhotoModal(true)}
            onShowInspectionModal={() => setShowInspectionModal(true)}
            onTabChange={handleTabChange}
            onScrollToElement={scrollToElementId}
            onDismissBgStepError={() => actions.setBgStepError(null)}
          />
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
          {jobCard.status.toLowerCase() !== "draft" && !workflow.receptionIsPending && (
            <button
              onClick={actions.handlePrintQr}
              disabled={actions.isDownloadingQr}
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
              {actions.isDownloadingQr ? "Generating..." : "Print JC"}
            </button>
          )}
          {currentStatus === "dispatched" && (
            <button
              onClick={actions.handlePrintSignedPdf}
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Job Card Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">JC Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jcNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Page Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.pageNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.customerName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
                >
                  {jobCard.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.updatedAt)}</dd>
            </div>
            {jobCard.description && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.description}</dd>
              </div>
            )}
            {jobCard.poNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.poNumber}</dd>
              </div>
            )}
            {jobCard.siteLocation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Site / Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.siteLocation}</dd>
              </div>
            )}
            {jobCard.contactPerson && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.contactPerson}</dd>
              </div>
            )}
            {jobCard.dueDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.dueDate}</dd>
              </div>
            )}
            {jobCard.reference && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Reference</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.reference}</dd>
              </div>
            )}
            {jobCard.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{jobCard.notes}</dd>
              </div>
            )}
          </dl>
          {coatingAnalysis &&
            coatingAnalysis.status === "analysed" &&
            coatingAnalysis.coats.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Coating Specification</h4>
                  <span className="text-xs text-gray-400 italic">extracted by Nix</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
                  {coatingAnalysis.applicationType && (
                    <div>
                      <span className="font-medium text-gray-500">Application: </span>
                      <span className="text-gray-900 capitalize">
                        {coatingAnalysis.applicationType}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.surfacePrep && (
                    <div>
                      <span className="font-medium text-gray-500">Surface Prep: </span>
                      <span className="text-gray-900 capitalize">
                        {coatingAnalysis.surfacePrep.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.extM2 > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">Ext m&#178;: </span>
                      <span className="text-gray-900">
                        {Number(coatingAnalysis.extM2).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.intM2 > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">Int m&#178;: </span>
                      <span className="text-gray-900">
                        {Number(coatingAnalysis.intM2).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Area</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Product</th>
                      <th className="text-right py-2 pr-4 font-medium text-gray-500">
                        DFT (&#181;m)
                      </th>
                      <th className="text-right py-2 pr-4 font-medium text-gray-500">
                        Coverage (m&#178;/L)
                      </th>
                      <th className="text-right py-2 font-medium text-gray-500">Litres Req.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coatingAnalysis.coats.map((coat, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-600 capitalize">
                          {coat.area === "external" ? "Ext" : "Int"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 font-medium">{coat.product}</td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {coat.minDftUm}-{coat.maxDftUm}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {coat.coverageM2PerLiter}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          {coat.litersRequired}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {coatingAnalysis.stockAssessment.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Stock Assessment
                    </h5>
                    <div className="space-y-1">
                      {coatingAnalysis.stockAssessment.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.product}</span>
                          <div className="flex items-center space-x-3">
                            {item.stockItemId ? (
                              <>
                                <span className="text-gray-500">
                                  {item.currentStock} / {item.required} {item.unit}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    item.sufficient
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.sufficient ? "OK" : "Short"}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-600 italic">
                                Not in inventory
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          {coatingAnalysis && coatingAnalysis.status === "pending" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                <span>Nix is analysing the coating specification...</span>
              </div>
            </div>
          )}
          {coatingAnalysis && coatingAnalysis.status === "failed" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-600">
                  Coating analysis failed: {coatingAnalysis.error || "Unknown error"}
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalysing}
                  className="text-sm text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Retry"}
                </button>
              </div>
            </div>
          )}
          {!coatingAnalysis && jobCard.notes && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">No coating analysis available</span>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalysing}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Run Coating Analysis"}
                </button>
              </div>
            </div>
          )}
          {requisition && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Requisition</span>
                </div>
                <Link
                  href={`/stock-control/portal/requisitions/${requisition.id}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100"
                >
                  {requisition.requisitionNumber}
                  <svg
                    className="w-4 h-4 ml-1"
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
              </div>
            </div>
          )}
          {jobCard.customFields && Object.keys(jobCard.customFields).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Custom Fields</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {Object.entries(jobCard.customFields).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {jobCard.lineItems && jobCard.lineItems.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
            <span className="text-sm text-gray-500">{jobCard.lineItems.length} items</span>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  #
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item Code
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item No
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Quantity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  JT No
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobCard.lineItems.map((li, idx) => (
                <tr key={li.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {li.itemCode || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {li.itemDescription || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {li.itemNo || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {li.quantity ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {li.jtNo || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Stock Allocations</h3>
          <span className="text-sm text-gray-500">{allocations.length} allocations</span>
        </div>
        {allocations.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

      {workflowStatus &&
        (() => {
          const stepAssignments = workflowStatus.stepAssignments;
          const foregroundSteps = workflowStatus.foregroundSteps;
          return (
            <WorkflowStatus
              currentStatus={currentStatus!}
              approvals={approvals}
              stepAssignments={stepAssignments || {}}
              foregroundSteps={foregroundSteps || []}
              backgroundSteps={backgroundSteps}
              currentUserName={effectiveName || authUserName}
              currentStepPhase1Done={currentStepActionCompleted}
            />
          );
        })()}

      <InspectionProposalBanner jobCardId={jobId} onChanged={fetchData} />

      {!specsNeedReview &&
        !workflow.prevStepBgPending &&
        !currentStepBlueBgPending &&
        !workflow.currentStepBgPending &&
        (currentStepActionCompleted || !currentStepActionLabel) && (
          <JobCardNextAction
            currentStatus={currentStatus}
            canApprove={workflow.canApprove}
            currentStep={currentStep}
            currentStepLabel={currentStepLabel}
            userRole={userRole}
            onApprove={currentStep ? () => actions.openApprovalModal(currentStep) : undefined}
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
              onReExtractNotes={actions.handleReExtractNotes}
              isReExtracting={actions.isReExtractingNotes}
            />

            {documents.versions.length > 0 && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Version History</h3>
                <select
                  value={(() => {
                    const selectedVersionId = documents.selectedVersionId;
                    return selectedVersionId ?? "";
                  })()}
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
                                  {selectedVersion.lineItemsSnapshot.map((li, idx) =>
                                    (() => {
                                      const itemCode = li.itemCode;
                                      const itemDescription = li.itemDescription;
                                      const quantity = li.quantity;
                                      return (
                                        <tr key={idx}>
                                          <td className="px-3 py-1.5 text-gray-700">
                                            {String(itemCode || "-")}
                                          </td>
                                          <td className="px-3 py-1.5 text-gray-700">
                                            {String(itemDescription || "-")}
                                          </td>
                                          <td className="px-3 py-1.5 text-gray-700">
                                            {quantity !== null && quantity !== undefined
                                              ? String(quantity)
                                              : "-"}
                                          </td>
                                        </tr>
                                      );
                                    })(),
                                  )}
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
                  {deliveryJobCards.map((djc) =>
                    (() => {
                      const jtDnNumber = djc.jtDnNumber;
                      const deliveryCardLabel = jtDnNumber || djc.jcNumber;
                      return (
                        <Link
                          key={djc.id}
                          href={`/stock-control/portal/job-cards/${djc.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                        >
                          <div>
                            <span className="font-medium text-gray-900">
                              {djc.jobNumber} / {deliveryCardLabel}
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
                      );
                    })(),
                  )}
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
              currentUserId={authUserId}
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
              jobNumber={jobCard?.jobNumber ? jobCard.jobNumber : ""}
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
              onSkipTds={actions.handleSkipTdsAndActivate}
              isAdmin={userRole === "admin"}
              sourceFileUrl={jobCard?.sourceFilePath ? jobCard.sourceFilePath : null}
              lineItems={jobCard?.lineItems ? jobCard.lineItems : []}
              showStockDecision={workflow.requisitionIsPending}
              onPlaceRequisition={handlePlaceRequisition}
              onUseCurrentStock={actions.handleUseCurrentStock}
              isProcessingDecision={actions.isProcessingDecision}
              decisionError={actions.decisionError}
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
                cpoId={jobCard?.cpoId ? jobCard.cpoId : null}
                backgroundSteps={backgroundSteps}
                activeBgStepKeys={workflow.activeBgStepKeys}
                stepAssignments={
                  workflowStatus?.stepAssignments ? workflowStatus.stepAssignments : {}
                }
                currentUserName={effectiveName || authUserName}
                rubberPlanOverride={jobCard?.rubberPlanOverride ? jobCard.rubberPlanOverride : null}
                onBatchComplete={
                  workflow.userPendingBgSteps.some(
                    (bg) => bg.branchColor && bg.stepKey === "qc_batch_certs",
                  )
                    ? () => {
                        actions.setBatchesSaved(true);
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
                  actions.setFinalPhotosSaved(true);
                }}
                lineItems={(jobCard?.lineItems ? jobCard.lineItems : []).map((li) => {
                  const itemCode = li.itemCode;
                  const itemDescription = li.itemDescription;
                  const quantity = li.quantity;
                  return {
                    id: li.id,
                    itemCode: itemCode || "",
                    description: itemDescription || "",
                    quantity: quantity || 0,
                  };
                })}
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
        isOpen={actions.showApprovalModal}
        onClose={() => actions.setShowApprovalModal(false)}
        onApprove={actions.handleApprove}
        onReject={actions.handleReject}
        jobNumber={jobCard.jobNumber}
        stepName={actions.currentApprovalStep.replace(/_/g, " ")}
        stepOutcomes={(() => {
          const activeStep = workflowStatus?.foregroundSteps?.find(
            (s) => s.key === actions.currentApprovalStep,
          );
          const outcomes = activeStep?.stepOutcomes;
          return outcomes ? outcomes : null;
        })()}
      />

      {actions.pdfPreviewUrl &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Job Card Preview — {jobCard?.jobNumber}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={actions.handleExportPdf}
                    disabled={actions.isDownloadingQr}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {actions.isDownloadingQr ? "Exporting..." : "Export PDF"}
                  </button>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(actions.pdfPreviewUrl!);
                      actions.setPdfPreviewUrl(null);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
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
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={actions.pdfPreviewUrl}
                  className="w-full h-full border-0"
                  title="Job Card PDF Preview"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
      <PdfPreviewModal state={actions.pdfPreview.state} onClose={actions.pdfPreview.close} />
    </div>
  );
}
