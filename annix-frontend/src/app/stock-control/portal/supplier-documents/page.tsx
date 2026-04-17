"use client";

import { keys } from "es-toolkit/compat";
import { useMemo, useState } from "react";
import type {
  SupplierDocument,
  SupplierDocumentExpiryStatus,
  SupplierDocumentType,
} from "@/app/lib/api/stock-control-api/types";
import { fromISO } from "@/app/lib/datetime";
import {
  useDeleteSupplierDocument,
  useStockControlSuppliers,
  useSupplierDocumentById,
  useSupplierDocumentsList,
  useUploadSupplierDocument,
} from "@/app/lib/query/hooks";

const DOC_TYPE_OPTIONS: { value: SupplierDocumentType; label: string }[] = [
  { value: "bee_certificate", label: "BEE Certificate" },
  { value: "tax_clearance", label: "Tax Clearance" },
  { value: "iso_certificate", label: "ISO Certification" },
  { value: "insurance", label: "Public Liability Insurance" },
  { value: "msds", label: "MSDS Sheet" },
  { value: "bank_confirmation", label: "Bank Confirmation" },
  { value: "company_registration", label: "Company Registration" },
  { value: "vat_registration", label: "VAT Registration" },
  { value: "other", label: "Other" },
];

const DOC_TYPE_LABELS: Record<SupplierDocumentType, string> = DOC_TYPE_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<SupplierDocumentType, string>,
);

const EXPIRY_STATUS_LABELS: Record<SupplierDocumentExpiryStatus, string> = {
  expired: "Expired",
  expiring_soon: "Expiring Soon",
  valid: "Valid",
  no_expiry: "No Expiry",
};

function expiryBadgeClass(status: SupplierDocumentExpiryStatus): string {
  if (status === "expired") return "bg-red-100 text-red-800 border-red-200";
  if (status === "expiring_soon") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "valid") return "bg-green-100 text-green-800 border-green-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return fromISO(iso)
    .toJSDate()
    .toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

export default function SupplierDocumentsPage() {
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [filterDocType, setFilterDocType] = useState<string>("");
  const [filterExpiry, setFilterExpiry] = useState<string>("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSupplierId, setUploadSupplierId] = useState<string>("");
  const [uploadDocType, setUploadDocType] = useState<SupplierDocumentType>("bee_certificate");
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadIssuedAt, setUploadIssuedAt] = useState("");
  const [uploadExpiresAt, setUploadExpiresAt] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const docFilters = useMemo(() => {
    const f: Record<string, string | number | undefined> = {};
    if (filterSupplier) f.supplierId = Number(filterSupplier);
    if (filterDocType) f.docType = filterDocType;
    if (filterExpiry) f.expiryStatus = filterExpiry;
    return f;
  }, [filterSupplier, filterDocType, filterExpiry]);

  const {
    data: documents = [],
    isLoading: loading,
    error: queryError,
  } = useSupplierDocumentsList(docFilters);
  const { data: suppliers = [] } = useStockControlSuppliers();
  const uploadDocMutation = useUploadSupplierDocument();
  const docByIdMutation = useSupplierDocumentById();
  const deleteDocMutation = useDeleteSupplierDocument();

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load supplier documents"
    : null;

  const supplierMap = useMemo(() => {
    return suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as Record<number, string>);
  }, [suppliers]);

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadSupplierId("");
    setUploadDocType("bee_certificate");
    setUploadDocNumber("");
    setUploadIssuedAt("");
    setUploadExpiresAt("");
    setUploadNotes("");
    setUploadError(null);
  };

  const uploading = uploadDocMutation.isPending;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadSupplierId) {
      setUploadError("File and supplier are required");
      return;
    }
    setUploadError(null);
    try {
      await uploadDocMutation.mutateAsync({
        file: uploadFile,
        data: {
          supplierId: Number(uploadSupplierId),
          docType: uploadDocType,
          docNumber: uploadDocNumber || null,
          issuedAt: uploadIssuedAt || null,
          expiresAt: uploadExpiresAt || null,
          notes: uploadNotes || null,
        },
      });
      setShowUploadModal(false);
      resetUploadForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadError(msg);
    }
  };

  const handleDownload = async (doc: SupplierDocument) => {
    try {
      const full = await docByIdMutation.mutateAsync(doc.id);
      const url = full.downloadUrl;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate download link";
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(msg);
    }
  };

  const handleDelete = async (doc: SupplierDocument) => {
    const mappedName = supplierMap[doc.supplierId];
    const supplierName = mappedName ? mappedName : `Supplier ${doc.supplierId}`;
    const docLabel = DOC_TYPE_LABELS[doc.docType];
    const confirmed = window.confirm(`Delete ${docLabel} for ${supplierName}?`);
    if (!confirmed) return;
    try {
      await deleteDocMutation.mutateAsync(doc.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete document";
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(msg);
    }
  };

  const groupedBySupplier = useMemo(() => {
    return documents.reduce(
      (acc, doc) => {
        const key = doc.supplierId;
        const prior = acc[key];
        const existing = prior || [];
        return { ...acc, [key]: [...existing, doc] };
      },
      {} as Record<number, SupplierDocument[]>,
    );
  }, [documents]);

  const sortedSupplierIds = useMemo(() => {
    return keys(groupedBySupplier)
      .map((k) => Number(k))
      .sort((a, b) => {
        const rawA = supplierMap[a];
        const rawB = supplierMap[b];
        const aName = rawA || "";
        const bName = rawB || "";
        return aName.localeCompare(bName);
      });
  }, [groupedBySupplier, supplierMap]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Supplier Documents
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Compliance documents per supplier with expiry tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-[#323288] hover:bg-[#4a4da3] text-white rounded-md text-sm font-medium shadow-sm"
        >
          Upload Document
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterDocType}
          onChange={(e) => setFilterDocType(e.target.value)}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="">All document types</option>
          {DOC_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filterExpiry}
          onChange={(e) => setFilterExpiry(e.target.value)}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="">All expiry statuses</option>
          <option value="expired">Expired</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="valid">Valid</option>
          <option value="no_expiry">No Expiry</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No supplier documents yet. Click Upload Document to add your first one.
          </p>
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <div className="space-y-6">
          {sortedSupplierIds.map((supplierId) => {
            const rawDocs = groupedBySupplier[supplierId];
            const docs = rawDocs || [];
            const mappedName = supplierMap[supplierId];
            const supplierName = mappedName || `Supplier ${supplierId}`;
            return (
              <div
                key={supplierId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {supplierName}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({docs.length} document{docs.length === 1 ? "" : "s"})
                    </span>
                  </h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/20">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Document
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Issued
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Expires
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {docs.map((doc) => {
                      const badgeClass = expiryBadgeClass(doc.expiryStatus);
                      const statusLabel = EXPIRY_STATUS_LABELS[doc.expiryStatus];
                      const docLabel = DOC_TYPE_LABELS[doc.docType];
                      const docNumberRaw = doc.docNumber;
                      const docNumberDisplay = docNumberRaw || "—";
                      const filename = doc.originalFilename;
                      const sizeDisplay = formatFileSize(doc.fileSizeBytes);
                      const issuedDisplay = formatDate(doc.issuedAt);
                      const expiresDisplay = formatDate(doc.expiresAt);
                      const daysText =
                        doc.expiryStatus === "expiring_soon" && doc.daysUntilExpiry !== null
                          ? ` (${doc.daysUntilExpiry}d)`
                          : "";
                      return (
                        <tr key={doc.id}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {docLabel}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {filename} · {sizeDisplay}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {docNumberDisplay}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {issuedDisplay}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {expiresDisplay}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                            >
                              {statusLabel}
                              {daysText}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm space-x-2">
                            <button
                              type="button"
                              onClick={() => handleDownload(doc)}
                              className="text-[#323288] hover:text-[#4a4da3] font-medium"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upload Supplier Document
              </h2>
            </div>
            <form onSubmit={handleUpload} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier *
                </label>
                <select
                  required
                  value={uploadSupplierId}
                  onChange={(e) => setUploadSupplierId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 text-sm"
                >
                  <option value="">Select a supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document Type *
                </label>
                <select
                  required
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as SupplierDocumentType)}
                  className="block w-full rounded-md border-gray-300 text-sm"
                >
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const files = e.target.files;
                    const picked = files ? files[0] : null;
                    setUploadFile(picked || null);
                  }}
                  className="block w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document Number
                </label>
                <input
                  type="text"
                  value={uploadDocNumber}
                  onChange={(e) => setUploadDocNumber(e.target.value)}
                  className="block w-full rounded-md border-gray-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Issued Date
                  </label>
                  <input
                    type="date"
                    value={uploadIssuedAt}
                    onChange={(e) => setUploadIssuedAt(e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expires Date
                  </label>
                  <input
                    type="date"
                    value={uploadExpiresAt}
                    onChange={(e) => setUploadExpiresAt(e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 text-sm"
                />
              </div>
              {uploadError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {uploadError}
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3] disabled:bg-gray-400 rounded-md"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
