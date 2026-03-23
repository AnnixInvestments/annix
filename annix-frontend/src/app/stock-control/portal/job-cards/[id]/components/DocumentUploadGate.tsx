"use client";

import { Download, Eye, FileText, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ReconciliationDocCategory,
  ReconciliationDocumentRecord,
  ReconciliationGateStatus,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface DocumentUploadGateProps {
  jobCardId: number;
  onGateSatisfied: () => void;
}

const CATEGORY_LABELS: Record<ReconciliationDocCategory, string> = {
  jt_dn: "JT / Delivery Note",
  sales_order: "Sales Order",
  cpo: "Customer Purchase Order",
  drawing: "Drawing",
  polymer_dn: "Polymer DN",
  mps_dn: "MPS DN",
};

const GATE_CATEGORIES: ReconciliationDocCategory[] = ["jt_dn", "sales_order", "cpo", "drawing"];

const EXTRACTION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Queued", className: "text-gray-500" },
  processing: { label: "Extracting...", className: "text-blue-600" },
  completed: { label: "Extracted", className: "text-green-600" },
  failed: { label: "Failed", className: "text-red-600" },
};

export function DocumentUploadGate(props: DocumentUploadGateProps) {
  const [gateStatus, setGateStatus] = useState<ReconciliationGateStatus | null>(null);
  const [documents, setDocuments] = useState<ReconciliationDocumentRecord[]>([]);
  const [uploading, setUploading] = useState<ReconciliationDocCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refresh = useCallback(async () => {
    try {
      const [gate, docs] = await Promise.all([
        stockControlApiClient.reconciliationGateStatus(props.jobCardId),
        stockControlApiClient.reconciliationDocuments(props.jobCardId),
      ]);
      setGateStatus(gate);
      setDocuments(docs);
      if (gate.satisfied) {
        props.onGateSatisfied();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gate status");
    }
  }, [props.jobCardId, props.onGateSatisfied]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleFileSelect = async (category: ReconciliationDocCategory, file: File) => {
    try {
      setUploading(category);
      setError(null);
      await stockControlApiClient.uploadReconciliationDocument(props.jobCardId, file, category);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      setError(null);
      await stockControlApiClient.deleteReconciliationDocument(props.jobCardId, docId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleView = async (docId: number) => {
    try {
      const { url } = await stockControlApiClient.reconciliationDocumentViewUrl(
        props.jobCardId,
        docId,
      );
      setViewingUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    }
  };

  const handleRetryExtraction = async (docId: number) => {
    try {
      await stockControlApiClient.retryReconciliationExtraction(props.jobCardId, docId);
      setTimeout(refresh, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  };

  const docForCategory = (category: ReconciliationDocCategory) =>
    documents.find((d) => d.documentCategory === category) || null;

  const gateDoc = (category: ReconciliationDocCategory) =>
    gateStatus?.documents.find((d) => d.category === category) || null;

  const requiredCount = gateStatus?.documents.filter((d) => d.required).length || 0;
  const uploadedRequiredCount =
    gateStatus?.documents.filter((d) => d.required && d.uploaded).length || 0;

  return (
    <>
      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Upload Required Documents</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Upload the following documents to proceed. Required documents are marked with *.
            </p>
          </div>
          <div className="text-xs font-medium text-amber-700">
            {uploadedRequiredCount}/{requiredCount} required
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GATE_CATEGORIES.map((category) => {
            const doc = docForCategory(category);
            const gate = gateDoc(category);
            const isRequired = gate?.required !== false;
            const isUploading = uploading === category;
            const extractionInfo = doc
              ? EXTRACTION_STATUS_LABELS[doc.extractionStatus] || null
              : null;

            return (
              <div
                key={category}
                className={`rounded-md border p-3 ${
                  doc ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    {CATEGORY_LABELS[category]}
                    {isRequired && <span className="ml-0.5 text-red-500">*</span>}
                  </span>
                  {doc && extractionInfo && (
                    <span className={`text-xs ${extractionInfo.className}`}>
                      {extractionInfo.label}
                      {doc.extractionStatus === "failed" && (
                        <button
                          onClick={() => handleRetryExtraction(doc.id)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          title="Retry extraction"
                        >
                          <RefreshCw className="inline h-3 w-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>

                {doc ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <FileText className="h-3.5 w-3.5 text-green-600" />
                      <span className="max-w-[140px] truncate">{doc.originalFilename}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(doc.id)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={stockControlApiClient.reconciliationDocumentDownloadUrl(
                          props.jobCardId,
                          doc.id,
                        )}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Download"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[category] = el;
                      }}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelect(category, file);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[category]?.click()}
                      disabled={isUploading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-teal-400 hover:text-teal-600 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {isUploading ? "Uploading..." : "Choose file"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {gateStatus?.satisfied && (
          <div className="mt-3 rounded-md bg-green-100 p-2 text-center text-xs font-medium text-green-800">
            All required documents uploaded. Gate satisfied.
          </div>
        )}
      </div>

      {viewingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative h-[90vh] w-[90vw] max-w-5xl rounded-lg bg-white shadow-xl">
            <button
              onClick={() => setViewingUrl(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-gray-100 p-1.5 hover:bg-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe src={viewingUrl} className="h-full w-full rounded-lg" title="Document Viewer" />
          </div>
        </div>
      )}
    </>
  );
}
