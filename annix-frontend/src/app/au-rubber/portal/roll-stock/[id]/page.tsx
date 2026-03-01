"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RollStockStatus,
  type RollTraceabilityDto,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";

export default function RollStockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [traceability, setTraceability] = useState<RollTraceabilityDto | null>(null);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellCustomerId, setSellCustomerId] = useState<number | null>(null);
  const [sellPoNumber, setSellPoNumber] = useState("");
  const [isSelling, setIsSelling] = useState(false);

  const rollId = Number(params.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [traceabilityData, companiesData] = await Promise.all([
        auRubberApiClient.rollTraceability(rollId),
        auRubberApiClient.companies(),
      ]);
      setTraceability(traceabilityData);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (rollId) {
      fetchData();
    }
  }, [rollId]);

  const handleSell = async () => {
    if (!sellCustomerId) {
      showToast("Please select a customer", "error");
      return;
    }
    try {
      setIsSelling(true);
      await auRubberApiClient.sellRoll(rollId, {
        customerId: sellCustomerId,
        poNumber: sellPoNumber || undefined,
      });
      showToast("Roll sold successfully", "success");
      setShowSellModal(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to sell roll", "error");
    } finally {
      setIsSelling(false);
    }
  };

  const handleReserve = async (customerId: number) => {
    try {
      await auRubberApiClient.reserveRoll(rollId, customerId);
      showToast("Roll reserved", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reserve roll", "error");
    }
  };

  const handleUnreserve = async () => {
    try {
      await auRubberApiClient.unreserveRoll(rollId);
      showToast("Reservation cancelled", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unreserve roll", "error");
    }
  };

  const statusBadge = (status: RollStockStatus) => {
    const colors: Record<RollStockStatus, string> = {
      IN_STOCK: "bg-green-100 text-green-800",
      RESERVED: "bg-yellow-100 text-yellow-800",
      SOLD: "bg-blue-100 text-blue-800",
      SCRAPPED: "bg-red-100 text-red-800",
    };
    const labels: Record<RollStockStatus, string> = {
      IN_STOCK: "In Stock",
      RESERVED: "Reserved",
      SOLD: "Sold",
      SCRAPPED: "Scrapped",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  if (error || !traceability) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Roll not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { roll, batches, supplierCocs, auCoc } = traceability;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Roll Stock", href: "/au-rubber/portal/roll-stock" },
          { label: roll.rollNumber },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{roll.rollNumber}</h1>
          <div className="mt-2">{statusBadge(roll.status)}</div>
        </div>
        <div className="flex space-x-3">
          {roll.status === "IN_STOCK" && (
            <button
              onClick={() => setShowSellModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Mark as Sold
            </button>
          )}
          {roll.status === "RESERVED" && (
            <>
              <button
                onClick={handleUnreserve}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel Reservation
              </button>
              <button
                onClick={() => setShowSellModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Mark as Sold
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Roll Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Roll Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{roll.rollNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Compound</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {roll.compoundName || "-"}
                {roll.compoundCode && (
                  <span className="text-gray-500 ml-1">({roll.compoundCode})</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Weight</dt>
              <dd className="mt-1 text-sm text-gray-900">{roll.weightKg.toFixed(2)} kg</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Dimensions</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {roll.widthMm && roll.thicknessMm && roll.lengthM
                  ? `${roll.widthMm}mm x ${roll.thicknessMm}mm x ${roll.lengthM}m`
                  : "-"}
              </dd>
            </div>
            {roll.soldToCompanyName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Sold To</dt>
                <dd className="mt-1 text-sm text-gray-900">{roll.soldToCompanyName}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(roll.createdAt).toLocaleString()}
              </dd>
            </div>
            {roll.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{roll.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {auCoc && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">AU Certificate</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">CoC Number</dt>
                <dd className="mt-1 text-sm">
                  <Link
                    href={`/au-rubber/portal/au-cocs/${auCoc.id}`}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    {auCoc.cocNumber}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 text-sm text-gray-900">{auCoc.customerCompanyName || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{auCoc.statusLabel}</dd>
              </div>
              {auCoc.poNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{auCoc.poNumber}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Traceability Chain</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {supplierCocs.map((coc, index) => (
              <div key={coc.id} className="relative flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center z-10">
                  <span className="text-xs font-medium text-purple-600">{index + 1}</span>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Supplier CoC: {coc.cocNumber || `COC-${coc.id}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {coc.cocTypeLabel} - {coc.supplierCompanyName}
                  </div>
                  <Link
                    href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                    className="text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
            {batches.length > 0 && (
              <div className="relative flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center z-10">
                  <span className="text-xs font-medium text-blue-600">
                    {supplierCocs.length + 1}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Compound Batches ({batches.length})
                  </div>
                  <div className="text-sm text-gray-500">
                    {batches.map((b) => b.batchNumber).join(", ")}
                  </div>
                </div>
              </div>
            )}
            <div className="relative flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center z-10">
                <span className="text-xs font-medium text-green-600">
                  {supplierCocs.length + (batches.length > 0 ? 2 : 1)}
                </span>
              </div>
              <div className="ml-4 flex-1">
                <div className="text-sm font-medium text-gray-900">Roll: {roll.rollNumber}</div>
                <div className="text-sm text-gray-500">
                  {roll.weightKg.toFixed(2)} kg - {roll.statusLabel}
                </div>
              </div>
            </div>
            {auCoc && (
              <div className="relative flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center z-10">
                  <span className="text-xs font-medium text-yellow-600">
                    {supplierCocs.length + (batches.length > 0 ? 3 : 2)}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-gray-900">AU CoC: {auCoc.cocNumber}</div>
                  <div className="text-sm text-gray-500">Issued to {auCoc.customerCompanyName}</div>
                  <Link
                    href={`/au-rubber/portal/au-cocs/${auCoc.id}`}
                    className="text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    View Certificate
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {batches.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Linked Compound Batches</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Batch
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Shore A
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Specific Gravity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tensile (MPa)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Elongation (%)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {batch.batchNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.shoreAHardness ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.specificGravity ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.tensileStrengthMpa ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.elongationPercent ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        batch.passFailStatus === "PASS"
                          ? "bg-green-100 text-green-800"
                          : batch.passFailStatus === "FAIL"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {batch.passFailStatusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSellModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowSellModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mark Roll as Sold</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    value={sellCustomerId ?? ""}
                    onChange={(e) =>
                      setSellCustomerId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="">Select customer</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number</label>
                  <input
                    type="text"
                    value={sellPoNumber}
                    onChange={(e) => setSellPoNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Customer PO (optional)"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSell}
                  disabled={isSelling || !sellCustomerId}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSelling ? "Processing..." : "Mark as Sold"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
