"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BackgroundStepStatus,
  CalibrationCertificate,
  CoatingAnalysis,
  DataBookCompleteness,
  DataBookStatus,
  IssuanceBatchRecord,
  QcBlastProfileRecord,
  QcDftReadingRecord,
  QcDustDebrisRecord,
  QcMeasurementsAggregate,
  QcPullTestRecord,
  QcShoreHardnessRecord,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import BlastProfileForm from "./BlastProfileForm";
import { DataBookCompletenessPanel } from "./DataBookCompletenessPanel";
import { DefelskoBatchSection } from "./DefelskoBatchSection";
import DftReadingForm from "./DftReadingForm";
import DustDebrisForm from "./DustDebrisForm";
import { ItemsReleaseSection } from "./ItemsReleaseSection";
import { PullTestForm } from "./PullTestForm";
import { QaFinalPhotosSection } from "./QaFinalPhotosSection";
import { QaReviewSection } from "./QaReviewSection";
import { QcpSection } from "./QcpSection";
import { QcReleaseCertificateSection } from "./QcReleaseCertificateSection";
import { ReleaseDocumentGenerator } from "./ReleaseDocumentGenerator";
import { ShoreHardnessForm } from "./ShoreHardnessForm";

type QcFormType = "shore-hardness" | "dft" | "blast-profile" | "dust-debris" | "pull-test" | null;

interface QualityTabProps {
  jobCardId: number;
  backgroundSteps: BackgroundStepStatus[];
  onBatchComplete: (() => void) | null;
  onQaReviewSubmitted: (() => void) | null;
  onFinalPhotosSaved: (() => void) | null;
}

export function QualityTab(props: QualityTabProps) {
  const { jobCardId, backgroundSteps, onBatchComplete, onQaReviewSubmitted, onFinalPhotosSaved } =
    props;
  const [certificates, setCertificates] = useState<SupplierCertificate[]>([]);
  const [calibrationCerts, setCalibrationCerts] = useState<CalibrationCertificate[]>([]);
  const [batchRecords, setBatchRecords] = useState<IssuanceBatchRecord[]>([]);
  const [dataBookStatus, setDataBookStatus] = useState<DataBookStatus | null>(null);
  const [coatingAnalysis, setCoatingAnalysis] = useState<CoatingAnalysis | null>(null);
  const [coatingLoaded, setCoatingLoaded] = useState(false);
  const [qcData, setQcData] = useState<QcMeasurementsAggregate | null>(null);
  const [completeness, setCompleteness] = useState<DataBookCompleteness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<QcFormType>(null);
  const [editingShoreHardness, setEditingShoreHardness] = useState<QcShoreHardnessRecord | null>(
    null,
  );
  const [editingDft, setEditingDft] = useState<QcDftReadingRecord | null>(null);
  const [editingBlast, setEditingBlast] = useState<QcBlastProfileRecord | null>(null);
  const [editingDust, setEditingDust] = useState<QcDustDebrisRecord | null>(null);
  const [editingPull, setEditingPull] = useState<QcPullTestRecord | null>(null);

  const fetchCoatingAnalysis = useCallback(async () => {
    try {
      const coatingRes = await stockControlApiClient.jobCardCoatingAnalysis(jobCardId);
      setCoatingAnalysis(coatingRes);
    } catch {
      setCoatingAnalysis(null);
    } finally {
      setCoatingLoaded(true);
    }
  }, [jobCardId]);

  const fetchQualityData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [certsRes, calCertsRes, recordsRes, statusRes, qcRes, completenessRes] =
        await Promise.all([
          stockControlApiClient.certificatesForJobCard(jobCardId),
          stockControlApiClient.calibrationCertificates({ active: true }),
          stockControlApiClient.batchRecordsForJobCard(jobCardId),
          stockControlApiClient.dataBookStatus(jobCardId),
          stockControlApiClient.qcMeasurementsForJobCard(jobCardId),
          stockControlApiClient.dataBookCompleteness(jobCardId),
        ]);
      setCertificates(Array.isArray(certsRes) ? certsRes : []);
      setCalibrationCerts(Array.isArray(calCertsRes) ? calCertsRes : []);
      setBatchRecords(Array.isArray(recordsRes) ? recordsRes : []);
      setDataBookStatus(statusRes);
      setQcData(qcRes);
      setCompleteness(completenessRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quality data");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchCoatingAnalysis();
    fetchQualityData();
  }, [fetchCoatingAnalysis, fetchQualityData]);

  const handleCompile = async (force = false) => {
    try {
      setIsCompiling(true);
      setError(null);
      setSuccess(null);
      const result = await stockControlApiClient.compileDataBook(jobCardId, force);
      setSuccess(`Data book compiled with ${result.certificateCount} certificates`);
      fetchQualityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile data book");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = async () => {
    try {
      setError(null);
      await stockControlApiClient.downloadDataBook(jobCardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download data book");
    }
  };

  const handleViewCertificate = async (id: number) => {
    try {
      const cert = await stockControlApiClient.certificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download URL");
    }
  };

  const handleFormClose = useCallback(() => {
    setActiveForm(null);
    setEditingShoreHardness(null);
    setEditingDft(null);
    setEditingBlast(null);
    setEditingDust(null);
    setEditingPull(null);
  }, []);

  const handleFormSaved = useCallback(() => {
    handleFormClose();
    fetchCoatingAnalysis();
    fetchQualityData();
  }, [handleFormClose, fetchCoatingAnalysis, fetchQualityData]);

  const handleDeleteQc = async (type: string, id: number) => {
    try {
      setError(null);
      if (type === "shore-hardness") {
        await stockControlApiClient.deleteShoreHardness(jobCardId, id);
      } else if (type === "dft") {
        await stockControlApiClient.deleteDftReading(jobCardId, id);
      } else if (type === "blast-profile") {
        await stockControlApiClient.deleteBlastProfile(jobCardId, id);
      } else if (type === "dust-debris") {
        await stockControlApiClient.deleteDustDebrisTest(jobCardId, id);
      } else if (type === "pull-test") {
        await stockControlApiClient.deletePullTest(jobCardId, id);
      }
      fetchQualityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  };

  const totalQcRecords =
    (qcData?.shoreHardness.length || 0) +
    (qcData?.dftReadings.length || 0) +
    (qcData?.blastProfiles.length || 0) +
    (qcData?.dustDebrisTests.length || 0) +
    (qcData?.pullTests.length || 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {coatingLoaded && (
        <DefelskoBatchSection
          jobCardId={jobCardId}
          coatingAnalysis={coatingAnalysis}
          onComplete={onBatchComplete}
        />
      )}

      <QaReviewSection
        jobCardId={jobCardId}
        backgroundSteps={backgroundSteps}
        onReviewSubmitted={onQaReviewSubmitted || (() => {})}
      />

      <QaFinalPhotosSection
        jobCardId={jobCardId}
        backgroundSteps={backgroundSteps}
        onPhotosSaved={onFinalPhotosSaved || (() => {})}
      />

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading quality data...</div>
      ) : (
        <>
          <div id="data-book-section">
            <DataBookCompletenessPanel
              completeness={completeness}
              dataBookStatus={dataBookStatus}
              isCompiling={isCompiling}
              onCompile={handleCompile}
              onDownload={handleDownload}
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">QC Measurements</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveForm("shore-hardness")}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  + Shore Hardness
                </button>
                <button
                  onClick={() => setActiveForm("dft")}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  + DFT
                </button>
                <button
                  onClick={() => setActiveForm("blast-profile")}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  + Blast Profile
                </button>
                <button
                  onClick={() => setActiveForm("dust-debris")}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  + Dust & Debris
                </button>
                <button
                  onClick={() => setActiveForm("pull-test")}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  + Pull Test
                </button>
              </div>
            </div>

            {totalQcRecords === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No QC measurements recorded yet. Use the buttons above to add records.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {(qcData?.shoreHardness || []).map((rec) => (
                  <div
                    key={`sh-${rec.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                        Shore
                      </span>
                      <span className="text-sm font-medium text-gray-900">{rec.rubberSpec}</span>
                      <span className="text-sm text-gray-500">
                        Avg: {rec.averages.overall?.toFixed(1) || "-"} / Required:{" "}
                        {rec.requiredShore}
                      </span>
                      {rec.averages.overall !== null &&
                        Math.abs(rec.averages.overall - rec.requiredShore) > 5 && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Out of spec
                          </span>
                        )}
                      <span className="text-xs text-gray-400">{rec.readingDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingShoreHardness(rec);
                          setActiveForm("shore-hardness");
                        }}
                        className="text-xs text-teal-600 hover:text-teal-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQc("shore-hardness", rec.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {(qcData?.dftReadings || []).map((rec) => (
                  <div
                    key={`dft-${rec.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          rec.coatType === "primer"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        DFT {rec.coatType === "primer" ? "Primer" : "Final"}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{rec.paintProduct}</span>
                      <span className="text-sm text-gray-500">
                        Avg: {rec.averageMicrons?.toFixed(1) || "-"} μm ({rec.specMinMicrons}-
                        {rec.specMaxMicrons})
                      </span>
                      {rec.averageMicrons !== null &&
                        (rec.averageMicrons < rec.specMinMicrons ||
                          rec.averageMicrons > rec.specMaxMicrons) && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Out of spec
                          </span>
                        )}
                      <span className="text-xs text-gray-400">{rec.readingDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDft(rec);
                          setActiveForm("dft");
                        }}
                        className="text-xs text-teal-600 hover:text-teal-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQc("dft", rec.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {(qcData?.blastProfiles || []).map((rec) => (
                  <div
                    key={`bp-${rec.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Blast
                      </span>
                      <span className="text-sm text-gray-500">
                        Avg: {rec.averageMicrons?.toFixed(1) || "-"} μm / Spec: {rec.specMicrons} μm
                      </span>
                      {rec.abrasiveBatchNumber && (
                        <span className="text-xs text-gray-500">
                          Batch: {rec.abrasiveBatchNumber}
                        </span>
                      )}
                      {rec.temperature !== null && (
                        <span className="text-xs text-gray-400">{rec.temperature}°C</span>
                      )}
                      {rec.humidity !== null && (
                        <span className="text-xs text-gray-400">{rec.humidity}% RH</span>
                      )}
                      <span className="text-xs text-gray-400">{rec.readingDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingBlast(rec);
                          setActiveForm("blast-profile");
                        }}
                        className="text-xs text-teal-600 hover:text-teal-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQc("blast-profile", rec.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {(qcData?.dustDebrisTests || []).map((rec) => {
                  const passCount = rec.tests.filter((t) => t.result === "pass").length;
                  const failCount = rec.tests.filter((t) => t.result === "fail").length;
                  return (
                    <div
                      key={`dd-${rec.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800">
                          Dust
                        </span>
                        <span className="text-sm text-gray-500">
                          {rec.tests.length} test{rec.tests.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-green-600">{passCount} pass</span>
                        {failCount > 0 && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            {failCount} fail
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{rec.readingDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingDust(rec);
                            setActiveForm("dust-debris");
                          }}
                          className="text-xs text-teal-600 hover:text-teal-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQc("dust-debris", rec.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(qcData?.pullTests || []).map((rec) => (
                  <div
                    key={`pt-${rec.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800">
                        Pull Test
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {rec.itemDescription ?? "-"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {rec.areaReadings.length} reading{rec.areaReadings.length !== 1 ? "s" : ""}
                      </span>
                      {rec.areaReadings.some((r) => r.result === "fail") && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Has failures
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{rec.readingDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPull(rec);
                          setActiveForm("pull-test");
                        }}
                        className="text-xs text-teal-600 hover:text-teal-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQc("pull-test", rec.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ReleaseDocumentGenerator
            jobCardId={jobCardId}
            backgroundSteps={backgroundSteps}
            onGenerated={fetchQualityData}
          />

          <QcReleaseCertificateSection jobCardId={jobCardId} />

          <ItemsReleaseSection jobCardId={jobCardId} />

          <QcpSection jobCardId={jobCardId} />

          {batchRecords.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Batch Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Batch
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Certificate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batchRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {record.batchNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {record.stockItem?.name || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {record.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.supplierCertificate ? (
                            <button
                              onClick={() => handleViewCertificate(record.supplierCertificate!.id)}
                              className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 hover:bg-green-200"
                            >
                              Linked - {record.supplierCertificate.certificateType}
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              No cert
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {formatDateZA(record.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {certificates.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Linked Certificates</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          cert.certificateType === "COA"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {cert.certificateType}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{cert.batchNumber}</span>
                      <span className="text-sm text-gray-500">{cert.supplier?.name || ""}</span>
                      <span className="text-xs text-gray-400">{cert.originalFilename}</span>
                    </div>
                    <button
                      onClick={() => handleViewCertificate(cert.id)}
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {calibrationCerts.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Calibration Certificates
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (included in data book)
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {calibrationCerts.map((cal) => {
                  const expiry = fromISO(cal.expiryDate);
                  const daysUntil = expiry.diff(now().startOf("day"), "days").days;
                  const isExpired = daysUntil < 0;
                  const isExpiringSoon = daysUntil >= 0 && daysUntil <= 30;

                  return (
                    <div
                      key={cal.id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                          CAL
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {cal.equipmentName}
                        </span>
                        {cal.equipmentIdentifier && (
                          <span className="text-xs text-gray-500">({cal.equipmentIdentifier})</span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isExpired
                              ? "bg-red-100 text-red-800"
                              : isExpiringSoon
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isExpired
                            ? "Expired"
                            : isExpiringSoon
                              ? `${Math.ceil(daysUntil)}d left`
                              : `Expires ${cal.expiryDate}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{cal.originalFilename}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {certificates.length === 0 &&
            batchRecords.length === 0 &&
            calibrationCerts.length === 0 &&
            totalQcRecords === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
                <p className="text-gray-500">No quality records for this job card yet</p>
                <p className="mt-1 text-sm text-gray-400">
                  Batch records are created when stock is issued with batch numbers
                </p>
              </div>
            )}
        </>
      )}

      <ShoreHardnessForm
        isOpen={activeForm === "shore-hardness"}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editingShoreHardness}
        onSaved={handleFormSaved}
        batchRecords={batchRecords}
      />
      <DftReadingForm
        isOpen={activeForm === "dft"}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editingDft}
        onSaved={handleFormSaved}
        coatingAnalysis={coatingAnalysis}
        batchRecords={batchRecords}
      />
      <BlastProfileForm
        isOpen={activeForm === "blast-profile"}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editingBlast}
        onSaved={handleFormSaved}
        coatingAnalysis={coatingAnalysis}
        batchRecords={batchRecords}
      />
      <DustDebrisForm
        isOpen={activeForm === "dust-debris"}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editingDust}
        onSaved={handleFormSaved}
      />
      <PullTestForm
        isOpen={activeForm === "pull-test"}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editingPull}
        onSaved={handleFormSaved}
        batchRecords={batchRecords}
      />
    </div>
  );
}
