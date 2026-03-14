"use client";

import type { StockItem } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA, nowISO } from "@/app/lib/datetime";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { InventoryCardView } from "../../components/InventoryCardView";
import { InventoryFilterBar } from "../../components/inventory/InventoryFilterBar";
import { InventoryGroupedView } from "../../components/inventory/InventoryGroupedView";
import { InventoryImportOverlay } from "../../components/inventory/InventoryImportOverlay";
import { InventoryItemModal } from "../../components/inventory/InventoryItemModal";
import { InventoryListView } from "../../components/inventory/InventoryListView";
import { InventoryLocationTabs } from "../../components/inventory/InventoryLocationTabs";
import { InventoryPendingChanges } from "../../components/inventory/InventoryPendingChanges";
import { InventoryToolbar } from "../../components/inventory/InventoryToolbar";
import { formatZAR } from "../../lib/currency";
import { useInventoryPageState } from "../../lib/useInventoryPageState";

export default function InventoryPage() {
  const inv = useInventoryPageState();
  const {
    canEditPrices,
    state,
    updateState,
    printDropdownRef,
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
      <InventoryImportOverlay
        isDragging={state.isDragging}
        importStep={state.importStep}
        importFileName={state.importFile?.name || null}
        importFormat={state.importFormat}
        importHeaders={state.importHeaders}
        importRawRows={state.importRawRows}
        importMapping={state.importMapping}
        importError={state.importError}
        importResult={state.importResult}
        parsedRows={state.parsedRows}
        isStockTakeMode={state.isStockTakeMode}
        isPrintingLabels={state.isPrintingLabels}
        onStockTakeModeChange={(checked) => updateState({ isStockTakeMode: checked })}
        onConfirmImport={handleConfirmImport}
        onDismissImport={dismissImport}
        onClearImportError={() => updateState({ importError: null })}
      />

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
      />

      <InventoryLocationTabs
        locations={locations}
        locationFilter={state.locationFilter}
        total={total}
        groupedData={groupedData}
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
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onChangeViewMode={changeViewMode}
        onChangeThumbSize={changeThumbSize}
        onUpdateCardGroupBy={(value) => updateState({ cardGroupBy: value })}
        onUpdateCardSort={(field, direction) =>
          updateState({ cardSortField: field, cardSortDirection: direction })
        }
        onToggleLowStockOnly={() => updateState({ lowStockOnly: !state.lowStockOnly })}
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
          pendingMinLevels={state.pendingMinLevels}
          pendingPrices={state.pendingPrices}
          pendingLocations={state.pendingLocations}
          onToggleSelectAll={toggleSelectAll}
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
        onUpdateState={updateState}
        onSave={handleSave}
      />

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
