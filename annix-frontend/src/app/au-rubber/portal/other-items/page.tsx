"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CreateOtherStockDto,
  type ImportOtherStockResultDto,
  type ImportOtherStockRowDto,
  type OtherStockUnitOfMeasure,
  type RubberOtherStockDto,
  type StockLocationDto,
} from "@/app/lib/api/auRubberApi";
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

type SortColumn = "itemCode" | "itemName" | "quantity" | "category" | "location";

const UNIT_OF_MEASURE_OPTIONS: { value: OtherStockUnitOfMeasure; label: string }[] = [
  { value: "EACH", label: "Each" },
  { value: "BOX", label: "Box" },
  { value: "PACK", label: "Pack" },
  { value: "KG", label: "Kg" },
  { value: "LITERS", label: "Liters" },
  { value: "METERS", label: "Meters" },
  { value: "ROLLS", label: "Rolls" },
  { value: "SHEETS", label: "Sheets" },
  { value: "PAIRS", label: "Pairs" },
  { value: "SETS", label: "Sets" },
];

export default function OtherItemsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<RubberOtherStockDto[]>([]);
  const [locations, setLocations] = useState<StockLocationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("itemName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemTab, setAddItemTab] = useState<"single" | "bulk">("single");
  const [itemForm, setItemForm] = useState<CreateOtherStockDto>({
    itemCode: "",
    itemName: "",
    description: null,
    category: null,
    unitOfMeasure: "EACH",
    quantity: 0,
    minStockLevel: 0,
    reorderPoint: 0,
    costPerUnit: null,
    pricePerUnit: null,
    locationId: null,
    supplier: null,
    notes: null,
  });
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [csvData, setCsvData] = useState<ImportOtherStockRowDto[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportOtherStockResultDto | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveItemId, setReceiveItemId] = useState<number | null>(null);
  const [receiveQty, setReceiveQty] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItemId, setAdjustItemId] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [itemsData, locationsData] = await Promise.all([
        auRubberApiClient.otherStocks(),
        auRubberApiClient.stockLocations(),
      ]);
      setItems(Array.isArray(itemsData) ? itemsData : []);
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

  const sortItems = (itemsToSort: RubberOtherStockDto[]): RubberOtherStockDto[] => {
    return [...itemsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "itemCode") {
        return direction * a.itemCode.localeCompare(b.itemCode);
      }
      if (sortColumn === "itemName") {
        return direction * a.itemName.localeCompare(b.itemName);
      }
      if (sortColumn === "quantity") {
        return direction * (a.quantity - b.quantity);
      }
      if (sortColumn === "category") {
        return direction * (a.category || "").localeCompare(b.category || "");
      }
      if (sortColumn === "location") {
        return direction * (a.location || "").localeCompare(b.location || "");
      }
      return 0;
    });
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  const filteredItems = sortItems(
    items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLowStock = !showLowStockOnly || item.isLowStock;
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesLowStock && matchesCategory;
    }),
  );

  const paginatedItems = filteredItems.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, showLowStockOnly, categoryFilter]);

  const resetItemForm = () => {
    setItemForm({
      itemCode: "",
      itemName: "",
      description: null,
      category: null,
      unitOfMeasure: "EACH",
      quantity: 0,
      minStockLevel: 0,
      reorderPoint: 0,
      costPerUnit: null,
      pricePerUnit: null,
      locationId: null,
      supplier: null,
      notes: null,
    });
    setCsvData([]);
    setCsvFileName("");
    setImportResult(null);
    setAddItemTab("single");
  };

  const handleCreateItem = async () => {
    if (!itemForm.itemCode || !itemForm.itemName) {
      showToast("Please fill in item code and name", "error");
      return;
    }
    try {
      setIsSubmittingItem(true);
      await auRubberApiClient.createOtherStock(itemForm);
      showToast("Item created successfully", "success");
      setShowAddItemModal(false);
      resetItemForm();
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create item", "error");
    } finally {
      setIsSubmittingItem(false);
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
      const rows: ImportOtherStockRowDto[] = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const rowData: ImportOtherStockRowDto = {
          itemCode: values[headers.indexOf("item_code")] || "",
          itemName: values[headers.indexOf("item_name")] || "",
          description: values[headers.indexOf("description")] || null,
          category: values[headers.indexOf("category")] || null,
          unitOfMeasure: values[headers.indexOf("unit_of_measure")] || null,
          quantity: Number(values[headers.indexOf("quantity")]) || 0,
          minStockLevel: values[headers.indexOf("min_stock_level")]
            ? Number(values[headers.indexOf("min_stock_level")])
            : null,
          reorderPoint: values[headers.indexOf("reorder_point")]
            ? Number(values[headers.indexOf("reorder_point")])
            : null,
          costPerUnit: values[headers.indexOf("cost_per_unit")]
            ? Number(values[headers.indexOf("cost_per_unit")])
            : null,
          pricePerUnit: values[headers.indexOf("price_per_unit")]
            ? Number(values[headers.indexOf("price_per_unit")])
            : null,
          location: values[headers.indexOf("location")] || null,
          supplier: values[headers.indexOf("supplier")] || null,
          notes: values[headers.indexOf("notes")] || null,
        };
        return rowData;
      });
      setCsvData(rows.filter((r) => r.itemCode && r.itemName && r.quantity > 0));
    };
    reader.readAsText(file);
  };

  const handleImportItems = async () => {
    if (csvData.length === 0) {
      showToast("No valid data to import", "error");
      return;
    }
    try {
      setIsImporting(true);
      const result = await auRubberApiClient.importOtherStock(csvData);
      setImportResult(result);
      if (result.errors.length === 0) {
        showToast(
          `Successfully imported: ${result.created} created, ${result.updated} updated`,
          "success",
        );
        setShowAddItemModal(false);
        resetItemForm();
        fetchData();
      } else {
        showToast(
          `Imported ${result.created + result.updated} of ${result.totalRows} with errors`,
          "warning",
        );
        fetchData();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to import items", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteOtherStock(id);
      showToast("Item deleted", "success");
      setDeleteItemId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  };

  const handleReceive = async () => {
    if (!receiveItemId || !receiveQty) {
      showToast("Please enter quantity", "error");
      return;
    }
    try {
      setIsReceiving(true);
      await auRubberApiClient.receiveOtherStock({
        otherStockId: receiveItemId,
        quantity: Number(receiveQty),
      });
      showToast("Stock received", "success");
      setShowReceiveModal(false);
      setReceiveItemId(null);
      setReceiveQty("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to receive stock", "error");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustItemId || adjustQty === "") {
      showToast("Please enter new quantity", "error");
      return;
    }
    try {
      setIsAdjusting(true);
      await auRubberApiClient.adjustOtherStock({
        otherStockId: adjustItemId,
        newQuantity: Number(adjustQty),
        reason: adjustReason || undefined,
      });
      showToast("Stock adjusted", "success");
      setShowAdjustModal(false);
      setAdjustItemId(null);
      setAdjustQty("");
      setAdjustReason("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to adjust stock", "error");
    } finally {
      setIsAdjusting(false);
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
      <Breadcrumb items={[{ label: "Other Items" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Other Items</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track miscellaneous stock items, consumables, and other inventory
          </p>
        </div>
        <button
          onClick={() => setShowAddItemModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
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
              placeholder="Item code, name, or description"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
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
          <TableLoadingState message="Loading items..." />
        ) : filteredItems.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.cube />}
            title="No items found"
            subtitle={
              searchQuery || showLowStockOnly || categoryFilter
                ? "Try adjusting your filters"
                : "Add your first item to get started"
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("itemCode")}
                >
                  <div className="flex items-center">
                    Code
                    <SortIcon active={sortColumn === "itemCode"} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("itemName")}
                >
                  <div className="flex items-center">
                    Name
                    <SortIcon active={sortColumn === "itemName"} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center">
                    Category
                    <SortIcon active={sortColumn === "category"} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("quantity")}
                >
                  <div className="flex items-center justify-end">
                    Quantity
                    <SortIcon active={sortColumn === "quantity"} direction={sortDirection} />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Point
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center">
                    Location
                    <SortIcon active={sortColumn === "location"} direction={sortDirection} />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.map((item) => (
                <tr key={item.id} className={item.isLowStock ? "bg-red-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.itemCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {item.itemName}
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`font-medium ${item.isLowStock ? "text-red-600" : "text-gray-900"}`}
                    >
                      {item.quantity.toLocaleString()} {item.unitOfMeasureLabel}
                    </span>
                    {item.isLowStock && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {item.reorderPoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.location || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setReceiveItemId(item.id);
                        setShowReceiveModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      Receive
                    </button>
                    <button
                      onClick={() => {
                        setAdjustItemId(item.id);
                        setAdjustQty(String(item.quantity));
                        setShowAdjustModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => setDeleteItemId(item.id)}
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
          totalItems={filteredItems.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="items"
          onPageChange={setCurrentPage}
        />
      </div>

      {showAddItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowAddItemModal(false);
                resetItemForm();
              }}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Item</h3>

              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setAddItemTab("single")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      addItemTab === "single"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Single Entry
                  </button>
                  <button
                    onClick={() => setAddItemTab("bulk")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      addItemTab === "bulk"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Bulk Import
                  </button>
                </nav>
              </div>

              {addItemTab === "single" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Item Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemForm.itemCode}
                        onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="ITEM-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemForm.itemName}
                        onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="Item name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <input
                        type="text"
                        value={itemForm.category ?? ""}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, category: e.target.value || null })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="e.g., Tools, PPE"
                        list="category-suggestions"
                      />
                      <datalist id="category-suggestions">
                        {categories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit of Measure
                      </label>
                      <select
                        value={itemForm.unitOfMeasure}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            unitOfMeasure: e.target.value as OtherStockUnitOfMeasure,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        {UNIT_OF_MEASURE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={itemForm.quantity || ""}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, quantity: Number(e.target.value) })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Min Stock Level
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={itemForm.minStockLevel || ""}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, minStockLevel: Number(e.target.value) })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reorder Point
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={itemForm.reorderPoint || ""}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, reorderPoint: Number(e.target.value) })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <select
                        value={itemForm.locationId ?? ""}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
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
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cost per Unit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={itemForm.costPerUnit ?? ""}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            costPerUnit: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Sell Price per Unit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={itemForm.pricePerUnit ?? ""}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            pricePerUnit: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier</label>
                      <input
                        type="text"
                        value={itemForm.supplier ?? ""}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, supplier: e.target.value || null })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="Supplier name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={itemForm.description ?? ""}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, description: e.target.value || null })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      rows={2}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={itemForm.notes ?? ""}
                      onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      rows={2}
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddItemModal(false);
                        resetItemForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateItem}
                      disabled={isSubmittingItem}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isSubmittingItem ? "Creating..." : "Create Item"}
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
                        Columns: item_code, item_name, description, category, unit_of_measure,
                        quantity, min_stock_level, reorder_point, cost_per_unit, price_per_unit,
                        location, supplier, notes
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
                                Code
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Qty
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Category
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.slice(0, 10).map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.itemCode}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.itemName}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.quantity}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.category ?? "-"}
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
                            Row {err.row} ({err.itemCode}): {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddItemModal(false);
                        resetItemForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportItems}
                      disabled={isImporting || csvData.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isImporting ? "Importing..." : `Import ${csvData.length} Items`}
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
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowReceiveModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Stock</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity to Receive
                  </label>
                  <input
                    type="number"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="0"
                    step="0.001"
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

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowAdjustModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adjust Stock</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Quantity</label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="0"
                    step="0.001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Stock count, damage, etc."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={isAdjusting || adjustQty === ""}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAdjusting ? "Adjusting..." : "Adjust"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteItemId !== null}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteItemId && handleDelete(deleteItemId)}
        onCancel={() => setDeleteItemId(null)}
      />
    </div>
  );
}
