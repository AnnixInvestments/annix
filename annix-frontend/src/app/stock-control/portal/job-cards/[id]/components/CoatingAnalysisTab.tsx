"use client";

import { useState } from "react";
import type {
  CoatingAnalysis,
  JobCardLineItem,
  UnverifiedProduct,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { HelpTooltip } from "../../../../components/HelpTooltip";

interface CoatingAnalysisTabProps {
  jobId: number;
  coatingAnalysis: CoatingAnalysis | null;
  isAnalysing: boolean;
  onRunAnalysis: () => void;
  onCoatingAnalysisChange: (analysis: CoatingAnalysis | null) => void;
  pipingLossPct: number;
  showTdsModal: boolean;
  onShowTdsModal: (show: boolean) => void;
  unverifiedProducts: UnverifiedProduct[];
  onUnverifiedProductsChange: (products: UnverifiedProduct[]) => void;
  tdsFile: File | null;
  onTdsFileChange: (file: File | null) => void;
  isUploadingTds: boolean;
  onTdsUpload: () => void;
  tdsUploadError: string | null;
  isAdmin: boolean;
  sourceFileUrl: string | null;
  lineItems: JobCardLineItem[];
  showStockDecision: boolean;
  onPlaceRequisition: () => void;
  onUseCurrentStock: () => void;
  isProcessingDecision: boolean;
  decisionError: string | null;
}

interface ExtractionCorrection {
  id: number;
  fieldName: string;
  originalValue: string | null;
  correctedValue: string;
  createdAt: string;
}

function EditableM2Field({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (val: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value || 0));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(inputVal);
    if (Number.isNaN(parsed) || parsed < 0) return;
    try {
      setSaving(true);
      await onSave(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        <span className="font-medium text-gray-500">{label}: </span>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-20 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={handleSave}
          disabled={saving}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div>
      <span className="font-medium text-gray-500">{label}: </span>
      <button
        type="button"
        className="text-gray-900 hover:text-teal-600 hover:underline cursor-pointer"
        onClick={() => {
          setInputVal(String(value || 0));
          setEditing(true);
        }}
        title="Click to edit"
      >
        {value > 0 ? Number(value).toFixed(2) : "0.00"}
      </button>
    </div>
  );
}

export function CoatingAnalysisTab(props: CoatingAnalysisTabProps) {
  const {
    jobId,
    coatingAnalysis,
    isAnalysing,
    onRunAnalysis,
    onCoatingAnalysisChange,
    pipingLossPct,
    showTdsModal,
    onShowTdsModal,
    unverifiedProducts,
    onUnverifiedProductsChange,
    tdsFile,
    onTdsFileChange,
    isUploadingTds,
    onTdsUpload,
    isAdmin,
    sourceFileUrl,
    lineItems,
  } = props;

  const [isDraggingTds, setIsDraggingTds] = useState(false);
  const [showTeachNix, setShowTeachNix] = useState(false);
  const [corrections, setCorrections] = useState<ExtractionCorrection[]>([]);
  const [pmEdits, setPmEdits] = useState<Record<string, number>>({});
  const [isSavingPmEdits, setIsSavingPmEdits] = useState(false);
  const [pmEditError, setPmEditError] = useState<string | null>(null);
  const isPmEditable = props.showStockDecision || props.isAdmin;
  const hasPmEdits = Object.keys(pmEdits).length > 0;
  const [correctionField, setCorrectionField] = useState("coatingSpec");
  const [correctionValue, setCorrectionValue] = useState("");
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [editingDft, setEditingDft] = useState<number | null>(null);
  const [dftMin, setDftMin] = useState("");
  const [dftMax, setDftMax] = useState("");
  const [savingDft, setSavingDft] = useState(false);
  const [removingCoat, setRemovingCoat] = useState<number | null>(null);

  const loadCorrections = async () => {
    try {
      const data = await stockControlApiClient.jobCardCorrections(jobId);
      setCorrections(data);
    } catch (_err) {
      setCorrections([]);
    }
  };

  const handleOpenTeachNix = async () => {
    setShowTeachNix(true);
    await loadCorrections();
  };

  const handleSaveCorrection = async () => {
    if (!correctionValue.trim()) return;
    try {
      setIsSavingCorrection(true);
      const originalValue = coatingAnalysis?.rawNotes || null;
      await stockControlApiClient.saveJobCardCorrection(jobId, {
        fieldName: correctionField,
        originalValue,
        correctedValue: correctionValue.trim(),
      });
      setCorrectionValue("");
      await loadCorrections();
      onRunAnalysis();
      setShowTeachNix(false);
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const handleSaveDft = async (idx: number) => {
    const parsedMin = parseFloat(dftMin);
    const parsedMax = parseFloat(dftMax);
    if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax) || parsedMin < 0 || parsedMax < 0)
      return;
    try {
      setSavingDft(true);
      const updated = await stockControlApiClient.updateCoatingCoat(jobId, idx, {
        minDftUm: parsedMin,
        maxDftUm: parsedMax,
      });
      onCoatingAnalysisChange(updated);
      setEditingDft(null);
    } finally {
      setSavingDft(false);
    }
  };

  const handleRemoveCoat = async (idx: number) => {
    try {
      setRemovingCoat(idx);
      const updated = await stockControlApiClient.removeCoatingCoat(jobId, idx);
      onCoatingAnalysisChange(updated);
    } finally {
      setRemovingCoat(null);
    }
  };

  const totalM2 = lineItems.reduce((sum, li) => {
    const m2 = Number(li.m2) || 0;
    const qty = Number(li.quantity) || 1;
    return sum + m2 * qty;
  }, 0);

  return (
    <div className="space-y-6">
      {lineItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Line Items <span className="text-gray-400 font-normal">{lineItems.length} items</span>
          </h4>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 w-10">#</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Item Code</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Description</th>
                <th className="text-right py-2 pr-4 font-medium text-gray-500">Qty</th>
                <th className="text-right py-2 pr-4 font-medium text-gray-500">m²</th>
                <th className="text-right py-2 pr-4 font-medium text-gray-500">Total m²</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => {
                const m2 = Number(li.m2) || 0;
                const qty = Number(li.quantity) || 1;
                return (
                  <tr key={li.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-400">{idx + 1}</td>
                    <td className="py-2 pr-4 text-gray-900 font-medium">{li.itemCode || "—"}</td>
                    <td className="py-2 pr-4 text-gray-700">{li.itemDescription || "—"}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-gray-900">{qty}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      {m2 > 0 ? m2.toFixed(2) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold text-teal-700">
                      {m2 > 0 ? (m2 * qty).toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300">
                <td colSpan={5} className="py-2 pr-4 text-right font-medium text-gray-600">
                  Total m²
                </td>
                <td className="py-2 pr-4 text-right font-bold text-teal-800">
                  {totalM2.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {coatingAnalysis &&
        (coatingAnalysis.status === "analysed" || coatingAnalysis.status === "accepted") &&
        coatingAnalysis.coats.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Coating Specification <HelpTooltip term="DFT" />
                </h4>
                <span className="text-xs text-gray-400 italic">extracted by Nix</span>
                {coatingAnalysis.status === "accepted" && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Accepted
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {coatingAnalysis.status === "analysed" && (
                  <button
                    onClick={async () => {
                      const updated = await stockControlApiClient.acceptCoatingAnalysis(jobId);
                      onCoatingAnalysisChange(updated);
                    }}
                    className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Accept Recommendation
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleOpenTeachNix}
                    className="text-xs px-3 py-1 rounded border border-purple-300 text-purple-700 hover:bg-purple-50 relative"
                  >
                    Teach Nix
                    {corrections.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-purple-600 rounded-full">
                        {corrections.length}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={onRunAnalysis}
                  disabled={isAnalysing}
                  className="text-xs text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Re-analyse"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 mb-4 text-sm">
              {coatingAnalysis.applicationType && (
                <div>
                  <span className="font-medium text-gray-500">Application: </span>
                  <span className="text-gray-900 capitalize">
                    {coatingAnalysis.applicationType}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-500">Ext Surface Prep: </span>
                {isPmEditable ? (
                  <select
                    value={coatingAnalysis.extSurfacePrep || ""}
                    onChange={async (e) => {
                      const updated = await stockControlApiClient.updateSurfacePrep(jobId, {
                        extSurfacePrep: e.target.value,
                      });
                      onCoatingAnalysisChange(updated);
                    }}
                    className="text-sm border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                  >
                    <option value="">Select...</option>
                    <option value="sa3_blast">SA3 BLAST</option>
                    <option value="sa2_5_blast">SA2.5 BLAST</option>
                    <option value="sa2_blast">SA2 BLAST</option>
                    <option value="sa1_blast">SA1 BLAST</option>
                    <option value="blast">BLAST</option>
                    <option value="hand_tool">HAND TOOL</option>
                    <option value="power_tool">POWER TOOL</option>
                  </select>
                ) : (
                  <span className="text-gray-900 uppercase">
                    {coatingAnalysis.extSurfacePrep
                      ? coatingAnalysis.extSurfacePrep.replace(/_/g, " ")
                      : "—"}
                  </span>
                )}
              </div>
              {(coatingAnalysis.hasInternalLining ||
                coatingAnalysis.coats.some((c) => c.area === "internal")) && (
                <div>
                  <span className="font-medium text-gray-500">Int Surface Prep: </span>
                  {isPmEditable ? (
                    <select
                      value={coatingAnalysis.intSurfacePrep || ""}
                      onChange={async (e) => {
                        const updated = await stockControlApiClient.updateSurfacePrep(jobId, {
                          intSurfacePrep: e.target.value,
                        });
                        onCoatingAnalysisChange(updated);
                      }}
                      className="text-sm border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                    >
                      <option value="">Select...</option>
                      <option value="sa3_blast">SA3 BLAST</option>
                      <option value="sa2_5_blast">SA2.5 BLAST</option>
                      <option value="sa2_blast">SA2 BLAST</option>
                      <option value="sa1_blast">SA1 BLAST</option>
                      <option value="blast">BLAST</option>
                      <option value="hand_tool">HAND TOOL</option>
                      <option value="power_tool">POWER TOOL</option>
                    </select>
                  ) : (
                    <span className="text-gray-900 uppercase">
                      {coatingAnalysis.intSurfacePrep
                        ? coatingAnalysis.intSurfacePrep.replace(/_/g, " ")
                        : "—"}
                    </span>
                  )}
                </div>
              )}
              <EditableM2Field
                label="Ext m²"
                value={coatingAnalysis.extM2}
                onSave={async (val) => {
                  const updated = await stockControlApiClient.updateCoatingSurfaceArea(
                    jobId,
                    val,
                    coatingAnalysis.intM2,
                  );
                  onCoatingAnalysisChange(updated);
                }}
              />
              {(coatingAnalysis.hasInternalLining ||
                coatingAnalysis.coats.some((c) => c.area === "internal")) && (
                <EditableM2Field
                  label="Int m²"
                  value={coatingAnalysis.intM2}
                  onSave={async (val) => {
                    const updated = await stockControlApiClient.updateCoatingSurfaceArea(
                      jobId,
                      coatingAnalysis.extM2,
                      val,
                    );
                    onCoatingAnalysisChange(updated);
                  }}
                />
              )}
            </div>
            {(() => {
              const uniqueCoats = coatingAnalysis.coats.reduce<typeof coatingAnalysis.coats>(
                (acc, coat) => {
                  const exists = acc.find(
                    (c) => c.product === coat.product && c.area === coat.area,
                  );
                  if (!exists) acc.push(coat);
                  return acc;
                },
                [],
              );
              const totalLitres = uniqueCoats.reduce((sum, c) => sum + c.litersRequired, 0);
              return (
                <div className="space-y-3">
                  {uniqueCoats.map((coat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm border-b border-gray-100 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 capitalize">
                          {coat.area === "external" ? "Ext" : "Int"}
                        </span>
                        <span className="font-medium text-gray-900">{coat.product}</span>
                        {coat.verified === true && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                            verified
                          </span>
                        )}
                        {coat.verified === false && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                            unverified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          DFT: {coat.minDftUm}-{coat.maxDftUm} µm
                        </span>
                        <span className="text-gray-500">
                          Coverage: {coat.coverageM2PerLiter} m²/L
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-medium text-gray-600">Total Litres Required</span>
                    <span className="text-lg font-bold text-teal-800">
                      {totalLitres.toFixed(1)} L
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 italic">
                    Coverage includes {pipingLossPct}% piping loss factor
                  </p>
                </div>
              );
            })()}
            {coatingAnalysis.stockAssessment.length > 0 &&
              (() => {
                const sourceAssessment =
                  coatingAnalysis.pmEditedAssessment || coatingAnalysis.stockAssessment;
                const deduped = sourceAssessment.reduce<typeof coatingAnalysis.stockAssessment>(
                  (acc, item) => {
                    const existing = acc.find((a) => a.product === item.product);
                    if (existing) {
                      existing.required = existing.required + item.required;
                      existing.sufficient = existing.stockItemId
                        ? existing.currentStock >= existing.required
                        : false;
                    } else {
                      acc.push({ ...item });
                    }
                    return acc;
                  },
                  [],
                );

                const handlePmEditChange = (product: string, value: number) => {
                  setPmEdits((prev) => ({ ...prev, [product]: value }));
                };

                const handleSavePmEdits = async () => {
                  try {
                    setIsSavingPmEdits(true);
                    setPmEditError(null);
                    const updatedItems = deduped.map((item) => ({
                      ...item,
                      required:
                        pmEdits[item.product] !== undefined ? pmEdits[item.product] : item.required,
                      sufficient: item.stockItemId
                        ? item.currentStock >=
                          (pmEdits[item.product] !== undefined
                            ? pmEdits[item.product]
                            : item.required)
                        : false,
                    }));
                    const result = await stockControlApiClient.updateStockAssessment(
                      props.jobId,
                      updatedItems,
                    );
                    props.onCoatingAnalysisChange(result);
                    setPmEdits({});
                  } catch (err) {
                    setPmEditError(err instanceof Error ? err.message : "Failed to save changes");
                  } finally {
                    setIsSavingPmEdits(false);
                  }
                };

                return (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Assessment
                        </h5>
                        {coatingAnalysis.pmEditedAssessment && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                            PM adjusted
                          </span>
                        )}
                      </div>
                      {isPmEditable && hasPmEdits && (
                        <button
                          onClick={handleSavePmEdits}
                          disabled={isSavingPmEdits}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSavingPmEdits ? "Saving..." : "Save Changes"}
                        </button>
                      )}
                    </div>
                    {pmEditError && <p className="text-xs text-red-600 mb-2">{pmEditError}</p>}
                    <div className="space-y-1">
                      {deduped.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.product}</span>
                          <div className="flex items-center space-x-3">
                            {item.stockItemId ? (
                              <>
                                <span className="text-gray-500">
                                  {item.currentStock} /
                                  {isPmEditable ? (
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      value={
                                        pmEdits[item.product] !== undefined
                                          ? pmEdits[item.product]
                                          : item.required
                                      }
                                      onChange={(e) =>
                                        handlePmEditChange(
                                          item.product,
                                          Number.parseFloat(e.target.value) || 0,
                                        )
                                      }
                                      className="w-16 mx-1 px-1 py-0.5 text-sm text-right border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                  ) : (
                                    <span className="mx-1">{item.required.toFixed(1)}</span>
                                  )}
                                  {item.unit}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    (
                                      pmEdits[item.product] !== undefined
                                        ? item.currentStock >= pmEdits[item.product]
                                        : item.sufficient
                                    )
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {(
                                    pmEdits[item.product] !== undefined
                                      ? item.currentStock >= pmEdits[item.product]
                                      : item.sufficient
                                  )
                                    ? "OK"
                                    : "Short"}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-600 italic">
                                Not in inventory
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {props.showStockDecision &&
                      (() => {
                        const allSufficient = deduped.every(
                          (item) =>
                            item.stockItemId !== null &&
                            (pmEdits[item.product] !== undefined
                              ? item.currentStock >= pmEdits[item.product]
                              : item.sufficient),
                        );
                        return (
                          <div className="mt-4 pt-3 border-t border-gray-100" id="stock-decision">
                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                              Stock Decision
                            </h5>
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={props.onPlaceRequisition}
                                disabled={props.isProcessingDecision}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                              >
                                {props.isProcessingDecision ? "Processing..." : "Place Requisition"}
                              </button>
                              <button
                                onClick={props.onUseCurrentStock}
                                disabled={props.isProcessingDecision || !allSufficient}
                                title={
                                  allSufficient
                                    ? "Reserve current stock for this job"
                                    : "Insufficient stock — place a requisition instead"
                                }
                                className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                              >
                                {props.isProcessingDecision ? "Processing..." : "Use Current Stock"}
                              </button>
                            </div>
                            {props.decisionError && (
                              <p className="text-xs text-red-600 mt-2">{props.decisionError}</p>
                            )}
                            {!allSufficient && (
                              <p className="text-xs text-amber-600 mt-2">
                                Some products are short or not in inventory — place a requisition to
                                order stock.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                );
              })()}
          </div>
        )}

      {coatingAnalysis && coatingAnalysis.status === "pending" && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
            <span>Nix is analysing the coating specification...</span>
          </div>
        </div>
      )}

      {coatingAnalysis && coatingAnalysis.status === "failed" && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-red-600">
              Coating analysis failed: {coatingAnalysis.error || "Unknown error"}
            </div>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalysing}
              className="text-sm text-teal-600 hover:text-teal-800 disabled:text-gray-400"
            >
              {isAnalysing ? "Analysing..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      {(!coatingAnalysis ||
        (coatingAnalysis.status === "analysed" && coatingAnalysis.coats.length === 0)) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {coatingAnalysis ? "No coating specification found" : "No coating analysis available"}
            </span>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalysing}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isAnalysing
                ? "Analysing..."
                : coatingAnalysis
                  ? "Re-analyse"
                  : "Run Coating Analysis"}
            </button>
          </div>
        </div>
      )}

      {showTeachNix && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"></div>
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Teach Nix</h3>
              <button
                onClick={() => setShowTeachNix(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {sourceFileUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Original Document</h4>
                  <iframe
                    src={sourceFileUrl}
                    className="w-full h-96 border border-gray-200 rounded"
                    title="Original uploaded document"
                  />
                  <a
                    href={sourceFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-teal-600 hover:text-teal-800"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
              {coatingAnalysis?.rawNotes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Raw Notes (what Nix received)
                  </h4>
                  <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {coatingAnalysis.rawNotes}
                  </pre>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Provide Correct Value</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Tell Nix what the correct coating specification should be. Future extractions for
                  this customer will use this as a reference.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Field</label>
                    <select
                      value={correctionField}
                      onChange={(e) => setCorrectionField(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    >
                      <option value="coatingSpec">Coating Specification</option>
                      <option value="rubberSpec">Rubber / Lining Specification</option>
                      <option value="notes">General Notes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Correct Value
                    </label>
                    <textarea
                      value={correctionValue}
                      onChange={(e) => setCorrectionValue(e.target.value)}
                      rows={4}
                      placeholder="e.g. EXT : BLAST & PAINT PENGUARD EXPRESS MIO BUFF @ 240-250um + HARDTOP XP RED @ 70-85um"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSaveCorrection}
                    disabled={isSavingCorrection || !correctionValue.trim()}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSavingCorrection ? "Saving & Re-analysing..." : "Save & Re-analyse"}
                  </button>
                </div>
              </div>
              {corrections.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Previous Corrections ({corrections.length})
                  </h4>
                  <div className="space-y-2">
                    {corrections.map((c) => (
                      <div
                        key={c.id}
                        className="text-xs border border-gray-200 rounded p-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-purple-700 capitalize">
                            {c.fieldName.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-gray-400">{formatDateZA(c.createdAt)}</span>
                        </div>
                        {c.originalValue && (
                          <div className="text-gray-500 line-through mb-0.5 truncate">
                            {c.originalValue.slice(0, 100)}
                          </div>
                        )}
                        <div className="text-gray-800">{c.correctedValue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTdsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unverified Coating Products
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                The following coating products could not be verified from the known products
                database. Upload the Technical Data Sheet (TDS) for each product to verify volume
                solids before activating this job card.
              </p>
              <div className="space-y-2 mb-4">
                {unverifiedProducts.map((product, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900">{product.product}</span>
                      {product.genericType && (
                        <span className="ml-2 text-xs text-gray-500 capitalize">
                          ({product.genericType.replace(/_/g, " ")})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-700">
                      Est. {product.estimatedVolumeSolids}% vol. solids
                    </span>
                  </div>
                ))}
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDraggingTds
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTds(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTds(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTds(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingTds(false);
                  const file = e.dataTransfer.files?.[0] || null;
                  if (file) {
                    onTdsFileChange(file);
                  }
                }}
              >
                {tdsFile ? (
                  <div className="space-y-1">
                    <svg
                      className="mx-auto h-8 w-8 text-teal-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-gray-700">{tdsFile.name}</p>
                    <button
                      type="button"
                      onClick={() => onTdsFileChange(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <svg
                      className={`mx-auto h-10 w-10 ${isDraggingTds ? "text-teal-500" : "text-gray-400"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p
                      className={`mt-1 text-sm ${isDraggingTds ? "text-teal-600 font-medium" : "text-gray-600"}`}
                    >
                      {isDraggingTds ? "Drop file here" : "Upload Technical Data Sheet (PDF)"}
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        onTdsFileChange(file);
                      }}
                    />
                  </label>
                )}
              </div>
              {props.tdsUploadError && (
                <p className="mt-3 text-sm text-red-600">{props.tdsUploadError}</p>
              )}
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    onShowTdsModal(false);
                    onTdsFileChange(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onTdsUpload}
                  disabled={!tdsFile || isUploadingTds}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isUploadingTds ? "Processing..." : "Accept & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
