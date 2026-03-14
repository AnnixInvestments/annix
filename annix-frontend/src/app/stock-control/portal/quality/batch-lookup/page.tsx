"use client";

import { useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useSearchBatch } from "@/app/lib/query/hooks";

export default function BatchLookupPage() {
  const [batchNumber, setBatchNumber] = useState("");
  const [searched, setSearched] = useState(false);

  const searchMutation = useSearchBatch();

  const handleSearch = () => {
    if (!batchNumber.trim()) return;

    setSearched(false);
    searchMutation.mutate(batchNumber.trim(), {
      onSettled: () => {
        setSearched(true);
      },
    });
  };

  const handleView = async (id: number) => {
    try {
      const cert = await stockControlApiClient.certificateById(id);
      if (cert.downloadUrl) {
        window.open(cert.downloadUrl, "_blank");
      }
    } catch {
      // View failed silently
    }
  };

  const certificates = searchMutation.data?.certificates || [];
  const batchRecords = searchMutation.data?.batchRecords || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Batch Lookup</h1>
      </div>

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
            disabled={!batchNumber.trim() || searchMutation.isPending}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {searchMutation.isPending ? "Searching..." : "Search"}
          </button>
        </div>

        {searched && certificates.length === 0 && batchRecords.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500">
              No certificates or issuance records found for batch &quot;{batchNumber}&quot;
            </p>
          </div>
        )}

        {certificates.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Certificates</h3>
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
          </div>
        )}

        {batchRecords.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Issuance History</h3>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Job Card
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
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.stockItem?.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {record.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {record.jobCardId ? `#${record.jobCardId}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
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
      </div>
    </div>
  );
}
