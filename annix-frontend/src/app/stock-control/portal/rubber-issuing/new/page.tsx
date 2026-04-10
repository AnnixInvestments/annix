"use client";

import { Camera, Check, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import {
  auRubberApiClient,
  type CreateRollIssuanceItemInput,
  type JcLineItemDto,
  type JcSearchResultDto,
  type RollIssuanceDto,
  type RollIssuanceRollDto,
  type RollPhotoExtractionDto,
} from "@/app/lib/api/auRubberApi";

type WizardStep = "identify" | "select-jcs" | "tick-items" | "review";

interface SelectedJc {
  jc: JcSearchResultDto;
  lineItems: JcLineItemDto[];
  selectedLineItemIds: Set<number>;
}

export default function NewRubberIssuancePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile } = useStockControlAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>("identify");
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [extraction, setExtraction] = useState<RollPhotoExtractionDto | null>(null);
  const [resolvedSupplier, setResolvedSupplier] = useState<string | null>(null);
  const [matchedRoll, setMatchedRoll] = useState<RollIssuanceRollDto | null>(null);
  const [selectedRoll, setSelectedRoll] = useState<RollIssuanceRollDto | null>(null);
  const [isCreatingRoll, setIsCreatingRoll] = useState(false);

  const [jcQuery, setJcQuery] = useState("");
  const [jcResults, setJcResults] = useState<JcSearchResultDto[]>([]);
  const [isSearchingJc, setIsSearchingJc] = useState(false);
  const [selectedJcs, setSelectedJcs] = useState<SelectedJc[]>([]);
  const [loadingJcItems, setLoadingJcItems] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RollIssuanceDto | null>(null);
  const [notes, setNotes] = useState("");

  const handlePhotoCapture = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";
        try {
          setIsIdentifying(true);
          const response = await auRubberApiClient.identifyRollPhoto(base64, mediaType);
          setExtraction(response.extraction);
          setResolvedSupplier(response.supplierResolved);
          if (response.matchedRoll) {
            setMatchedRoll(response.matchedRoll);
            setSelectedRoll(response.matchedRoll);
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Failed to identify roll", "error");
        } finally {
          setIsIdentifying(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [showToast],
  );

  const handleCreateRollFromExtraction = async () => {
    if (!extraction?.batchNumber || !extraction.weightKg) return;
    try {
      setIsCreatingRoll(true);
      const roll = await auRubberApiClient.createRollFromPhoto({
        rollNumber: extraction.batchNumber,
        compoundCode: extraction.compoundCode,
        weightKg: extraction.weightKg,
        widthMm: extraction.widthMm,
        thicknessMm: extraction.thicknessMm,
        lengthM: extraction.lengthM,
      });
      setSelectedRoll(roll);
      setMatchedRoll(roll);
      showToast("Roll created from photo data", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create roll", "error");
    } finally {
      setIsCreatingRoll(false);
    }
  };

  const handleSearchJc = async () => {
    if (!jcQuery.trim()) return;
    try {
      setIsSearchingJc(true);
      const results = await auRubberApiClient.searchJobCardsForIssuing(jcQuery.trim());
      setJcResults(results);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Search failed", "error");
    } finally {
      setIsSearchingJc(false);
    }
  };

  const handleAddJc = async (jc: JcSearchResultDto) => {
    if (selectedJcs.some((s) => s.jc.id === jc.id)) return;
    try {
      setLoadingJcItems(jc.id);
      const lineItems = await auRubberApiClient.jobCardLineItems(jc.id);
      setSelectedJcs((prev) => [
        ...prev,
        { jc, lineItems, selectedLineItemIds: new Set<number>() },
      ]);
      setJcResults([]);
      setJcQuery("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load line items", "error");
    } finally {
      setLoadingJcItems(null);
    }
  };

  const handleRemoveJc = (jcId: number) => {
    setSelectedJcs((prev) => prev.filter((s) => s.jc.id !== jcId));
  };

  const handleToggleLineItem = (jcId: number, lineItemId: number) => {
    setSelectedJcs((prev) =>
      prev.map((s) => {
        if (s.jc.id !== jcId) return s;
        const newSet = new Set(s.selectedLineItemIds);
        if (newSet.has(lineItemId)) {
          newSet.delete(lineItemId);
        } else {
          newSet.add(lineItemId);
        }
        return { ...s, selectedLineItemIds: newSet };
      }),
    );
  };

  const totalSelectedM2 = selectedJcs.reduce((sum, sjc) => {
    return sjc.lineItems
      .filter((li) => sjc.selectedLineItemIds.has(li.id))
      .reduce((s, li) => s + (li.m2 || 0), sum);
  }, 0);

  const rollThickness = selectedRoll ? selectedRoll.thicknessMm : null;
  const extractionThickness = extraction ? extraction.thicknessMm : null;
  const thicknessMm = rollThickness || extractionThickness || null;
  const estimatedUsageKg =
    thicknessMm && totalSelectedM2 > 0 ? totalSelectedM2 * (thicknessMm / 1000) * 1150 : null;
  const rollWeight = selectedRoll ? selectedRoll.weightKg : 0;
  const expectedReturnKg = estimatedUsageKg !== null ? rollWeight - estimatedUsageKg : null;

  const handleSubmit = async () => {
    if (!selectedRoll) return;
    const userName = profile ? profile.name : "Unknown";

    const jobCards: CreateRollIssuanceItemInput[] = selectedJcs.map((sjc) => ({
      jobCardId: sjc.jc.id,
      jcNumber: sjc.jc.jcNumber || sjc.jc.jobNumber,
      jobName: sjc.jc.jobName,
      lineItems: sjc.lineItems
        .filter((li) => sjc.selectedLineItemIds.has(li.id))
        .map((li) => ({
          lineItemId: li.id,
          itemDescription: li.itemDescription,
          itemNo: li.itemNo,
          quantity: li.quantity,
          m2: li.m2,
        })),
    }));

    try {
      setIsSubmitting(true);
      const issuance = await auRubberApiClient.createRollIssuance({
        rollStockId: selectedRoll.id,
        issuedBy: userName,
        notes: notes || null,
        jobCards,
      });
      setResult(issuance);
      showToast("Roll issued successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create issuance", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedFromIdentify = selectedRoll !== null;
  const canProceedFromJcs = selectedJcs.length > 0;
  const canProceedFromItems = selectedJcs.some((s) => s.selectedLineItemIds.size > 0);

  if (result) {
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" aria-hidden="true" />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Roll Issued</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600 text-left">
              <p>
                <strong>Roll:</strong> {result.rollNumber}
              </p>
              <p>
                <strong>Weight:</strong> {result.rollWeightAtIssueKg.toFixed(1)} kg
              </p>
              {result.totalEstimatedUsageKg !== null && (
                <p>
                  <strong>Estimated usage:</strong> {result.totalEstimatedUsageKg.toFixed(1)} kg
                </p>
              )}
              {result.expectedReturnKg !== null && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
                  <p className="font-semibold text-yellow-800">
                    Workers must return {result.expectedReturnKg.toFixed(1)} kg to stock
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Notifications have been sent to the issuer and PM.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push("/stock-control/portal/rubber-issuing")}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/stock-control/portal/rubber-issuing" className="hover:text-yellow-700">
          Rubber Issuing
        </a>
        <span>/</span>
        <span className="text-gray-900">New Issuance</span>
      </div>

      <div className="flex gap-1 mb-4">
        {(["identify", "select-jcs", "tick-items", "review"] as WizardStep[]).map((s, i) => {
          const labels = ["1. Roll", "2. Job Cards", "3. Items", "4. Review"];
          const isActive = s === step;
          const stepIndex = ["identify", "select-jcs", "tick-items", "review"].indexOf(step);
          const isDone = i < stepIndex;
          return (
            <div
              key={s}
              className={`flex-1 text-center py-2 text-xs font-medium rounded ${
                isActive
                  ? "bg-yellow-600 text-white"
                  : isDone
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {labels[i]}
            </div>
          );
        })}
      </div>

      {step === "identify" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Identify Roll</h2>
            <p className="text-sm text-gray-600 mb-4">
              Take a photo of the roll label or enter details manually.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoCapture(file);
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isIdentifying}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-yellow-400 rounded-lg text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
            >
              {isIdentifying ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
              {isIdentifying ? "Identifying..." : "Take Photo / Upload Image"}
            </button>
          </div>

          {extraction && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Extracted Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Date</span>
                  <p className="font-medium">{extraction.date || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Supplier</span>
                  <p className="font-medium">
                    {resolvedSupplier || extraction.supplier || "-"}
                    {resolvedSupplier && resolvedSupplier !== extraction.supplier && (
                      <span className="text-xs text-gray-400 ml-1">
                        (label: {extraction.supplier})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Compound</span>
                  <p className="font-medium">{extraction.compoundCode || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Batch #</span>
                  <p className="font-medium">{extraction.batchNumber || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Dimensions</span>
                  <p className="font-medium">
                    {extraction.thicknessMm || "?"} x {extraction.widthMm || "?"} x{" "}
                    {extraction.lengthM || "?"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Weight</span>
                  <p className="font-medium">
                    {extraction.weightKg ? `${extraction.weightKg} kg` : "-"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Confidence: {Math.round(extraction.confidence * 100)}%
              </p>

              {matchedRoll ? (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm font-medium text-green-800">
                    Matched roll: {matchedRoll.rollNumber} ({matchedRoll.weightKg} kg)
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-2">
                    <p className="text-sm text-orange-800">No matching roll found in stock</p>
                  </div>
                  <button
                    onClick={handleCreateRollFromExtraction}
                    disabled={isCreatingRoll || !extraction.batchNumber || !extraction.weightKg}
                    className="w-full px-4 py-3 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {isCreatingRoll ? "Creating..." : "Create Roll from Photo Data"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === "select-jcs" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Job Cards</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={jcQuery}
                onChange={(e) => setJcQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchJc()}
                placeholder="Search JC number or job name..."
                className="flex-1 px-3 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
              <button
                onClick={handleSearchJc}
                disabled={isSearchingJc}
                className="px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {isSearchingJc ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>

            {jcResults.length > 0 && (
              <div className="mt-3 divide-y divide-gray-100 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                {jcResults.map((jc) => {
                  const alreadyAdded = selectedJcs.some((s) => s.jc.id === jc.id);
                  return (
                    <button
                      key={jc.id}
                      onClick={() => handleAddJc(jc)}
                      disabled={alreadyAdded || loadingJcItems === jc.id}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      <div className="font-medium">{jc.jcNumber || jc.jobNumber}</div>
                      <div className="text-gray-500 text-xs">{jc.jobName}</div>
                      {loadingJcItems === jc.id && (
                        <Loader2 className="w-4 h-4 animate-spin inline ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedJcs.length > 0 && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Selected ({selectedJcs.length})
              </h3>
              <div className="space-y-2">
                {selectedJcs.map((sjc) => (
                  <div
                    key={sjc.jc.id}
                    className="flex items-center justify-between bg-yellow-50 rounded-md px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {sjc.jc.jcNumber || sjc.jc.jobNumber}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">{sjc.jc.jobName}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveJc(sjc.jc.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "tick-items" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Line Items</h2>
            <p className="text-sm text-gray-500 mb-4">
              Tick the items being lined with this roll on each job card.
            </p>
          </div>

          {selectedJcs.map((sjc) => (
            <div key={sjc.jc.id} className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-700 mb-3">
                {sjc.jc.jcNumber || sjc.jc.jobNumber} — {sjc.jc.jobName}
              </h3>
              {sjc.lineItems.length === 0 ? (
                <p className="text-sm text-gray-400">No line items</p>
              ) : (
                <div className="space-y-2">
                  {sjc.lineItems.map((li) => {
                    const isChecked = sjc.selectedLineItemIds.has(li.id);
                    return (
                      <label
                        key={li.id}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          isChecked
                            ? "border-yellow-400 bg-yellow-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleLineItem(sjc.jc.id, li.id)}
                          className="mt-0.5 w-5 h-5 rounded text-yellow-600 focus:ring-yellow-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {li.itemNo ? `${li.itemNo}: ` : ""}
                            {li.itemDescription || "No description"}
                          </p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            {li.quantity !== null && <span>Qty: {li.quantity}</span>}
                            {li.m2 !== null && <span>{li.m2} m2</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {step === "review" && selectedRoll && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Review Issuance</h2>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-gray-500">Roll</span>
                <p className="font-medium">{selectedRoll.rollNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Compound</span>
                <p className="font-medium">{selectedRoll.compoundCode || "-"}</p>
              </div>
              <div>
                <span className="text-gray-500">Roll Weight</span>
                <p className="font-medium">{selectedRoll.weightKg.toFixed(1)} kg</p>
              </div>
              <div>
                <span className="text-gray-500">Total m2 Selected</span>
                <p className="font-medium">{totalSelectedM2.toFixed(2)} m2</p>
              </div>
            </div>

            {estimatedUsageKg !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                <p className="text-sm text-blue-800">
                  <strong>Estimated usage:</strong> {estimatedUsageKg.toFixed(1)} kg
                </p>
              </div>
            )}

            {expectedReturnKg !== null && (
              <div
                className={`rounded-md p-3 mb-3 ${
                  expectedReturnKg >= 0
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    expectedReturnKg >= 0 ? "text-green-800" : "text-red-800"
                  }`}
                >
                  Expected return: {expectedReturnKg.toFixed(1)} kg
                </p>
                {expectedReturnKg < 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Warning: Not enough material on this roll
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {selectedJcs.map((sjc) => {
                const selectedItems = sjc.lineItems.filter((li) =>
                  sjc.selectedLineItemIds.has(li.id),
                );
                return (
                  <div key={sjc.jc.id} className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm font-medium">{sjc.jc.jcNumber || sjc.jc.jobNumber}</p>
                    <ul className="mt-1 text-xs text-gray-600 list-disc pl-4">
                      {selectedItems.map((li) => (
                        <li key={li.id}>
                          {li.itemDescription || li.itemNo || "Item"}
                          {li.m2 !== null ? ` (${li.m2} m2)` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-50">
        {step !== "identify" && (
          <button
            onClick={() => {
              const steps: WizardStep[] = ["identify", "select-jcs", "tick-items", "review"];
              const idx = steps.indexOf(step);
              if (idx > 0) setStep(steps[idx - 1]);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {step === "identify" && (
          <button
            onClick={() => setStep("select-jcs")}
            disabled={!canProceedFromIdentify}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-3 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {step === "select-jcs" && (
          <button
            onClick={() => setStep("tick-items")}
            disabled={!canProceedFromJcs}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-3 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {step === "tick-items" && (
          <button
            onClick={() => setStep("review")}
            disabled={!canProceedFromItems}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-3 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
          >
            Review
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {step === "review" && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-3 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {isSubmitting ? "Issuing..." : "Issue Roll"}
          </button>
        )}
      </div>
    </div>
  );
}
