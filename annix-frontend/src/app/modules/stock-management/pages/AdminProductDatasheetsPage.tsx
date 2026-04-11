"use client";

import { useState } from "react";
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

  const handleVerify = async (datasheet: ProductDatasheetDto) => {
    try {
      await mutations.verifyDatasheet(datasheet.id);
      await refetch();
    } catch (err) {
      console.error("Verify failed", err);
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
                    {new Date(datasheet.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
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

      <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Datasheet upload UI is mounted on the rubber compound / paint product detail pages. File
        upload from this admin index is a future enhancement.
      </div>
    </div>
  );
}

export default AdminProductDatasheetsPage;
