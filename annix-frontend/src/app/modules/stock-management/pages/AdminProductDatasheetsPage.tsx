"use client";

import { useState } from "react";
import { fromISO } from "@/app/lib/datetime";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useAdminMutations, useProductDatasheets } from "../hooks/useAdminQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { ProductDatasheetDto } from "../types/admin";

const TYPE_FILTERS: ReadonlyArray<{
  value: ProductDatasheetDto["productType"] | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "paint", label: "Paint" },
  { value: "rubber_compound", label: "Rubber Compound" },
  { value: "solution", label: "Solution" },
  { value: "consumable", label: "Consumable" },
];

export function AdminProductDatasheetsPage() {
  const config = useStockManagementConfig();
  const [filterType, setFilterType] = useState<ProductDatasheetDto["productType"] | undefined>(
    undefined,
  );
  const { data, isLoading, refetch } = useProductDatasheets(filterType);
  const mutations = useAdminMutations();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] =
    useState<ProductDatasheetDto["productType"]>("rubber_compound");
  const [uploadOwnerId, setUploadOwnerId] = useState<number | "">("");
  const [uploadDocType, setUploadDocType] = useState<string>("tds");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleVerify = async (datasheet: ProductDatasheetDto) => {
    try {
      await mutations.verifyDatasheet(datasheet.id);
      await refetch();
    } catch (err) {
      console.error("Verify failed", err);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadOwnerId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("productType", uploadType);
      formData.append("docType", uploadDocType);
      if (uploadType === "paint") formData.append("paintProductId", String(uploadOwnerId));
      if (uploadType === "rubber_compound")
        formData.append("rubberCompoundId", String(uploadOwnerId));
      if (uploadType === "solution") formData.append("solutionProductId", String(uploadOwnerId));
      if (uploadType === "consumable")
        formData.append("consumableProductId", String(uploadOwnerId));
      const response = await fetch(`${config.apiBaseUrl}/datasheets/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
      }
      setShowUpload(false);
      setUploadFile(null);
      setUploadOwnerId("");
      await refetch();
    } catch (err) {
      console.error("Upload failed", err);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (datasheet: ProductDatasheetDto) => {
    try {
      const client = new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      });
      const { url } = await client.datasheetDownloadUrl(datasheet.id);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.label("admin.productDatasheets")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Datasheets uploaded for paint, rubber compounds, and solutions with AI-extracted data
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterType ?? "all"}
            onChange={(e) =>
              setFilterType(
                e.target.value === "all"
                  ? undefined
                  : (e.target.value as ProductDatasheetDto["productType"]),
              )
            }
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {TYPE_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
          >
            + Upload Datasheet
          </button>
        </div>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Doc
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Filename
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Rev
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Extraction
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Uploaded
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  {config.label("common.empty")}
                </td>
              </tr>
            )}
            {(data ?? []).map((datasheet) => {
              const status = datasheet.extractionStatus;
              const statusClass =
                status === "completed"
                  ? "bg-green-100 text-green-800"
                  : status === "in_progress" || status === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-700";
              return (
                <tr key={datasheet.id}>
                  <td className="px-4 py-3 text-xs">{datasheet.productType}</td>
                  <td className="px-4 py-3 text-xs uppercase">{datasheet.docType}</td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">
                    {datasheet.originalFilename}
                  </td>
                  <td className="px-4 py-3 text-xs">v{datasheet.revisionNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${statusClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {fromISO(datasheet.uploadedAt).toJSDate().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(datasheet)}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      Download
                    </button>
                    {status === "completed" && (
                      <button
                        type="button"
                        onClick={() => handleVerify(datasheet)}
                        disabled={mutations.isPending}
                        className="text-sm text-teal-700 hover:underline"
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Upload Datasheet</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Product Type</label>
                <select
                  value={uploadType}
                  onChange={(e) =>
                    setUploadType(e.target.value as ProductDatasheetDto["productType"])
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="rubber_compound">Rubber Compound</option>
                  <option value="paint">Paint</option>
                  <option value="solution">Solution</option>
                  <option value="consumable">Consumable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Owner ID</label>
                <input
                  type="number"
                  value={uploadOwnerId}
                  onChange={(e) => setUploadOwnerId(e.target.value ? Number(e.target.value) : "")}
                  placeholder="ID of the rubber compound / paint product / etc."
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Document Type</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="tds">TDS (Technical Data Sheet)</option>
                  <option value="sds">SDS (Safety Data Sheet)</option>
                  <option value="msds">MSDS (Material Safety Data Sheet)</option>
                  <option value="product_info">Product Info</option>
                  <option value="application_guide">Application Guide</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">File</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) =>
                    setUploadFile(
                      (() => {
                        const rawFiles = e.target.files?.[0];
                        return rawFiles ?? null;
                      })(),
                    )
                  }
                  className="mt-1 w-full text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setUploadFile(null);
                  setUploadOwnerId("");
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !uploadFile || !uploadOwnerId}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProductDatasheetsPage;
