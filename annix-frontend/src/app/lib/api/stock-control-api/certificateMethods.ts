import { StockControlApiClient } from "./base";
import type {
  CalibrationCertificate,
  DataBookCompleteness,
  DataBookStatus,
  IssuanceBatchRecord,
  QcMeasurementsAggregate,
  SupplierCertificate,
} from "./types";

export interface QualityTabBundle {
  certificates: SupplierCertificate[];
  calibrationCerts: CalibrationCertificate[];
  batchRecords: IssuanceBatchRecord[];
  dataBookStatus: DataBookStatus;
  qcMeasurements: QcMeasurementsAggregate;
  completeness: DataBookCompleteness;
}

declare module "./base" {
  interface StockControlApiClient {
    uploadCertificate(
      file: File,
      data: {
        supplierId: number;
        stockItemId?: number | null;
        jobCardId?: number | null;
        certificateType: string;
        batchNumber: string;
        description?: string | null;
        expiryDate?: string | null;
        pageNumbers?: number[] | null;
      },
    ): Promise<SupplierCertificate>;
    analyzeCertificateDocument(file: File): Promise<{
      certificates: Array<{
        supplierName: string | null;
        batchNumber: string | null;
        certificateType: "COA" | "COC" | null;
        productInfo: string | null;
        pageNumbers: number[];
        confidence: number;
      }>;
      totalPages: number;
      processingTimeMs: number;
    }>;
    dataBookStatusBulk(
      jobCardIds: number[],
    ): Promise<Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>>;
    certificates(filters?: {
      supplierId?: number;
      stockItemId?: number;
      jobCardId?: number;
      batchNumber?: string;
      certificateType?: string;
    }): Promise<SupplierCertificate[]>;
    certificateById(id: number): Promise<SupplierCertificate>;
    deleteCertificate(id: number): Promise<void>;
    backfillCertificateProducts(): Promise<{ processed: number }>;
    certificatesByBatchNumber(batchNumber: string): Promise<SupplierCertificate[]>;
    batchRecordsByBatchNumber(batchNumber: string): Promise<IssuanceBatchRecord[]>;
    certificatesForJobCard(jobCardId: number): Promise<SupplierCertificate[]>;
    batchRecordsForJobCard(jobCardId: number): Promise<IssuanceBatchRecord[]>;
    dataBookStatus(jobCardId: number): Promise<DataBookStatus>;
    dataBookCompleteness(jobCardId: number): Promise<DataBookCompleteness>;
    qualityTabBundle(jobCardId: number): Promise<QualityTabBundle>;
    compileDataBook(
      jobCardId: number,
      force?: boolean,
    ): Promise<{ id: number; certificateCount: number }>;
    downloadDataBook(jobCardId: number): Promise<Blob>;
    recentBatches(stockItemId: number): Promise<string[]>;
    uploadCalibrationCertificate(
      file: File,
      data: {
        equipmentName: string;
        equipmentIdentifier?: string | null;
        certificateNumber?: string | null;
        description?: string | null;
        expiryDate: string;
      },
    ): Promise<CalibrationCertificate>;
    calibrationCertificates(filters?: { active?: boolean }): Promise<CalibrationCertificate[]>;
    calibrationCertificateById(id: number): Promise<CalibrationCertificate>;
    updateCalibrationCertificate(
      id: number,
      data: {
        equipmentName?: string;
        equipmentIdentifier?: string | null;
        certificateNumber?: string | null;
        description?: string | null;
        expiryDate?: string;
      },
    ): Promise<CalibrationCertificate>;
    deactivateCalibrationCertificate(id: number): Promise<CalibrationCertificate>;
    deleteCalibrationCertificate(id: number): Promise<{ deleted: boolean }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.uploadCertificate = async function (file, data) {
  const extraFields: Record<string, string> = {
    supplierId: String(data.supplierId),
    certificateType: data.certificateType,
    batchNumber: data.batchNumber,
  };
  if (data.stockItemId) extraFields.stockItemId = String(data.stockItemId);
  if (data.jobCardId) extraFields.jobCardId = String(data.jobCardId);
  if (data.description) extraFields.description = data.description;
  if (data.expiryDate) extraFields.expiryDate = data.expiryDate;
  if (data.pageNumbers && data.pageNumbers.length > 0)
    extraFields.pageNumbers = JSON.stringify(data.pageNumbers);

  return this.uploadFile("/stock-control/certificates", file, extraFields);
};

proto.analyzeCertificateDocument = async function (file) {
  return this.uploadFile("/stock-control/certificates/analyze", file);
};

proto.dataBookStatusBulk = async function (jobCardIds) {
  return this.request("/stock-control/certificates/data-book-status-bulk", {
    method: "POST",
    body: JSON.stringify({ jobCardIds }),
  });
};

proto.certificates = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
  if (filters?.stockItemId) params.set("stockItemId", String(filters.stockItemId));
  if (filters?.jobCardId) params.set("jobCardId", String(filters.jobCardId));
  if (filters?.batchNumber) params.set("batchNumber", filters.batchNumber);
  if (filters?.certificateType) params.set("certificateType", filters.certificateType);

  const qs = params.toString();
  return this.request(`/stock-control/certificates${qs ? `?${qs}` : ""}`);
};

proto.certificateById = async function (id) {
  return this.request(`/stock-control/certificates/${id}`);
};

proto.deleteCertificate = async function (id) {
  return this.request(`/stock-control/certificates/${id}`, { method: "DELETE" });
};

proto.backfillCertificateProducts = async function () {
  return this.request("/stock-control/certificates/backfill-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
};

proto.certificatesByBatchNumber = async function (batchNumber) {
  return this.request(`/stock-control/certificates/batch/${encodeURIComponent(batchNumber)}`);
};

proto.batchRecordsByBatchNumber = async function (batchNumber) {
  return this.request(
    `/stock-control/certificates/batch/${encodeURIComponent(batchNumber)}/records`,
  );
};

proto.certificatesForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/certificates/job-card/${jobCardId}`);
};

proto.batchRecordsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/certificates/job-card/${jobCardId}/batch-records`);
};

proto.dataBookStatus = async function (jobCardId) {
  return this.request(`/stock-control/certificates/job-card/${jobCardId}/data-book/status`);
};

proto.dataBookCompleteness = async function (jobCardId) {
  return this.request(`/stock-control/certificates/job-card/${jobCardId}/data-book/completeness`);
};

proto.qualityTabBundle = async function (jobCardId) {
  return this.request(`/stock-control/certificates/job-card/${jobCardId}/quality-tab-bundle`);
};

proto.compileDataBook = async function (jobCardId, force = false) {
  return this.request(`/stock-control/certificates/job-card/${jobCardId}/data-book`, {
    method: "POST",
    body: JSON.stringify({ force }),
  });
};

proto.downloadDataBook = async function (jobCardId) {
  return this.requestBlob(`/stock-control/certificates/job-card/${jobCardId}/data-book`);
};

proto.recentBatches = async function (stockItemId) {
  return this.request(`/stock-control/certificates/recent-batches/${stockItemId}`);
};

proto.uploadCalibrationCertificate = async function (file, data) {
  const extraFields: Record<string, string> = {
    equipmentName: data.equipmentName,
    expiryDate: data.expiryDate,
  };
  if (data.equipmentIdentifier) extraFields.equipmentIdentifier = data.equipmentIdentifier;
  if (data.certificateNumber) extraFields.certificateNumber = data.certificateNumber;
  if (data.description) extraFields.description = data.description;

  return this.uploadFile("/stock-control/calibration-certificates", file, extraFields);
};

proto.calibrationCertificates = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.active !== undefined) params.set("active", String(filters.active));
  const query = params.toString();
  return this.request(`/stock-control/calibration-certificates${query ? `?${query}` : ""}`);
};

proto.calibrationCertificateById = async function (id) {
  return this.request(`/stock-control/calibration-certificates/${id}`);
};

proto.updateCalibrationCertificate = async function (id, data) {
  return this.request(`/stock-control/calibration-certificates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

proto.deactivateCalibrationCertificate = async function (id) {
  return this.request(`/stock-control/calibration-certificates/${id}/deactivate`, {
    method: "POST",
  });
};

proto.deleteCalibrationCertificate = async function (id) {
  return this.request(`/stock-control/calibration-certificates/${id}`, { method: "DELETE" });
};
