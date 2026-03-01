"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient, type RubberRollStockDto } from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";

export default function NewAuCocPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [availableRolls, setAvailableRolls] = useState<RubberRollStockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [selectedRollIds, setSelectedRollIds] = useState<Set<number>>(new Set());
  const [poNumber, setPoNumber] = useState("");
  const [deliveryNoteRef, setDeliveryNoteRef] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesData, rollsData] = await Promise.all([
        auRubberApiClient.companies(),
        auRubberApiClient.rollStock({ status: "IN_STOCK" }),
      ]);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setAvailableRolls(Array.isArray(rollsData) ? rollsData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRolls = availableRolls.filter((roll) => {
    const matchesSearch =
      searchQuery === "" ||
      roll.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roll.compoundName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roll.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleRollSelection = (rollId: number) => {
    const newSelected = new Set(selectedRollIds);
    if (newSelected.has(rollId)) {
      newSelected.delete(rollId);
    } else {
      newSelected.add(rollId);
    }
    setSelectedRollIds(newSelected);
  };

  const selectAll = () => {
    setSelectedRollIds(new Set(filteredRolls.map((r) => r.id)));
  };

  const deselectAll = () => {
    setSelectedRollIds(new Set());
  };

  const handleCreate = async () => {
    if (!customerId) {
      showToast("Please select a customer", "error");
      return;
    }
    if (selectedRollIds.size === 0) {
      showToast("Please select at least one roll", "error");
      return;
    }
    try {
      setIsCreating(true);
      const result = await auRubberApiClient.createAuCoc({
        customerCompanyId: customerId,
        rollIds: Array.from(selectedRollIds),
        poNumber: poNumber || undefined,
        deliveryNoteRef: deliveryNoteRef || undefined,
      });
      showToast("Certificate created successfully", "success");
      router.push(`/au-rubber/portal/au-cocs/${result.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create certificate", "error");
    } finally {
      setIsCreating(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "AU Certificates", href: "/au-rubber/portal/au-cocs" },
          { label: "New Certificate" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create AU Certificate</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select rolls and customer to generate a new Certificate of Conformance
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Certificate Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <select
              value={customerId ?? ""}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
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
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
              placeholder="Customer PO number (optional)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Delivery Note Reference
            </label>
            <input
              type="text"
              value={deliveryNoteRef}
              onChange={(e) => setDeliveryNoteRef(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
              placeholder="Delivery note reference (optional)"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Select Rolls</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {selectedRollIds.size} of {filteredRolls.length} selected
            </span>
            <button onClick={selectAll} className="text-sm text-yellow-600 hover:text-yellow-800">
              Select All
            </button>
            <button onClick={deselectAll} className="text-sm text-gray-600 hover:text-gray-800">
              Clear
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rolls by number or compound..."
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading available rolls...</p>
          </div>
        ) : filteredRolls.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery ? "No rolls match your search" : "No rolls available in stock"}
            </p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedRollIds.size === filteredRolls.length && filteredRolls.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAll();
                        } else {
                          deselectAll();
                        }
                      }}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Roll Number
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Compound
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Weight (kg)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Dimensions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRolls.map((roll) => (
                  <tr
                    key={roll.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedRollIds.has(roll.id) ? "bg-yellow-50" : ""
                    }`}
                    onClick={() => toggleRollSelection(roll.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRollIds.has(roll.id)}
                        onChange={() => toggleRollSelection(roll.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {roll.rollNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {roll.compoundName || "-"}
                      {roll.compoundCode && (
                        <span className="ml-1 text-xs text-gray-400">({roll.compoundCode})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {roll.weightKg.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {roll.widthMm && roll.thicknessMm && roll.lengthM
                        ? `${roll.widthMm}mm x ${roll.thicknessMm}mm x ${roll.lengthM}m`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={isCreating || !customerId || selectedRollIds.size === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create Certificate"}
        </button>
      </div>
    </div>
  );
}
