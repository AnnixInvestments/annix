"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  QcBlastingCheck,
  QcCheckResult,
  QcCureCycleRecord,
  QcFinalInspection,
  QcLiningCheck,
  QcPaintingCheck,
  QcReleaseCertificateRecord,
  QcSolutionUsed,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { nowISO } from "@/app/lib/datetime";
import { SignaturePad } from "@/app/stock-control/components/SignaturePad";

interface QcReleaseCertificateFormProps {
  jobCardId: number;
  existingCertificate: QcReleaseCertificateRecord | null;
  onSaved: () => void;
  onCancel: () => void;
}

const emptyBlastingCheck: QcBlastingCheck = {
  blastProfileBatchNo: null,
  contaminationFree: null,
  sa25Grade: null,
  inspectorName: null,
};

const emptyLiningCheck: QcLiningCheck = {
  preCureLinedAsPerDrawing: null,
  preCureInspectorName: null,
  visualDefectInspection: null,
  visualDefectInspectorName: null,
};

const emptyFinalInspection: QcFinalInspection = {
  linedAsPerDrawing: null,
  visualInspection: null,
  testPlate: null,
  shoreHardness: null,
  sparkTest: null,
  sparkTestVoltagePerMm: null,
  inspectorName: null,
};

const defaultPaintingChecks: QcPaintingCheck[] = [
  { coat: "primer", batchNumber: null, dftMicrons: null, result: null, inspectorName: null },
  { coat: "intermediate", batchNumber: null, dftMicrons: null, result: null, inspectorName: null },
  { coat: "final", batchNumber: null, dftMicrons: null, result: null, inspectorName: null },
];

function passFailToggle(
  label: string,
  value: QcCheckResult | null,
  onChange: (val: QcCheckResult | null) => void,
) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[140px] text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(value === "pass" ? null : "pass")}
        className={`rounded px-3 py-1 text-xs font-medium ${
          value === "pass"
            ? "bg-green-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Pass
      </button>
      <button
        type="button"
        onClick={() => onChange(value === "fail" ? null : "fail")}
        className={`rounded px-3 py-1 text-xs font-medium ${
          value === "fail" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Fail
      </button>
    </div>
  );
}

export function QcReleaseCertificateForm({
  jobCardId,
  existingCertificate,
  onSaved,
  onCancel,
}: QcReleaseCertificateFormProps) {
  const isEditing = existingCertificate !== null;

  const [certificateNumber, setCertificateNumber] = useState(
    existingCertificate?.certificateNumber ?? "",
  );
  const [certificateDate, setCertificateDate] = useState(
    existingCertificate?.certificateDate ?? nowISO().slice(0, 10),
  );
  const [blastingCheck, setBlastingCheck] = useState<QcBlastingCheck>(
    existingCertificate?.blastingCheck ?? { ...emptyBlastingCheck },
  );
  const [solutionsUsed, setSolutionsUsed] = useState<QcSolutionUsed[]>(
    existingCertificate?.solutionsUsed?.length
      ? existingCertificate.solutionsUsed
      : [{ productName: "", typeBatch: null, result: "pass", inspectorName: null }],
  );
  const [liningCheck, setLiningCheck] = useState<QcLiningCheck>(
    existingCertificate?.liningCheck ?? { ...emptyLiningCheck },
  );
  const [cureCycles, setCureCycles] = useState<QcCureCycleRecord[]>(
    existingCertificate?.cureCycles?.length
      ? existingCertificate.cureCycles
      : [{ cycleNumber: 1, timeIn: null, timeOut: null, pressureBar: null }],
  );
  const [paintingChecks, setPaintingChecks] = useState<QcPaintingCheck[]>(
    existingCertificate?.paintingChecks?.length
      ? existingCertificate.paintingChecks
      : [...defaultPaintingChecks],
  );
  const [finalInspection, setFinalInspection] = useState<QcFinalInspection>(
    existingCertificate?.finalInspection ?? { ...emptyFinalInspection },
  );
  const [comments, setComments] = useState(existingCertificate?.comments ?? "");
  const [finalApprovalName, setFinalApprovalName] = useState(
    existingCertificate?.finalApprovalName ?? "",
  );
  const [finalApprovalDate, setFinalApprovalDate] = useState(
    existingCertificate?.finalApprovalDate ?? nowISO().slice(0, 10),
  );
  const [signatureUrl, setSignatureUrl] = useState<string | null>(
    existingCertificate?.finalApprovalSignatureUrl ?? null,
  );
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    stockControlApiClient
      .currentUser()
      .then((user) => {
        if (user?.name) {
          setCurrentUserName(user.name);
        }
      })
      .catch(() => {});
  }, []);

  const autoFillInspector = useCallback(() => currentUserName, [currentUserName]);

  const updateBlasting = useCallback(
    (field: keyof QcBlastingCheck, value: string | QcCheckResult | null) => {
      setBlastingCheck((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateLining = useCallback(
    (field: keyof QcLiningCheck, value: string | QcCheckResult | null) => {
      setLiningCheck((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateFinalInspection = useCallback(
    (field: keyof QcFinalInspection, value: string | number | QcCheckResult | null) => {
      setFinalInspection((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateSolution = useCallback(
    (index: number, field: keyof QcSolutionUsed, value: string | QcCheckResult | null) => {
      setSolutionsUsed((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    },
    [],
  );

  const addSolution = useCallback(() => {
    setSolutionsUsed((prev) => [
      ...prev,
      { productName: "", typeBatch: null, result: "pass" as QcCheckResult, inspectorName: null },
    ]);
  }, []);

  const removeSolution = useCallback((index: number) => {
    setSolutionsUsed((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCureCycle = useCallback(
    (index: number, field: keyof QcCureCycleRecord, value: string | number | null) => {
      setCureCycles((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    },
    [],
  );

  const addCureCycle = useCallback(() => {
    setCureCycles((prev) => [
      ...prev,
      { cycleNumber: prev.length + 1, timeIn: null, timeOut: null, pressureBar: null },
    ]);
  }, []);

  const removeCureCycle = useCallback((index: number) => {
    setCureCycles((prev) =>
      prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, cycleNumber: i + 1 })),
    );
  }, []);

  const updatePaintingCheck = useCallback(
    (
      index: number,
      field: keyof QcPaintingCheck,
      value: string | number | QcCheckResult | null,
    ) => {
      setPaintingChecks((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    },
    [],
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload: Partial<QcReleaseCertificateRecord> = {
        certificateNumber: certificateNumber || null,
        certificateDate: certificateDate || null,
        blastingCheck,
        solutionsUsed: solutionsUsed.filter((s) => s.productName.trim() !== ""),
        liningCheck,
        cureCycles,
        paintingChecks,
        finalInspection,
        comments: comments || null,
        finalApprovalName: finalApprovalName || null,
        finalApprovalSignatureUrl: signatureUrl,
        finalApprovalDate: finalApprovalDate || null,
      };

      if (isEditing) {
        await stockControlApiClient.updateReleaseCertificate(
          jobCardId,
          existingCertificate.id,
          payload,
        );
      } else {
        await stockControlApiClient.createReleaseCertificate(jobCardId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save release certificate");
    } finally {
      setIsSaving(false);
    }
  };

  const sectionHeader = (title: string) => (
    <div className="border-b border-gray-200 pb-1 pt-4">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
    </div>
  );

  const inspectorField = (
    value: string | null,
    onChange: (val: string | null) => void,
    label?: string,
  ) => (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500">{label ?? "Inspector"}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Inspector name"
        className="w-44 rounded border border-gray-300 px-2 py-1 text-sm"
      />
      {currentUserName && !value && (
        <button
          type="button"
          onClick={() => onChange(autoFillInspector())}
          className="text-xs text-teal-600 hover:text-teal-800"
        >
          Auto-fill
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {isEditing ? "Edit" : "New"} Quality Release Certificate
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Certificate Number</label>
          <input
            type="text"
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. QRC-001"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Certificate Date</label>
          <input
            type="date"
            value={certificateDate}
            onChange={(e) => setCertificateDate(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {sectionHeader("1. Blasting Checks")}
      <div className="space-y-3 pl-2">
        <div className="flex items-center gap-2">
          <label className="min-w-[140px] text-sm text-gray-700">Profile Batch No</label>
          <input
            type="text"
            value={blastingCheck.blastProfileBatchNo ?? ""}
            onChange={(e) => updateBlasting("blastProfileBatchNo", e.target.value || null)}
            className="w-48 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        {passFailToggle("Contamination Free", blastingCheck.contaminationFree, (val) =>
          updateBlasting("contaminationFree", val),
        )}
        {passFailToggle("SA 2.5 Grade", blastingCheck.sa25Grade, (val) =>
          updateBlasting("sa25Grade", val),
        )}
        {inspectorField(blastingCheck.inspectorName, (val) => updateBlasting("inspectorName", val))}
      </div>

      {sectionHeader("2. Solutions Used")}
      <div className="space-y-3 pl-2">
        {solutionsUsed.map((sol, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-2 rounded border border-gray-100 bg-gray-50 p-2"
          >
            <input
              type="text"
              value={sol.productName}
              onChange={(e) => updateSolution(idx, "productName", e.target.value)}
              placeholder="Product name"
              className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              type="text"
              value={sol.typeBatch ?? ""}
              onChange={(e) => updateSolution(idx, "typeBatch", e.target.value || null)}
              placeholder="Type / Batch"
              className="w-36 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            {passFailToggle("", sol.result, (val) => updateSolution(idx, "result", val ?? "pass"))}
            {inspectorField(sol.inspectorName, (val) => updateSolution(idx, "inspectorName", val))}
            {solutionsUsed.length > 1 && (
              <button
                type="button"
                onClick={() => removeSolution(idx)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSolution}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          + Add Solution
        </button>
      </div>

      {sectionHeader("3. Lining Checks")}
      <div className="space-y-3 pl-2">
        {passFailToggle(
          "Pre-cure lined as per drawing",
          liningCheck.preCureLinedAsPerDrawing,
          (val) => updateLining("preCureLinedAsPerDrawing", val),
        )}
        {inspectorField(liningCheck.preCureInspectorName, (val) =>
          updateLining("preCureInspectorName", val),
        )}
        {passFailToggle("Visual defect inspection", liningCheck.visualDefectInspection, (val) =>
          updateLining("visualDefectInspection", val),
        )}
        {inspectorField(liningCheck.visualDefectInspectorName, (val) =>
          updateLining("visualDefectInspectorName", val),
        )}
      </div>

      {sectionHeader("4. Curing Records")}
      <div className="space-y-3 pl-2">
        {cureCycles.map((cycle, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-3 rounded border border-gray-100 bg-gray-50 p-2"
          >
            <span className="text-sm font-medium text-gray-700">Cycle {cycle.cycleNumber}</span>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Time In</label>
              <input
                type="datetime-local"
                value={cycle.timeIn ?? ""}
                onChange={(e) => updateCureCycle(idx, "timeIn", e.target.value || null)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Time Out</label>
              <input
                type="datetime-local"
                value={cycle.timeOut ?? ""}
                onChange={(e) => updateCureCycle(idx, "timeOut", e.target.value || null)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Pressure (BAR)</label>
              <input
                type="number"
                step="0.1"
                value={cycle.pressureBar ?? ""}
                onChange={(e) =>
                  updateCureCycle(
                    idx,
                    "pressureBar",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            {cureCycles.length > 1 && (
              <button
                type="button"
                onClick={() => removeCureCycle(idx)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addCureCycle}
          className="text-xs font-medium text-teal-600 hover:text-teal-800"
        >
          + Add Cure Cycle
        </button>
      </div>

      {sectionHeader("5. Painting Checks")}
      <div className="space-y-3 pl-2">
        {paintingChecks.map((pc, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-3 rounded border border-gray-100 bg-gray-50 p-2"
          >
            <span className="w-24 text-sm font-medium capitalize text-gray-700">{pc.coat}</span>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Batch</label>
              <input
                type="text"
                value={pc.batchNumber ?? ""}
                onChange={(e) => updatePaintingCheck(idx, "batchNumber", e.target.value || null)}
                className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">DFT (um)</label>
              <input
                type="number"
                value={pc.dftMicrons ?? ""}
                onChange={(e) =>
                  updatePaintingCheck(
                    idx,
                    "dftMicrons",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            {passFailToggle("", pc.result, (val) => updatePaintingCheck(idx, "result", val))}
            {inspectorField(pc.inspectorName, (val) =>
              updatePaintingCheck(idx, "inspectorName", val),
            )}
          </div>
        ))}
      </div>

      {sectionHeader("6. Final Inspection")}
      <div className="space-y-3 pl-2">
        {passFailToggle("Lined as per drawing", finalInspection.linedAsPerDrawing, (val) =>
          updateFinalInspection("linedAsPerDrawing", val),
        )}
        {passFailToggle("Visual inspection", finalInspection.visualInspection, (val) =>
          updateFinalInspection("visualInspection", val),
        )}
        {passFailToggle("Test plate", finalInspection.testPlate, (val) =>
          updateFinalInspection("testPlate", val),
        )}
        <div className="flex items-center gap-2">
          <label className="min-w-[140px] text-sm text-gray-700">Shore Hardness</label>
          <input
            type="number"
            value={finalInspection.shoreHardness ?? ""}
            onChange={(e) =>
              updateFinalInspection("shoreHardness", e.target.value ? Number(e.target.value) : null)
            }
            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        {passFailToggle("Spark test", finalInspection.sparkTest, (val) =>
          updateFinalInspection("sparkTest", val),
        )}
        <div className="flex items-center gap-2">
          <label className="min-w-[140px] text-sm text-gray-700">Voltage per mm</label>
          <input
            type="number"
            step="0.1"
            value={finalInspection.sparkTestVoltagePerMm ?? ""}
            onChange={(e) =>
              updateFinalInspection(
                "sparkTestVoltagePerMm",
                e.target.value ? Number(e.target.value) : null,
              )
            }
            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        {inspectorField(finalInspection.inspectorName, (val) =>
          updateFinalInspection("inspectorName", val),
        )}
      </div>

      {sectionHeader("7. Comments")}
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={3}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="Additional comments..."
      />

      {sectionHeader("8. Final Approval")}
      <div className="space-y-3 pl-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Approver Name</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={finalApprovalName}
                onChange={(e) => setFinalApprovalName(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Name"
              />
              {currentUserName && !finalApprovalName && (
                <button
                  type="button"
                  onClick={() => setFinalApprovalName(autoFillInspector())}
                  className="whitespace-nowrap text-xs text-teal-600 hover:text-teal-800"
                >
                  Auto-fill
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Approval Date</label>
            <input
              type="date"
              value={finalApprovalDate}
              onChange={(e) => setFinalApprovalDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Signature</label>
          {signatureUrl && !showSignaturePad ? (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={signatureUrl}
                alt="Signature"
                className="h-16 rounded border border-gray-200 bg-white p-1"
              />
              <button
                type="button"
                onClick={() => setShowSignaturePad(true)}
                className="text-xs text-teal-600 hover:text-teal-800"
              >
                Change signature
              </button>
            </div>
          ) : showSignaturePad ? (
            <div className="mt-2">
              <SignaturePad
                existingSignature={signatureUrl}
                onSave={(dataUrl: string) => {
                  setSignatureUrl(dataUrl);
                  setShowSignaturePad(false);
                }}
                onCancel={() => setShowSignaturePad(false)}
                width={400}
                height={150}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              className="mt-2 rounded border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600"
            >
              Add signature
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isEditing ? "Update Certificate" : "Create Certificate"}
        </button>
      </div>
    </div>
  );
}
