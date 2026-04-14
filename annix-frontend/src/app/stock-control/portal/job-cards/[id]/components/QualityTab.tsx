"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BackgroundStepStatus,
  CalibrationCertificate,
  CoatingAnalysis,
  DataBookCompleteness,
  DataBookStatus,
  IssuanceBatchRecord,
  QcBlastProfileRecord,
  QcDftReadingRecord,
  QcMeasurementsAggregate,
  QcShoreHardnessRecord,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import { BatchAssignmentSection } from "./BatchAssignmentSection";
import BlastProfileForm from "./BlastProfileForm";
import { DataBookCompletenessPanel } from "./DataBookCompletenessPanel";
import { DefelskoBatchSection } from "./DefelskoBatchSection";
import DftReadingForm from "./DftReadingForm";
import { ItemsReleaseSection } from "./ItemsReleaseSection";
import { MaterialBatchSection } from "./MaterialBatchSection";
import { QaFinalPhotosSection } from "./QaFinalPhotosSection";
import { QaReviewSection } from "./QaReviewSection";
import { QcMeasurementChecklist } from "./QcMeasurementChecklist";
import { QcpSection } from "./QcpSection";
import { QcReleaseCertificateSection } from "./QcReleaseCertificateSection";
import { ReleaseDocumentGenerator } from "./ReleaseDocumentGenerator";
import { ShoreHardnessForm } from "./ShoreHardnessForm";

type QcFormType = "shore-hardness" | "dft" | "blast-profile" | "paint-profile" | null;

interface QualityTabProps {
  jobCardId: number;
  cpoId?: number | null;
  backgroundSteps: BackgroundStepStatus[];
  activeBgStepKeys: Set<string>;
  onBatchComplete: (() => void) | null;
  onQaReviewSubmitted: (() => void) | null;
  onFinalPhotosSaved: (() => void) | null;
  stepAssignments: Record<string, { name: string; isPrimary: boolean }[]>;
  currentUserName: string | null;
  rubberPlanOverride?: { manualRolls?: any[] | null } | null;
  lineItems: Array<{
    id: number;
    itemCode: string;
    description: string;
    quantity: number;
  }>;
}

export function QualityTab(props: QualityTabProps) {
  const {
    jobCardId,
    backgroundSteps,
    activeBgStepKeys,
    onBatchComplete,
    onQaReviewSubmitted,
    onFinalPhotosSaved,
    stepAssignments,
    currentUserName,
    rubberPlanOverride,
    lineItems,
  } = props;
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
  const [paintProfileCoatLabel, setPaintProfileCoatLabel] = useState<string | null>(null);

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
      const overallStart = performance.now();
      const bundle = await stockControlApiClient.qualityTabBundle(jobCardId);
      console.log(
        `[QualityTab] qualityTabBundle ${(performance.now() - overallStart).toFixed(0)}ms`,
      );
      setCertificates(Array.isArray(bundle.certificates) ? bundle.certificates : []);
      setCalibrationCerts(Array.isArray(bundle.calibrationCerts) ? bundle.calibrationCerts : []);
      setBatchRecords(Array.isArray(bundle.batchRecords) ? bundle.batchRecords : []);
      setDataBookStatus(bundle.dataBookStatus);
      setQcData(bundle.qcMeasurements);
      setCompleteness(bundle.completeness);
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
    setPaintProfileCoatLabel(null);
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
      }
      fetchQualityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    }
  };

  const blastProfiles = useMemo(() => {
    const allProfiles = qcData ? qcData.blastProfiles : [];
    return allProfiles.filter((r) => r.profileType !== "paint");
  }, [qcData]);
  const paintProfiles = useMemo(() => {
    const allProfiles = qcData ? qcData.blastProfiles : [];
    return allProfiles.filter((r) => r.profileType === "paint");
  }, [qcData]);

  const rawCoats = coatingAnalysis ? coatingAnalysis.coats : [];
  const paintCoats = rawCoats || [];
  const shoreHardnessList = qcData ? qcData.shoreHardness : [];
  const dftReadingsList = qcData ? qcData.dftReadings : [];

  const totalQcRecords =
    shoreHardnessList.length + dftReadingsList.length + blastProfiles.length + paintProfiles.length;

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

      {props.cpoId && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
              CPO
            </span>
            <span className="text-xs font-semibold text-gray-700">
              Inherited Quality Control Plans
            </span>
          </div>
          <QcpSection cpoId={props.cpoId} readOnly />
        </div>
      )}
      {!props.cpoId && <QcpSection jobCardId={jobCardId} />}

      {coatingLoaded && (
        <DefelskoBatchSection
          jobCardId={jobCardId}
          coatingAnalysis={coatingAnalysis}
          batchRecords={batchRecords}
          onComplete={onBatchComplete}
        />
      )}

      {coatingLoaded && lineItems.length > 0 && (
        <BatchAssignmentSection
          jobCardId={jobCardId}
          coatingAnalysis={coatingAnalysis}
          lineItems={lineItems}
          onAssignmentSaved={fetchQualityData}
        />
      )}

      <MaterialBatchSection
        jobCardId={jobCardId}
        batchRecords={batchRecords}
        hasRubber={coatingAnalysis ? coatingAnalysis.hasInternalLining === true : false}
        hasPaint={paintCoats.length > 0}
        coatingAnalysis={coatingAnalysis}
        rubberPlanOverride={rubberPlanOverride || null}
      />

      {coatingLoaded && (
        <QcMeasurementChecklist jobCardId={jobCardId} coatingAnalysis={coatingAnalysis} />
      )}

      <QaReviewSection
        jobCardId={jobCardId}
        backgroundSteps={backgroundSteps}
        activeBgStepKeys={activeBgStepKeys}
        onReviewSubmitted={onQaReviewSubmitted || (() => {})}
        stepAssignments={stepAssignments}
        currentUserName={currentUserName}
      />

      <QaFinalPhotosSection
        jobCardId={jobCardId}
        backgroundSteps={backgroundSteps}
        activeBgStepKeys={activeBgStepKeys}
        onPhotosSaved={onFinalPhotosSaved || (() => {})}
        stepAssignments={stepAssignments}
        currentUserName={currentUserName}
      />

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading quality data...</div>
      ) : (
        <>
          {false && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 px-3 sm:px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">QC Measurements</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveForm("blast-profile")}
                    className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                  >
                    + Blast Profile
                  </button>
                  {paintCoats.map((coat, idx) => {
                    const rawProduct = coat.product;
                    const label = rawProduct || `Coat ${idx + 1}`;
                    return (
                      <button
                        key={`paint-btn-${idx}`}
                        onClick={() => {
                          setPaintProfileCoatLabel(label);
                          setActiveForm("paint-profile");
                        }}
                        className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                      >
                        + Paint Profile ({label})
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setActiveForm("shore-hardness")}
                    className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                  >
                    + Shore Hardness
                  </button>
                </div>
              </div>

              {totalQcRecords === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No QC measurements recorded yet. Use the buttons above to add records.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {blastProfiles.map((rec) => {
                    const avgMicrons = rec.averageMicrons;
                    const avgDisplay = typeof avgMicrons === "number" ? avgMicrons.toFixed(1) : "-";
                    return (
                      <div
                        key={`bp-${rec.id}`}
                        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            Blast
                          </span>
                          <span className="text-sm text-gray-500">
                            Avg: {avgDisplay} μm / Spec: {rec.specMicrons} μm
                          </span>
                          {rec.abrasiveBatchNumber && (
                            <span className="hidden sm:inline text-xs text-gray-500">
                              Batch: {rec.abrasiveBatchNumber}
                            </span>
                          )}
                          {rec.temperature !== null && (
                            <span className="hidden sm:inline text-xs text-gray-400">
                              {rec.temperature}°C
                            </span>
                          )}
                          {rec.humidity !== null && (
                            <span className="hidden sm:inline text-xs text-gray-400">
                              {rec.humidity}% RH
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{rec.readingDate}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
                    );
                  })}

                  {paintProfiles.map((rec) => {
                    const rawCoatLabel = rec.coatLabel;
                    const label = rawCoatLabel || "Paint";
                    const paintAvg = rec.averageMicrons;
                    const paintAvgDisplay =
                      typeof paintAvg === "number" ? paintAvg.toFixed(1) : "-";
                    return (
                      <div
                        key={`pp-${rec.id}`}
                        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                            Paint
                          </span>
                          <span className="text-sm font-medium text-gray-900">{label}</span>
                          <span className="text-sm text-gray-500">
                            Avg: {paintAvgDisplay} μm / Spec: {rec.specMicrons} μm
                          </span>
                          {rec.abrasiveBatchNumber && (
                            <span className="hidden sm:inline text-xs text-gray-500">
                              Batch: {rec.abrasiveBatchNumber}
                            </span>
                          )}
                          {rec.temperature !== null && (
                            <span className="hidden sm:inline text-xs text-gray-400">
                              {rec.temperature}°C
                            </span>
                          )}
                          {rec.humidity !== null && (
                            <span className="hidden sm:inline text-xs text-gray-400">
                              {rec.humidity}% RH
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{rec.readingDate}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingBlast(rec);
                              setPaintProfileCoatLabel(label);
                              setActiveForm("paint-profile");
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
                    );
                  })}

                  {shoreHardnessList.map((rec) => {
                    const rawOverall = rec.averages ? rec.averages.overall : null;
                    const overallAvg = rawOverall;
                    const overallDisplay =
                      typeof overallAvg === "number" ? overallAvg.toFixed(1) : "-";
                    return (
                      <div
                        key={`sh-${rec.id}`}
                        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                            Shore
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {rec.rubberSpec}
                          </span>
                          <span className="text-sm text-gray-500">
                            Avg: {overallDisplay} / Required: {rec.requiredShore}
                          </span>
                          {typeof overallAvg === "number" &&
                            Math.abs(overallAvg - rec.requiredShore) > 5 && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                Out of spec
                              </span>
                            )}
                          <span className="text-xs text-gray-400">{rec.readingDate}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
                    );
                  })}

                  {dftReadingsList.map((rec) => {
                    const dftAvg = rec.averageMicrons;
                    const dftAvgDisplay = typeof dftAvg === "number" ? dftAvg.toFixed(1) : "-";
                    const specMin = rec.specMinMicrons;
                    const specMax = rec.specMaxMicrons;
                    const outOfSpec =
                      typeof dftAvg === "number" && (dftAvg < specMin || dftAvg > specMax);
                    return (
                      <div
                        key={`dft-${rec.id}`}
                        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              rec.coatType === "primer"
                                ? "bg-orange-100 text-orange-800"
                                : rec.coatType === "intermediate"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            DFT{" "}
                            {rec.coatType === "primer"
                              ? "Primer"
                              : rec.coatType === "intermediate"
                                ? "Intermediate"
                                : "Final"}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {rec.paintProduct}
                          </span>
                          <span className="text-sm text-gray-500">
                            Avg: {dftAvgDisplay} μm ({rec.specMinMicrons}-{rec.specMaxMicrons})
                          </span>
                          {outOfSpec && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              Out of spec
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{rec.readingDate}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <ReleaseDocumentGenerator
            jobCardId={jobCardId}
            backgroundSteps={backgroundSteps}
            onGenerated={fetchQualityData}
          />

          <ItemsReleaseSection jobCardId={jobCardId} />

          <QcReleaseCertificateSection jobCardId={jobCardId} />

          <div id="data-book-section">
            <DataBookCompletenessPanel
              completeness={completeness}
              dataBookStatus={dataBookStatus}
              isCompiling={isCompiling}
              onCompile={handleCompile}
              onDownload={handleDownload}
            />
          </div>

          {certificates.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-3 sm:px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Supplier Certificates</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {certificates.map((cert) => {
                  const supplierName = cert.supplier ? cert.supplier.name : "";
                  return (
                    <div
                      key={cert.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cert.certificateType === "COA"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {cert.certificateType}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {cert.batchNumber}
                        </span>
                        <span className="hidden sm:inline text-sm text-gray-500">
                          {supplierName}
                        </span>
                        <span className="hidden sm:inline text-xs text-gray-400">
                          {cert.originalFilename}
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewCertificate(cert.id)}
                        className="self-start text-sm text-teal-600 hover:text-teal-800 shrink-0"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calibrationCerts.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-3 sm:px-5 py-3">
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
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-3 hover:bg-gray-50"
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                          CAL
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {cal.equipmentName}
                        </span>
                        {cal.equipmentIdentifier && (
                          <span className="hidden sm:inline text-xs text-gray-500">
                            ({cal.equipmentIdentifier})
                          </span>
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
                      <span className="hidden sm:inline text-xs text-gray-400">
                        {cal.originalFilename}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {batchRecords.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-3 sm:px-5 py-3">
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
                    {batchRecords.map((record) => {
                      const stockItemName = record.stockItem ? record.stockItem.name : "-";
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                            {record.batchNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{stockItemName}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {record.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.supplierCertificate ? (
                              <button
                                onClick={() =>
                                  handleViewCertificate(record.supplierCertificate!.id)
                                }
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
                      );
                    })}
                  </tbody>
                </table>
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
        coatingAnalysis={coatingAnalysis}
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
      <BlastProfileForm
        isOpen={activeForm === "paint-profile"}
        onClose={handleFormClose}
        jobCardId={jobCardId}
        existing={editingBlast}
        onSaved={handleFormSaved}
        coatingAnalysis={coatingAnalysis}
        batchRecords={batchRecords}
        profileType="paint"
        coatLabel={paintProfileCoatLabel}
      />
    </div>
  );
}
