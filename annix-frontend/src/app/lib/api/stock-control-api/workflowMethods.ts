import { API_BASE_URL } from "@/lib/api-config";
import { StockControlApiClient } from "./base";
import type {
  BackgroundStepStatus,
  DispatchProgress,
  DispatchScan,
  EligibleUser,
  JobCard,
  JobCardActionCompletion,
  JobCardApproval,
  JobCardDocument,
  PendingBackgroundStep,
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
      data: { signatureDataUrl?: string; comments?: string },
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
    backgroundStepConfigs(): Promise<WorkflowStepConfig[]>;
    backgroundStepsForJobCard(jobCardId: number): Promise<BackgroundStepStatus[]>;
    completeBackgroundStep(jobCardId: number, stepKey: string, notes?: string): Promise<void>;
    pendingBackgroundSteps(): Promise<PendingBackgroundStep[]>;
    workflowAssignments(): Promise<WorkflowStepAssignment[]>;
    eligibleUsersForStep(step: string): Promise<EligibleUser[]>;
    updateWorkflowAssignments(
      step: string,
      userIds: number[],
      primaryUserId?: number,
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

proto.downloadSignedJobCardPdf = async function (jobCardId) {
  const h = this.headers();
  const cacheBuster = Date.now();
  const response = await fetch(
    `${API_BASE_URL}/stock-control/workflow/job-cards/${jobCardId}/print?_t=${cacheBuster}`,
    { headers: { Authorization: h.Authorization ?? "" }, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Failed to download signed job card PDF: ${response.status}`);
  }

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

proto.backgroundStepConfigs = async function () {
  return this.request("/stock-control/workflow/step-configs/background");
};

proto.backgroundStepsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/background-steps`);
};

proto.completeBackgroundStep = async function (jobCardId, stepKey, notes) {
  return this.request(
    `/stock-control/workflow/job-cards/${jobCardId}/background-steps/${encodeURIComponent(stepKey)}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
  );
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

proto.updateWorkflowAssignments = async function (step, userIds, primaryUserId) {
  return this.request(`/stock-control/workflow/assignments/${encodeURIComponent(step)}`, {
    method: "PUT",
    body: JSON.stringify({ userIds, primaryUserId }),
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
