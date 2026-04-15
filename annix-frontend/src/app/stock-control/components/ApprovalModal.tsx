"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { StepOutcome } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { useModalAccessibility } from "../lib/useModalAccessibility";
import { SignaturePad } from "./SignaturePad";

const OUTCOME_STYLE_MAP: Record<string, string> = {
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-600 hover:bg-red-700",
  amber: "bg-amber-600 hover:bg-amber-700",
  blue: "bg-blue-600 hover:bg-blue-700",
};

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (signatureDataUrl?: string, comments?: string, outcomeKey?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  jobNumber: string;
  stepName: string;
  stepOutcomes?: StepOutcome[] | null;
}

export function ApprovalModal(props: ApprovalModalProps) {
  const { isOpen, onClose, onApprove, onReject, jobNumber, stepName, stepOutcomes } = props;
  const hasOutcomes = stepOutcomes && stepOutcomes.length > 0;
  const [mode, setMode] = useState<"choice" | "outcome" | "approve" | "reject">("choice");
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingSignature(true);
    stockControlApiClient
      .mySignature()
      .then((result) => {
        setSavedSignature(result.signatureUrl);
      })
      .catch(() => {
        setSavedSignature(null);
      })
      .finally(() => {
        setIsLoadingSignature(false);
      });
  }, [isOpen]);

  const handleApprove = useCallback(
    async (signatureDataUrl?: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const dataUrl = signatureDataUrl || undefined;
        const approvalComments = comments || undefined;
        const outcomeKey = selectedOutcome || undefined;
        await onApprove(dataUrl, approvalComments, outcomeKey);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Approval failed. Please try again.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onApprove, comments, selectedOutcome, onClose],
  );

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onReject(rejectReason);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rejection failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [onReject, rejectReason, onClose]);

  const handleClose = useCallback(() => {
    setMode("choice");
    setSelectedOutcome(null);
    setComments("");
    setRejectReason("");
    setError(null);
    onClose();
  }, [onClose]);

  const handleSelectOutcome = useCallback((outcomeKey: string) => {
    setSelectedOutcome(outcomeKey);
    setMode("approve");
  }, []);

  const modalFocusRef = useModalAccessibility(isOpen, handleClose);

  if (!isOpen) return null;

  const selectedOutcomeMatch = stepOutcomes?.find((o) => o.key === selectedOutcome);
  const selectedOutcomeText = selectedOutcomeMatch?.label;
  const selectedOutcomeLabel = selectedOutcomeText || "";
  const closeMode = hasOutcomes ? "outcome" : "choice";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 id="approval-modal-title" className="text-lg font-semibold text-gray-900">
              {mode === "choice" && `Workflow Action: ${jobNumber}`}
              {mode === "outcome" && `Select Outcome: ${stepName}`}
              {mode === "approve" &&
                (selectedOutcomeLabel
                  ? `Approve (${selectedOutcomeLabel}): ${stepName}`
                  : `Approve: ${stepName}`)}
              {mode === "reject" && `Reject: ${jobNumber}`}
            </h2>
            <button
              ref={modalFocusRef as React.RefObject<HTMLButtonElement>}
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {mode === "choice" && (
              <div className="space-y-4">
                <p className="text-gray-600">What would you like to do with this job card?</p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => (hasOutcomes ? setMode("outcome") : setMode("approve"))}
                    className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setMode("reject")}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {mode === "outcome" && hasOutcomes && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Select the material sourcing method for this job card:
                </p>
                <div className="flex space-x-4">
                  {stepOutcomes.map((outcome) => (
                    <button
                      key={outcome.key}
                      onClick={() => handleSelectOutcome(outcome.key)}
                      className={`flex-1 px-4 py-3 text-white rounded-lg font-medium ${(() => {
                        const outcomeStyle = OUTCOME_STYLE_MAP[outcome.style];
                        return outcomeStyle || "bg-gray-600 hover:bg-gray-700";
                      })()}`}
                    >
                      {outcome.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setMode("choice")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back
                </button>
              </div>
            )}

            {mode === "approve" && (
              <div className="space-y-4">
                {selectedOutcomeLabel && (
                  <div className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-md text-sm text-teal-800">
                    Material sourcing: <span className="font-semibold">{selectedOutcomeLabel}</span>
                  </div>
                )}

                <p className="text-gray-600">
                  {savedSignature
                    ? "Your saved signature is shown below. You can use it or draw a new one."
                    : "Please sign below to approve this step. Your signature will be saved for future approvals."}
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments (optional)
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Add any comments..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                  {isLoadingSignature ? (
                    <div className="text-center text-gray-500 py-8">Loading signature...</div>
                  ) : (
                    <SignaturePad
                      onSave={handleApprove}
                      onCancel={() => setMode(closeMode)}
                      existingSignature={savedSignature}
                    />
                  )}
                </div>

                {isSubmitting && (
                  <div className="text-center text-gray-500">Processing approval...</div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            )}

            {mode === "reject" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Please provide a reason for rejecting this job card. This will be sent back to the
                  submitter.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    placeholder="Explain why this job card is being rejected..."
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setMode("choice")}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Rejecting..." : "Reject Job Card"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
