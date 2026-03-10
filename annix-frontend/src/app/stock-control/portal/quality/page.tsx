"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CalibrationCertificate,
  DataBookStatus,
  IssuanceBatchRecord,
  StockControlSupplierDto,
  StockItem,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";

type TabKey = "certificates" | "calibration" | "data-books" | "batch-lookup";

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("certificates");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "certificates", label: "Certificates" },
    { key: "calibration", label: "Calibration Certificates" },
    { key: "data-books", label: "Job Card Data Books" },
    { key: "batch-lookup", label: "Batch Lookup" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quality Management</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "certificates" && <CertificatesTab />}
      {activeTab === "calibration" && <CalibrationCertificatesTab />}
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
  const [filterBatch, setFilterBatch] = useState("");
  const [filterType, setFilterType] = useState("");

  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: Record<string, string | number> = {};
      if (filterSupplier) filters.supplierId = parseInt(filterSupplier, 10);
      if (filterBatch) filters.batchNumber = filterBatch;
      if (filterType) filters.certificateType = filterType;

      const data = await stockControlApiClient.certificates(filters);
      setCertificates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load certificates");
    } finally {
      setIsLoading(false);
    }
  }, [filterSupplier, filterBatch, filterType]);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validTypes = ["image/", "application/pdf"];
    if (!validTypes.some((t) => file.type.startsWith(t))) return;

    setDroppedFile(file);
    setShowUploadModal(true);
  }, []);

  return (
    <div
      className="space-y-4 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-600/20 backdrop-blur-sm">
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
            <p className="mt-4 text-lg font-medium text-gray-900">Drop certificate to upload</p>
            <p className="mt-1 text-sm text-gray-500">PDF or image files accepted</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
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

        <input
          type="text"
          placeholder="Search batch number..."
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />

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
          className="ml-auto rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
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
      ) : certificates.length === 0 ? (
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
          <p className="text-gray-500">No certificates uploaded yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Drag and drop a certificate file here, or click below
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Upload your first certificate
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {cert.batchNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {cert.supplier?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cert.stockItem?.name ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {cert.jobCard ? cert.jobCard.jobNumber : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="max-w-[150px] truncate block" title={cert.originalFilename}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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

function DataBooksTab() {
  const [jobCardId, setJobCardId] = useState("");
  const [status, setStatus] = useState<DataBookStatus | null>(null);
  const [certs, setCerts] = useState<SupplierCertificate[]>([]);
  const [batchRecords, setBatchRecords] = useState<IssuanceBatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async () => {
    const id = parseInt(jobCardId, 10);
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const [statusRes, certsRes, recordsRes] = await Promise.all([
        stockControlApiClient.dataBookStatus(id),
        stockControlApiClient.certificatesForJobCard(id),
        stockControlApiClient.batchRecordsForJobCard(id),
      ]);
      setStatus(statusRes);
      setCerts(certsRes);
      setBatchRecords(recordsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data book status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompile = async () => {
    const id = parseInt(jobCardId, 10);
    if (!id) return;

    try {
      setIsCompiling(true);
      setError(null);
      const result = await stockControlApiClient.compileDataBook(id);
      setSuccess(`Data book compiled with ${result.certificateCount} certificates`);
      handleSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile data book");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = async () => {
    const id = parseInt(jobCardId, 10);
    if (!id) return;

    try {
      await stockControlApiClient.downloadDataBook(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download data book");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="number"
          placeholder="Job Card ID"
          value={jobCardId}
          onChange={(e) => setJobCardId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={!jobCardId || isLoading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Search"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {status && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Data Book - Job Card #{jobCardId}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {status.certificateCount} certificate{status.certificateCount !== 1 ? "s" : ""}{" "}
                linked
              </p>
              {status.exists && (
                <p className="text-sm text-gray-500">
                  Last compiled: {status.generatedAt ? formatDateZA(status.generatedAt) : "-"}
                  {status.isStale && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Stale - new materials issued
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {status.certificateCount > 0 && (
                <button
                  onClick={handleCompile}
                  disabled={isCompiling}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isCompiling ? "Compiling..." : status.exists ? "Recompile" : "Compile Data Book"}
                </button>
              )}
              {status.exists && (
                <button
                  onClick={handleDownload}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>

          {batchRecords.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700">Batch Records</h4>
              <div className="mt-2 overflow-hidden rounded border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Batch
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Product
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Certificate
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batchRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                          {record.batchNumber}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {record.stockItem?.name ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-600">
                          {record.quantity}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {record.supplierCertificate ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Linked
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              No cert
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {formatDateZA(record.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {certs.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700">Linked Certificates</h4>
              <div className="mt-2 space-y-2">
                {certs.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          cert.certificateType === "COA"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {cert.certificateType}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{cert.batchNumber}</span>
                      <span className="text-sm text-gray-500">{cert.supplier?.name ?? ""}</span>
                    </div>
                    <span className="text-xs text-gray-400">{cert.originalFilename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchLookupTab() {
  const [batchNumber, setBatchNumber] = useState("");
  const [certificates, setCertificates] = useState<SupplierCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!batchNumber.trim()) return;

    try {
      setIsLoading(true);
      const data = await stockControlApiClient.certificatesByBatchNumber(batchNumber.trim());
      setCertificates(data);
      setSearched(true);
    } catch {
      setCertificates([]);
      setSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (id: number) => {
    try {
      const cert = await stockControlApiClient.certificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch {
      // silently fail view
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Enter batch number..."
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={!batchNumber.trim() || isLoading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {searched && certificates.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
          <p className="text-gray-500">No certificates found for batch "{batchNumber}"</p>
        </div>
      )}

      {certificates.length > 0 && (
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
                    {cert.supplier?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cert.stockItem?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cert.originalFilename}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDateZA(cert.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleView(cert.id)}
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
  );
}

function expiryStatus(expiryDate: string): { label: string; className: string } {
  const expiry = fromISO(expiryDate);
  const today = now().startOf("day");
  const daysUntil = expiry.diff(today, "days").days;

  if (daysUntil < 0) {
    return { label: "Expired", className: "bg-red-100 text-red-800" };
  }

  if (daysUntil <= 30) {
    return { label: `${Math.ceil(daysUntil)}d left`, className: "bg-amber-100 text-amber-800" };
  }

  return { label: "Valid", className: "bg-green-100 text-green-800" };
}

function CalibrationCertificatesTab() {
  const [certificates, setCertificates] = useState<CalibrationCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterActive, setFilterActive] = useState("true");

  const fetchCertificates = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: { active?: boolean } = {};
      if (filterActive === "true") filters.active = true;
      if (filterActive === "false") filters.active = false;

      const data = await stockControlApiClient.calibrationCertificates(filters);
      setCertificates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calibration certificates");
    } finally {
      setIsLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

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
      fetchCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate certificate");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await stockControlApiClient.deleteCalibrationCertificate(id);
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete certificate");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
          <option value="">All</option>
        </select>

        <button
          onClick={() => setShowUploadModal(true)}
          className="ml-auto rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Upload Calibration Certificate
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
        <div className="py-12 text-center text-gray-500">Loading calibration certificates...</div>
      ) : certificates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No calibration certificates uploaded yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Calibration certificates are automatically included in every data book
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Upload your first calibration certificate
          </button>
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
                  ID / Serial
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Cert No.
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
              {certificates.map((cert) => {
                const status = expiryStatus(cert.expiryDate);
                return (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {cert.equipmentName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {cert.equipmentIdentifier ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {cert.certificateNumber ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {cert.expiryDate}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          cert.isActive ? status.className : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {cert.isActive ? status.label : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="max-w-[120px] truncate block" title={cert.originalFilename}>
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
                      {cert.isActive && (
                        <button
                          onClick={() => handleDeactivate(cert.id)}
                          className="mr-2 text-amber-600 hover:text-amber-800"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="text-red-600 hover:text-red-800"
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
      )}

      {showUploadModal && (
        <UploadCalibrationCertificateModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => {
            setShowUploadModal(false);
            fetchCertificates();
          }}
        />
      )}
    </div>
  );
}

function UploadCalibrationCertificateModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentIdentifier, setEquipmentIdentifier] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file || !equipmentName.trim() || !expiryDate) {
      setError("Equipment name, expiry date, and file are required");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await stockControlApiClient.uploadCalibrationCertificate(file, {
        equipmentName: equipmentName.trim(),
        equipmentIdentifier: equipmentIdentifier.trim() || null,
        certificateNumber: certificateNumber.trim() || null,
        description: description.trim() || null,
        expiryDate,
      });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload Calibration Certificate</h2>
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
            <label className="block text-sm font-medium text-gray-700">Equipment Name *</label>
            <input
              type="text"
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              placeholder="e.g. DFT Gauge, Blast Profile Gauge"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Equipment ID / Serial
              </label>
              <input
                type="text"
                value={equipmentIdentifier}
                onChange={(e) => setEquipmentIdentifier(e.target.value)}
                placeholder="e.g. SN-12345"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Certificate No.</label>
              <input
                type="text"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="e.g. CAL-2026-001"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
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
            <label className="block text-sm font-medium text-gray-700">File *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
            disabled={isUploading || !file || !equipmentName.trim() || !expiryDate}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
