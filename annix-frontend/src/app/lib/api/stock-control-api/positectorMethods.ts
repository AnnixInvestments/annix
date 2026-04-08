import { StockControlApiClient } from "./base";
import type {
  PositectorBatchDetail,
  PositectorBatchSummary,
  PositectorConnectionStatus,
  PositectorDevice,
  PositectorImportResult,
  PositectorStreamingSaveResult,
  PositectorStreamingSession,
  PositectorUploadRecord,
  PositectorUploadResponse,
  QcBatchAssignment,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    positectorDevices(filters?: { active?: boolean }): Promise<PositectorDevice[]>;
    positectorDeviceById(id: number): Promise<PositectorDevice>;
    registerPositectorDevice(data: {
      deviceName: string;
      ipAddress: string;
      port?: number;
      probeType?: string | null;
      serialNumber?: string | null;
    }): Promise<PositectorDevice>;
    updatePositectorDevice(
      id: number,
      data: Partial<{
        deviceName: string;
        ipAddress: string;
        port: number;
        probeType: string | null;
        serialNumber: string | null;
        isActive: boolean;
      }>,
    ): Promise<PositectorDevice>;
    deletePositectorDevice(id: number): Promise<void>;
    checkPositectorConnection(id: number): Promise<PositectorConnectionStatus>;
    positectorBatches(deviceId: number): Promise<PositectorBatchSummary[]>;
    positectorBatch(deviceId: number, buid: string): Promise<PositectorBatchDetail>;
    importPositectorBatch(
      deviceId: number,
      buid: string,
      data: {
        jobCardId: number;
        entityType: string;
        coatType?: string;
        paintProduct?: string;
        batchNumber?: string | null;
        specMinMicrons?: number;
        specMaxMicrons?: number;
        specMicrons?: number;
        temperature?: number | null;
        humidity?: number | null;
        rubberSpec?: string;
        rubberBatchNumber?: string | null;
        requiredShore?: number;
      },
    ): Promise<PositectorImportResult>;
    uploadPositectorFile(file: File): Promise<PositectorUploadResponse>;
    positectorUploads(filters?: {
      unlinked?: boolean;
      entityType?: string;
    }): Promise<PositectorUploadRecord[]>;
    positectorUploadById(uploadId: number): Promise<PositectorUploadRecord>;
    positectorUploadDownloadUrl(uploadId: number): Promise<{ url: string }>;
    linkPositectorUpload(
      uploadId: number,
      data: {
        jobCardId: number;
        coatType?: string;
        paintProduct?: string;
        specMinMicrons?: number;
        specMaxMicrons?: number;
        specMicrons?: number;
        rubberSpec?: string;
        rubberBatchNumber?: string | null;
        requiredShore?: number;
      },
    ): Promise<PositectorImportResult & { uploadId: number }>;
    uploadAndImportPositectorFile(
      file: File,
      data: {
        jobCardId: number;
        entityType: string;
        coatType?: string;
        paintProduct?: string;
        batchNumber?: string | null;
        specMinMicrons?: number;
        specMaxMicrons?: number;
        specMicrons?: number;
        temperature?: number | null;
        humidity?: number | null;
        rubberSpec?: string;
        rubberBatchNumber?: string | null;
        requiredShore?: number;
      },
    ): Promise<PositectorImportResult>;
    startPositectorStreamingSession(data: {
      deviceId: number;
      jobCardId: number;
      entityType: "dft" | "blast_profile" | "shore_hardness";
      coatType?: string;
      paintProduct?: string;
      batchNumber?: string | null;
      specMinMicrons?: number;
      specMaxMicrons?: number;
      specMicrons?: number;
      rubberSpec?: string;
      rubberBatchNumber?: string | null;
      requiredShore?: number;
    }): Promise<PositectorStreamingSession>;
    positectorStreamingSessions(): Promise<PositectorStreamingSession[]>;
    positectorStreamingSession(sessionId: string): Promise<PositectorStreamingSession>;
    endPositectorStreamingSession(sessionId: string): Promise<PositectorStreamingSaveResult>;
    discardPositectorStreamingSession(sessionId: string): Promise<{ discarded: boolean }>;
    addPositectorStreamingReading(
      sessionId: string,
      data: { value: number; units?: string | null },
    ): Promise<{ received: boolean; readingCount: number }>;
    positectorStreamingEventsUrl(sessionId: string): string;
    positectorWebhookUrl(companyId: number, deviceId: number): string;
    positectorUploadsForJobCard(jobCardId: number): Promise<PositectorUploadRecord[]>;
    batchAssignmentsForJobCard(jobCardId: number): Promise<QcBatchAssignment[]>;
    saveBatchAssignment(
      jobCardId: number,
      data: {
        fieldKey: string;
        category: string;
        label: string;
        batchNumber: string;
        lineItemIds: number[];
        notApplicable?: boolean;
      },
    ): Promise<QcBatchAssignment[]>;
    removeBatchAssignment(jobCardId: number, assignmentId: number): Promise<{ deleted: boolean }>;
    unassignedItemsForField(jobCardId: number, fieldKey: string): Promise<number[]>;
  }
}

const proto = StockControlApiClient.prototype;

proto.positectorDevices = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.active !== undefined) params.set("active", String(filters.active));
  const query = params.toString();
  return this.request(`/stock-control/positector-devices${query ? `?${query}` : ""}`);
};

proto.positectorDeviceById = async function (id) {
  return this.request(`/stock-control/positector-devices/${id}`);
};

proto.registerPositectorDevice = async function (data) {
  return this.request("/stock-control/positector-devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updatePositectorDevice = async function (id, data) {
  return this.request(`/stock-control/positector-devices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deletePositectorDevice = async function (id) {
  return this.request(`/stock-control/positector-devices/${id}`, { method: "DELETE" });
};

proto.checkPositectorConnection = async function (id) {
  return this.request(`/stock-control/positector-devices/${id}/check-connection`, {
    method: "POST",
  });
};

proto.positectorBatches = async function (deviceId) {
  return this.request(`/stock-control/positector-devices/${deviceId}/batches`);
};

proto.positectorBatch = async function (deviceId, buid) {
  return this.request(`/stock-control/positector-devices/${deviceId}/batches/${buid}`);
};

proto.importPositectorBatch = async function (deviceId, buid, data) {
  return this.request(`/stock-control/positector-devices/${deviceId}/batches/${buid}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.uploadPositectorFile = async function (file) {
  return this.uploadFile("/stock-control/positector-devices/upload", file);
};

proto.positectorUploads = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.unlinked) params.set("unlinked", "true");
  if (filters?.entityType) params.set("entityType", filters.entityType);
  const query = params.toString();
  return this.request(`/stock-control/positector-devices/uploads${query ? `?${query}` : ""}`);
};

proto.positectorUploadById = async function (uploadId) {
  return this.request(`/stock-control/positector-devices/uploads/${uploadId}`);
};

proto.positectorUploadDownloadUrl = async function (uploadId) {
  return this.request(`/stock-control/positector-devices/uploads/${uploadId}/download-url`);
};

proto.linkPositectorUpload = async function (uploadId, data) {
  return this.request(`/stock-control/positector-devices/uploads/${uploadId}/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.uploadAndImportPositectorFile = async function (file, data) {
  const extraFields: Record<string, string> = {
    jobCardId: String(data.jobCardId),
    entityType: data.entityType,
  };
  if (data.coatType) extraFields.coatType = data.coatType;
  if (data.paintProduct) extraFields.paintProduct = data.paintProduct;
  if (data.batchNumber) extraFields.batchNumber = data.batchNumber;
  if (data.specMinMicrons !== undefined) extraFields.specMinMicrons = String(data.specMinMicrons);
  if (data.specMaxMicrons !== undefined) extraFields.specMaxMicrons = String(data.specMaxMicrons);
  if (data.specMicrons !== undefined) extraFields.specMicrons = String(data.specMicrons);
  if (data.temperature !== undefined && data.temperature !== null)
    extraFields.temperature = String(data.temperature);
  if (data.humidity !== undefined && data.humidity !== null)
    extraFields.humidity = String(data.humidity);
  if (data.rubberSpec) extraFields.rubberSpec = data.rubberSpec;
  if (data.rubberBatchNumber) extraFields.rubberBatchNumber = data.rubberBatchNumber;
  if (data.requiredShore !== undefined) extraFields.requiredShore = String(data.requiredShore);

  return this.uploadFile("/stock-control/positector-devices/upload/import", file, extraFields);
};

proto.startPositectorStreamingSession = async function (data) {
  return this.request("/stock-control/positector-streaming/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.positectorStreamingSessions = async function () {
  return this.request("/stock-control/positector-streaming/sessions");
};

proto.positectorStreamingSession = async function (sessionId) {
  return this.request(`/stock-control/positector-streaming/sessions/${sessionId}`);
};

proto.endPositectorStreamingSession = async function (sessionId) {
  return this.request(`/stock-control/positector-streaming/sessions/${sessionId}/end`, {
    method: "POST",
  });
};

proto.discardPositectorStreamingSession = async function (sessionId) {
  return this.request(`/stock-control/positector-streaming/sessions/${sessionId}`, {
    method: "DELETE",
  });
};

proto.addPositectorStreamingReading = async function (sessionId, data) {
  return this.request(`/stock-control/positector-streaming/sessions/${sessionId}/readings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.positectorStreamingEventsUrl = function (sessionId) {
  return `${this.baseURL}/stock-control/positector-streaming/sessions/${sessionId}/events`;
};

proto.positectorUploadsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/positector-uploads`);
};

proto.positectorWebhookUrl = function (companyId, deviceId) {
  return (
    `${this.baseURL}/stock-control/positector-streaming/webhook` +
    `?company=${companyId}&device=${deviceId}` +
    "&value=[thickness]&units=[units]&probe=[probetype]&serial=[gagesn]"
  );
};

proto.batchAssignmentsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/batch-assignments`);
};

proto.saveBatchAssignment = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/batch-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.removeBatchAssignment = async function (jobCardId, assignmentId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/batch-assignments/${assignmentId}`,
    {
      method: "DELETE",
    },
  );
};

proto.unassignedItemsForField = async function (jobCardId, fieldKey) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/batch-assignments/unassigned/${fieldKey}`,
  );
};
