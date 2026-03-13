"use client";

import Link from "next/link";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA, nowISO } from "@/app/lib/datetime";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { HelpTooltip } from "../../components/HelpTooltip";
import {
  type GroupByOption,
  InventoryCardView,
  type SortDirection,
  type SortField,
} from "../../components/InventoryCardView";
import { formatZAR } from "../../lib/currency";
import {
  PAGE_SIZE_OPTIONS,
  isRandColumn,
  isImportRowBlank,
  isImportSectionTitle,
  formatRandCell,
  useInventoryPageState,
} from "../../lib/useInventoryPageState";

export default function InventoryPage() {
  const inv = useInventoryPageState();
  const {
    canEditPrices,
    state,
    updateState,
    printDropdownRef,
    isGroupedView,
    isLoading,
    error,
    items,
    total,
    totalPages,
    categories,
    locations,
    groupedData,
    allItems,
    changeViewMode,
    changeThumbSize,
    changePageSize,
    handleSearch,
    handleCategoryChange,
    handleLocationChange,
    toggleGroupExpanded,
    expandAllGroups,
    collapseAllGroups,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    toggleSelectItem,
    toggleSelectAll,
    handlePrintStockList,
    handlePrintPreviewPrint,
    closePrintPreview,
    handlePrintSelected,
    handlePrintAll,
    updatePendingMinLevel,
    clearAllPendingMinLevels,
    saveAllMinLevels,
    minLevelForItem,
    priceForItem,
    locationForItem,
    updatePendingPrice,
    updatePendingLocation,
    clearAllPendingPrices,
    clearAllPendingLocations,
    saveAllPrices,
    saveAllLocations,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleConfirmImport,
    dismissImport,
  } = inv;

  if (isLoading && items.length === 0 && groupedData.length === 0) {
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
      className="space-y-6 relative w-full max-w-full overflow-x-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {state.isDragging && (
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

      {state.importStep === "parsing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Parsing {state.importFile?.name}...</p>
          </div>
        </div>
      )}

      {state.importStep === "preview" && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500/75" onClick={dismissImport}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Import Preview</h3>
                  <p className="text-sm text-gray-500">
                    {state.importFile?.name} -{" "}
                    {state.importFormat === "excel"
                      ? state.importRawRows.filter((r) => !isImportRowBlank(r)).length
                      : state.parsedRows.length}{" "}
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
                      state.importFormat === "excel"
                        ? state.importRawRows.length === 0
                        : state.parsedRows.length === 0
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    Confirm Import (
                    {state.importFormat === "excel"
                      ? state.importRawRows.filter((r) => !isImportRowBlank(r)).length
                      : state.parsedRows.length}{" "}
                    rows)
                  </button>
                </div>
              </div>
              <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.isStockTakeMode}
                    onChange={(e) => updateState({ isStockTakeMode: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-amber-800">Monthly Stock Take</span>
                    <p className="text-xs text-amber-600">
                      Overwrites quantities instead of adding. New items will be highlighted until
                      labels are printed.
                    </p>
                  </div>
                </label>
              </div>
              {state.importMapping && (
                <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    AI mapped columns:{" "}
                    {Object.entries(state.importMapping)
                      .filter(([, v]) => v !== null)
                      .map(
                        ([field, colIdx]) =>
                          `${field} -> "${state.importHeaders[colIdx as number]}"`,
                      )
                      .join(", ") || "No columns mapped"}
                  </p>
                </div>
              )}
              {state.importError && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{state.importError}</p>
                </div>
              )}
              <div className="overflow-x-auto max-h-96">
                {state.importFormat === "excel" ? (
                  (() => {
                    const headersEmpty = state.importHeaders.every((h) => h.trim() === "");
                    const effectiveHeaders = headersEmpty
                      ? state.importRawRows[0] || []
                      : state.importHeaders;
                    const effectiveDataRows = headersEmpty
                      ? state.importRawRows.slice(1)
                      : state.importRawRows;
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
                                    const cell = row[colIdx] || "";
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
                        {state.parsedRows.length > 0 &&
                          Object.keys(state.parsedRows[0]).map((header) => (
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
                      {state.parsedRows.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          {Object.keys(state.parsedRows[0]).map((header) => (
                            <td key={header} className="px-4 py-3 text-sm text-gray-900">
                              {String(row[header] || "")}
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

      {state.importStep === "importing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Importing items...</p>
          </div>
        </div>
      )}

      {state.importStep === "result" && state.importResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500/75" onClick={dismissImport}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {state.importResult.created}
                  </div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {state.importResult.updated}
                  </div>
                  <div className="text-sm text-blue-600">Updated</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {state.importResult.errors.length}
                  </div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>
              {state.importResult.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto space-y-1">
                  {state.importResult.errors.map((err, index) => (
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

      {state.isPrintingLabels && (
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

      {state.importError && state.importStep === "idle" && (
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
            <p className="text-sm text-red-700">{state.importError}</p>
          </div>
          <button
            onClick={() => updateState({ importError: null })}
            className="text-red-400 hover:text-red-600"
          >
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
          <p className="mt-1 text-lg font-semibold text-gray-800">
            Total SOH <HelpTooltip term="SOH" /> Value:{" "}
            {formatZAR(
              state.viewMode === "grouped" || state.viewMode === "cards"
                ? groupedData.reduce(
                    (total, group) =>
                      total + group.items.reduce((sum, i) => sum + i.costPerUnit * i.quantity, 0),
                    0,
                  )
                : allItems.reduce((sum, i) => sum + i.costPerUnit * i.quantity, 0),
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrintAll}
            disabled={state.isPrintingLabels}
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
            {state.isPrintingLabels ? "Printing..." : "Print All Labels"}
          </button>
          <div className="relative" ref={printDropdownRef}>
            <button
              onClick={() => updateState({ showPrintDropdown: !state.showPrintDropdown })}
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
            {state.showPrintDropdown && (
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
                    disabled={state.selectedIds.size === 0}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Print Selected ({state.selectedIds.size})
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

      {locations.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => handleLocationChange("")}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              state.locationFilter === ""
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Locations
            <span className="ml-1.5 text-xs opacity-80">{total}</span>
          </button>
          {locations.map((loc) => {
            const locItemCount =
              groupedData.find((g) => g.locationId === loc.id)?.items.length ?? 0;
            return (
              <button
                key={loc.id}
                onClick={() => handleLocationChange(String(loc.id))}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  state.locationFilter === loc.id
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {loc.name}
                <span className="ml-1.5 text-xs opacity-80">{locItemCount}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            <input
              type="text"
              placeholder="Search items..."
              value={state.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-10 rounded-md bg-white border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={state.categoryFilter}
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
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => changeViewMode("cards")}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                state.viewMode === "cards"
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              title="Card view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
            </button>
            <button
              onClick={() => changeViewMode("grouped")}
              className={`px-3 py-2 text-sm font-medium border-t border-r border-b ${
                state.viewMode === "grouped"
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
              onClick={() => changeViewMode("list")}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                state.viewMode === "list"
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
          {state.viewMode === "cards" && (
            <div className="flex items-center rounded-md shadow-sm border border-gray-300">
              {(["S", "M", "L", "XL"] as const).map((size, idx) => (
                <button
                  key={size}
                  onClick={() => changeThumbSize(size)}
                  className={`px-2.5 py-2 text-xs font-semibold transition-colors ${
                    state.thumbnailSize === size
                      ? "bg-teal-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  } ${idx === 0 ? "rounded-l-md" : ""} ${idx === 3 ? "rounded-r-md" : ""} ${idx > 0 ? "border-l border-gray-300" : ""}`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {state.viewMode === "cards" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <select
            value={state.cardGroupBy}
            onChange={(e) => updateState({ cardGroupBy: e.target.value as GroupByOption })}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          >
            <option value="none">No Grouping</option>
            <option value="location">Group by Location</option>
            <option value="category">Group by Category</option>
            <option value="stockLevel">Group by Stock Level</option>
          </select>
          <select
            value={`${state.cardSortField}-${state.cardSortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-") as [SortField, SortDirection];
              updateState({ cardSortField: field, cardSortDirection: dir });
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="quantity-asc">Quantity Low-High</option>
            <option value="quantity-desc">Quantity High-Low</option>
            <option value="stockLevel-asc">Stock Level (Critical First)</option>
            <option value="stockLevel-desc">Stock Level (Healthy First)</option>
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="updatedAt-asc">Oldest Updated</option>
          </select>
          <button
            onClick={() => updateState({ lowStockOnly: !state.lowStockOnly })}
            className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
              state.lowStockOnly
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg
              className={`w-4 h-4 mr-1.5 ${state.lowStockOnly ? "text-amber-600" : "text-gray-400"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Low Stock Only
          </button>
        </div>
      )}

      {state.selectedIds.size > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-medium text-teal-800">
            {state.selectedIds.size} item{state.selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateState({ selectedIds: new Set() })}
              className="text-sm text-teal-700 hover:text-teal-900"
            >
              Clear
            </button>
            <button
              onClick={handlePrintSelected}
              disabled={state.isPrintingLabels}
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
              {state.isPrintingLabels ? "Printing..." : "Print Labels"}
            </button>
          </div>
        </div>
      )}

      {state.pendingMinLevels.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-medium text-amber-800">
            {state.pendingMinLevels.size} unsaved min level change
            {state.pendingMinLevels.size !== 1 ? "s" : ""}
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
              disabled={state.isSavingMinLevels}
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
              {state.isSavingMinLevels ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
      )}

      {state.pendingPrices.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-medium text-green-800">
            {state.pendingPrices.size} unsaved price change
            {state.pendingPrices.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={clearAllPendingPrices}
              className="text-sm text-green-700 hover:text-green-900"
            >
              Discard Changes
            </button>
            <button
              onClick={saveAllPrices}
              disabled={state.isSavingPrices}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {state.isSavingPrices ? "Saving..." : "Save Price Changes"}
            </button>
          </div>
        </div>
      )}

      {state.pendingLocations.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-sm font-medium text-blue-800">
            {state.pendingLocations.size} unsaved location change
            {state.pendingLocations.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={clearAllPendingLocations}
              className="text-sm text-blue-700 hover:text-blue-900"
            >
              Discard Changes
            </button>
            <button
              onClick={saveAllLocations}
              disabled={state.isSavingLocations}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {state.isSavingLocations ? "Saving..." : "Save Location Changes"}
            </button>
          </div>
        </div>
      )}

      {(state.viewMode === "grouped" || state.viewMode === "cards") && groupedData.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {groupedData.length} location{groupedData.length !== 1 ? "s" : ""}, {total} items total
          </span>
          <div className="flex items-center space-x-2">
            <button onClick={expandAllGroups} className="text-sm text-teal-600 hover:text-teal-800">
              Expand All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={collapseAllGroups}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {state.viewMode === "cards" ? (
        <InventoryCardView
          items={allItems}
          locations={locations}
          groupBy={state.cardGroupBy}
          sortField={state.cardSortField}
          sortDirection={state.cardSortDirection}
          lowStockOnly={state.lowStockOnly}
          selectedIds={state.selectedIds}
          onToggleSelect={toggleSelectItem}
          onEdit={openEditModal}
          onDelete={(id) => updateState({ confirmDeleteId: id })}
          canEditPrices={canEditPrices ?? false}
          thumbnailSize={state.thumbnailSize}
        />
      ) : state.viewMode === "grouped" ? (
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
            groupedData.map((group) => {
              const groupLocId = group.locationId;
              const isUnassigned = groupLocId === null;
              return (
                <div
                  key={groupLocId ?? "no-location"}
                  className="bg-white shadow rounded-lg overflow-x-auto"
                >
                  <button
                    onClick={() => toggleGroupExpanded(groupLocId)}
                    className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                      isUnassigned
                        ? "bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-400"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        className={`w-5 h-5 transition-transform ${isUnassigned ? "text-amber-500" : "text-gray-500"} ${group.expanded ? "rotate-90" : ""}`}
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
                      <span
                        className={`font-semibold ${isUnassigned ? "text-amber-800" : "text-gray-900"}`}
                      >
                        {group.locationName}
                      </span>
                      <span
                        className={`text-sm ${isUnassigned ? "text-amber-600" : "text-gray-500"}`}
                      >
                        ({group.items.length} item{group.items.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <span
                      className={`text-sm ${isUnassigned ? "text-amber-700" : "text-gray-600"}`}
                    >
                      {formatZAR(
                        group.items.reduce((sum, i) => sum + i.costPerUnit * i.quantity, 0),
                      )}
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
                                  group.items.every((item) => state.selectedIds.has(item.id))
                                }
                                onChange={() => {
                                  const groupIds = group.items.map((item) => item.id);
                                  const allSelected = groupIds.every((id) =>
                                    state.selectedIds.has(id),
                                  );
                                  if (allSelected) {
                                    updateState({
                                      selectedIds: new Set(
                                        [...state.selectedIds].filter(
                                          (id) => !groupIds.includes(id),
                                        ),
                                      ),
                                    });
                                  } else {
                                    updateState({
                                      selectedIds: new Set([...state.selectedIds, ...groupIds]),
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
                              SOH <HelpTooltip term="SOH" />
                            </th>
                            <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Min
                            </th>
                            <th className="hidden md:table-cell px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                            <th className="hidden lg:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="hidden xl:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.items
                            .filter(
                              (item): item is StockItem => item != null && typeof item === "object",
                            )
                            .map((item) => (
                              <tr
                                key={item.id}
                                className={
                                  item.needsQrPrint
                                    ? "bg-red-50 hover:bg-red-100"
                                    : item.minStockLevel > 0 && item.quantity <= item.minStockLevel
                                      ? "bg-amber-50 hover:bg-amber-100"
                                      : "hover:bg-gray-50"
                                }
                              >
                                <td className="px-4 py-4 w-10">
                                  <input
                                    type="checkbox"
                                    checked={state.selectedIds.has(item.id)}
                                    onChange={() => toggleSelectItem(item.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                  />
                                </td>
                                <td className="hidden sm:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                  {item.sku}
                                </td>
                                <td className="px-3 lg:px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    <Link
                                      href={`/stock-control/portal/inventory/${item.id}`}
                                      className="text-sm font-medium text-teal-700 hover:text-teal-900 break-words"
                                    >
                                      {item.name}
                                    </Link>
                                    {item.needsQrPrint && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                  <span className="sm:hidden block text-xs text-gray-500 font-mono mt-0.5">
                                    {item.sku}
                                  </span>
                                </td>
                                <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                  {item.quantity}
                                  {item.minStockLevel > 0 &&
                                    item.quantity <= item.minStockLevel && (
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
                                      updatePendingMinLevel(
                                        item.id,
                                        parseInt(e.target.value, 10) || 0,
                                      )
                                    }
                                    className={`w-16 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
                                      state.pendingMinLevels.has(item.id)
                                        ? "border-teal-500 bg-teal-50"
                                        : "border-gray-300"
                                    }`}
                                  />
                                </td>
                                <td className="hidden md:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right">
                                  {canEditPrices ? (
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={priceForItem(item)}
                                      onChange={(e) =>
                                        updatePendingPrice(item.id, parseFloat(e.target.value) || 0)
                                      }
                                      className={`w-24 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
                                        state.pendingPrices.has(item.id)
                                          ? "border-green-500 bg-green-50"
                                          : "border-gray-300"
                                      }`}
                                    />
                                  ) : (
                                    <span className="text-gray-900">
                                      {formatZAR(item.costPerUnit)}
                                    </span>
                                  )}
                                </td>
                                <td className="hidden lg:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {item.category || "-"}
                                </td>
                                <td className="hidden xl:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm">
                                  <select
                                    value={locationForItem(item) || ""}
                                    onChange={(e) =>
                                      updatePendingLocation(
                                        item.id,
                                        e.target.value ? parseInt(e.target.value, 10) : null,
                                      )
                                    }
                                    className={`w-full rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm ${
                                      state.pendingLocations.has(item.id)
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    <option value="">-</option>
                                    {locations.map((loc) => (
                                      <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm">
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="text-teal-600 hover:text-teal-900 mr-2 lg:mr-3"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => updateState({ confirmDeleteId: item.id })}
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
              );
            })
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
                          items.length > 0 && items.every((item) => state.selectedIds.has(item.id))
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
                  {items
                    .filter((item): item is StockItem => item != null && typeof item === "object")
                    .map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.needsQrPrint
                            ? "bg-red-50 hover:bg-red-100"
                            : item.minStockLevel > 0 && item.quantity <= item.minStockLevel
                              ? "bg-amber-50 hover:bg-amber-100"
                              : "hover:bg-gray-50"
                        }
                      >
                        <td className="px-4 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={state.selectedIds.has(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="hidden sm:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {item.sku}
                        </td>
                        <td className="px-3 lg:px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/stock-control/portal/inventory/${item.id}`}
                              className="text-sm font-medium text-teal-700 hover:text-teal-900 break-words"
                            >
                              {item.name}
                            </Link>
                            {item.needsQrPrint && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                NEW
                              </span>
                            )}
                          </div>
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
                              state.pendingMinLevels.has(item.id)
                                ? "border-teal-500 bg-teal-50"
                                : "border-gray-300"
                            }`}
                          />
                        </td>
                        <td className="hidden md:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right">
                          {canEditPrices ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={priceForItem(item)}
                              onChange={(e) =>
                                updatePendingPrice(item.id, parseFloat(e.target.value) || 0)
                              }
                              className={`w-24 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
                                state.pendingPrices.has(item.id)
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-300"
                              }`}
                            />
                          ) : (
                            <span className="text-gray-900">{formatZAR(item.costPerUnit)}</span>
                          )}
                        </td>
                        <td className="hidden xl:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={locationForItem(item) || ""}
                            onChange={(e) =>
                              updatePendingLocation(
                                item.id,
                                e.target.value ? parseInt(e.target.value, 10) : null,
                              )
                            }
                            className={`w-full rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm ${
                              state.pendingLocations.has(item.id)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">-</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-teal-600 hover:text-teal-900 mr-2 lg:mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => updateState({ confirmDeleteId: item.id })}
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

          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              {state.pageSize > 0 ? (
                <>
                  Showing {state.currentPage * state.pageSize + 1} to{" "}
                  {Math.min((state.currentPage + 1) * state.pageSize, total)} of {total} items
                </>
              ) : (
                <>Showing all {total} items</>
              )}
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600">Rows:</span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      changePageSize(size);
                    }}
                    className={`px-2 py-1 text-sm rounded-md ${
                      state.pageSize === size
                        ? "bg-teal-600 text-white"
                        : "border text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {size === 0 ? "All" : size}
                  </button>
                ))}
              </div>
              {state.pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateState({ currentPage: Math.max(0, state.currentPage - 1) })}
                    disabled={state.currentPage === 0}
                    className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {state.currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      updateState({ currentPage: Math.min(totalPages - 1, state.currentPage + 1) })
                    }
                    disabled={state.currentPage >= totalPages - 1}
                    className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {state.showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => updateState({ showModal: false })}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {state.editingItem ? "Edit Stock Item" : "Add Stock Item"}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      value={state.modalForm.sku}
                      onChange={(e) =>
                        updateState({ modalForm: { ...state.modalForm, sku: e.target.value } })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={state.modalForm.name}
                      onChange={(e) =>
                        updateState({ modalForm: { ...state.modalForm, name: e.target.value } })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={state.modalForm.description}
                    onChange={(e) =>
                      updateState({
                        modalForm: { ...state.modalForm, description: e.target.value },
                      })
                    }
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={state.modalForm.category}
                      onChange={(e) =>
                        updateState({ modalForm: { ...state.modalForm, category: e.target.value } })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={state.modalForm.unitOfMeasure}
                      onChange={(e) =>
                        updateState({
                          modalForm: { ...state.modalForm, unitOfMeasure: e.target.value },
                        })
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
                      value={state.modalForm.costPerUnit}
                      onChange={(e) =>
                        updateState({
                          modalForm: {
                            ...state.modalForm,
                            costPerUnit: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      value={state.modalForm.quantity}
                      onChange={(e) =>
                        updateState({
                          modalForm: {
                            ...state.modalForm,
                            quantity: parseInt(e.target.value, 10) || 0,
                          },
                        })
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
                      value={state.modalForm.minStockLevel}
                      onChange={(e) =>
                        updateState({
                          modalForm: {
                            ...state.modalForm,
                            minStockLevel: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    value={state.modalForm.locationId != null ? state.modalForm.locationId : ""}
                    onChange={(e) =>
                      updateState({
                        modalForm: {
                          ...state.modalForm,
                          locationId: e.target.value ? parseInt(e.target.value, 10) : null,
                        },
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <div className="flex items-center gap-4">
                    {state.photoPreview ? (
                      <div className="relative h-20 w-20 shrink-0">
                        <img
                          src={state.photoPreview}
                          alt="Item photo"
                          className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            updateState({ photoFile: null, photoPreview: null });
                          }}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {state.photoPreview ? "Change Photo" : "Add Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              updateState({
                                photoFile: file,
                                photoPreview: URL.createObjectURL(file),
                              });
                            }
                          }}
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => updateState({ showModal: false })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={state.isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {state.isSaving ? "Saving..." : state.editingItem ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.printPreviewItems !== null && (
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
                        .filter(
                          (item): item is StockItem => item != null && typeof item === "object",
                        )
                        .map((item) => (
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

      <ConfirmDialog
        open={state.confirmDeleteId !== null}
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
    </div>
  );
}
