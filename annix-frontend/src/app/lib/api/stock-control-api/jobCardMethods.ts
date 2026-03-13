import { StockControlApiClient } from "./base";
import type {
  CoatingAnalysis,
  ImportMappingConfig,
  JobCard,
  JobCardAttachment,
  JobCardImportMapping,
  JobCardImportResult,
  JobCardImportRow,
  JobCardImportUploadResponse,
  M2Result,
  RubberDimensionOverride,
  RubberPlanOverride,
  RubberStockOptionsResponse,
  StockAllocation,
  UnverifiedProduct,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    jobCards(status?: string): Promise<JobCard[]>;
    jobCardById(id: number): Promise<JobCard>;
    createJobCard(data: Partial<JobCard>): Promise<JobCard>;
    updateJobCard(id: number, data: Partial<JobCard>): Promise<JobCard>;
    deleteJobCard(id: number): Promise<void>;
    allocateStock(
      jobCardId: number,
      data: {
        stockItemId: number;
        quantityUsed: number;
        photoUrl?: string;
        notes?: string;
        staffMemberId?: number;
      },
    ): Promise<StockAllocation>;
    jobCardAllocations(jobCardId: number): Promise<StockAllocation[]>;
    jobCardCoatingAnalysis(jobCardId: number): Promise<CoatingAnalysis | null>;
    updateCoatingSurfaceArea(jobCardId: number, extM2: number, intM2: number): Promise<CoatingAnalysis>;
    triggerCoatingAnalysis(jobCardId: number): Promise<CoatingAnalysis>;
    acceptCoatingAnalysis(jobCardId: number): Promise<CoatingAnalysis>;
    unverifiedCoatingProducts(jobCardId: number): Promise<UnverifiedProduct[]>;
    uploadCoatingTds(jobCardId: number, file: File): Promise<CoatingAnalysis>;
    rubberStockOptions(jobCardId: number): Promise<RubberStockOptionsResponse>;
    updateRubberPlan(jobCardId: number, override: RubberPlanOverride): Promise<JobCard>;
    markOffcutAsWastage(
      jobCardId: number,
      data: {
        widthMm: number;
        lengthMm: number;
        thicknessMm: number;
        color: string | null;
        specificGravity: number;
      },
    ): Promise<{ weightKg: number; stockItemId: number }>;
    rubberDimensionSuggestions(params: {
      itemType?: string | null;
      nbMm?: number | null;
      schedule?: string | null;
      pipeLengthMm: number;
      flangeConfig?: string | null;
    }): Promise<RubberDimensionOverride[]>;
    uploadAllocationPhoto(jobCardId: number, allocationId: number, file: File): Promise<StockAllocation>;
    pendingAllocations(): Promise<StockAllocation[]>;
    approveOverAllocation(jobCardId: number, allocationId: number): Promise<StockAllocation>;
    rejectOverAllocation(jobCardId: number, allocationId: number, reason: string): Promise<StockAllocation>;
    uploadJobCardAmendment(jobCardId: number, file: File, notes?: string): Promise<JobCard>;
    jobCardVersionHistory(jobCardId: number): Promise<import("./types").JobCardVersion[]>;
    jobCardVersionById(jobCardId: number, versionId: number): Promise<import("./types").JobCardVersion>;
    jobCardAttachments(jobCardId: number): Promise<JobCardAttachment[]>;
    uploadJobCardAttachment(jobCardId: number, file: File, notes?: string): Promise<JobCardAttachment>;
    triggerDrawingExtraction(jobCardId: number, attachmentId: number): Promise<JobCardAttachment>;
    extractAllDrawings(jobCardId: number): Promise<Record<string, unknown>>;
    deleteJobCardAttachment(jobCardId: number, attachmentId: number): Promise<void>;
    deliveryJobCards(parentJobCardId: number): Promise<JobCard[]>;
    uploadJobCardImportFile(file: File): Promise<JobCardImportUploadResponse>;
    uploadDrawingFiles(files: File[]): Promise<JobCardImportUploadResponse>;
    jobCardImportMapping(): Promise<JobCardImportMapping | null>;
    saveJobCardImportMapping(mappingConfig: ImportMappingConfig): Promise<JobCardImportMapping>;
    calculateM2(descriptions: string[]): Promise<M2Result[]>;
    autoDetectJobCardMapping(grid: string[][]): Promise<ImportMappingConfig>;
    confirmJobCardImport(rows: JobCardImportRow[]): Promise<JobCardImportResult>;
    confirmDeliveryMatches(
      jobCardId: number,
      matches: { deliveryItemId: number; cpoItemId: number }[],
    ): Promise<{ success: boolean }>;
    downloadJobCardQrPdf(id: number): Promise<void>;
  }
}

const proto = StockControlApiClient.prototype;

proto.jobCards = async function (status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return this.request(`/stock-control/job-cards${query}`);
};

proto.jobCardById = async function (id) {
  return this.request(`/stock-control/job-cards/${id}`);
};

proto.createJobCard = async function (data) {
  return this.request("/stock-control/job-cards", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.updateJobCard = async function (id, data) {
  return this.request(`/stock-control/job-cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.deleteJobCard = async function (id) {
  return this.request(`/stock-control/job-cards/${id}`, { method: "DELETE" });
};

proto.allocateStock = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/allocate`, {
    method: "POST",
    body: JSON.stringify({ ...data, jobCardId }),
  });
};

proto.jobCardAllocations = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/allocations`);
};

proto.jobCardCoatingAnalysis = async function (jobCardId) {
  const result = await this.request<CoatingAnalysis | Record<string, never>>(
    `/stock-control/job-cards/${jobCardId}/coating-analysis`,
  );
  return result && "id" in result ? (result as CoatingAnalysis) : null;
};

proto.updateCoatingSurfaceArea = async function (jobCardId, extM2, intM2) {
  return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis/surface-area`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extM2, intM2 }),
  });
};

proto.triggerCoatingAnalysis = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis`, { method: "POST" });
};

proto.acceptCoatingAnalysis = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis/accept`, { method: "PATCH" });
};

proto.unverifiedCoatingProducts = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/coating-analysis/unverified`);
};

proto.uploadCoatingTds = async function (jobCardId, file) {
  return this.uploadFile(`/stock-control/job-cards/${jobCardId}/coating-analysis/verify-tds`, file);
};

proto.rubberStockOptions = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/rubber-stock-options`);
};

proto.updateRubberPlan = async function (jobCardId, override) {
  return this.request(`/stock-control/job-cards/${jobCardId}/rubber-plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(override),
  });
};

proto.markOffcutAsWastage = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/rubber-wastage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.rubberDimensionSuggestions = async function (params) {
  const searchParams = new URLSearchParams();
  if (params.itemType) searchParams.set("itemType", params.itemType);
  if (params.nbMm) searchParams.set("nbMm", String(params.nbMm));
  if (params.schedule) searchParams.set("schedule", params.schedule);
  searchParams.set("pipeLengthMm", String(params.pipeLengthMm));
  if (params.flangeConfig) searchParams.set("flangeConfig", params.flangeConfig);
  return this.request(
    `/stock-control/job-cards/rubber-dimension-suggestions?${searchParams.toString()}`,
  );
};

proto.uploadAllocationPhoto = async function (jobCardId, allocationId, file) {
  return this.uploadFile(`/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/photo`, file);
};

proto.pendingAllocations = async function () {
  return this.request("/stock-control/job-cards/allocations/pending");
};

proto.approveOverAllocation = async function (jobCardId, allocationId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/approve`,
    { method: "POST" },
  );
};

proto.rejectOverAllocation = async function (jobCardId, allocationId, reason) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
};

proto.uploadJobCardAmendment = async function (jobCardId, file, notes) {
  return this.uploadFile(`/stock-control/job-cards/${jobCardId}/amendment`, file, notes ? { notes } : undefined);
};

proto.jobCardVersionHistory = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/versions`);
};

proto.jobCardVersionById = async function (jobCardId, versionId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/versions/${versionId}`);
};

proto.jobCardAttachments = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/attachments`);
};

proto.uploadJobCardAttachment = async function (jobCardId, file, notes) {
  return this.uploadFile(`/stock-control/job-cards/${jobCardId}/attachments`, file, notes ? { notes } : undefined);
};

proto.triggerDrawingExtraction = async function (jobCardId, attachmentId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/attachments/${attachmentId}/extract`,
    { method: "POST" },
  );
};

proto.extractAllDrawings = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/extract-all`, { method: "POST" });
};

proto.deleteJobCardAttachment = async function (jobCardId, attachmentId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
};

proto.deliveryJobCards = async function (parentJobCardId) {
  return this.request(`/stock-control/job-cards/${parentJobCardId}/delivery-job-cards`);
};

proto.uploadJobCardImportFile = async function (file) {
  return this.uploadFile("/stock-control/job-card-import/upload", file);
};

proto.uploadDrawingFiles = async function (files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const url = `${this.baseURL}/stock-control/job-card-import/upload-drawings`;
  const { Authorization } = this.headers();
  let response = await fetch(url, {
    method: "POST",
    headers: { ...(Authorization ? { Authorization } : {}) },
    body: formData,
  });

  if (response.status === 401 && this.refreshToken) {
    const refreshed = await this.refreshAccessToken();
    if (refreshed) {
      const { Authorization: newAuth } = this.headers();
      response = await fetch(url, {
        method: "POST",
        headers: { ...(newAuth ? { Authorization: newAuth } : {}) },
        body: formData,
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drawing import failed: ${errorText}`);
  }

  return response.json();
};

proto.jobCardImportMapping = async function () {
  return this.request("/stock-control/job-card-import/mapping");
};

proto.saveJobCardImportMapping = async function (mappingConfig) {
  return this.request("/stock-control/job-card-import/mapping", {
    method: "POST",
    body: JSON.stringify({ mappingConfig }),
  });
};

proto.calculateM2 = async function (descriptions) {
  return this.request("/stock-control/job-card-import/calculate-m2", {
    method: "POST",
    body: JSON.stringify({ descriptions }),
  });
};

proto.autoDetectJobCardMapping = async function (grid) {
  return this.request("/stock-control/job-card-import/auto-detect", {
    method: "POST",
    body: JSON.stringify({ grid }),
  });
};

proto.confirmJobCardImport = async function (rows) {
  return this.request("/stock-control/job-card-import/confirm", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
};

proto.confirmDeliveryMatches = async function (jobCardId, matches) {
  return this.request("/stock-control/job-card-import/confirm-delivery-matches", {
    method: "POST",
    body: JSON.stringify({ jobCardId, matches }),
  });
};

proto.downloadJobCardQrPdf = async function (id) {
  return this.downloadBlob(`/stock-control/workflow/job-cards/${id}/print`, `job-card-${id}.pdf`);
};
