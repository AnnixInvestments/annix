import { StockControlApiClient } from "./base";
import type {
  CpoReleasableItem,
  CpoReleaseDocumentsResult,
  QcBlastProfileRecord,
  QcControlPlanRecord,
  QcDefelskoBatchRecord,
  QcDftReadingRecord,
  QcDustDebrisRecord,
  QcEnvironmentalRecordResponse,
  QcItemsReleaseRecord,
  QcMeasurementsAggregate,
  QcPullTestRecord,
  QcpApprovalTokenRecord,
  QcpCustomerPreferenceRecord,
  QcReleaseCertificateRecord,
  QcReleaseDocumentsResult,
  QcShoreHardnessRecord,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    qcMeasurementsForJobCard(jobCardId: number): Promise<QcMeasurementsAggregate>;
    createShoreHardness(
      jobCardId: number,
      data: Partial<QcShoreHardnessRecord>,
    ): Promise<QcShoreHardnessRecord>;
    updateShoreHardness(
      jobCardId: number,
      id: number,
      data: Partial<QcShoreHardnessRecord>,
    ): Promise<QcShoreHardnessRecord>;
    deleteShoreHardness(jobCardId: number, id: number): Promise<void>;
    createDftReading(
      jobCardId: number,
      data: Partial<QcDftReadingRecord>,
    ): Promise<QcDftReadingRecord>;
    updateDftReading(
      jobCardId: number,
      id: number,
      data: Partial<QcDftReadingRecord>,
    ): Promise<QcDftReadingRecord>;
    deleteDftReading(jobCardId: number, id: number): Promise<void>;
    createBlastProfile(
      jobCardId: number,
      data: Partial<QcBlastProfileRecord>,
    ): Promise<QcBlastProfileRecord>;
    updateBlastProfile(
      jobCardId: number,
      id: number,
      data: Partial<QcBlastProfileRecord>,
    ): Promise<QcBlastProfileRecord>;
    deleteBlastProfile(jobCardId: number, id: number): Promise<void>;
    createDustDebrisTest(
      jobCardId: number,
      data: Partial<QcDustDebrisRecord>,
    ): Promise<QcDustDebrisRecord>;
    updateDustDebrisTest(
      jobCardId: number,
      id: number,
      data: Partial<QcDustDebrisRecord>,
    ): Promise<QcDustDebrisRecord>;
    deleteDustDebrisTest(jobCardId: number, id: number): Promise<void>;
    createPullTest(jobCardId: number, data: Partial<QcPullTestRecord>): Promise<QcPullTestRecord>;
    updatePullTest(
      jobCardId: number,
      id: number,
      data: Partial<QcPullTestRecord>,
    ): Promise<QcPullTestRecord>;
    deletePullTest(jobCardId: number, id: number): Promise<void>;
    releaseCertificatesForJobCard(jobCardId: number): Promise<QcReleaseCertificateRecord[]>;
    releaseCertificateById(jobCardId: number, id: number): Promise<QcReleaseCertificateRecord>;
    createReleaseCertificate(
      jobCardId: number,
      data: Partial<QcReleaseCertificateRecord>,
    ): Promise<QcReleaseCertificateRecord>;
    updateReleaseCertificate(
      jobCardId: number,
      id: number,
      data: Partial<QcReleaseCertificateRecord>,
    ): Promise<QcReleaseCertificateRecord>;
    deleteReleaseCertificate(jobCardId: number, id: number): Promise<void>;
    controlPlansForJobCard(jobCardId: number): Promise<QcControlPlanRecord[]>;
    autoGenerateControlPlans(jobCardId: number): Promise<QcControlPlanRecord[]>;
    controlPlanById(jobCardId: number, id: number): Promise<QcControlPlanRecord>;
    createControlPlan(
      jobCardId: number,
      data: Partial<QcControlPlanRecord>,
    ): Promise<QcControlPlanRecord>;
    updateControlPlan(
      jobCardId: number,
      id: number,
      data: Partial<QcControlPlanRecord>,
    ): Promise<QcControlPlanRecord>;
    deleteControlPlan(jobCardId: number, id: number): Promise<void>;
    itemsReleasesForJobCard(jobCardId: number): Promise<QcItemsReleaseRecord[]>;
    autoPopulateItemsRelease(jobCardId: number): Promise<QcItemsReleaseRecord>;
    autoGenerateReleaseDocuments(
      jobCardId: number,
      selectedItemIndices: number[],
      quantityOverrides?: Record<number, number>,
    ): Promise<QcReleaseDocumentsResult>;
    createItemsRelease(
      jobCardId: number,
      data: Partial<QcItemsReleaseRecord>,
    ): Promise<QcItemsReleaseRecord>;
    updateItemsRelease(
      jobCardId: number,
      id: number,
      data: Partial<QcItemsReleaseRecord>,
    ): Promise<QcItemsReleaseRecord>;
    deleteItemsRelease(jobCardId: number, id: number): Promise<void>;
    openReleaseCertificatePdf(jobCardId: number, id: number): Promise<Blob>;
    openItemsReleasePdf(jobCardId: number, id: number): Promise<Blob>;
    openControlPlanPdf(jobCardId: number, id: number): Promise<Blob>;
    sendControlPlanForApproval(
      jobCardId: number,
      planId: number,
      clientEmail: string,
    ): Promise<QcpApprovalTokenRecord>;
    cancelControlPlanApproval(jobCardId: number, planId: number): Promise<{ cancelled: boolean }>;
    resendControlPlanApproval(
      jobCardId: number,
      planId: number,
      partyRole: "mps" | "client" | "third_party",
    ): Promise<QcpApprovalTokenRecord>;
    controlPlanApprovalHistory(
      jobCardId: number,
      planId: number,
    ): Promise<QcpApprovalTokenRecord[]>;
    customerQcpPreferences(customerName: string): Promise<QcpCustomerPreferenceRecord>;
    qcpLog(search?: string): Promise<QcControlPlanRecord[]>;
    controlPlansForCpo(cpoId: number): Promise<QcControlPlanRecord[]>;
    autoGenerateControlPlansForCpo(cpoId: number): Promise<QcControlPlanRecord[]>;
    updateControlPlanForCpo(
      cpoId: number,
      id: number,
      data: Partial<QcControlPlanRecord>,
    ): Promise<QcControlPlanRecord>;
    deleteControlPlanForCpo(cpoId: number, id: number): Promise<void>;
    openControlPlanPdfForCpo(cpoId: number, id: number): Promise<Blob>;
    itemsReleasesForCpo(cpoId: number): Promise<QcItemsReleaseRecord[]>;
    releasableItemsForCpo(cpoId: number): Promise<{ items: CpoReleasableItem[] }>;
    autoGenerateReleaseDocumentsForCpo(
      cpoId: number,
      selectedItems: {
        itemCode: string;
        description: string;
        quantity: number;
        jobCardId: number;
      }[],
    ): Promise<CpoReleaseDocumentsResult>;
    openItemsReleasePdfForCpo(cpoId: number, id: number): Promise<Blob>;
    environmentalRecordsForJobCard(jobCardId: number): Promise<QcEnvironmentalRecordResponse[]>;
    environmentalRecordByDate(
      jobCardId: number,
      date: string,
    ): Promise<QcEnvironmentalRecordResponse | null>;
    createEnvironmentalRecord(
      jobCardId: number,
      data: Partial<QcEnvironmentalRecordResponse>,
    ): Promise<QcEnvironmentalRecordResponse>;
    bulkCreateEnvironmentalRecords(
      jobCardId: number,
      records: Array<Partial<QcEnvironmentalRecordResponse>>,
    ): Promise<QcEnvironmentalRecordResponse[]>;
    updateEnvironmentalRecord(
      jobCardId: number,
      id: number,
      data: Partial<QcEnvironmentalRecordResponse>,
    ): Promise<QcEnvironmentalRecordResponse>;
    deleteEnvironmentalRecord(jobCardId: number, id: number): Promise<void>;
    defelskoBatchesForJobCard(jobCardId: number): Promise<QcDefelskoBatchRecord[]>;
    saveDefelskoBatches(
      jobCardId: number,
      data: {
        batches: Array<{
          fieldKey: string;
          category: string;
          label: string;
          batchNumber: string | null;
          notApplicable: boolean;
        }>;
      },
    ): Promise<QcDefelskoBatchRecord[]>;
  }
}

const proto = StockControlApiClient.prototype;

proto.qcMeasurementsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc`);
};

proto.createShoreHardness = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/shore-hardness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateShoreHardness = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/shore-hardness/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteShoreHardness = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/shore-hardness/${id}`, {
    method: "DELETE",
  });
};

proto.createDftReading = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/dft-readings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateDftReading = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/dft-readings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteDftReading = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/dft-readings/${id}`, {
    method: "DELETE",
  });
};

proto.createBlastProfile = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/blast-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateBlastProfile = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/blast-profiles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteBlastProfile = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/blast-profiles/${id}`, {
    method: "DELETE",
  });
};

proto.createDustDebrisTest = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/dust-debris`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateDustDebrisTest = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/dust-debris/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteDustDebrisTest = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/dust-debris/${id}`, {
    method: "DELETE",
  });
};

proto.createPullTest = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/pull-tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updatePullTest = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/pull-tests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deletePullTest = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/pull-tests/${id}`, {
    method: "DELETE",
  });
};

proto.releaseCertificatesForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/release-certificates`);
};

proto.releaseCertificateById = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/release-certificates/${id}`);
};

proto.createReleaseCertificate = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/release-certificates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateReleaseCertificate = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/release-certificates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteReleaseCertificate = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/release-certificates/${id}`, {
    method: "DELETE",
  });
};

proto.controlPlansForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/control-plans`);
};

proto.autoGenerateControlPlans = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/control-plans/auto-generate`, {
    method: "POST",
  });
};

proto.controlPlanById = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/control-plans/${id}`);
};

proto.createControlPlan = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/control-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateControlPlan = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/control-plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteControlPlan = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/control-plans/${id}`, {
    method: "DELETE",
  });
};

proto.itemsReleasesForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/items-releases`);
};

proto.autoPopulateItemsRelease = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/items-releases/auto-populate`, {
    method: "POST",
  });
};

proto.autoGenerateReleaseDocuments = async function (
  jobCardId,
  selectedItemIndices,
  quantityOverrides,
) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/release-documents/auto-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedItemIndices, quantityOverrides }),
  });
};

proto.createItemsRelease = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/items-releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateItemsRelease = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/items-releases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteItemsRelease = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/items-releases/${id}`, {
    method: "DELETE",
  });
};

proto.openReleaseCertificatePdf = async function (jobCardId, id) {
  return this.requestBlob(
    `/stock-control/job-cards/${jobCardId}/qc/release-certificates/${id}/pdf`,
  );
};

proto.openItemsReleasePdf = async function (jobCardId, id) {
  return this.requestBlob(`/stock-control/job-cards/${jobCardId}/qc/items-releases/${id}/pdf`);
};

proto.openControlPlanPdf = async function (jobCardId, id) {
  return this.requestBlob(`/stock-control/job-cards/${jobCardId}/qc/control-plans/${id}/pdf`);
};

proto.qcpLog = async function (search) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return this.request(`/stock-control/qcp-log${params}`);
};

proto.environmentalRecordsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/environmental-records`);
};

proto.environmentalRecordByDate = async function (jobCardId, date) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/environmental-records/by-date?date=${encodeURIComponent(date)}`,
  );
};

proto.createEnvironmentalRecord = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/environmental-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.bulkCreateEnvironmentalRecords = async function (jobCardId, records) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/environmental-records/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
};

proto.updateEnvironmentalRecord = async function (jobCardId, id, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/environmental-records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteEnvironmentalRecord = async function (jobCardId, id) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/environmental-records/${id}`, {
    method: "DELETE",
  });
};

proto.defelskoBatchesForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/defelsko-batches`);
};

proto.saveDefelskoBatches = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/qc/defelsko-batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.sendControlPlanForApproval = async function (jobCardId, planId, clientEmail) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/control-plans/${planId}/send-for-approval`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientEmail }),
    },
  );
};

proto.cancelControlPlanApproval = async function (jobCardId, planId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/control-plans/${planId}/cancel-approval`,
    { method: "POST" },
  );
};

proto.resendControlPlanApproval = async function (jobCardId, planId, partyRole) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/control-plans/${planId}/resend-approval`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partyRole }),
    },
  );
};

proto.controlPlanApprovalHistory = async function (jobCardId, planId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/qc/control-plans/${planId}/approval-history`,
  );
};

proto.customerQcpPreferences = async function (customerName) {
  return this.request(
    `/stock-control/job-cards/0/qc/customer-qcp-preferences/${encodeURIComponent(customerName)}`,
  );
};

proto.controlPlansForCpo = async function (cpoId) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/control-plans`);
};

proto.autoGenerateControlPlansForCpo = async function (cpoId) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/control-plans/auto-generate`, {
    method: "POST",
  });
};

proto.updateControlPlanForCpo = async function (cpoId, id, data) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/control-plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteControlPlanForCpo = async function (cpoId, id) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/control-plans/${id}`, {
    method: "DELETE",
  });
};

proto.openControlPlanPdfForCpo = async function (cpoId, id) {
  return this.requestBlob(`/stock-control/cpos/${cpoId}/qc/control-plans/${id}/pdf`);
};

proto.itemsReleasesForCpo = async function (cpoId) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/items-releases`);
};

proto.releasableItemsForCpo = async function (cpoId) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/releasable-items`);
};

proto.autoGenerateReleaseDocumentsForCpo = async function (cpoId, selectedItems) {
  return this.request(`/stock-control/cpos/${cpoId}/qc/release-documents/auto-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedItems }),
  });
};

proto.openItemsReleasePdfForCpo = async function (cpoId, id) {
  return this.requestBlob(`/stock-control/cpos/${cpoId}/qc/items-releases/${id}/pdf`);
};
