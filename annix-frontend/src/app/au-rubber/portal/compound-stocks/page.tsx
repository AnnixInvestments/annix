"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CreateCompoundOpeningStockDto,
  type ImportCompoundOpeningStockResultDto,
  type ImportCompoundOpeningStockRowDto,
  type RubberCompoundStockDto,
  type StockLocationDto,
} from "@/app/lib/api/auRubberApi";
import type { RubberProductCodingDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "compoundName" | "quantityKg" | "reorderPointKg" | "location";

export default function CompoundStocksPage() {
  const { showToast } = useToast();
  const [stocks, setStocks] = useState<RubberCompoundStockDto[]>([]);
  const [compounds, setCompounds] = useState<RubberProductCodingDto[]>([]);
  const [locations, setLocations] = useState<StockLocationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("compoundName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteStockId, setDeleteStockId] = useState<number | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveStockId, setReceiveStockId] = useState<number | null>(null);
  const [receiveQty, setReceiveQty] = useState("");
  const [receiveBatch, setReceiveBatch] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [openingStockTab, setOpeningStockTab] = useState<"single" | "bulk">("single");
  const [openingStockForm, setOpeningStockForm] = useState<CreateCompoundOpeningStockDto>({
    compoundCodingId: 0,
    quantityKg: 0,
    costPerKg: null,
    minStockLevelKg: 0,
    reorderPointKg: 0,
    locationId: null,
    batchNumber: null,
    notes: null,
  });
  const [isSubmittingOpeningStock, setIsSubmittingOpeningStock] = useState(false);
  const [csvData, setCsvData] = useState<ImportCompoundOpeningStockRowDto[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportCompoundOpeningStockResultDto | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [stocksData, compoundsData, locationsData] = await Promise.all([
        auRubberApiClient.compoundStocks(),
        auRubberApiClient.productCodings("COMPOUND"),
        auRubberApiClient.stockLocations(),
      ]);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
      setCompounds(Array.isArray(compoundsData) ? compoundsData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortStocks = (stocksToSort: RubberCompoundStockDto[]): RubberCompoundStockDto[] => {
    return [...stocksToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "compoundName") {
        return direction * (a.compoundName || "").localeCompare(b.compoundName || "");
      }
      if (sortColumn === "quantityKg") {
        return direction * (a.quantityKg - b.quantityKg);
      }
      if (sortColumn === "reorderPointKg") {
        return direction * (a.reorderPointKg - b.reorderPointKg);
      }
      if (sortColumn === "location") {
        return direction * (a.location || "").localeCompare(b.location || "");
      }
      return 0;
    });
  };

  const filteredStocks = sortStocks(
    stocks.filter((stock) => {
      const matchesSearch =
        searchQuery === "" ||
        stock.compoundName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLowStock = !showLowStockOnly || stock.isLowStock;
      return matchesSearch && matchesLowStock;
    }),
  );

  const paginatedStocks = filteredStocks.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, showLowStockOnly]);

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteCompoundStock(id);
      showToast("Compound stock deleted", "success");
      setDeleteStockId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  };

  const handleReceive = async () => {
    if (!receiveStockId || !receiveQty) {
      showToast("Please enter quantity", "error");
      return;
    }
    try {
      setIsReceiving(true);
      await auRubberApiClient.receiveCompound({
        compoundStockId: receiveStockId,
        quantityKg: Number(receiveQty),
        batchNumber: receiveBatch || undefined,
        notes: receiveNotes || undefined,
      });
      showToast("Compound received", "success");
      setShowReceiveModal(false);
      setReceiveStockId(null);
      setReceiveQty("");
      setReceiveBatch("");
      setReceiveNotes("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to receive", "error");
    } finally {
      setIsReceiving(false);
    }
  };

  const availableCompounds = compounds.filter(
    (c) => !stocks.some((s) => s.compoundCodingId === c.id),
  );

  const resetOpeningStockForm = () => {
    setOpeningStockForm({
      compoundCodingId: 0,
      quantityKg: 0,
      costPerKg: null,
      minStockLevelKg: 0,
      reorderPointKg: 0,
      locationId: null,
      batchNumber: null,
      notes: null,
    });
    setCsvData([]);
    setCsvFileName("");
    setImportResult(null);
    setOpeningStockTab("single");
  };

  const handleCreateOpeningStock = async () => {
    if (!openingStockForm.compoundCodingId || !openingStockForm.quantityKg) {
      showToast("Please fill in compound and quantity", "error");
      return;
    }
    try {
      setIsSubmittingOpeningStock(true);
      await auRubberApiClient.createCompoundOpeningStock(openingStockForm);
      showToast("Opening stock created successfully", "success");
      setShowOpeningStockModal(false);
      resetOpeningStockForm();
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create opening stock", "error");
    } finally {
      setIsSubmittingOpeningStock(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows: ImportCompoundOpeningStockRowDto[] = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowData: ImportCompoundOpeningStockRowDto = {
          compoundCode: values[headers.indexOf("compound_code")] || "",
          quantityKg: Number(values[headers.indexOf("quantity_kg")]) || 0,
          costPerKg: values[headers.indexOf("cost_per_kg")]
            ? Number(values[headers.indexOf("cost_per_kg")])
            : null,
          minStockLevelKg: values[headers.indexOf("min_stock_level_kg")]
            ? Number(values[headers.indexOf("min_stock_level_kg")])
            : null,
          reorderPointKg: values[headers.indexOf("reorder_point_kg")]
            ? Number(values[headers.indexOf("reorder_point_kg")])
            : null,
          location: values[headers.indexOf("location")] || null,
          batchNumber: values[headers.indexOf("batch_number")] || null,
        };
        return rowData;
      });
      setCsvData(rows.filter((r) => r.compoundCode && r.quantityKg > 0));
    };
    reader.readAsText(file);
  };

  const handleImportOpeningStock = async () => {
    if (csvData.length === 0) {
      showToast("No valid data to import", "error");
      return;
    }
    try {
      setIsImporting(true);
      const result = await auRubberApiClient.importCompoundOpeningStock(csvData);
      setImportResult(result);
      if (result.errors.length === 0) {
        showToast(
          `Successfully imported: ${result.created} created, ${result.updated} updated`,
          "success",
        );
        setShowOpeningStockModal(false);
        resetOpeningStockForm();
        fetchData();
      } else {
        showToast(
          `Imported ${result.created + result.updated} of ${result.totalRows} with errors`,
          "warning",
        );
        fetchData();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to import opening stock", "error");
    } finally {
      setIsImporting(false);
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
      <Breadcrumb items={[{ label: "Compound Inventory" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compound Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track rubber compound stock levels and manage inventory
          </p>
        </div>
        <button
          onClick={() => setShowOpeningStockModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Opening Stock
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Compound name or code"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
          </label>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading compound stocks..." />
        ) : filteredStocks.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title="No compound stocks found"
            subtitle={
              searchQuery || showLowStockOnly
                ? "Try adjusting your filters"
                : "Get started by adding opening stock"
            }
            action={
              !searchQuery && !showLowStockOnly
                ? { label: "Add Opening Stock", onClick: () => setShowOpeningStockModal(true) }
                : undefined
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("compoundName")}
                >
                  Compound
                  <SortIcon active={sortColumn === "compoundName"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("quantityKg")}
                >
                  Quantity (kg)
                  <SortIcon active={sortColumn === "quantityKg"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("reorderPointKg")}
                >
                  Reorder Point
                  <SortIcon active={sortColumn === "reorderPointKg"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("location")}
                >
                  Location
                  <SortIcon active={sortColumn === "location"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStocks.map((stock) => (
                <tr
                  key={stock.id}
                  className={`hover:bg-gray-50 ${stock.isLowStock ? "bg-red-50" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/compound-stocks/${stock.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {stock.compoundName || "N/A"}
                    </Link>
                    {stock.compoundCode && (
                      <span className="ml-2 text-xs text-gray-500">({stock.compoundCode})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stock.quantityKg.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stock.reorderPointKg.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stock.location || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stock.isLowStock ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setReceiveStockId(stock.id);
                        setShowReceiveModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      Receive
                    </button>
                    <button
                      onClick={() => setDeleteStockId(stock.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStocks.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="stocks"
          onPageChange={setCurrentPage}
        />
      </div>

      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 z-10"
              onClick={() => {
                setShowOpeningStockModal(false);
                resetOpeningStockForm();
              }}
            />
            <div className="relative z-20 bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Opening Stock</h3>

              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setOpeningStockTab("single")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      openingStockTab === "single"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Single Entry
                  </button>
                  <button
                    onClick={() => setOpeningStockTab("bulk")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      openingStockTab === "bulk"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Bulk Import
                  </button>
                </nav>
              </div>

              {openingStockTab === "single" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Compound <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={openingStockForm.compoundCodingId}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            compoundCodingId: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        <option value={0}>Select compound</option>
                        {availableCompounds.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.quantityKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            quantityKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="100.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cost per kg (ZAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.costPerKg ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            costPerKg: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="50.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Min Stock Level (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.minStockLevelKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            minStockLevelKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reorder Point (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.reorderPointKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            reorderPointKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <select
                        value={openingStockForm.locationId ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            locationId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        <option value="">Select location</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={openingStockForm.batchNumber ?? ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            batchNumber: e.target.value || null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={openingStockForm.notes ?? ""}
                      onChange={(e) =>
                        setOpeningStockForm({
                          ...openingStockForm,
                          notes: e.target.value || null,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      rows={2}
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowOpeningStockModal(false);
                        resetOpeningStockForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateOpeningStock}
                      disabled={isSubmittingOpeningStock}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isSubmittingOpeningStock ? "Creating..." : "Create Opening Stock"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
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
                      <p className="mt-2 text-sm text-gray-600">
                        {csvFileName || "Click to upload CSV file"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Columns: compound_code, quantity_kg, cost_per_kg, min_stock_level_kg,
                        reorder_point_kg, location, batch_number
                      </p>
                    </label>
                  </div>

                  {csvData.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        Preview ({csvData.length} rows)
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Compound
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Qty (kg)
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Cost/kg
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Location
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.slice(0, 10).map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.compoundCode}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.quantityKg}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.costPerKg ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.location ?? "-"}
                                </td>
                              </tr>
                            ))}
                            {csvData.length > 10 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-3 py-2 text-sm text-gray-500 text-center"
                                >
                                  ...and {csvData.length - 10} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importResult && importResult.errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg bg-red-50 p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-2">
                        Import Errors ({importResult.errors.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto text-sm text-red-700">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx}>
                            Row {err.row} ({err.compoundCode}): {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowOpeningStockModal(false);
                        resetOpeningStockForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportOpeningStock}
                      disabled={isImporting || csvData.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isImporting ? "Importing..." : `Import ${csvData.length} Compounds`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 z-10"
              onClick={() => setShowReceiveModal(false)}
            />
            <div className="relative z-20 bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Compound</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
                  <input
                    type="number"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input
                    type="text"
                    value={receiveBatch}
                    onChange={(e) => setReceiveBatch(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    rows={2}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceive}
                  disabled={isReceiving || !receiveQty}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isReceiving ? "Receiving..." : "Receive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteStockId !== null}
        title="Delete Compound Stock"
        message="Are you sure you want to delete this compound stock? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteStockId && handleDelete(deleteStockId)}
        onCancel={() => setDeleteStockId(null)}
      />
    </div>
  );
}
