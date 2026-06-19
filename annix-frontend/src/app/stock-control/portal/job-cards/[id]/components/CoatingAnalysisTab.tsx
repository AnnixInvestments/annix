"use client";

import { keys } from "es-toolkit/compat";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  CoatingAnalysis,
  JobCardLineItem,
  PackOptionResult,
  UnverifiedProduct,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useCreatePaintPackOptions, usePreferredPaints } from "@/app/lib/query/hooks";
import { HelpTooltip } from "../../../../components/HelpTooltip";

function money(value: number): string {
  return value.toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
}

function isBandingProduct(product: string, rawNotes: string | null, isBanding?: boolean): boolean {
  if (isBanding === true) return true;
  if (isBanding === false) return false;
  if (!rawNotes) return false;
  const upper = rawNotes.toUpperCase();
  const productUpper = product.toUpperCase();
  const bandingIdx = upper.indexOf("BANDING");
  if (bandingIdx < 0) return false;
  const afterBanding = upper.substring(bandingIdx);
  const beforeBanding = upper.substring(0, bandingIdx);
  if (beforeBanding.includes(productUpper)) return false;
  return afterBanding.includes(productUpper);
}

function workTypeFromNotes(notes: string | null | undefined): string {
  if (!notes) return "—";
  const upper = notes.toUpperCase();
  const lines = upper.split("\n").map((l) => l.trim());
  const hasRubber = lines.some((l) => /^INT\s*:/.test(l) && /R\/L|RUBBER|SHORE|LINING/.test(l));
  const hasPaint = lines.some((l) => /^EXT\s*:/.test(l) && /PAINT|BLAST|PRIMER|COAT/.test(l));
  if (hasRubber && hasPaint) return "Rubber & Paint";
  if (hasRubber) return "Rubber";
  if (hasPaint) return "Paint";
  return "—";
}

interface CoatingAnalysisTabProps {
  jobId: number;
  jobNumber: string;
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
  onSkipTds: () => void;
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
    jobNumber,
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
  const showStockDecision = props.showStockDecision;
  const isPmEditable = showStockDecision || props.isAdmin;
  const hasPmEdits = keys(pmEdits).length > 0;
  const [correctionField, setCorrectionField] = useState("coatingSpec");
  const [correctionValue, setCorrectionValue] = useState("");
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [editingDft, setEditingDft] = useState<number | null>(null);
  const [dftMin, setDftMin] = useState("");
  const [dftMax, setDftMax] = useState("");
  const [savingDft, setSavingDft] = useState(false);
  const [removingCoat, setRemovingCoat] = useState<number | null>(null);
  const [assigningPaint, setAssigningPaint] = useState<number | null>(null);
  const { showToast } = useToast();
  const preferredPaintsQuery = usePreferredPaints();
  const preferredPaintsData = preferredPaintsQuery.data;
  const preferredPaints = preferredPaintsData || [];
  const packOptionsMutation = useCreatePaintPackOptions();
  const [showPackOptions, setShowPackOptions] = useState(false);
  const [packOptions, setPackOptions] = useState<PackOptionResult[]>([]);
  const [packLitres, setPackLitres] = useState<Record<string, number>>({});
  const packOptionsPending = packOptionsMutation.isPending;

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
      const rawNotes = coatingAnalysis ? coatingAnalysis.rawNotes : null;
      const originalValue = rawNotes || null;
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

  const handleAssignPaint = async (idx: number, paintId: number, coatRoleLabel: string) => {
    const paint = preferredPaints.find((p) => p.id === paintId);
    if (!paint) return;
    const recommendedMicrons = paint.recommendedMicrons;
    const paintType = paint.paintType;
    const productName = paint.productName;
    const volumeSolids = paint.volumeSolidsPercent;
    try {
      setAssigningPaint(idx);
      const baseUpdates = {
        product: productName,
        genericType: paintType !== null ? paintType : null,
        solidsByVolumePercent: volumeSolids,
      };
      const updates =
        recommendedMicrons !== null
          ? { ...baseUpdates, minDftUm: recommendedMicrons, maxDftUm: recommendedMicrons }
          : baseUpdates;
      const updated = await stockControlApiClient.updateCoatingCoat(jobId, idx, updates);
      onCoatingAnalysisChange(updated);
      showToast(`Assigned ${productName} to ${coatRoleLabel} coat`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to assign paint";
      showToast(message, "error");
    } finally {
      setAssigningPaint(null);
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 w-10">#</th>
                  <th className="hidden sm:table-cell text-left py-2 pr-4 font-medium text-gray-500">
                    Type
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Item No</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Description</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-500">Qty</th>
                  <th className="hidden sm:table-cell text-right py-2 pr-4 font-medium text-gray-500">
                    m²
                  </th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-500">Total m²</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => {
                  const itemNo = li.itemNo;
                  const itemDescription = li.itemDescription;
                  const m2 = Number(li.m2) || 0;
                  const qty = Number(li.quantity) || 1;
                  return (
                    <tr key={li.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-400">{idx + 1}</td>
                      <td className="hidden sm:table-cell py-2 pr-4 text-gray-700">
                        {workTypeFromNotes(li.notes)}
                      </td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">{itemNo || "—"}</td>
                      <td className="py-2 pr-4 text-gray-700 max-w-[120px] sm:max-w-none truncate">
                        {itemDescription || "—"}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold text-gray-900">{qty}</td>
                      <td className="hidden sm:table-cell py-2 pr-4 text-right text-gray-700">
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
        </div>
      )}

      {coatingAnalysis &&
        (coatingAnalysis.status === "analysed" || coatingAnalysis.status === "accepted") &&
        coatingAnalysis.coats.length > 0 && (
          <div id="coating-spec-review" className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-wrap items-center gap-2">
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
            {(() => {
              const extSurfacePrep = coatingAnalysis.extSurfacePrep;
              const intSurfacePrep = coatingAnalysis.intSurfacePrep;
              const hasExtCoats = coatingAnalysis.coats.some((c) => c.area === "external");
              const hasIntCoats = coatingAnalysis.coats.some((c) => c.area === "internal");
              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 mb-4 text-sm">
                  {coatingAnalysis.applicationType && (
                    <div>
                      <span className="font-medium text-gray-500">Application: </span>
                      <span className="text-gray-900 capitalize">
                        {coatingAnalysis.applicationType}
                      </span>
                    </div>
                  )}
                  {hasExtCoats && (
                    <div>
                      <span className="font-medium text-gray-500">Ext Surface Prep: </span>
                      {isPmEditable ? (
                        <select
                          value={extSurfacePrep || ""}
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
                          <option value="no_blasting">NO BLASTING</option>
                        </select>
                      ) : (
                        <span className="text-gray-900 uppercase">
                          {coatingAnalysis.extSurfacePrep
                            ? coatingAnalysis.extSurfacePrep.replace(/_/g, " ")
                            : "—"}
                        </span>
                      )}
                    </div>
                  )}
                  {hasIntCoats && (
                    <div>
                      <span className="font-medium text-gray-500">Int Surface Prep: </span>
                      {isPmEditable ? (
                        <select
                          value={intSurfacePrep || ""}
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
                  {hasExtCoats && (
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
                  )}
                  {hasIntCoats && (
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
              );
            })()}
            {(() => {
              const rawNotes = coatingAnalysis.rawNotes;
              const uniqueCoats = coatingAnalysis.coats
                .filter((coat) => !isBandingProduct(coat.product, rawNotes))
                .reduce<typeof coatingAnalysis.coats>((acc, coat) => {
                  const exists = acc.find(
                    (c) => c.product === coat.product && c.area === coat.area,
                  );
                  if (!exists) acc.push(coat);
                  return acc;
                }, []);
              const totalLitres = uniqueCoats.reduce((sum, c) => sum + c.litersRequired, 0);
              const allCoats = coatingAnalysis.coats;
              return (
                <div className="space-y-3">
                  {uniqueCoats.map((coat, idx) => {
                    const coatRole = coat.coatRole;
                    const coatRoleLabel = coatRole || "selected";
                    const coatProduct = coat.product;
                    const coatArea = coat.area;
                    const realIndex = allCoats.findIndex(
                      (c) => c.product === coatProduct && c.area === coatArea,
                    );
                    const roleMatched = coatRole
                      ? preferredPaints.filter((p) => p.coatType === coatRole)
                      : [];
                    const otherPaints = coatRole
                      ? preferredPaints.filter((p) => p.coatType !== coatRole)
                      : preferredPaints;
                    const isAssigning = assigningPaint === realIndex;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 text-sm border-b border-gray-100 pb-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 capitalize">
                            {coatArea === "external" ? "Ext" : "Int"}
                          </span>
                          <span className="font-medium text-gray-900">{coatProduct}</span>
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
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            DFT:{" "}
                            {coat.minDftUm === coat.maxDftUm
                              ? coat.minDftUm
                              : `${coat.minDftUm}-${coat.maxDftUm}`}{" "}
                            µm
                          </span>
                          <span className="text-gray-500">
                            Coverage: {coat.coverageM2PerLiter} m²/L
                          </span>
                          {isAdmin &&
                            realIndex >= 0 &&
                            (preferredPaints.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">
                                No preferred paints set
                              </span>
                            ) : (
                              <select
                                value=""
                                disabled={isAssigning}
                                onChange={(e) => {
                                  const selected = e.target.value;
                                  if (!selected) return;
                                  handleAssignPaint(
                                    realIndex,
                                    Number.parseInt(selected, 10),
                                    coatRoleLabel,
                                  );
                                }}
                                className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                title="Assign a preferred paint to this coat"
                              >
                                <option value="" disabled>
                                  {isAssigning ? "Assigning..." : "Assign preferred paint…"}
                                </option>
                                {roleMatched.length > 0 && (
                                  <optgroup label={`Preferred for ${coatRoleLabel} coat`}>
                                    {roleMatched.map((paint) => (
                                      <option key={paint.id} value={paint.id}>
                                        {paint.productName}
                                        {paint.recommendedMicrons !== null
                                          ? ` (${paint.recommendedMicrons}µm)`
                                          : ""}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {otherPaints.length > 0 && (
                                  <optgroup label="Other preferred paints…">
                                    {otherPaints.map((paint) => (
                                      <option key={paint.id} value={paint.id}>
                                        {paint.productName}
                                        {paint.recommendedMicrons !== null
                                          ? ` (${paint.recommendedMicrons}µm)`
                                          : ""}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            ))}
                        </div>
                      </div>
                    );
                  })}
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
                const pmEditedAssessment = coatingAnalysis.pmEditedAssessment;
                const rawNotesForStock = coatingAnalysis.rawNotes;
                const sourceAssessment = (
                  pmEditedAssessment || coatingAnalysis.stockAssessment
                ).filter((item) => !isBandingProduct(item.product, rawNotesForStock));
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

                const effectiveLitres = (product: string, required: number) => {
                  const edited = pmEdits[product];
                  return edited !== undefined ? edited : required;
                };

                const runPackOptions = async (litresByProduct: Record<string, number>) => {
                  try {
                    const items = deduped.map((item) => ({
                      product: item.product,
                      litres: effectiveLitres(item.product, item.required),
                    }));
                    const overrideItems = items.map((entry) => {
                      const override = litresByProduct[entry.product];
                      return override !== undefined ? { ...entry, litres: override } : entry;
                    });
                    const result = await packOptionsMutation.mutateAsync(overrideItems);
                    setPackOptions(result);
                    const seeded = overrideItems.reduce<Record<string, number>>((acc, entry) => {
                      acc[entry.product] = entry.litres;
                      return acc;
                    }, {});
                    setPackLitres(seeded);
                    setShowPackOptions(true);
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Failed to load pack options";
                    showToast(message, "error");
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
                      <div className="flex items-center gap-2">
                        {isPmEditable && (
                          <button
                            onClick={() => runPackOptions({})}
                            disabled={packOptionsPending}
                            className="px-3 py-1 text-xs font-medium rounded-md border border-teal-300 text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Show the cheapest pack combinations to buy for each paint"
                          >
                            {packOptionsPending ? "Loading..." : "Pack options"}
                          </button>
                        )}
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
                    {showPackOptions &&
                      (() => {
                        const matchedOptions = packOptions.filter((opt) => opt.matched);
                        const unmatchedOptions = packOptions.filter((opt) => !opt.matched);
                        return (
                          <div className="mt-4 pt-3 border-t border-gray-100" id="pack-options">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Pack options
                              </h5>
                              <button
                                onClick={() => setShowPackOptions(false)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Hide
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-400 italic mb-2">
                              Cheapest whole-pack combination to buy for each paint. Adjust the
                              litres to order extra for stock.
                            </p>
                            <div className="space-y-3">
                              {matchedOptions.map((opt) => {
                                const product = opt.product;
                                const best = opt.best;
                                const bestTotalCost = opt.bestTotalCost;
                                const bestTotalLitres = opt.bestTotalLitres;
                                const singlePackOptions = opt.singlePackOptions;
                                const litresValue = packLitres[product];
                                const litresInput =
                                  litresValue !== undefined ? litresValue : opt.litres;
                                const overage =
                                  bestTotalLitres !== null && bestTotalLitres > opt.litres;
                                return (
                                  <div
                                    key={product}
                                    className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                      <span className="font-medium text-gray-900">{product}</span>
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500">Litres</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          value={litresInput}
                                          onChange={(e) => {
                                            const parsed = Number.parseFloat(e.target.value) || 0;
                                            setPackLitres((prev) => ({
                                              ...prev,
                                              [product]: parsed,
                                            }));
                                          }}
                                          className="w-20 px-1 py-0.5 text-xs text-right border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                        <button
                                          onClick={() => runPackOptions(packLitres)}
                                          disabled={packOptionsPending}
                                          className="px-2 py-0.5 text-xs font-medium rounded border border-teal-300 text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                                        >
                                          {packOptionsPending ? "..." : "Recalculate"}
                                        </button>
                                      </div>
                                    </div>
                                    {best !== null && best.length > 0 ? (
                                      <div className="mb-2">
                                        <p className="text-xs font-semibold text-teal-700 mb-1">
                                          Recommended (cheapest)
                                        </p>
                                        <ul className="space-y-0.5">
                                          {best.map((line, lineIdx) => {
                                            const qty = line.qty;
                                            const packSizeLitres = line.packSizeLitres;
                                            const packCost = line.packCost;
                                            const lineTotal = line.lineTotal;
                                            return (
                                              <li key={lineIdx} className="text-xs text-gray-700">
                                                {qty} × {packSizeLitres} L @ {money(packCost)} ={" "}
                                                {money(lineTotal)}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                        {bestTotalCost !== null && (
                                          <p className="mt-1 text-xs text-gray-700">
                                            Total:{" "}
                                            <span className="font-bold text-teal-800">
                                              {money(bestTotalCost)}
                                            </span>
                                            {bestTotalLitres !== null && (
                                              <span className="text-gray-500">
                                                {" "}
                                                ({bestTotalLitres} L)
                                              </span>
                                            )}
                                          </p>
                                        )}
                                        {overage && (
                                          <p className="mt-0.5 text-[11px] text-gray-400 italic">
                                            Covers more than needed — whole packs only, the overage
                                            is normal.
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="mb-2 text-xs text-gray-400 italic">
                                        No pack combination available.
                                      </p>
                                    )}
                                    {singlePackOptions.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">
                                          Alternatives
                                        </p>
                                        <ul className="space-y-0.5">
                                          {singlePackOptions.map((line, lineIdx) => {
                                            const qty = line.qty;
                                            const packSizeLitres = line.packSizeLitres;
                                            const packCost = line.packCost;
                                            const lineTotal = line.lineTotal;
                                            return (
                                              <li key={lineIdx} className="text-xs text-gray-600">
                                                {qty} × {packSizeLitres} L @ {money(packCost)} ={" "}
                                                {money(lineTotal)}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {unmatchedOptions.map((opt) => {
                                const product = opt.product;
                                return (
                                  <div
                                    key={product}
                                    className="flex items-center justify-between text-xs text-gray-400 italic"
                                  >
                                    <span>{product}</span>
                                    <span>Not in paint price list</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    {props.showStockDecision &&
                      (() => {
                        const isProcessingDecision = props.isProcessingDecision;
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
                                disabled={isProcessingDecision || !allSufficient}
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

      {coatingAnalysis &&
        coatingAnalysis.status === "failed" &&
        (() => {
          const rawAnalysisError = coatingAnalysis.error;
          return (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-600">
                  Coating analysis failed: {rawAnalysisError || "Unknown error"}
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
          );
        })()}

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
                  const dtFiles = e.dataTransfer.files;
                  const file = dtFiles ? dtFiles[0] : null;
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
                        const targetFiles = e.target.files;
                        const file = targetFiles ? targetFiles[0] : null;
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
                  onClick={props.onSkipTds}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100"
                >
                  Skip & Activate
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

      {isAnalysing && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/10 backdrop-blur-md" aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-lg font-bold text-purple-700">N</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Nix Coating Analysis</h3>
                  <p className="text-xs text-gray-500">Analysing job card</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Checking <span className="font-medium text-purple-700">{jobNumber}</span>
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
