"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportResult, StockItem } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

const ITEMS_PER_PAGE = 20;

export default function InventoryPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
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
    location: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importStep, setImportStep] = useState<"idle" | "parsing" | "preview" | "importing" | "result">("idle");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {
        page: String(currentPage + 1),
        limit: String(ITEMS_PER_PAGE),
      };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;

      const [result, cats] = await Promise.all([
        stockControlApiClient.stockItems(params),
        stockControlApiClient.categories(),
      ]);
      setItems(Array.isArray(result.items) ? result.items : []);
      setTotal(result.total ?? 0);
      setCategories(Array.isArray(cats) ? cats : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load inventory"));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, categoryFilter]);

  useEffect(() => {
    if (actionError) {
      showError("Inventory Error", actionError.message);
      clearActionError();
    }
  }, [actionError, showError, clearActionError]);

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
      const rows = await stockControlApiClient.uploadImportFile(droppedFile);
      setParsedRows(rows as Record<string, unknown>[]);
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
      const result = await stockControlApiClient.confirmImport(parsedRows);
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

  if (error && items.length === 0 && groupedData.length === 0) {
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
      className="space-y-6 relative"
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
                    {importFile?.name} - {parsedRows.length} rows parsed
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
                    disabled={parsedRows.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    Confirm Import ({parsedRows.length} rows)
                  </button>
                </div>
              </div>
              {importError && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">Manage stock items and quantities</p>
        </div>
        <div className="flex items-center space-x-3">
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

      <InventoryToolbar
        viewMode={state.viewMode}
        groupedData={groupedData}
        allItems={allItems}
        isPrintingLabels={state.isPrintingLabels}
        showPrintDropdown={state.showPrintDropdown}
        selectedIdsSize={state.selectedIds.size}
        printDropdownRef={printDropdownRef}
        onPrintAll={handlePrintAll}
        onTogglePrintDropdown={() => updateState({ showPrintDropdown: !state.showPrintDropdown })}
        onPrintStockList={handlePrintStockList}
        onOpenCreateModal={openCreateModal}
        onRefresh={invalidateInventory}
      />

      <InventoryLocationTabs
        locations={locations}
        locationFilter={state.locationFilter}
        total={total}
        locationCounts={locationCounts}
        onLocationChange={handleLocationChange}
      />

      <InventoryFilterBar
        search={state.search}
        categoryFilter={state.categoryFilter}
        categories={categories}
        viewMode={state.viewMode}
        thumbnailSize={state.thumbnailSize}
        cardGroupBy={state.cardGroupBy}
        cardSortField={state.cardSortField}
        cardSortDirection={state.cardSortDirection}
        lowStockOnly={state.lowStockOnly}
        listGroupByCategory={state.listGroupByCategory}
        isAutoCategorizing={state.isAutoCategorizing}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onChangeViewMode={changeViewMode}
        onChangeThumbSize={changeThumbSize}
        onUpdateCardGroupBy={(value) => updateState({ cardGroupBy: value })}
        onUpdateCardSort={(field, direction) =>
          updateState({ cardSortField: field, cardSortDirection: direction })
        }
        onToggleLowStockOnly={() => updateState({ lowStockOnly: !state.lowStockOnly })}
        onToggleListGroupByCategory={toggleListGroupByCategory}
        onAutoCategorize={handleAutoCategorize}
        onNormalizeRubber={handleNormalizeRubber}
      />

      <InventoryPendingChanges
        selectedIdsSize={state.selectedIds.size}
        pendingMinLevelsSize={state.pendingMinLevels.size}
        pendingPricesSize={state.pendingPrices.size}
        pendingLocationsSize={state.pendingLocations.size}
        isPrintingLabels={state.isPrintingLabels}
        isSavingMinLevels={state.isSavingMinLevels}
        isSavingPrices={state.isSavingPrices}
        isSavingLocations={state.isSavingLocations}
        onClearSelection={() => updateState({ selectedIds: new Set() })}
        onPrintSelected={handlePrintSelected}
        onClearMinLevels={clearAllPendingMinLevels}
        onSaveMinLevels={saveAllMinLevels}
        onClearPrices={clearAllPendingPrices}
        onSavePrices={saveAllPrices}
        onClearLocations={clearAllPendingLocations}
        onSaveLocations={saveAllLocations}
      />

      {state.viewMode === "cards" ? (
        <InventoryCardView
          items={allItems}
          locations={locations}
          categories={categories}
          groupBy={state.cardGroupBy}
          sortField={state.cardSortField}
          sortDirection={state.cardSortDirection}
          lowStockOnly={state.lowStockOnly}
          selectedIds={state.selectedIds}
          onToggleSelect={toggleSelectItem}
          onEdit={openEditModal}
          onDelete={(id) => updateState({ confirmDeleteId: id })}
          onCategoryChange={handleInlineCategoryChange}
          canEditPrices={canEditPrices ?? false}
          thumbnailSize={state.thumbnailSize}
        />
      ) : state.viewMode === "grouped" ? (
        <InventoryGroupedView
          groupedData={groupedData}
          total={total}
          selectedIds={state.selectedIds}
          canEditPrices={canEditPrices ?? false}
          locations={locations}
          pendingMinLevels={state.pendingMinLevels}
          pendingPrices={state.pendingPrices}
          pendingLocations={state.pendingLocations}
          onToggleGroupExpanded={toggleGroupExpanded}
          onExpandAllGroups={expandAllGroups}
          onCollapseAllGroups={collapseAllGroups}
          onUpdateSelectedIds={(ids) => updateState({ selectedIds: ids })}
          onToggleSelectItem={toggleSelectItem}
          onEditItem={openEditModal}
          onRequestDelete={(id) => updateState({ confirmDeleteId: id })}
          onMinLevelChange={updatePendingMinLevel}
          onPriceChange={updatePendingPrice}
          onLocationChange={updatePendingLocation}
          minLevelForItem={minLevelForItem}
          priceForItem={priceForItem}
          locationForItem={locationForItem}
        />
      ) : (
        <InventoryListView
          items={items}
          total={total}
          totalPages={totalPages}
          currentPage={state.currentPage}
          pageSize={state.pageSize}
          selectedIds={state.selectedIds}
          canEditPrices={canEditPrices ?? false}
          locations={locations}
          categories={categories}
          pendingMinLevels={state.pendingMinLevels}
          pendingPrices={state.pendingPrices}
          pendingLocations={state.pendingLocations}
          groupByCategory={state.listGroupByCategory}
          onToggleSelectAll={toggleSelectAll}
          onCategoryChange={handleInlineCategoryChange}
          onToggleSelectItem={toggleSelectItem}
          onEditItem={openEditModal}
          onRequestDelete={(id) => updateState({ confirmDeleteId: id })}
          onMinLevelChange={updatePendingMinLevel}
          onPriceChange={updatePendingPrice}
          onLocationChange={updatePendingLocation}
          onChangePageSize={changePageSize}
          onChangePage={(page) => updateState({ currentPage: page })}
          minLevelForItem={minLevelForItem}
          priceForItem={priceForItem}
          locationForItem={locationForItem}
        />
      )}

      <InventoryItemModal
        showModal={state.showModal}
        editingItem={state.editingItem}
        modalForm={state.modalForm}
        isSaving={state.isSaving}
        photoPreview={state.photoPreview}
        locations={locations}
        modalError={state.modalError}
        onUpdateState={updateState}
        onSave={handleSave}
      />

      {state.printPreviewItems !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto print:relative print:overflow-visible">
          <div className="flex items-start justify-center min-h-screen px-4 py-8 print:p-0 print:m-0">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md print:hidden"
              onClick={closePrintPreview}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full print:shadow-none print:max-w-none print:rounded-none">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Print Stock List</h3>
                  <p className="text-sm text-gray-500">{state.printPreviewItems.length} items</p>
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
                      Generated on {formatDateLongZA(nowISO())}
                    </p>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200 print:text-sm">
                    <thead className="bg-gray-50 print:bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:px-2 print:py-1">
                          Roll #
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
                      {state.printPreviewItems
                        .filter((item): item is StockItem => item != null && isObject(item))
                        .map((item) => {
                          const category = item.category;
                          const location = item.location;
                          return (
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
                              <td className="px-4 py-2 text-sm font-mono text-gray-500 print:px-2 print:py-1">
                                <RollNumberCell
                                  rollNumbers={item.rollNumbers}
                                  rollNumber={item.rollNumber}
                                />
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 print:px-2 print:py-1">
                                {item.name}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 print:px-2 print:py-1">
                                {category || "-"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900 print:px-2 print:py-1">
                                {item.quantity}
                                {item.minStockLevel > 0 &&
                                  item.quantity <= item.minStockLevel &&
                                  " *"}
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
                                {location || "-"}
                              </td>
                            </tr>
                          );
                        })}
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
                          {state.printPreviewItems.reduce((sum, i) => sum + i.quantity, 0)}
                        </td>
                        <td className="px-4 py-3 print:px-2 print:py-1" />
                        <td className="px-4 py-3 print:px-2 print:py-1" />
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 print:px-2 print:py-1">
                          {formatZAR(
                            state.printPreviewItems.reduce(
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

      <ConfirmModal
        isOpen={state.confirmDeleteId !== null}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (state.confirmDeleteId !== null) {
            handleDelete(state.confirmDeleteId);
          }
        }}
        onCancel={() => updateState({ confirmDeleteId: null })}
      />
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
