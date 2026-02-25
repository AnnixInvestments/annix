"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { SignaturePad } from "./SignaturePad";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (signatureDataUrl?: string, comments?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  existingSignature?: string | null;
  jobNumber: string;
  stepName: string;
}

export function ApprovalModal({
  isOpen,
  onClose,
  onApprove,
  onReject,
  existingSignature,
  jobNumber,
  stepName,
}: ApprovalModalProps) {
  const [mode, setMode] = useState<"choice" | "approve" | "reject">("choice");
  const [comments, setComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = useCallback(
    async (signatureDataUrl?: string) => {
      setIsSubmitting(true);
      try {
        await onApprove(signatureDataUrl, comments || undefined);
        onClose();
      } catch (error) {
        console.error("Approval failed:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onApprove, comments, onClose],
  );

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(rejectReason);
      onClose();
    } catch (error) {
      console.error("Rejection failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onReject, rejectReason, onClose]);

  const handleClose = useCallback(() => {
    setMode("choice");
    setComments("");
    setRejectReason("");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === "choice" && `Workflow Action: ${jobNumber}`}
              {mode === "approve" && `Approve: ${stepName}`}
              {mode === "reject" && `Reject: ${jobNumber}`}
            </h2>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {mode === "choice" && (
              <div className="space-y-4">
                <p className="text-gray-600">What would you like to do with this job card?</p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setMode("approve")}
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

            {mode === "approve" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Please sign below to approve this step. You can also add optional comments.
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
                  <SignaturePad
                    onSave={handleApprove}
                    onCancel={() => setMode("choice")}
                    existingSignature={existingSignature}
                  />
                </div>

                {isSubmitting && (
                  <div className="text-center text-gray-500">Processing approval...</div>
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
    </div>
  );
}
