"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DataBookStatus,
  IssuanceBatchRecord,
  SupplierCertificate,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface QualityTabProps {
  jobCardId: number;
}

export function QualityTab({ jobCardId }: QualityTabProps) {
  const [certificates, setCertificates] = useState<SupplierCertificate[]>([]);
  const [batchRecords, setBatchRecords] = useState<IssuanceBatchRecord[]>([]);
  const [dataBookStatus, setDataBookStatus] = useState<DataBookStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchQualityData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [certsRes, recordsRes, statusRes] = await Promise.all([
        stockControlApiClient.certificatesForJobCard(jobCardId),
        stockControlApiClient.batchRecordsForJobCard(jobCardId),
        stockControlApiClient.dataBookStatus(jobCardId),
      ]);
      setCertificates(Array.isArray(certsRes) ? certsRes : []);
      setBatchRecords(Array.isArray(recordsRes) ? recordsRes : []);
      setDataBookStatus(statusRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quality data");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    fetchQualityData();
  }, [fetchQualityData]);

  const handleCompile = async () => {
    try {
      setIsCompiling(true);
      setError(null);
      setSuccess(null);
      const result = await stockControlApiClient.compileDataBook(jobCardId);
      setSuccess(`Data book compiled with ${result.certificateCount} certificates`);
      fetchQualityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile data book");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = async () => {
    try {
      setError(null);
      await stockControlApiClient.downloadDataBook(jobCardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download data book");
    }
  };

  const handleViewCertificate = async (id: number) => {
    try {
      const cert = await stockControlApiClient.certificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download URL");
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">Loading quality data...</div>;
  }

  const linkedCount = batchRecords.filter((r) => r.supplierCertificate).length;
  const unlinkedCount = batchRecords.length - linkedCount;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Data Book</h3>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
              <span>
                {certificates.length} certificate{certificates.length !== 1 ? "s" : ""} linked
              </span>
              {batchRecords.length > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>
                    {batchRecords.length} batch record{batchRecords.length !== 1 ? "s" : ""}
                  </span>
                  {unlinkedCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {unlinkedCount} missing cert{unlinkedCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </>
              )}
            </div>
            {dataBookStatus?.exists && (
              <p className="mt-1 text-xs text-gray-500">
                Last compiled:{" "}
                {dataBookStatus.generatedAt ? formatDateZA(dataBookStatus.generatedAt) : "-"}
                {dataBookStatus.isStale && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Stale - recompile needed
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {certificates.length > 0 && (
              <button
                onClick={handleCompile}
                disabled={isCompiling}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {isCompiling
                  ? "Compiling..."
                  : dataBookStatus?.exists
                    ? "Recompile"
                    : "Compile Data Book"}
              </button>
            )}
            {dataBookStatus?.exists && (
              <button
                onClick={handleDownload}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {batchRecords.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Batch Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Certificate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batchRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {record.batchNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.stockItem?.name ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {record.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.supplierCertificate ? (
                        <button
                          onClick={() => handleViewCertificate(record.supplierCertificate!.id)}
                          className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 hover:bg-green-200"
                        >
                          Linked - {record.supplierCertificate.certificateType}
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          No cert
                        </span>
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
        </div>
      )}

      {certificates.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Linked Certificates</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      cert.certificateType === "COA"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {cert.certificateType}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{cert.batchNumber}</span>
                  <span className="text-sm text-gray-500">{cert.supplier?.name ?? ""}</span>
                  <span className="text-xs text-gray-400">{cert.originalFilename}</span>
                </div>
                <button
                  onClick={() => handleViewCertificate(cert.id)}
                  className="text-sm text-teal-600 hover:text-teal-800"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {certificates.length === 0 && batchRecords.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No quality records for this job card yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Batch records are created when stock is issued with batch numbers
          </p>
        </div>
      )}
    </div>
  );
}
