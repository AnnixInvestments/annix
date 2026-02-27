"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ImportResult,
  ImportUploadResponse,
  InventoryColumnMapping,
  StockControlLocation,
  StockItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

function isRandColumn(header: string): boolean {
  return /value|price|cost|r\/p|amount|rand|zar/i.test(header);
}

function isImportRowBlank(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "" || cell.trim() === "0");
}

function isImportSectionTitle(row: string[]): boolean {
  const firstCell = row[0]?.trim() ?? "";
  if (firstCell === "" || firstCell === "0") {
    return false;
  } else {
    return row.slice(1).every((cell) => cell.trim() === "" || cell.trim() === "0");
  }
}

function formatRandCell(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return value;
  } else {
    return `R ${num.toFixed(2)}`;
  }
}

const ITEMS_PER_PAGE = 20;

type ViewMode = "list" | "grouped";

interface CategoryGroup {
  category: string;
  items: StockItem[];
  expanded: boolean;
}

export default function InventoryPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<StockControlLocation[]>([]);
  const [groupedData, setGroupedData] = useState<CategoryGroup[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState<number | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [modalForm, setModalForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unitOfMeasure: "each",
    costPerUnit: 0,
    quantity: 0,
    minStockLevel: 0,
    locationId: null as number | null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importStep, setImportStep] = useState<
    "idle" | "parsing" | "preview" | "importing" | "result"
  >("idle");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRawRows, setImportRawRows] = useState<string[][]>([]);
  const [importMapping, setImportMapping] = useState<InventoryColumnMapping | null>(null);
  const [importFormat, setImportFormat] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);
  const [pendingMinLevels, setPendingMinLevels] = useState<Map<number, number>>(new Map());
  const [isSavingMinLevels, setIsSavingMinLevels] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [printPreviewItems, setPrintPreviewItems] = useState<StockItem[] | null>(null);
  const printDropdownRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(event.target as Node)) {
        setShowPrintDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allItems = (): StockItem[] => {
    if (viewMode === "grouped") {
      return groupedData.flatMap((g) => g.items);
    }
    return items;
  };

  const handlePrintStockList = (mode: "all" | "selected") => {
    setShowPrintDropdown(false);
    const itemsToPrint =
      mode === "selected" ? allItems().filter((item) => selectedIds.has(item.id)) : allItems();
    setPrintPreviewItems(itemsToPrint);
  };

  const handlePrintPreviewPrint = () => {
    window.print();
  };

  const closePrintPreview = () => {
    setPrintPreviewItems(null);
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = items.map((item) => item.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handlePrintSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsPrintingLabels(true);
      await stockControlApiClient.downloadBatchLabelsPdf({ ids: [...selectedIds] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download labels"));
    } finally {
      setIsPrintingLabels(false);
    }
  };

  const handlePrintAll = async () => {
    try {
      setIsPrintingLabels(true);
      await stockControlApiClient.downloadBatchLabelsPdf({
        search: search || undefined,
        category: categoryFilter || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download labels"));
    } finally {
      setIsPrintingLabels(false);
    }
  };

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);

      if (viewMode === "grouped") {
        const [grouped, cats, locs] = await Promise.all([
          stockControlApiClient.stockItemsGrouped(search || undefined, locationFilter || undefined),
          stockControlApiClient.categories(),
          stockControlApiClient.locations(),
        ]);
        const withExpanded = grouped.map((g) => ({ ...g, expanded: true }));
        setGroupedData(withExpanded);
        setCategories(Array.isArray(cats) ? cats : []);
        setLocations(locs);
        const totalItems = grouped.reduce((sum, g) => sum + g.items.length, 0);
        setTotal(totalItems);
        setItems([]);
      } else {
        const params: Record<string, string> = {
          page: String(currentPage + 1),
          limit: String(ITEMS_PER_PAGE),
        };
        if (search) params.search = search;
        if (categoryFilter) params.category = categoryFilter;
        if (locationFilter) params.locationId = String(locationFilter);

        const [result, cats, locs] = await Promise.all([
          stockControlApiClient.stockItems(params),
          stockControlApiClient.categories(),
          stockControlApiClient.locations(),
        ]);
        setItems(Array.isArray(result.items) ? result.items : []);
        setTotal(result.total ?? 0);
        setCategories(Array.isArray(cats) ? cats : []);
        setLocations(locs);
        setGroupedData([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load inventory"));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, categoryFilter, locationFilter, viewMode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(0);
  };

  const handleLocationChange = (value: string) => {
    setLocationFilter(value === "" ? "" : Number(value));
    setCurrentPage(0);
  };

  const toggleCategoryExpanded = (category: string) => {
    setGroupedData((prev) =>
      prev.map((g) => (g.category === category ? { ...g, expanded: !g.expanded } : g)),
    );
  };

  const expandAllCategories = () => {
    setGroupedData((prev) => prev.map((g) => ({ ...g, expanded: true })));
  };

  const collapseAllCategories = () => {
    setGroupedData((prev) => prev.map((g) => ({ ...g, expanded: false })));
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setModalForm({
      sku: "",
      name: "",
      description: "",
      category: "",
      unitOfMeasure: "each",
      costPerUnit: 0,
      quantity: 0,
      minStockLevel: 0,
      locationId: null,
    });
    setShowModal(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setModalForm({
      sku: item.sku,
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      unitOfMeasure: item.unitOfMeasure,
      costPerUnit: item.costPerUnit,
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
      locationId: item.locationId,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingItem) {
        await stockControlApiClient.updateStockItem(editingItem.id, modalForm);
      } else {
        await stockControlApiClient.createStockItem(modalForm);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to save item"));
    } finally {
      setIsSaving(false);
    }
  };

  const updatePendingMinLevel = (itemId: number, value: number) => {
    setPendingMinLevels((prev) => {
      const next = new Map(prev);
      next.set(itemId, value);
      return next;
    });
  };

  const clearPendingMinLevel = (itemId: number) => {
    setPendingMinLevels((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  const clearAllPendingMinLevels = () => {
    setPendingMinLevels(new Map());
  };

  const saveAllMinLevels = async () => {
    if (isSavingMinLevels || pendingMinLevels.size === 0) return;
    try {
      setIsSavingMinLevels(true);
      const updates = Array.from(pendingMinLevels.entries()).map(([id, minStockLevel]) =>
        stockControlApiClient.updateStockItem(id, { minStockLevel }),
      );
      await Promise.all(updates);
      setPendingMinLevels(new Map());
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update min stock levels"));
    } finally {
      setIsSavingMinLevels(false);
    }
  };

  const minLevelForItem = (item: StockItem): number => {
    return pendingMinLevels.has(item.id) ? pendingMinLevels.get(item.id)! : item.minStockLevel;
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await stockControlApiClient.deleteStockItem(id);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete item"));
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const validExtensions = [".xlsx", ".xls", ".csv", ".pdf"];
    const extension = droppedFile.name.toLowerCase().slice(droppedFile.name.lastIndexOf("."));
    if (!validExtensions.includes(extension)) {
      setImportError("Unsupported file type. Please use Excel, CSV, or PDF files.");
      setImportStep("idle");
      return;
    }

    setImportFile(droppedFile);
    setImportError(null);
    setImportStep("parsing");

    try {
      const response: ImportUploadResponse =
        await stockControlApiClient.uploadImportFile(droppedFile);
      setImportFormat(response.format);

      if (response.format === "excel" && response.headers && response.rawRows) {
        setImportHeaders(response.headers);
        setImportRawRows(response.rawRows);
        setImportMapping(response.mapping ?? null);
        setParsedRows([]);
      } else {
        setParsedRows((response.rows as Record<string, unknown>[]) ?? []);
        setImportHeaders([]);
        setImportRawRows([]);
        setImportMapping(null);
      }

      setImportStep("preview");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse file");
      setImportStep("idle");
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImportStep("importing");
      setImportError(null);

      const buildFallbackMapping = (headers: string[]): InventoryColumnMapping => {
        const mapping: InventoryColumnMapping = {
          sku: null,
          name: null,
          description: null,
          category: null,
          unitOfMeasure: null,
          costPerUnit: null,
          quantity: null,
          minStockLevel: null,
          location: null,
        };
        headers.forEach((header, idx) => {
          const h = header.toLowerCase().trim();
          if (/product.?code|sku|code|item.?code|part.?no/.test(h)) {
            mapping.sku = idx;
          } else if (/stock.?count|qty|quantity|soh|on.?hand|count/.test(h)) {
            mapping.quantity = idx;
          } else if (/r\/p|unit.?price|cost|price.?per/.test(h)) {
            mapping.costPerUnit = idx;
          } else if (/min|minimum|reorder/.test(h)) {
            mapping.minStockLevel = idx;
          } else if (/location|loc|warehouse/.test(h)) {
            mapping.location = idx;
          } else if (/category|cat|group/.test(h)) {
            mapping.category = idx;
          } else if (/unit.?of|uom|measure/.test(h)) {
            mapping.unitOfMeasure = idx;
          }
        });
        if (mapping.name === null) {
          const mappedIndices = new Set(
            Object.values(mapping).filter((v): v is number => v !== null),
          );
          if (!mappedIndices.has(0)) {
            mapping.name = 0;
          }
        }
        return mapping;
      };

      let effectiveMapping = importMapping;
      let dataRows = importRawRows;

      if (importFormat === "excel") {
        const headersEmpty = importHeaders.every((h) => h.trim() === "");
        if (headersEmpty && importRawRows.length > 0) {
          effectiveMapping = buildFallbackMapping(importRawRows[0]);
          dataRows = importRawRows.slice(1);
        } else if (effectiveMapping && Object.values(effectiveMapping).every((v) => v === null)) {
          effectiveMapping = buildFallbackMapping(importHeaders);
        }
      }

      const rowsToImport =
        importFormat === "excel" && effectiveMapping
          ? dataRows
              .filter((row) => !isImportRowBlank(row) && !isImportSectionTitle(row))
              .map((row) => {
                const cellAt = (idx: number | null): string | undefined => {
                  if (idx === null || idx < 0 || idx >= row.length) {
                    return undefined;
                  }
                  const val = row[idx].trim();
                  return val === "" ? undefined : val;
                };
                const numAt = (idx: number | null): number | undefined => {
                  const val = cellAt(idx);
                  if (val === undefined) {
                    return undefined;
                  }
                  const num = Number(val);
                  return Number.isNaN(num) ? undefined : num;
                };
                return {
                  sku: cellAt(effectiveMapping.sku),
                  name: cellAt(effectiveMapping.name),
                  description: cellAt(effectiveMapping.description),
                  category: cellAt(effectiveMapping.category),
                  unitOfMeasure: cellAt(effectiveMapping.unitOfMeasure),
                  costPerUnit: numAt(effectiveMapping.costPerUnit),
                  quantity: numAt(effectiveMapping.quantity),
                  minStockLevel: numAt(effectiveMapping.minStockLevel),
                  location: cellAt(effectiveMapping.location),
                };
              })
          : parsedRows;

      const result = await stockControlApiClient.confirmImport(rowsToImport);
      setImportResult(result);
      setImportStep("result");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import data");
      setImportStep("preview");
    }
  };

  const dismissImport = () => {
    setImportStep("idle");
    setImportFile(null);
    setParsedRows([]);
    setImportHeaders([]);
    setImportRawRows([]);
    setImportMapping(null);
    setImportFormat(null);
    setImportResult(null);
    setImportError(null);
    fetchItems();
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 relative w-full max-w-full overflow-x-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-600/20 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-teal-500">
            <svg
              className="mx-auto h-16 w-16 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-4 text-lg font-semibold text-gray-900">Drop file to import</p>
            <p className="mt-1 text-sm text-gray-500">Excel, CSV, or PDF</p>
          </div>
        </div>
      )}

      {importStep === "parsing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Parsing {importFile?.name}...</p>
          </div>
        </div>
      )}

      {importStep === "preview" && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500/75" onClick={dismissImport}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Import Preview</h3>
                  <p className="text-sm text-gray-500">
                    {importFile?.name} -{" "}
                    {importFormat === "excel"
                      ? importRawRows.filter((r) => !isImportRowBlank(r)).length
                      : parsedRows.length}{" "}
                    rows parsed
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={dismissImport}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={
                      importFormat === "excel"
                        ? importRawRows.length === 0
                        : parsedRows.length === 0
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    Confirm Import (
                    {importFormat === "excel"
                      ? importRawRows.filter((r) => !isImportRowBlank(r)).length
                      : parsedRows.length}{" "}
                    rows)
                  </button>
                </div>
              </div>
              {importMapping && (
                <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    AI mapped columns:{" "}
                    {Object.entries(importMapping)
                      .filter(([, v]) => v !== null)
                      .map(([field, colIdx]) => `${field} -> "${importHeaders[colIdx as number]}"`)
                      .join(", ") || "No columns mapped"}
                  </p>
                </div>
              )}
              {importError && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}
              <div className="overflow-x-auto max-h-96">
                {importFormat === "excel" ? (
                  (() => {
                    const headersEmpty = importHeaders.every((h) => h.trim() === "");
                    const effectiveHeaders = headersEmpty
                      ? (importRawRows[0] ?? [])
                      : importHeaders;
                    const effectiveDataRows = headersEmpty ? importRawRows.slice(1) : importRawRows;
                    return (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Row
                            </th>
                            {effectiveHeaders.map((header, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {effectiveDataRows
                            .filter((row) => !isImportRowBlank(row))
                            .map((row, rowIdx) => {
                              const sectionTitle = isImportSectionTitle(row);
                              return (
                                <tr
                                  key={rowIdx}
                                  className={sectionTitle ? "bg-gray-100" : "hover:bg-gray-50"}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-500">{rowIdx + 1}</td>
                                  {effectiveHeaders.map((header, colIdx) => {
                                    const cell = row[colIdx] ?? "";
                                    const displayValue =
                                      sectionTitle && (cell.trim() === "0" || cell.trim() === "")
                                        ? ""
                                        : isRandColumn(header) && !sectionTitle
                                          ? formatRandCell(cell)
                                          : cell;
                                    return (
                                      <td
                                        key={colIdx}
                                        className={`px-4 py-3 text-sm text-gray-900 ${sectionTitle ? "font-bold" : ""}`}
                                      >
                                        {displayValue}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    );
                  })()
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Row
                        </th>
                        {parsedRows.length > 0 &&
                          Object.keys(parsedRows[0]).map((header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                            >
                              {header}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedRows.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          {Object.keys(parsedRows[0]).map((header) => (
                            <td key={header} className="px-4 py-3 text-sm text-gray-900">
                              {String(row[header] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {importStep === "importing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Importing items...</p>
          </div>
        </div>
      )}

      {importStep === "result" && importResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500/75" onClick={dismissImport}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                  <div className="text-sm text-blue-600">Updated</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, index) => (
                    <div key={index} className="text-sm text-red-700">
                      <span className="font-medium">Row {err.row}:</span> {err.message}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={dismissImport}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrintingLabels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Labels</h3>
              <p className="text-sm text-gray-500 text-center">
                Please wait while we prepare your PDF. This may take a moment...
              </p>
            </div>
          </div>
        </div>
      )}

      {importError && importStep === "idle" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{importError}</p>
          </div>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">Manage stock items and quantities</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrintAll}
            disabled={isPrintingLabels}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            {isPrintingLabels ? "Printing..." : "Print All Labels"}
          </button>
          <div className="relative" ref={printDropdownRef}>
            <button
              onClick={() => setShowPrintDropdown(!showPrintDropdown)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Print Stock List
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showPrintDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={() => handlePrintStockList("all")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Print Full List
                  </button>
                  <button
                    onClick={() => handlePrintStockList("selected")}
                    disabled={selectedIds.size === 0}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Print Selected ({selectedIds.size})
                  </button>
                </div>
              </div>
            )}
          </div>
          <Link
            href="/stock-control/portal/inventory/import"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Item
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={locationFilter}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          {viewMode === "list" && (
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === "grouped"
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              title="Grouped view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === "list"
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-medium text-teal-800">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-teal-700 hover:text-teal-900"
            >
              Clear
            </button>
            <button
              onClick={handlePrintSelected}
              disabled={isPrintingLabels}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              {isPrintingLabels ? "Printing..." : "Print Labels"}
            </button>
          </div>
        </div>
      )}

      {pendingMinLevels.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-medium text-amber-800">
            {pendingMinLevels.size} unsaved min level change{pendingMinLevels.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={clearAllPendingMinLevels}
              className="text-sm text-amber-700 hover:text-amber-900"
            >
              Discard Changes
            </button>
            <button
              onClick={saveAllMinLevels}
              disabled={isSavingMinLevels}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {isSavingMinLevels ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
      )}

      {viewMode === "grouped" && groupedData.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {groupedData.length} categories, {total} items total
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={expandAllCategories}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              Expand All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={collapseAllCategories}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {groupedData.length === 0 ? (
            <div className="bg-white shadow rounded-lg text-center py-12">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
              <p className="mt-1 text-sm text-gray-500">Add a stock item to get started.</p>
            </div>
          ) : (
            groupedData.map((group) => (
              <div key={group.category} className="bg-white shadow rounded-lg overflow-x-auto">
                <button
                  onClick={() => toggleCategoryExpanded(group.category)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${group.expanded ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="font-semibold text-gray-900">{group.category}</span>
                    <span className="text-sm text-gray-500">({group.items.length} items)</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatZAR(group.items.reduce((sum, i) => sum + i.costPerUnit * i.quantity, 0))}
                  </span>
                </button>
                {group.expanded && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={
                                group.items.length > 0 &&
                                group.items.every((item) => selectedIds.has(item.id))
                              }
                              onChange={() => {
                                const groupIds = group.items.map((item) => item.id);
                                const allSelected = groupIds.every((id) => selectedIds.has(id));
                                if (allSelected) {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    groupIds.forEach((id) => next.delete(id));
                                    return next;
                                  });
                                } else {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    groupIds.forEach((id) => next.add(id));
                                    return next;
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                          </th>
                          <th className="hidden sm:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SOH
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Min
                          </th>
                          <th className="hidden md:table-cell px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cost
                          </th>
                          <th className="hidden lg:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.items.map((item) => (
                          <tr
                            key={item.id}
                            className={
                              item.minStockLevel > 0 && item.quantity <= item.minStockLevel
                                ? "bg-amber-50 hover:bg-amber-100"
                                : "hover:bg-gray-50"
                            }
                          >
                            <td className="px-4 py-4 w-10">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelectItem(item.id)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="hidden sm:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                              {item.sku}
                            </td>
                            <td className="px-3 lg:px-6 py-4">
                              <Link
                                href={`/stock-control/portal/inventory/${item.id}`}
                                className="text-sm font-medium text-teal-700 hover:text-teal-900 break-words"
                              >
                                {item.name}
                              </Link>
                              <span className="sm:hidden block text-xs text-gray-500 font-mono mt-0.5">
                                {item.sku}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                              {item.quantity}
                              {item.minStockLevel > 0 && item.quantity <= item.minStockLevel && (
                                <svg
                                  className="w-4 h-4 text-amber-500 inline ml-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right">
                              <input
                                type="number"
                                min={0}
                                value={minLevelForItem(item)}
                                onChange={(e) =>
                                  updatePendingMinLevel(item.id, parseInt(e.target.value, 10) || 0)
                                }
                                className={`w-16 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
                                  pendingMinLevels.has(item.id)
                                    ? "border-teal-500 bg-teal-50"
                                    : "border-gray-300"
                                }`}
                              />
                            </td>
                            <td className="hidden md:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatZAR(item.costPerUnit)}
                            </td>
                            <td className="hidden lg:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.locationId
                                ? (locations.find((l) => l.id === item.locationId)?.name ?? "-")
                                : "-"}
                            </td>
                            <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => openEditModal(item)}
                                className="text-teal-600 hover:text-teal-900 mr-2 lg:mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Del
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {items.length === 0 ? (
            <div className="text-center py-12">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
              <p className="mt-1 text-sm text-gray-500">Add a stock item to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          items.length > 0 && items.every((item) => selectedIds.has(item.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th
                      scope="col"
                      className="hidden sm:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      SKU
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="hidden lg:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      SOH
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Min
                    </th>
                    <th
                      scope="col"
                      className="hidden md:table-cell px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Cost
                    </th>
                    <th
                      scope="col"
                      className="hidden xl:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        item.minStockLevel > 0 && item.quantity <= item.minStockLevel
                          ? "bg-amber-50 hover:bg-amber-100"
                          : "hover:bg-gray-50"
                      }
                    >
                      <td className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="hidden sm:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <Link
                          href={`/stock-control/portal/inventory/${item.id}`}
                          className="text-sm font-medium text-teal-700 hover:text-teal-900 break-words"
                        >
                          {item.name}
                        </Link>
                        <span className="sm:hidden block text-xs text-gray-500 font-mono mt-0.5">
                          {item.sku}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category || "-"}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {item.quantity}
                        {item.minStockLevel > 0 && item.quantity <= item.minStockLevel && (
                          <svg
                            className="w-4 h-4 text-amber-500 inline ml-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right">
                        <input
                          type="number"
                          min={0}
                          value={minLevelForItem(item)}
                          onChange={(e) =>
                            updatePendingMinLevel(item.id, parseInt(e.target.value, 10) || 0)
                          }
                          className={`w-16 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
                            pendingMinLevels.has(item.id)
                              ? "border-teal-500 bg-teal-50"
                              : "border-gray-300"
                          }`}
                        />
                      </td>
                      <td className="hidden md:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatZAR(item.costPerUnit)}
                      </td>
                      <td className="hidden xl:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.locationId
                          ? (locations.find((l) => l.id === item.locationId)?.name ?? "-")
                          : "-"}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-teal-600 hover:text-teal-900 mr-2 lg:mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-gray-700 text-center sm:text-left">
                Showing {currentPage * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min((currentPage + 1) * ITEMS_PER_PAGE, total)} of {total} items
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? "Edit Stock Item" : "Add Stock Item"}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      value={modalForm.sku}
                      onChange={(e) => setModalForm({ ...modalForm, sku: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={modalForm.name}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={modalForm.category}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={modalForm.unitOfMeasure}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, unitOfMeasure: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalForm.costPerUnit}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, costPerUnit: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      value={modalForm.quantity}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, quantity: parseInt(e.target.value, 10) || 0 })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Min Stock Level
                    </label>
                    <input
                      type="number"
                      value={modalForm.minStockLevel}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          minStockLevel: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    value={modalForm.locationId ?? ""}
                    onChange={(e) =>
                      setModalForm({
                        ...modalForm,
                        locationId: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value="">No location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : editingItem ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printPreviewItems !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto print:relative print:overflow-visible">
          <div className="flex items-start justify-center min-h-screen px-4 py-8 print:p-0 print:m-0">
            <div
              className="fixed inset-0 bg-gray-500/75 print:hidden"
              onClick={closePrintPreview}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full print:shadow-none print:max-w-none print:rounded-none">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Print Stock List</h3>
                  <p className="text-sm text-gray-500">{printPreviewItems.length} items</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={closePrintPreview}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrintPreviewPrint}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
                  >
                    Print
                  </button>
                </div>
              </div>
              <div className="p-6 print:p-0">
                <div className="print:block">
                  <div className="text-center mb-6 print:mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 print:text-xl">Stock List</h1>
                    <p className="text-sm text-gray-500">
                      Generated on{" "}
                      {new Date().toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200 print:text-sm">
                    <thead className="bg-gray-50 print:bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Category
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          SOH
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Min Level
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {printPreviewItems.map((item) => (
                        <tr
                          key={item.id}
                          className={
                            item.minStockLevel > 0 && item.quantity <= item.minStockLevel
                              ? "bg-amber-50"
                              : ""
                          }
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-900 print:px-2 print:py-1">
                            {item.sku}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 print:px-2 print:py-1">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 print:px-2 print:py-1">
                            {item.category || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900 print:px-2 print:py-1">
                            {item.quantity}
                            {item.minStockLevel > 0 && item.quantity <= item.minStockLevel && " *"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500 print:px-2 print:py-1">
                            {item.minStockLevel}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 print:px-2 print:py-1">
                            {formatZAR(item.costPerUnit)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 print:px-2 print:py-1">
                            {formatZAR(item.costPerUnit * item.quantity)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 print:px-2 print:py-1">
                            {item.location || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 print:bg-gray-100">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-sm font-medium text-gray-900 print:px-2 print:py-1"
                        >
                          Total
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 print:px-2 print:py-1">
                          {printPreviewItems.reduce((sum, i) => sum + i.quantity, 0)}
                        </td>
                        <td className="px-4 py-3 print:px-2 print:py-1" />
                        <td className="px-4 py-3 print:px-2 print:py-1" />
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 print:px-2 print:py-1">
                          {formatZAR(
                            printPreviewItems.reduce(
                              (sum, i) => sum + i.costPerUnit * i.quantity,
                              0,
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3 print:px-2 print:py-1" />
                      </tr>
                    </tfoot>
                  </table>
                  <p className="mt-4 text-xs text-gray-500 print:mt-2">
                    * Items marked with asterisk are at or below minimum stock level
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
