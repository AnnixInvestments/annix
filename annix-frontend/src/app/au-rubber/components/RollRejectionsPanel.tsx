"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Link2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RollRejectionDto,
  type RollRejectionStatus,
  type RubberSupplierCocDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA } from "@/app/lib/datetime";

interface RollRejectionsPanelProps {
  supplierCoc: RubberSupplierCocDto;
  onRejectionCreated?: () => void;
}

const STATUS_COLORS: Record<RollRejectionStatus, string> = {
  PENDING_RETURN: "bg-amber-100 text-amber-800",
  RETURNED: "bg-blue-100 text-blue-800",
  REPLACEMENT_RECEIVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

export function RollRejectionsPanel(props: RollRejectionsPanelProps) {
  const { supplierCoc, onRejectionCreated } = props;
  const { showToast } = useToast();
  const [rejections, setRejections] = useState<RollRejectionDto[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [linkCocId, setLinkCocId] = useState("");
  const [linkRollNumber, setLinkRollNumber] = useState("");

  const [rejectForm, setRejectForm] = useState({
    rollNumber: "",
    rejectionReason: "",
    rejectedBy: "",
    notes: "",
  });

  const fetchRejections = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.rollRejectionsBySupplierCoc(supplierCoc.id);
      setRejections(data);
      if (data.length > 0) {
        setIsExpanded(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load rejections", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRejections();
  }, [supplierCoc.id]);

  const handleRejectRoll = async () => {
    if (!rejectForm.rollNumber || !rejectForm.rejectionReason || !rejectForm.rejectedBy) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      const rawRejectFormNotes = rejectForm.notes;
      setIsSubmitting(true);
      await auRubberApiClient.createRollRejection({
        originalSupplierCocId: supplierCoc.id,
        rollNumber: rejectForm.rollNumber,
        rejectionReason: rejectForm.rejectionReason,
        rejectedBy: rejectForm.rejectedBy,
        notes: rawRejectFormNotes || null,
      });
      showToast("Roll rejection created", "success");
      setShowRejectForm(false);
      setRejectForm({ rollNumber: "", rejectionReason: "", rejectedBy: "", notes: "" });
      fetchRejections();
      if (onRejectionCreated) onRejectionCreated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create rejection", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadReturnDoc = async (rejectionId: number, file: File) => {
    try {
      setUploadingId(rejectionId);
      await auRubberApiClient.uploadRollRejectionReturnDocument(rejectionId, file);
      showToast("Return document uploaded", "success");
      fetchRejections();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload document", "error");
    } finally {
      setUploadingId(null);
    }
  };

  const handleLinkReplacement = async (rejectionId: number) => {
    if (!linkCocId) {
      showToast("Please enter a replacement CoC ID", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await auRubberApiClient.linkReplacementCoc(rejectionId, {
        replacementCocId: Number(linkCocId),
        replacementRollNumber: linkRollNumber || undefined,
      });
      showToast("Replacement CoC linked", "success");
      setLinkingId(null);
      setLinkCocId("");
      setLinkRollNumber("");
      fetchRejections();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to link replacement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (rejectionId: number) => {
    try {
      await auRubberApiClient.closeRollRejection(rejectionId);
      showToast("Rejection closed", "success");
      fetchRejections();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to close rejection", "error");
    }
  };

  const handleViewReturnDoc = async (rejectionId: number) => {
    try {
      const result = await auRubberApiClient.rollRejectionReturnDocumentUrl(rejectionId);
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to get document URL", "error");
    }
  };

  const extractedRollNumbers = (() => {
    const data = supplierCoc.extractedData as Record<string, unknown> | null;
    const rawDataRollNumbers = data?.rollNumbers;
    const rolls = (rawDataRollNumbers || []) as string[];
    return rolls;
  })();

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-medium text-gray-900">
            Roll Rejections
            {rejections.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">({rejections.length})</span>
            )}
          </h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-6">
          {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

          {!isLoading && rejections.length === 0 && !showRejectForm && (
            <p className="text-sm text-gray-500">No roll rejections for this CoC.</p>
          )}

          {rejections.length > 0 && (
            <div className="space-y-4 mb-4">
              {rejections.map((rejection) => {
                const rawRejectionReplacementCocNumber = rejection.replacementCocNumber;
                return (
                  <div key={rejection.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            Roll {rejection.rollNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[rejection.status]}`}
                          >
                            {rejection.statusLabel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{rejection.rejectionReason}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Rejected by {rejection.rejectedBy} on{" "}
                          {formatDateTimeZA(rejection.rejectedAt)}
                        </p>
                        {rejection.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{rejection.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {rejection.status === "PENDING_RETURN" && (
                        <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          {uploadingId === rejection.id ? "Uploading..." : "Upload Return Doc"}
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadingId === rejection.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadReturnDoc(rejection.id, file);
                            }}
                          />
                        </label>
                      )}

                      {rejection.returnDocumentPath && (
                        <button
                          type="button"
                          onClick={() => handleViewReturnDoc(rejection.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          View Return Doc
                        </button>
                      )}

                      {(rejection.status === "RETURNED" || rejection.status === "PENDING_RETURN") &&
                        !rejection.replacementSupplierCocId &&
                        (linkingId === rejection.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={linkCocId}
                              onChange={(e) => setLinkCocId(e.target.value)}
                              placeholder="Replacement CoC ID"
                              className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <input
                              type="text"
                              value={linkRollNumber}
                              onChange={(e) => setLinkRollNumber(e.target.value)}
                              placeholder="Roll # (optional)"
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleLinkReplacement(rejection.id)}
                              disabled={isSubmitting}
                              className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              Link
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingId(null);
                                setLinkCocId("");
                                setLinkRollNumber("");
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLinkingId(rejection.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Link2 className="w-3.5 h-3.5 mr-1" />
                            Link Replacement CoC
                          </button>
                        ))}

                      {rejection.replacementSupplierCocId && (
                        <NextLink
                          href={`/au-rubber/portal/supplier-cocs/${rejection.replacementSupplierCocId}`}
                          className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100"
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1" />
                          Replacement:{" "}
                          {rawRejectionReplacementCocNumber ||
                            `CoC-${rejection.replacementSupplierCocId}`}
                          {rejection.replacementRollNumber &&
                            ` (Roll ${rejection.replacementRollNumber})`}
                        </NextLink>
                      )}

                      {rejection.status !== "CLOSED" && rejection.replacementSupplierCocId && (
                        <button
                          type="button"
                          onClick={() => handleClose(rejection.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showRejectForm && (
            <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Reject Roll</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Roll Number *
                  </label>
                  {extractedRollNumbers.length > 0 ? (
                    <select
                      value={rejectForm.rollNumber}
                      onChange={(e) => setRejectForm({ ...rejectForm, rollNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select roll...</option>
                      {extractedRollNumbers.map((rn) => (
                        <option key={rn} value={rn}>
                          {rn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={rejectForm.rollNumber}
                      onChange={(e) => setRejectForm({ ...rejectForm, rollNumber: e.target.value })}
                      placeholder="e.g. 41823"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Rejected By *
                  </label>
                  <input
                    type="text"
                    value={rejectForm.rejectedBy}
                    onChange={(e) => setRejectForm({ ...rejectForm, rejectedBy: e.target.value })}
                    placeholder="Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectForm.rejectionReason}
                    onChange={(e) =>
                      setRejectForm({ ...rejectForm, rejectionReason: e.target.value })
                    }
                    rows={2}
                    placeholder="Reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={rejectForm.notes}
                    onChange={(e) => setRejectForm({ ...rejectForm, notes: e.target.value })}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleRejectRoll}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showRejectForm && (
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              className="inline-flex items-center px-3 py-2 border border-amber-300 rounded-md text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100"
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Reject Roll
            </button>
          )}
        </div>
      )}
    </div>
  );
}
