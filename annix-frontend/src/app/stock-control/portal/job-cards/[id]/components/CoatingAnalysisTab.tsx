"use client";

import { useState } from "react";
import type { CoatingAnalysis, UnverifiedProduct } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
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

export function CoatingAnalysisTab({
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
}: CoatingAnalysisTabProps) {
  return (
    <div className="space-y-6">
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
                <button
                  onClick={onRunAnalysis}
                  disabled={isAnalysing}
                  className="text-xs text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Re-analyse"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
              {coatingAnalysis.applicationType && (
                <div>
                  <span className="font-medium text-gray-500">Application: </span>
                  <span className="text-gray-900 capitalize">
                    {coatingAnalysis.applicationType}
                  </span>
                </div>
              )}
              {coatingAnalysis.surfacePrep && (
                <div>
                  <span className="font-medium text-gray-500">Surface Prep: </span>
                  <span className="text-gray-900 uppercase">
                    {coatingAnalysis.surfacePrep.replace(/_/g, " ")}
                  </span>
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
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Area</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Product</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-500">
                    DFT (&#181;m) <HelpTooltip term="DFT" />
                  </th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-500">
                    Coverage (m&#178;/L)
                  </th>
                  <th className="text-right py-2 font-medium text-gray-500">Litres Req.</th>
                </tr>
              </thead>
              <tbody>
                {coatingAnalysis.coats.map((coat, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-600 capitalize">
                      {coat.area === "external" ? "Ext" : "Int"}
                    </td>
                    <td className="py-2 pr-4 text-gray-900 font-medium">
                      {coat.product}
                      {coat.verified === false && (
                        <span
                          className="ml-1.5 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700"
                          title="Volume solids estimated - upload TDS to verify"
                        >
                          unverified
                        </span>
                      )}
                      {coat.verified === true && (
                        <span
                          className="ml-1.5 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700"
                          title="Volume solids verified"
                        >
                          verified
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-900">
                      {coat.minDftUm}-{coat.maxDftUm}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-900">
                      {coat.coverageM2PerLiter}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      {coat.litersRequired === 0 ? "\u2014" : coat.litersRequired}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400 italic">
              Coverage includes {pipingLossPct}% piping loss factor
            </p>
            {coatingAnalysis.stockAssessment.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Stock Assessment
                </h5>
                <div className="space-y-1">
                  {coatingAnalysis.stockAssessment.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.product}</span>
                      <div className="flex items-center space-x-3">
                        {item.stockItemId ? (
                          <>
                            <span className="text-gray-500">
                              {item.currentStock} / {item.required} {item.unit}
                            </span>
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                item.sufficient
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {item.sufficient ? "OK" : "Short"}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-amber-600 italic">Not in inventory</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {showTdsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                onShowTdsModal(false);
                onTdsFileChange(null);
              }}
            ></div>
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
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
                      className="mx-auto h-10 w-10 text-gray-400"
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
                    <p className="mt-1 text-sm text-gray-600">Upload Technical Data Sheet (PDF)</p>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        onTdsFileChange(file);
                      }}
                    />
                  </label>
                )}
              </div>
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
                  {isUploadingTds ? "Processing..." : "Upload & Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
