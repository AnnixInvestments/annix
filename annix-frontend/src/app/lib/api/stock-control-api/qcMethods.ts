import { StockControlApiClient } from "./base";
import type {
  QcBlastProfileRecord,
  QcControlPlanRecord,
  QcDftReadingRecord,
  QcDustDebrisRecord,
  QcItemsReleaseRecord,
  QcMeasurementsAggregate,
  QcPullTestRecord,
  QcReleaseCertificateRecord,
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
