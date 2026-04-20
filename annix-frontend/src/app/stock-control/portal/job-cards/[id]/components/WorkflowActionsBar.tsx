"use client";

import { useRouter } from "next/navigation";
import type {
  BackgroundStepStatus,
  CoatingAnalysis,
  Requisition,
} from "@/app/lib/api/stockControlApi";

interface WorkflowActionsBarProps {
  jobId: number;
  currentStep: string | null;
  canApprove: boolean;
  canAcceptDraft: boolean;
  isAdminView: boolean;
  isQualityUser: boolean;
  specsNeedReview: boolean;
  prevStepBgPending: boolean;
  currentStepBgPending: boolean;
  currentStepBlueBgPending: boolean;
  hasBlueLineTasks: boolean;
  fgActionAssignedToOther: boolean;
  currentStepActionCompleted: boolean;
  currentStepActionLabel: string | null;
  receptionIsPending: boolean;
  qcpsNeedApproval: boolean;
  rubberPlanPending: boolean;
  userPendingBgSteps: BackgroundStepStatus[];
  bgStepError: string | null;
  completingStepKey: string | null;
  isDownloadingQr: boolean;
  isUpdatingStatus: boolean;
  isCompletingFgAction: boolean;
  isUploadingReadyPhoto: boolean;
  isConfirmingIssuance: boolean;
  isProcessingDecision: boolean;
  hasAllocations: boolean;
  hasUnissuedAllocations: boolean;
  hasReadyPhoto: boolean;
  batchesSaved: boolean;
  finalPhotosSaved: boolean;
  jobFileGateSatisfied: boolean;
  docUploadGateSatisfied: boolean;
  requisition: Requisition | null;
  coatingAnalysis: CoatingAnalysis | null;
  phase2ActionLabel: string | null;
  adminBlockedFromStep: (stepKey: string | null | undefined) => boolean;
  isReceptionStep: (bg: BackgroundStepStatus) => boolean;
  isRequisitionStep: (bg: BackgroundStepStatus) => boolean;
  isReqAuthStep: (bg: BackgroundStepStatus) => boolean;
  isOrderPlacementStep: (bg: BackgroundStepStatus) => boolean;
  isStockAllocStep: (bg: BackgroundStepStatus) => boolean;
  isReadyStep: (bg: BackgroundStepStatus) => boolean;
  isQaReviewStep: (bg: BackgroundStepStatus) => boolean;
  isQcRepairsStep: (bg: BackgroundStepStatus) => boolean;
  isQaFinalCheckStep: (bg: BackgroundStepStatus) => boolean;
  isInspectionBookingStep: (bg: BackgroundStepStatus) => boolean;
  isDataBookStep: (bg: BackgroundStepStatus) => boolean;
  isJobFileReviewStep: (bg: BackgroundStepStatus) => boolean;
  isDocUploadStep: (bg: BackgroundStepStatus) => boolean;
  onPrintQr: () => Promise<void>;
  onCompleteFgAction: () => void;
  onCompleteBackgroundStep: (stepKey: string, outcomeKey?: string) => void;
  onOpenApprovalModal: (stepName: string) => void;
  onDraftAccepted: () => void;
  onConfirmIssuance: () => void;
  onShowReadyPhotoModal: () => void;
  onShowInspectionModal: () => void;
  onTabChange: (tabId: string) => void;
  onScrollToElement: (elementId: string) => void;
  onDismissBgStepError: () => void;
}

export function WorkflowActionsBar(props: WorkflowActionsBarProps) {
  const router = useRouter();

  const {
    jobId,
    currentStep,
    canApprove,
    canAcceptDraft,
    isAdminView,
    isQualityUser,
    specsNeedReview,
    prevStepBgPending,
    currentStepBgPending,
    currentStepBlueBgPending,
    hasBlueLineTasks,
    fgActionAssignedToOther,
    currentStepActionCompleted,
    currentStepActionLabel,
    receptionIsPending,
    qcpsNeedApproval,
    rubberPlanPending,
    userPendingBgSteps,
    bgStepError,
    completingStepKey,
    isDownloadingQr,
    isUpdatingStatus,
    isCompletingFgAction,
    isUploadingReadyPhoto,
    isConfirmingIssuance,
    hasAllocations,
    hasUnissuedAllocations,
    hasReadyPhoto,
    batchesSaved,
    finalPhotosSaved,
    jobFileGateSatisfied,
    docUploadGateSatisfied,
    requisition,
    coatingAnalysis,
    phase2ActionLabel,
    adminBlockedFromStep,
    isReceptionStep,
    isRequisitionStep,
    isReqAuthStep,
    isOrderPlacementStep,
    isStockAllocStep,
    isReadyStep,
    isQaReviewStep,
    isQcRepairsStep,
    isQaFinalCheckStep,
    isInspectionBookingStep,
    isDataBookStep,
    isJobFileReviewStep,
    isDocUploadStep,
    onPrintQr,
    onCompleteFgAction,
    onCompleteBackgroundStep,
    onOpenApprovalModal,
    onDraftAccepted,
    onConfirmIssuance,
    onShowReadyPhotoModal,
    onShowInspectionModal,
    onTabChange,
    onScrollToElement,
    onDismissBgStepError,
  } = props;

  const approveLabel = hasBlueLineTasks ? phase2ActionLabel || "Release" : "Approve & Sign";
  const actionGateSatisfied = currentStepActionCompleted || !currentStepActionLabel;

  return (
    <div
      id="workflow-actions"
      className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2"
    >
      <h3 className="text-xs font-semibold text-gray-500 mb-1.5">Workflow Actions</h3>
      <div className="flex flex-wrap items-center gap-2">
        {canApprove && currentStep && specsNeedReview && (
          <>
            {coatingAnalysis &&
              coatingAnalysis.coats.length > 0 &&
              coatingAnalysis.status !== "accepted" && (
                <button
                  onClick={() => {
                    onTabChange("coating");
                    onScrollToElement("coating-spec-review");
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs transition-colors"
                >
                  Check Coating Spec
                </button>
              )}
            {rubberPlanPending && (
              <button
                onClick={() => {
                  onTabChange("rubber-analysis");
                  onScrollToElement("rubber-spec-review");
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs transition-colors"
              >
                Accept Rubber Plan
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
              onClick={onCompleteFgAction}
              disabled={isCompletingFgAction || adminBlockedFromStep(currentStep)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCompletingFgAction ? "..." : currentStepActionLabel}
            </button>
          )}
        {canApprove &&
          currentStep &&
          actionGateSatisfied &&
          !prevStepBgPending &&
          !currentStepBgPending &&
          (!hasBlueLineTasks || !currentStepBlueBgPending) && (
            <button
              onClick={() => onOpenApprovalModal(currentStep)}
              disabled={adminBlockedFromStep(currentStep)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {approveLabel}
            </button>
          )}
        {(isQualityUser || isAdminView) &&
          qcpsNeedApproval &&
          currentStep &&
          currentStep !== "admin_approval" && (
            <button
              onClick={() => {
                onTabChange("quality");
                onScrollToElement("quality-tab-content");
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs transition-colors"
            >
              Approve QCP
            </button>
          )}
        {canAcceptDraft && (
          <button
            onClick={onDraftAccepted}
            disabled={isUpdatingStatus || adminBlockedFromStep("document_upload")}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium text-xs disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdatingStatus ? "..." : "Draft Accepted"}
          </button>
        )}
        {receptionIsPending && (
          <button
            onClick={async () => {
              const receptionStep = userPendingBgSteps.find(isReceptionStep);
              if (receptionStep) {
                await onPrintQr();
                onCompleteBackgroundStep(receptionStep.stepKey);
              }
            }}
            disabled={(() => {
              const receptionStep = userPendingBgSteps.find(isReceptionStep);
              const receptionStepKey = receptionStep?.stepKey;
              return (
                isDownloadingQr ||
                completingStepKey === receptionStepKey ||
                adminBlockedFromStep(receptionStepKey)
              );
            })()}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
        {userPendingBgSteps.filter((bg) => !isReceptionStep(bg)).length > 0 &&
          userPendingBgSteps
            .filter((bg) => !isReceptionStep(bg))
            .filter(
              (bg) =>
                bg.rejoinAtStep !== null ||
                isAdminView ||
                !canApprove ||
                prevStepBgPending ||
                currentStepBlueBgPending ||
                currentStepBgPending,
            )
            .map((bg) =>
              isRequisitionStep(bg) ? (
                <button
                  key={bg.stepKey}
                  onClick={() => {
                    onTabChange("coating");
                    onScrollToElement("stock-decision");
                  }}
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
                    onClick={() => {
                      onTabChange("stock-issues");
                      onScrollToElement("stock-allocation-section");
                    }}
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
                      onClick={onConfirmIssuance}
                      disabled={isConfirmingIssuance}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isConfirmingIssuance ? "Issuing..." : "Issue Allocated"}
                    </button>
                  )}
                  {hasAllocations && (
                    <button
                      onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                      disabled={
                        completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {(() => {
                        const actionLabel = bg.actionLabel;
                        return completingStepKey === bg.stepKey
                          ? "..."
                          : actionLabel || `Complete ${bg.label}`;
                      })()}
                    </button>
                  )}
                </div>
              ) : isReadyStep(bg) ? (
                <div key={bg.stepKey} className="flex flex-wrap gap-2">
                  {!hasReadyPhoto ? (
                    <button
                      onClick={onShowReadyPhotoModal}
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
                      onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                      disabled={
                        completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)
                      }
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
                    onTabChange("quality");
                    onScrollToElement("qa-review-section");
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  QA Review
                </button>
              ) : isQcRepairsStep(bg) ? (
                <button
                  key={bg.stepKey}
                  onClick={() => {
                    onTabChange("quality");
                    onScrollToElement("qa-review-section");
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  View QA Repairs
                </button>
              ) : bg.stepKey === "qc_batch_certs" && !batchesSaved ? (
                <button
                  key={bg.stepKey}
                  onClick={() => {
                    onTabChange("quality");
                    onScrollToElement("defelsko-batch-section");
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Input Batches
                </button>
              ) : bg.stepKey === "qc_batch_certs" && batchesSaved ? (
                <button
                  key={bg.stepKey}
                  onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                  disabled={completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {completingStepKey === bg.stepKey ? "..." : "Batches Completed"}
                </button>
              ) : isQaFinalCheckStep(bg) && !finalPhotosSaved ? (
                <button
                  key={bg.stepKey}
                  onClick={() => {
                    onTabChange("quality");
                    onScrollToElement("qa-final-photos-section");
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Upload Final Photos
                </button>
              ) : isInspectionBookingStep(bg) ? (
                <button
                  key={bg.stepKey}
                  onClick={onShowInspectionModal}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Book Inspection
                </button>
              ) : isDataBookStep(bg) ? (
                <button
                  key={bg.stepKey}
                  onClick={() => {
                    onTabChange("quality");
                    onScrollToElement("data-book-section");
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Review Data Book
                </button>
              ) : isJobFileReviewStep(bg) ? (
                <div key={bg.stepKey} className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onTabChange("job-files");
                      onScrollToElement("job-file-upload-area");
                    }}
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
                      onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                      disabled={
                        completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {completingStepKey === bg.stepKey ? "..." : "Complete File Review"}
                    </button>
                  )}
                </div>
              ) : isDocUploadStep(bg) ? (
                <div key={bg.stepKey} className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onTabChange("job-files");
                      onScrollToElement("document-upload-gate");
                    }}
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
                      onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                      disabled={
                        completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {(() => {
                        const actionLabel = bg.actionLabel;
                        return completingStepKey === bg.stepKey
                          ? "..."
                          : actionLabel || "Docs Uploaded";
                      })()}
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
                  const mappedStyle = styleMap[outcome.style];
                  const btnClass = mappedStyle ? mappedStyle : "bg-amber-600 hover:bg-amber-700";
                  return (
                    <button
                      key={`${bg.stepKey}-${outcome.key}`}
                      onClick={() => onCompleteBackgroundStep(bg.stepKey, outcome.key)}
                      disabled={
                        completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${btnClass}`}
                    >
                      {completingStepKey === bg.stepKey ? "..." : outcome.label}
                    </button>
                  );
                })
              ) : (
                <button
                  key={bg.stepKey}
                  onClick={() => onCompleteBackgroundStep(bg.stepKey)}
                  disabled={completingStepKey === bg.stepKey || adminBlockedFromStep(bg.stepKey)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {(() => {
                    const actionLabel = bg.actionLabel;
                    return completingStepKey === bg.stepKey
                      ? "..."
                      : actionLabel || `Complete ${bg.label}`;
                  })()}
                </button>
              ),
            )}
        {bgStepError && (
          <span className="text-xs text-red-600">
            {bgStepError}
            <button onClick={onDismissBgStepError} className="ml-1 font-medium underline">
              Dismiss
            </button>
          </span>
        )}
        {canApprove &&
          currentStep &&
          currentStepActionCompleted &&
          (prevStepBgPending || currentStepBlueBgPending) && (
            <span className="text-xs text-amber-600 italic">
              Waiting for background tasks to complete before approval
            </span>
          )}
        {!canApprove &&
          !canAcceptDraft &&
          !receptionIsPending &&
          userPendingBgSteps.length === 0 &&
          !qcpsNeedApproval &&
          currentStep === "manager_approval" &&
          !specsNeedReview && (
            <span className="text-xs text-green-600 italic">
              Coating spec and rubber plan accepted — awaiting PM release to factory
            </span>
          )}
        {!canApprove &&
          !canAcceptDraft &&
          !receptionIsPending &&
          userPendingBgSteps.length === 0 &&
          !qcpsNeedApproval &&
          !(currentStep === "manager_approval" && !specsNeedReview) && (
            <span className="text-xs text-gray-400 italic">
              No pending actions for you on this job card
            </span>
          )}
      </div>
    </div>
  );
}
