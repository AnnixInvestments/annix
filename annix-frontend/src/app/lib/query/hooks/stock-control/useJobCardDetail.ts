import type {
  BackgroundStepStatus,
  JobCard,
  JobCardApproval,
  QcControlPlanRecord,
  Requisition,
  StockAllocation,
  WorkflowStatus,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { createMutationHook } from "../../factories";
import { stockControlKeys } from "../../keys/stockControlKeys";

type JobCardFile = Awaited<ReturnType<typeof stockControlApiClient.uploadReadyPhoto>>;
type SourceFileUrl = Awaited<ReturnType<typeof stockControlApiClient.sourceFileUrl>>;
type JobCardAdjacentIds = Awaited<ReturnType<typeof stockControlApiClient.jobCardAdjacentIds>>;
type JobCardCorrection = Awaited<ReturnType<typeof stockControlApiClient.saveJobCardCorrection>>;
type ReconciliationGateStatus = Awaited<
  ReturnType<typeof stockControlApiClient.reconciliationGateStatus>
>;

export const useLoadWorkflowStatus = createMutationHook<WorkflowStatus, number>((jobCardId) =>
  stockControlApiClient.workflowStatus(jobCardId),
);

export const useLoadApprovalHistory = createMutationHook<JobCardApproval[], number>((jobCardId) =>
  stockControlApiClient.approvalHistory(jobCardId),
);

export const useLoadJobCardPdfPreview = createMutationHook<string, number>((jobCardId) =>
  stockControlApiClient.previewJobCardPdf(jobCardId),
);

export const useDownloadJobCardQrPdf = createMutationHook<void, number>((jobCardId) =>
  stockControlApiClient.downloadJobCardQrPdf(jobCardId),
);

export const useDownloadSignedJobCardPdf = createMutationHook<Blob, number>((jobCardId) =>
  stockControlApiClient.downloadSignedJobCardPdf(jobCardId),
);

export const useUpdateJobCard = createMutationHook<
  JobCard,
  { jobCardId: number; data: Partial<JobCard> & { skipTdsCheck?: boolean } }
>(
  ({ jobCardId, data }) => stockControlApiClient.updateJobCard(jobCardId, data),
  (_data, { jobCardId }) => [
    stockControlKeys.jobCardDetail.all,
    stockControlKeys.jobCards.detail(jobCardId),
    stockControlKeys.jobCards.all,
  ],
);

export const useReExtractJobCardNotes = createMutationHook<{ notes: string | null }, number>(
  (jobCardId) => stockControlApiClient.reExtractJobCardNotes(jobCardId),
  (_data, jobCardId) => [stockControlKeys.jobCards.detail(jobCardId)],
);

export const useCompleteBackgroundStepWithOutcome = createMutationHook<
  void,
  { jobCardId: number; stepKey: string; notes?: string; outcomeKey?: string }
>(
  ({ jobCardId, stepKey, notes, outcomeKey }) =>
    stockControlApiClient.completeBackgroundStep(jobCardId, stepKey, notes, outcomeKey),
  [stockControlKeys.jobCardDetail.all, stockControlKeys.notifications.all],
);

export const useUploadReadyPhoto = createMutationHook<
  JobCardFile,
  { jobCardId: number; file: File }
>(
  ({ jobCardId, file }) => stockControlApiClient.uploadReadyPhoto(jobCardId, file),
  (_data, { jobCardId }) => [
    stockControlKeys.jobCardDetail.all,
    stockControlKeys.jobCards.detail(jobCardId),
  ],
);

export const useConfirmIssuance = createMutationHook<
  StockAllocation[],
  { jobCardId: number; allocationIds: number[] }
>(
  ({ jobCardId, allocationIds }) => stockControlApiClient.confirmIssuance(jobCardId, allocationIds),
  [stockControlKeys.jobCardDetail.all],
);

export const usePlaceRequisitionDecision = createMutationHook<
  { success: boolean; requisitionId: number | null },
  number
>(
  (jobCardId) => stockControlApiClient.placeRequisitionDecision(jobCardId),
  [stockControlKeys.jobCardDetail.all, stockControlKeys.requisitions.all],
);

export const useUseCurrentStockDecision = createMutationHook<{ success: boolean }, number>(
  (jobCardId) => stockControlApiClient.useCurrentStockDecision(jobCardId),
  [stockControlKeys.jobCardDetail.all],
);

export const useLoadSourceFileUrl = createMutationHook<SourceFileUrl, number>((jobCardId) =>
  stockControlApiClient.sourceFileUrl(jobCardId),
);

export const useLoadBackgroundStepsForJobCard = createMutationHook<BackgroundStepStatus[], number>(
  (jobCardId) => stockControlApiClient.backgroundStepsForJobCard(jobCardId),
);

export const useLoadJobCardAdjacentIds = createMutationHook<JobCardAdjacentIds, number>(
  (jobCardId) => stockControlApiClient.jobCardAdjacentIds(jobCardId),
);

export const useLoadControlPlansForJobCard = createMutationHook<QcControlPlanRecord[], number>(
  (jobCardId) => stockControlApiClient.controlPlansForJobCard(jobCardId),
);

export const useSaveJobCardCorrection = createMutationHook<
  JobCardCorrection,
  {
    jobCardId: number;
    data: { fieldName: string; originalValue: string | null; correctedValue: string };
  }
>(({ jobCardId, data }) => stockControlApiClient.saveJobCardCorrection(jobCardId, data));

export const useLoadRequisitions = createMutationHook<Requisition[], void>(() =>
  stockControlApiClient.requisitions(),
);

export const useLoadDeliveryJobCards = createMutationHook<JobCard[], number>((parentJobCardId) =>
  stockControlApiClient.deliveryJobCards(parentJobCardId),
);

export const useLoadReconciliationGateStatus = createMutationHook<ReconciliationGateStatus, number>(
  (jobCardId) => stockControlApiClient.reconciliationGateStatus(jobCardId),
);
