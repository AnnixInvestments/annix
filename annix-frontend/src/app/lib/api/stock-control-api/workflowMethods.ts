import { throwIfNotOk } from "@/app/lib/api/apiError";
import { nowMillis } from "@/app/lib/datetime";
import { API_BASE_URL } from "@/lib/api-config";
import { StockControlApiClient } from "./base";
import type {
  BackgroundStepStatus,
  CdnLineMatch,
  DispatchCdn,
  DispatchLoadPhoto,
  DispatchProgress,
  DispatchScan,
  EligibleUser,
  JobCard,
  JobCardActionCompletion,
  JobCardApproval,
  JobCardDocument,
  JobCardJobFile,
  PendingBackgroundStep,
  QaApplicability,
  QaReviewDecision,
  StepNotificationRecipients,
  UserLocationSummary,
  WorkflowNotification,
  WorkflowStatus,
  WorkflowStepAssignment,
  WorkflowStepConfig,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    uploadWorkflowDocument(
      jobCardId: number,
      file: File,
      documentType: string,
    ): Promise<JobCardDocument>;
    workflowDocuments(jobCardId: number): Promise<JobCardDocument[]>;
    workflowStatus(jobCardId: number): Promise<WorkflowStatus>;
    approvalHistory(jobCardId: number): Promise<JobCardApproval[]>;
    approveWorkflowStep(
      jobCardId: number,
      data: { signatureDataUrl?: string; comments?: string; outcomeKey?: string },
    ): Promise<JobCard>;
    rejectWorkflowStep(jobCardId: number, reason: string): Promise<JobCard>;
    pendingApprovals(): Promise<JobCard[]>;
    canApproveJobCard(jobCardId: number): Promise<{ canApprove: boolean }>;
    workflowNotifications(limit?: number): Promise<WorkflowNotification[]>;
    unreadNotifications(): Promise<WorkflowNotification[]>;
    notificationCount(): Promise<{ count: number }>;
    markNotificationAsRead(notificationId: number): Promise<{ success: boolean }>;
    markAllNotificationsAsRead(): Promise<{ success: boolean }>;
    startDispatchSession(
      jobCardId: number,
    ): Promise<{ jobCard: JobCard; progress: DispatchProgress }>;
    dispatchProgress(jobCardId: number): Promise<DispatchProgress>;
    dispatchHistory(jobCardId: number): Promise<DispatchScan[]>;
    scanDispatchItem(
      jobCardId: number,
      stockItemId: number,
      quantity: number,
      notes?: string,
    ): Promise<DispatchScan>;
    completeDispatch(jobCardId: number): Promise<JobCard>;
    scanQrCode(qrToken: string): Promise<{ type: "job_card" | "stock_item"; id: number }>;
    uploadDispatchCdn(jobCardId: number, file: File): Promise<DispatchCdn>;
    dispatchCdns(jobCardId: number): Promise<DispatchCdn[]>;
    updateCdnMatches(
      jobCardId: number,
      cdnId: number,
      lineMatches: CdnLineMatch[],
    ): Promise<DispatchCdn>;
    deleteDispatchCdn(jobCardId: number, cdnId: number): Promise<{ success: boolean }>;
    uploadDispatchLoadPhotos(jobCardId: number, files: File[]): Promise<DispatchLoadPhoto[]>;
    dispatchLoadPhotos(jobCardId: number): Promise<DispatchLoadPhoto[]>;
    deleteDispatchLoadPhoto(jobCardId: number, photoId: number): Promise<{ success: boolean }>;
    downloadSignedJobCardPdf(jobCardId: number): Promise<void>;
    workflowStepConfigs(): Promise<WorkflowStepConfig[]>;
    updateWorkflowStepLabel(key: string, label: string): Promise<{ success: boolean }>;
    addWorkflowStep(input: {
      label: string;
      afterStepKey: string;
      isBackground?: boolean;
      triggerAfterStep?: string;
    }): Promise<WorkflowStepConfig>;
    removeWorkflowStep(key: string): Promise<{ success: boolean }>;
    reorderWorkflowSteps(orderedKeys: string[]): Promise<{ success: boolean }>;
    toggleWorkflowStepBackground(
      key: string,
      isBackground: boolean,
      triggerAfterStep?: string,
    ): Promise<WorkflowStepConfig>;
    updateStepFollows(key: string, triggerAfterStep: string | null): Promise<WorkflowStepConfig>;
    updateStepBranchColor(key: string, branchColor: string | null): Promise<{ success: boolean }>;
    updatePhaseActionLabels(
      key: string,
      phaseActionLabels: Record<string, string> | null,
    ): Promise<{ success: boolean }>;
    backgroundStepConfigs(): Promise<WorkflowStepConfig[]>;
    backgroundStepsForJobCard(jobCardId: number): Promise<BackgroundStepStatus[]>;
    completeBackgroundStep(
      jobCardId: number,
      stepKey: string,
      notes?: string,
      outcomeKey?: string,
    ): Promise<void>;
    updateStepOutcomes(
      key: string,
      stepOutcomes: Array<{
        key: string;
        label: string;
        nextStepKey: string | null;
        notifyStepKey: string | null;
        style: string;
      }> | null,
    ): Promise<{ success: boolean }>;
    updateStepBranchType(
      key: string,
      branchType: "loop" | "connect" | null,
    ): Promise<{ success: boolean }>;
    updateStepRejoinAtStep(key: string, rejoinAtStep: string | null): Promise<{ success: boolean }>;
    uploadReadyPhoto(jobCardId: number, file: File): Promise<JobCardJobFile>;
    pendingBackgroundSteps(): Promise<PendingBackgroundStep[]>;
    workflowAssignments(): Promise<WorkflowStepAssignment[]>;
    eligibleUsersForStep(step: string): Promise<EligibleUser[]>;
    updateWorkflowAssignments(
      step: string,
      userIds: number[],
      primaryUserId?: number,
      secondaryUserId?: number | null,
    ): Promise<{ success: boolean }>;
    notificationRecipients(): Promise<StepNotificationRecipients[]>;
    updateNotificationRecipients(step: string, emails: string[]): Promise<{ success: boolean }>;
    userLocationAssignments(): Promise<UserLocationSummary[]>;
    updateUserLocations(userId: number, locationIds: number[]): Promise<{ success: boolean }>;
    pushVapidKey(): Promise<{ vapidPublicKey: string | null }>;
    subscribePush(subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }): Promise<{ success: boolean }>;
    unsubscribePush(endpoint: string): Promise<{ success: boolean }>;
    completeAction(
      jobCardId: number,
      stepKey: string,
      actionType?: string,
      metadata?: Record<string, unknown>,
    ): Promise<JobCardActionCompletion>;
    actionCompletions(jobCardId: number): Promise<JobCardActionCompletion[]>;
    archiveUrls(jobCardId: number): Promise<{ url: string; path: string }[]>;
    updateStepActionLabel(key: string, actionLabel: string | null): Promise<{ success: boolean }>;
    placeRequisitionDecision(
      jobCardId: number,
    ): Promise<{ success: boolean; requisitionId: number | null }>;
    completeRequisitionStep(jobCardId: number): Promise<{ success: boolean }>;
    useCurrentStockDecision(jobCardId: number): Promise<{ success: boolean }>;
    qaApplicability(jobCardId: number): Promise<QaApplicability>;
    submitQaReview(
      jobCardId: number,
      data: {
        rubberAccepted?: boolean | null;
        paintAccepted?: boolean | null;
        notes?: string | null;
      },
    ): Promise<{ success: boolean; decision: QaReviewDecision }>;
    latestQaReview(jobCardId: number): Promise<QaReviewDecision | null>;
    uploadQaReviewPhoto(jobCardId: number, file: File): Promise<JobCardJobFile>;
  }
}

const proto = StockControlApiClient.prototype;

proto.uploadWorkflowDocument = async function (jobCardId, file, documentType) {
  return this.uploadFile(`/stock-control/workflow/job-cards/${jobCardId}/documents`, file, {
    documentType,
  });
};

proto.workflowDocuments = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/documents`);
};

proto.workflowStatus = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/status`);
};

proto.approvalHistory = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/history`);
};

proto.approveWorkflowStep = async function (jobCardId, data) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/approve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.rejectWorkflowStep = async function (jobCardId, reason) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

proto.pendingApprovals = async function () {
  return this.request("/stock-control/workflow/pending");
};

proto.canApproveJobCard = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/can-approve`);
};

proto.workflowNotifications = async function (limit) {
  const query = limit ? `?limit=${limit}` : "";
  return this.request(`/stock-control/workflow/notifications${query}`);
};

proto.unreadNotifications = async function () {
  return this.request("/stock-control/workflow/notifications/unread");
};

proto.notificationCount = async function () {
  return this.request("/stock-control/workflow/notifications/count");
};

proto.markNotificationAsRead = async function (notificationId) {
  return this.request(`/stock-control/workflow/notifications/${notificationId}/read`, {
    method: "PUT",
  });
};

proto.markAllNotificationsAsRead = async function () {
  return this.request("/stock-control/workflow/notifications/read-all", { method: "PUT" });
};

proto.startDispatchSession = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/start`);
};

proto.dispatchProgress = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/progress`);
};

proto.dispatchHistory = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/history`);
};

proto.scanDispatchItem = async function (jobCardId, stockItemId, quantity, notes) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/scan`, {
    method: "POST",
    body: JSON.stringify({ stockItemId, quantity, notes }),
  });
};

proto.completeDispatch = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/complete`, {
    method: "POST",
  });
};

proto.scanQrCode = async function (qrToken) {
  return this.request("/stock-control/workflow/dispatch/scan-qr", {
    method: "POST",
    body: JSON.stringify({ qrToken }),
  });
};

proto.uploadDispatchCdn = async function (jobCardId, file) {
  return this.uploadFile(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/cdn`, file);
};

proto.dispatchCdns = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/cdns`);
};

proto.updateCdnMatches = async function (jobCardId, cdnId, lineMatches) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/dispatch/cdns/${cdnId}/matches`,
    {
      method: "PUT",
      body: JSON.stringify({ lineMatches }),
    },
  );
};

proto.deleteDispatchCdn = async function (jobCardId, cdnId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/cdns/${cdnId}`, {
    method: "DELETE",
  });
};

proto.uploadDispatchLoadPhotos = async function (jobCardId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const h = this.headers();
  const response = await fetch(
    `${API_BASE_URL}/stock-control/workflow/job-cards/${jobCardId}/dispatch/load-photos`,
    { method: "POST", headers: { Authorization: h.Authorization || "" }, body: formData },
  );
  await throwIfNotOk(response);
  return response.json();
};

proto.dispatchLoadPhotos = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/dispatch/load-photos`);
};

proto.deleteDispatchLoadPhoto = async function (jobCardId, photoId) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/dispatch/load-photos/${photoId}`,
    { method: "DELETE" },
  );
};

proto.downloadSignedJobCardPdf = async function (jobCardId) {
  const h = this.headers();
  const cacheBuster = nowMillis();
  const response = await fetch(
    `${API_BASE_URL}/stock-control/workflow/job-cards/${jobCardId}/print?_t=${cacheBuster}`,
    { headers: { Authorization: h.Authorization ?? "" }, cache: "no-store" },
  );

  await throwIfNotOk(response);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `job-card-signed-${jobCardId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

proto.workflowStepConfigs = async function () {
  return this.request("/stock-control/workflow/step-configs");
};

proto.updateWorkflowStepLabel = async function (key, label) {
  return this.request(`/stock-control/workflow/step-configs/${encodeURIComponent(key)}/label`, {
    method: "PUT",
    body: JSON.stringify({ label }),
  });
};

proto.addWorkflowStep = async function (input) {
  return this.request("/stock-control/workflow/step-configs", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

proto.removeWorkflowStep = async function (key) {
  return this.request(`/stock-control/workflow/step-configs/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
};

proto.reorderWorkflowSteps = async function (orderedKeys) {
  return this.request("/stock-control/workflow/step-configs/reorder", {
    method: "PUT",
    body: JSON.stringify({ orderedKeys }),
  });
};

proto.toggleWorkflowStepBackground = async function (key, isBackground, triggerAfterStep) {
  return this.request(
    `/stock-control/workflow/step-configs/${encodeURIComponent(key)}/toggle-background`,
    {
      method: "PUT",
      body: JSON.stringify({ isBackground, triggerAfterStep }),
    },
  );
};

proto.updateStepFollows = async function (key, triggerAfterStep) {
  return this.request(`/stock-control/workflow/step-configs/${encodeURIComponent(key)}/follows`, {
    method: "PUT",
    body: JSON.stringify({ triggerAfterStep }),
  });
};

proto.updateStepBranchColor = async function (key, branchColor) {
  return this.request(
    `/stock-control/workflow/step-configs/${encodeURIComponent(key)}/branch-color`,
    {
      method: "PUT",
      body: JSON.stringify({ branchColor }),
    },
  );
};

proto.updatePhaseActionLabels = async function (key, phaseActionLabels) {
  return this.request(
    `/stock-control/workflow/step-configs/${encodeURIComponent(key)}/phase-labels`,
    {
      method: "PUT",
      body: JSON.stringify({ phaseActionLabels }),
    },
  );
};

proto.backgroundStepConfigs = async function () {
  return this.request("/stock-control/workflow/step-configs/background");
};

proto.backgroundStepsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/background-steps`);
};

proto.completeBackgroundStep = async function (jobCardId, stepKey, notes, outcomeKey) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/background-steps/${encodeURIComponent(stepKey)}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ notes, outcomeKey }),
    },
  );
};

proto.updateStepOutcomes = async function (key, stepOutcomes) {
  return this.request(`/stock-control/workflow/step-configs/${encodeURIComponent(key)}/outcomes`, {
    method: "PUT",
    body: JSON.stringify({ stepOutcomes }),
  });
};

proto.updateStepBranchType = async function (key, branchType) {
  return this.request(
    `/stock-control/workflow/step-configs/${encodeURIComponent(key)}/branch-type`,
    {
      method: "PUT",
      body: JSON.stringify({ branchType }),
    },
  );
};

proto.updateStepRejoinAtStep = async function (key, rejoinAtStep) {
  return this.request(
    `/stock-control/workflow/step-configs/${encodeURIComponent(key)}/rejoin-at-step`,
    {
      method: "PUT",
      body: JSON.stringify({ rejoinAtStep }),
    },
  );
};

proto.uploadReadyPhoto = async function (jobCardId, file) {
  return this.uploadFile(`/stock-control/workflow/job-cards/${jobCardId}/ready-photo`, file);
};

proto.pendingBackgroundSteps = async function () {
  return this.request("/stock-control/workflow/background-steps/pending");
};

proto.workflowAssignments = async function () {
  return this.request("/stock-control/workflow/assignments");
};

proto.eligibleUsersForStep = async function (step) {
  return this.request(
    `/stock-control/workflow/assignments/${encodeURIComponent(step)}/eligible-users`,
  );
};

proto.updateWorkflowAssignments = async function (step, userIds, primaryUserId, secondaryUserId) {
  return this.request(`/stock-control/workflow/assignments/${encodeURIComponent(step)}`, {
    method: "PUT",
    body: JSON.stringify({ userIds, primaryUserId, secondaryUserId }),
  });
};

proto.notificationRecipients = async function () {
  return this.request("/stock-control/workflow/notification-recipients");
};

proto.updateNotificationRecipients = async function (step, emails) {
  return this.request(
    `/stock-control/workflow/notification-recipients/${encodeURIComponent(step)}`,
    {
      method: "PUT",
      body: JSON.stringify({ emails }),
    },
  );
};

proto.userLocationAssignments = async function () {
  return this.request("/stock-control/workflow/user-locations");
};

proto.updateUserLocations = async function (userId, locationIds) {
  return this.request(`/stock-control/workflow/user-locations/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ locationIds }),
  });
};

proto.pushVapidKey = async function () {
  return this.request("/stock-control/workflow/push/vapid-key");
};

proto.subscribePush = async function (subscription) {
  return this.request("/stock-control/workflow/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
};

proto.unsubscribePush = async function (endpoint) {
  return this.request("/stock-control/workflow/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
};

proto.completeAction = async function (jobCardId, stepKey, actionType, metadata) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/action`, {
    method: "POST",
    body: JSON.stringify({ stepKey, actionType, metadata }),
  });
};

proto.actionCompletions = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/actions`);
};

proto.archiveUrls = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/archive`);
};

proto.updateStepActionLabel = async function (key, actionLabel) {
  return this.request(
    `/stock-control/workflow/step-configs/${encodeURIComponent(key)}/action-label`,
    {
      method: "PUT",
      body: JSON.stringify({ actionLabel }),
    },
  );
};

proto.placeRequisitionDecision = async function (jobCardId) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/stock-decision/place-requisition`,
    { method: "POST" },
  );
};

proto.completeRequisitionStep = async function (jobCardId) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/stock-decision/complete-requisition`,
    { method: "POST" },
  );
};

proto.useCurrentStockDecision = async function (jobCardId) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/stock-decision/use-current-stock`,
    { method: "POST" },
  );
};

proto.qaApplicability = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/qa-applicability`);
};

proto.submitQaReview = async function (jobCardId, data) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/qa-review`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.latestQaReview = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/qa-review/latest`);
};

proto.uploadQaReviewPhoto = async function (jobCardId, file) {
  return this.uploadFile(`/stock-control/workflow/job-cards/${jobCardId}/qa-review/photos`, file);
};
