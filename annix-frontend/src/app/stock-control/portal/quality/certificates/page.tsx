"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CalibrationCertificate,
  IssuanceBatchRecord,
  JobCard,
  StockControlSupplierDto,
  StockItem,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA, fromISO, now, nowMillis } from "@/app/lib/datetime";

interface IdentifiedCertificate {
  supplierName: string | null;
  batchNumber: string | null;
  certificateType: "COA" | "COC" | null;
  productInfo: string | null;
  pageNumbers: number[];
  confidence: number;
  sourceFileIndex: number;
}

interface AnalysisResult {
  certificates: IdentifiedCertificate[];
  totalPages: number;
  processingTimeMs: number;
}

type ViewMode = "list" | "analyzing" | "review";
type QualityTab = "certificates" | "calibration" | "data-books" | "batch-lookup";

const QUALITY_TABS: { key: QualityTab; label: string }[] = [
  { key: "certificates", label: "Supplier Certificates" },
  { key: "calibration", label: "Calibration" },
  { key: "data-books", label: "Data Books" },
  { key: "batch-lookup", label: "Batch Lookup" },
];

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<QualityTab>("certificates");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quality Management</h1>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {QUALITY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "certificates" && <CertificatesTab />}
      {activeTab === "calibration" && <CalibrationTab />}
      {activeTab === "data-books" && <DataBooksTab />}
      {activeTab === "batch-lookup" && <BatchLookupTab />}
    </div>
  );
}

function CertificatesTab() {
  const [certificates, setCertificates] = useState<SupplierCertificate[]>([]);
  const [suppliers, setSuppliers] = useState<StockControlSupplierDto[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisFiles, setAnalysisFiles] = useState<File[] | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [savingCerts, setSavingCerts] = useState<Set<number>>(new Set());
  const [savedCerts, setSavedCerts] = useState<Set<number>>(new Set());

  const dragCounter = useRef(0);

  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: Record<string, string | number> = {};
      if (filterSupplier) filters.supplierId = parseInt(filterSupplier, 10);
      if (filterType) filters.certificateType = filterType;

      const data = await stockControlApiClient.certificates(filters);
      setCertificates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load certificates");
    } finally {
      setIsLoading(false);
    }
  }, [filterSupplier, filterType]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await stockControlApiClient.suppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      setSuppliers([]);
    }
  }, []);

  const fetchStockItems = useCallback(async () => {
    try {
      const data = await stockControlApiClient.stockItems();
      setStockItems(Array.isArray(data) ? data : []);
    } catch {
      setStockItems([]);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  useEffect(() => {
    fetchSuppliers();
    fetchStockItems();
  }, [fetchSuppliers, fetchStockItems]);

  const handleDelete = async (id: number) => {
    try {
      await stockControlApiClient.deleteCertificate(id);
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete certificate");
    }
  };

  const handleView = async (id: number) => {
    try {
      const cert = await stockControlApiClient.certificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download URL");
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleAnalyzeFiles = useCallback(async (files: File[]) => {
    setViewMode("analyzing");
    setAnalysisFiles(files);
    setAnalysisError(null);
    setAnalysisResult(null);
    setSavedCerts(new Set());

    try {
      const {
        certificates: allCertificates,
        totalPages,
        totalTime,
      } = await files.reduce(
        async (accPromise, file, fileIdx) => {
          const acc = await accPromise;
          const result = await stockControlApiClient.analyzeCertificateDocument(file);
          const tagged = result.certificates.map((c) => ({ ...c, sourceFileIndex: fileIdx }));
          return {
            certificates: [...acc.certificates, ...tagged],
            totalPages: acc.totalPages + result.totalPages,
            totalTime: acc.totalTime + result.processingTimeMs,
          };
        },
        Promise.resolve({
          certificates: [] as IdentifiedCertificate[],
          totalPages: 0,
          totalTime: 0,
        }),
      );

      setAnalysisResult({ certificates: allCertificates, totalPages, processingTimeMs: totalTime });
      setViewMode("review");
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
      setViewMode("list");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((f) => {
        const validTypes = ["image/", "application/pdf"];
        return validTypes.some((t) => f.type.startsWith(t));
      });

      if (validFiles.length === 0) return;

      handleAnalyzeFiles(validFiles);
    },
    [handleAnalyzeFiles],
  );

  const handleSaveCertificate = async (cert: IdentifiedCertificate, index: number) => {
    const sourceFile = analysisFiles?.[cert.sourceFileIndex] || null;
    if (!sourceFile) return;

    const matchedSupplier = suppliers.find(
      (s) => cert.supplierName && s.name.toLowerCase().includes(cert.supplierName.toLowerCase()),
    );

    if (!matchedSupplier) {
      setDroppedFile(sourceFile);
      setShowUploadModal(true);
      return;
    }

    const certsFromSameFile = analysisResult
      ? analysisResult.certificates.filter((c) => c.sourceFileIndex === cert.sourceFileIndex)
      : [];
    const needsPageExtraction = certsFromSameFile.length > 1;

    try {
      setSavingCerts((prev) => new Set([...prev, index]));
      await stockControlApiClient.uploadCertificate(sourceFile, {
        supplierId: matchedSupplier.id,
        certificateType: cert.certificateType || "COC",
        batchNumber: cert.batchNumber || `BATCH-${nowMillis()}`,
        description: [cert.productInfo, `Pages: ${cert.pageNumbers.join(", ")}`]
          .filter(Boolean)
          .join(" | "),
        pageNumbers: needsPageExtraction ? cert.pageNumbers : null,
      });
      setSavedCerts((prev) => new Set([...prev, index]));
      fetchCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save certificate");
    } finally {
      setSavingCerts((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const filteredCertificates = searchQuery
    ? certificates.filter((cert) => {
        const q = searchQuery.toLowerCase();
        return (
          (cert.batchNumber ?? "").toLowerCase().includes(q) ||
          (cert.supplier?.name || "").toLowerCase().includes(q) ||
          (cert.stockItem?.name || "").toLowerCase().includes(q) ||
          (cert.originalFilename ?? "").toLowerCase().includes(q) ||
          (cert.certificateType ?? "").toLowerCase().includes(q)
        );
      })
    : certificates;

  const supplierGroupedCerts = analysisResult
    ? analysisResult.certificates.reduce<
        Record<string, { cert: IdentifiedCertificate; index: number }[]>
      >((groups, cert, index) => {
        const key = cert.supplierName || "Unknown Supplier";
        return {
          ...groups,
          [key]: [...(groups[key] || []), { cert, index }],
        };
      }, {})
    : {};

  return (
    <div
      className="space-y-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-600/20 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md mx-4">
            <svg
              className="mx-auto h-12 w-12 text-teal-600"
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
            <p className="mt-4 text-lg font-medium text-gray-900">Drop to analyze with Nix</p>
            <p className="mt-1 text-sm text-gray-500">
              Nix will auto-identify and separate COC/COA documents
            </p>
          </div>
        </div>
      )}

      {viewMode === "review" && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setViewMode("list");
              setAnalysisResult(null);
              setAnalysisFiles(null);
            }}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to List
          </button>
        </div>
      )}

      {viewMode === "analyzing" && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-teal-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900">
            Nix is analyzing your document...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Identifying individual certificates, suppliers, and batch numbers
          </p>
          {analysisFiles && (
            <p className="mt-2 text-xs text-gray-400">
              {analysisFiles.map((f) => f.name).join(", ")}
            </p>
          )}
        </div>
      )}

      {analysisError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {analysisError}
          <button onClick={() => setAnalysisError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {viewMode === "review" && analysisResult && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  Analysis Complete - {analysisResult.certificates.length} certificate(s) identified
                  across {analysisResult.totalPages} page(s)
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Processed in {(analysisResult.processingTimeMs / 1000).toFixed(1)}s
                </p>
              </div>
              <button
                onClick={() => {
                  setDroppedFile(analysisFiles?.[0] || null);
                  setShowUploadModal(true);
                }}
                className="rounded-md border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Manual Upload Instead
              </button>
            </div>
          </div>

          {Object.entries(supplierGroupedCerts).map(([supplierName, items]) => (
            <div
              key={supplierName}
              className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{supplierName}</h3>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    {items.length} cert(s)
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(({ cert, index }) => (
                  <div key={index} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                          cert.certificateType === "COA"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {cert.certificateType || "COC"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {cert.productInfo || "Certificate"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Batch: {cert.batchNumber || "Unknown"} | Pages:{" "}
                          {cert.pageNumbers.join(", ")} | Confidence:{" "}
                          {Math.round(cert.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {savedCerts.has(index) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSaveCertificate(cert, index)}
                          disabled={savingCerts.has(index)}
                          className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          {savingCerts.has(index) ? "Saving..." : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search certificates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="COA">COA</option>
              <option value="COC">COC</option>
            </select>

            <button
              onClick={() => setShowUploadModal(true)}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Upload Certificate
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-medium underline">
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading certificates...</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
              <svg
                className="mx-auto h-10 w-10 text-gray-400 mb-3"
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
              <p className="text-gray-500">
                {searchQuery ? "No certificates match your search" : "No certificates uploaded yet"}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Drag and drop certificate files here - Nix will auto-analyze and separate them
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Or upload manually
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Batch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Job Card
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      File
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Uploaded
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cert.certificateType === "COA"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {cert.certificateType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {cert.batchNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {cert.supplier?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {cert.stockItem?.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {cert.jobCard ? cert.jobCard.jobNumber : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span
                          className="max-w-[150px] truncate block"
                          title={cert.originalFilename}
                        >
                          {cert.originalFilename}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDateZA(cert.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => handleView(cert.id)}
                          className="mr-2 text-teal-600 hover:text-teal-800"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(cert.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <UploadCertificateModal
          suppliers={suppliers}
          stockItems={stockItems}
          initialFile={droppedFile}
          onClose={() => {
            setShowUploadModal(false);
            setDroppedFile(null);
          }}
          onUploaded={() => {
            setShowUploadModal(false);
            setDroppedFile(null);
            fetchCertificates();
          }}
        />
      )}
    </div>
  );
}

function CalibrationTab() {
  const [calCerts, setCalCerts] = useState<CalibrationCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(true);

  const fetchCalCerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.calibrationCertificates(
        showActive ? { active: true } : undefined,
      );
      setCalCerts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calibration certificates");
    } finally {
      setIsLoading(false);
    }
  }, [showActive]);

  useEffect(() => {
    fetchCalCerts();
  }, [fetchCalCerts]);

  const handleView = async (id: number) => {
    try {
      const cert = await stockControlApiClient.calibrationCertificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download URL");
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await stockControlApiClient.deactivateCalibrationCertificate(id);
      fetchCalCerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate certificate");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stockControlApiClient.deleteCalibrationCertificate(id);
      setCalCerts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete certificate");
    }
  };

  const isExpiringSoon = (expiryDate: string): boolean => {
    const expiry = fromISO(expiryDate);
    const thirtyDaysFromNow = now().plus({ days: 30 });
    return expiry <= thirtyDaysFromNow && expiry >= now();
  };

  const isExpired = (expiryDate: string): boolean => {
    return fromISO(expiryDate) < now();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showActive}
              onChange={(e) => setShowActive(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Active only
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading calibration certificates...</div>
      ) : calCerts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No calibration certificates found</p>
          <p className="mt-1 text-sm text-gray-400">
            Upload calibration certificates from the Settings page
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Equipment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Identifier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Certificate #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Expiry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  File
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {calCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {cert.equipmentName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {cert.equipmentIdentifier ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {cert.certificateNumber ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDateZA(cert.expiryDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {isExpired(cert.expiryDate) ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Expired
                      </span>
                    ) : isExpiringSoon(cert.expiryDate) ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Expiring Soon
                      </span>
                    ) : cert.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="max-w-[150px] truncate block" title={cert.originalFilename}>
                      {cert.originalFilename}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleView(cert.id)}
                      className="mr-2 text-teal-600 hover:text-teal-800"
                    >
                      View
                    </button>
                    {cert.isActive ? (
                      <button
                        onClick={() => handleDeactivate(cert.id)}
                        className="mr-2 text-amber-600 hover:text-amber-800"
                      >
                        Deactivate
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DataBooksTab() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [statuses, setStatuses] = useState<
    Record<number, { exists: boolean; isStale: boolean; certificateCount: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compilingId, setCompilingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchJobCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.jobCards("active");
      setJobCards(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job cards");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobCards();
  }, [fetchJobCards]);

  useEffect(() => {
    if (jobCards.length === 0) return;
    const ids = jobCards.map((jc) => jc.id);
    stockControlApiClient
      .dataBookStatusBulk(ids)
      .then(setStatuses)
      .catch(() => setStatuses({}));
  }, [jobCards]);

  const handleCompile = async (jobCardId: number) => {
    try {
      setCompilingId(jobCardId);
      await stockControlApiClient.compileDataBook(jobCardId);
      const ids = jobCards.map((jc) => jc.id);
      const newStatuses = await stockControlApiClient.dataBookStatusBulk(ids);
      setStatuses(newStatuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile data book");
    } finally {
      setCompilingId(null);
    }
  };

  const handleDownload = async (jobCardId: number) => {
    try {
      setDownloadingId(jobCardId);
      await stockControlApiClient.downloadDataBook(jobCardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download data book");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading job cards...</div>
      ) : jobCards.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No active job cards found</p>
          <p className="mt-1 text-sm text-gray-400">
            Create a job card and link certificates to compile a data book
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Job Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Job Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Certificates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Data Book
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobCards.map((jc) => {
                const status = statuses[jc.id];
                return (
                  <tr key={jc.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-teal-700">
                      {jc.jobNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {jc.jobName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {jc.customerName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {status?.certificateCount ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {status.certificateCount} cert{status.certificateCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {status?.exists && !status.isStale ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Compiled
                        </span>
                      ) : status?.exists && status.isStale ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Stale
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not compiled</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleCompile(jc.id)}
                        disabled={compilingId === jc.id || !status?.certificateCount}
                        className="mr-2 text-teal-600 hover:text-teal-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        {compilingId === jc.id
                          ? "Compiling..."
                          : status?.exists
                            ? "Recompile"
                            : "Compile"}
                      </button>
                      {status?.exists ? (
                        <button
                          onClick={() => handleDownload(jc.id)}
                          disabled={downloadingId === jc.id}
                          className="text-blue-600 hover:text-blue-800 disabled:text-gray-300"
                        >
                          {downloadingId === jc.id ? "Downloading..." : "Download"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchLookupTab() {
  const [batchNumber, setBatchNumber] = useState("");
  const [searchedBatch, setSearchedBatch] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<SupplierCertificate[]>([]);
  const [batchRecords, setBatchRecords] = useState<IssuanceBatchRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const trimmed = batchNumber.trim();
    if (!trimmed) return;

    try {
      setIsSearching(true);
      setError(null);
      const [certs, records] = await Promise.all([
        stockControlApiClient.certificatesByBatchNumber(trimmed),
        stockControlApiClient.batchRecordsByBatchNumber(trimmed),
      ]);
      setCertificates(certs);
      setBatchRecords(records);
      setSearchedBatch(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleViewCert = async (id: number) => {
    try {
      const cert = await stockControlApiClient.certificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download URL");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Enter batch number..."
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !batchNumber.trim()}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {searchedBatch && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Certificates for batch &quot;{searchedBatch}&quot;
            </h3>
            {certificates.length === 0 ? (
              <p className="text-sm text-gray-500">No certificates found for this batch number</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        File
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Uploaded
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              cert.certificateType === "COA"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {cert.certificateType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {cert.supplier?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cert.stockItem?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span
                            className="max-w-[150px] truncate block"
                            title={cert.originalFilename}
                          >
                            {cert.originalFilename}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {formatDateZA(cert.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => handleViewCert(cert.id)}
                            className="text-teal-600 hover:text-teal-800"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Issuance history for batch &quot;{searchedBatch}&quot;
            </h3>
            {batchRecords.length === 0 ? (
              <p className="text-sm text-gray-500">
                No issuance records found for this batch number
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Stock Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Certificate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Issued
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batchRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {record.stockItem?.name || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {record.quantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {record.supplierCertificate ? (
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  record.supplierCertificate.certificateType === "COA"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {record.supplierCertificate.certificateType}
                              </span>
                              <span className="text-xs text-gray-500">
                                {record.supplierCertificate.supplier?.name || ""}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No cert linked</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {formatDateZA(record.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!searchedBatch && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-gray-500">
            Enter a batch number to find certificates and issuance history
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Trace material from supplier certificate through to job card issuance
          </p>
        </div>
      )}
    </div>
  );
}

function UploadCertificateModal({
  suppliers,
  stockItems,
  initialFile,
  onClose,
  onUploaded,
}: {
  suppliers: StockControlSupplierDto[];
  stockItems: StockItem[];
  initialFile?: File | null;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [supplierId, setSupplierId] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [certificateType, setCertificateType] = useState("COC");
  const [batchNumber, setBatchNumber] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file || !supplierId || !batchNumber) {
      setError("File, supplier, and batch number are required");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await stockControlApiClient.uploadCertificate(file, {
        supplierId: parseInt(supplierId, 10),
        stockItemId: stockItemId ? parseInt(stockItemId, 10) : null,
        certificateType,
        batchNumber,
        description: description || null,
        expiryDate: expiryDate || null,
      });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload Certificate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type *</label>
              <select
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="COC">COC</option>
                <option value="COA">COA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Batch Number *</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. B1234"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Product (optional)</label>
            <select
              value={stockItemId}
              onChange={(e) => setStockItemId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">No specific product</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku ? `${item.sku} - ` : ""}
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">File *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !file || !supplierId || !batchNumber}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
