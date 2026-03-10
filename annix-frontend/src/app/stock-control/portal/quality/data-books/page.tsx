"use client";

import { useState } from "react";
import type {
  DataBookStatus,
  IssuanceBatchRecord,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

export default function DataBooksPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Job Card Data Books</h1>
      </div>

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
                    {isCompiling
                      ? "Compiling..."
                      : status.exists
                        ? "Recompile"
                        : "Compile Data Book"}
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
                        <span className="text-sm font-medium text-gray-900">
                          {cert.batchNumber}
                        </span>
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
    </div>
  );
}
