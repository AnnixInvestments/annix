"use client";

import { useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import type { IssuanceBatchRecord, SupplierCertificate } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useSearchBatch, useViewCertificateUrl } from "@/app/lib/query/hooks";

export function BatchLookupPanel() {
  const searchBatchMutation = useSearchBatch();
  const viewCertLookupMutation = useViewCertificateUrl();
  const [batchNumber, setBatchNumber] = useState("");
  const [searchedBatch, setSearchedBatch] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<SupplierCertificate[]>([]);
  const [batchRecords, setBatchRecords] = useState<IssuanceBatchRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfPreview = usePdfPreview();

  const handleSearch = async () => {
    const trimmed = batchNumber.trim();
    if (!trimmed) return;

    try {
      setIsSearching(true);
      setError(null);
      const result = await searchBatchMutation.mutateAsync(trimmed);
      const certs = result.certificates;
      const records = result.batchRecords;
      setCertificates(certs);
      setBatchRecords(records);
      setSearchedBatch(trimmed);
    } catch (err) {
      setError(extractErrorMessage(err, "Search failed"));
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
      const cert = await viewCertLookupMutation.mutateAsync(id);
      if (cert.downloadUrl) {
        const originalFilename = cert.originalFilename;
        pdfPreview.open(cert.downloadUrl, originalFilename || "certificate.pdf");
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to get download URL"));
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
          className="rounded-md bg-[var(--sc-primary,#323288)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--sc-primary-hover,#252560)] disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Supplier
                      </th>
                      <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Product
                      </th>
                      <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        File
                      </th>
                      <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
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
                          {(() => {
                            const csn2 = cert.supplier ? cert.supplier.name : null;
                            return csn2 ? csn2 : "-";
                          })()}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                          {(() => {
                            const csn3 = cert.stockItem ? cert.stockItem.name : null;
                            return csn3 ? csn3 : "-";
                          })()}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                          <span
                            className="max-w-[150px] truncate block"
                            title={cert.originalFilename}
                          >
                            {cert.originalFilename}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {formatDateZA(cert.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => handleViewCert(cert.id)}
                            className="text-[var(--sc-primary,#323288)] hover:text-[var(--sc-primary-active,#1c1c48)]"
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
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
                          {(() => {
                            const rsn = record.stockItem ? record.stockItem.name : null;
                            return rsn ? rsn : "-";
                          })()}
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
                                {(() => {
                                  const rscn = record.supplierCertificate.supplier
                                    ? record.supplierCertificate.supplier.name
                                    : "";
                                  return rscn;
                                })()}
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

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
