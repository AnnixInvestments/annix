import { isObject } from "es-toolkit/compat";
import Link from "next/link";
import { useState } from "react";
import type { StockControlLocation, StockItem } from "@/app/lib/api/stockControlApi";
import { formatZAR } from "../../lib/currency";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../../lib/useInventoryPageState";
import { InlineCategoryEdit } from "./InlineCategoryEdit";
import { RollNumberCell } from "./RollNumberCell";

interface InventoryListViewProps {
  items: StockItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: PageSize;
  selectedIds: Set<number>;
  canEditPrices: boolean;
  locations: StockControlLocation[];
  pendingMinLevels: Map<number, number>;
  pendingPrices: Map<number, number>;
  pendingLocations: Map<number, number | null>;
  categories?: string[];
  groupByCategory?: boolean;
  onToggleSelectAll: () => void;
  onToggleSelectItem: (id: number) => void;
  onCategoryChange?: (itemId: number, category: string) => void;
  onEditItem: (item: StockItem) => void;
  onRequestDelete: (id: number) => void;
  onMinLevelChange: (itemId: number, value: number) => void;
  onPriceChange: (itemId: number, value: number) => void;
  onLocationChange: (itemId: number, value: number | null) => void;
  onChangePageSize: (size: PageSize) => void;
  onChangePage: (page: number) => void;
  minLevelForItem: (item: StockItem) => number;
  priceForItem: (item: StockItem) => number;
  locationForItem: (item: StockItem) => number | null;
}

function buildCategoryGroups(items: StockItem[]): { category: string; items: StockItem[] }[] {
  const map = new Map<string, StockItem[]>();
  const validItems = items.filter((item): item is StockItem => item != null && isObject(item));
  for (const item of validItems) {
    const category = item.category;
    const cat = category || "Uncategorized";
    const existing = map.get(cat);
    if (existing) {
      existing.push(item);
    } else {
      map.set(cat, [item]);
    }
  }
  const groups = Array.from(map.entries())
    .map(([category, groupItems]) => ({ category, items: groupItems }))
    .sort((a, b) => {
      if (a.category === "Uncategorized") return 1;
      if (b.category === "Uncategorized") return -1;
      return a.category.localeCompare(b.category);
    });
  return groups;
}

export function InventoryListView(props: InventoryListViewProps) {
  const {
    items,
    total,
    totalPages,
    currentPage,
    pageSize,
    selectedIds,
    canEditPrices,
    locations,
    pendingMinLevels,
    pendingPrices,
    pendingLocations,
    categories: categoriesProp,
    groupByCategory,
    onToggleSelectAll,
    onToggleSelectItem,
    onCategoryChange,
    onEditItem,
    onRequestDelete,
    onMinLevelChange,
    onPriceChange,
    onLocationChange,
    onChangePageSize,
    onChangePage,
    minLevelForItem,
    priceForItem,
    locationForItem,
  } = props;

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groups = groupByCategory ? buildCategoryGroups(items) : null;

  return (
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
                    checked={items.length > 0 && items.every((item) => selectedIds.has(item.id))}
                    onChange={onToggleSelectAll}
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
                  className="hidden lg:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Roll #
                </th>
                <th
                  scope="col"
                  className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
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
                  className="hidden lg:table-cell px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
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
              {groups
                ? groups.map((group) => {
                    const isCollapsed = collapsedCategories.has(group.category);
                    return (
                      <CategoryGroup
                        key={group.category}
                        category={group.category}
                        items={group.items}
                        isCollapsed={isCollapsed}
                        onToggle={toggleCategory}
                        selectedIds={selectedIds}
                        canEditPrices={canEditPrices}
                        locations={locations}
                        categories={categoriesProp || []}
                        pendingMinLevels={pendingMinLevels}
                        pendingPrices={pendingPrices}
                        pendingLocations={pendingLocations}
                        onToggleSelectItem={onToggleSelectItem}
                        onEditItem={onEditItem}
                        onRequestDelete={onRequestDelete}
                        onMinLevelChange={onMinLevelChange}
                        onPriceChange={onPriceChange}
                        onLocationChange={onLocationChange}
                        onCategoryChange={onCategoryChange}
                        minLevelForItem={minLevelForItem}
                        priceForItem={priceForItem}
                        locationForItem={locationForItem}
                      />
                    );
                  })
                : items
                    .filter((item): item is StockItem => item != null && isObject(item))
                    .map((item) => (
                      <ListTableRow
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.has(item.id)}
                        canEditPrices={canEditPrices}
                        locations={locations}
                        categories={categoriesProp || []}
                        hasPendingMinLevel={pendingMinLevels.has(item.id)}
                        hasPendingPrice={pendingPrices.has(item.id)}
                        hasPendingLocation={pendingLocations.has(item.id)}
                        onToggleSelect={onToggleSelectItem}
                        onEdit={onEditItem}
                        onRequestDelete={onRequestDelete}
                        onMinLevelChange={onMinLevelChange}
                        onPriceChange={onPriceChange}
                        onLocationChange={onLocationChange}
                        onCategoryChange={onCategoryChange}
                        minLevel={minLevelForItem(item)}
                        price={priceForItem(item)}
                        locationValue={locationForItem(item)}
                      />
                    ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationFooter
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onChangePageSize={onChangePageSize}
        onChangePage={onChangePage}
      />
    </div>
  );
}

interface CategoryGroupProps {
  category: string;
  items: StockItem[];
  isCollapsed: boolean;
  onToggle: (category: string) => void;
  selectedIds: Set<number>;
  canEditPrices: boolean;
  locations: StockControlLocation[];
  categories: string[];
  pendingMinLevels: Map<number, number>;
  pendingPrices: Map<number, number>;
  pendingLocations: Map<number, number | null>;
  onToggleSelectItem: (id: number) => void;
  onEditItem: (item: StockItem) => void;
  onRequestDelete: (id: number) => void;
  onMinLevelChange: (itemId: number, value: number) => void;
  onPriceChange: (itemId: number, value: number) => void;
  onLocationChange: (itemId: number, value: number | null) => void;
  onCategoryChange?: (itemId: number, category: string) => void;
  minLevelForItem: (item: StockItem) => number;
  priceForItem: (item: StockItem) => number;
  locationForItem: (item: StockItem) => number | null;
}

function CategoryGroup(props: CategoryGroupProps) {
  const {
    category,
    items,
    isCollapsed,
    onToggle,
    selectedIds,
    canEditPrices,
    locations,
    categories,
    pendingMinLevels,
    pendingPrices,
    pendingLocations,
    onToggleSelectItem,
    onEditItem,
    onRequestDelete,
    onMinLevelChange,
    onPriceChange,
    onLocationChange,
    onCategoryChange,
    minLevelForItem,
    priceForItem,
    locationForItem,
  } = props;

  const totalQty =
    Math.round(items.reduce((sum, item) => sum + Number(item.quantity), 0) * 100) / 100;

  return (
    <>
      <tr
        className="bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => onToggle(category)}
      >
        <td colSpan={8} className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
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
              <span className="text-sm font-semibold text-gray-800">{category}</span>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <span className="text-xs text-gray-500">Total SOH: {totalQty}</span>
          </div>
        </td>
      </tr>
      {!isCollapsed &&
        items.map((item) => (
          <ListTableRow
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            canEditPrices={canEditPrices}
            locations={locations}
            categories={categories}
            hasPendingMinLevel={pendingMinLevels.has(item.id)}
            hasPendingPrice={pendingPrices.has(item.id)}
            hasPendingLocation={pendingLocations.has(item.id)}
            onToggleSelect={onToggleSelectItem}
            onEdit={onEditItem}
            onRequestDelete={onRequestDelete}
            onMinLevelChange={onMinLevelChange}
            onPriceChange={onPriceChange}
            onLocationChange={onLocationChange}
            onCategoryChange={onCategoryChange}
            minLevel={minLevelForItem(item)}
            price={priceForItem(item)}
            locationValue={locationForItem(item)}
          />
        ))}
    </>
  );
}

interface ListTableRowProps {
  item: StockItem;
  isSelected: boolean;
  canEditPrices: boolean;
  locations: StockControlLocation[];
  categories: string[];
  hasPendingMinLevel: boolean;
  hasPendingPrice: boolean;
  hasPendingLocation: boolean;
  minLevel: number;
  price: number;
  locationValue: number | null;
  onToggleSelect: (id: number) => void;
  onEdit: (item: StockItem) => void;
  onRequestDelete: (id: number) => void;
  onMinLevelChange: (itemId: number, value: number) => void;
  onPriceChange: (itemId: number, value: number) => void;
  onLocationChange: (itemId: number, value: number | null) => void;
  onCategoryChange?: (itemId: number, category: string) => void;
}

function ListTableRow({
  item,
  isSelected,
  canEditPrices,
  locations,
  categories,
  hasPendingMinLevel,
  hasPendingPrice,
  hasPendingLocation,
  minLevel,
  price,
  locationValue,
  onToggleSelect,
  onEdit,
  onRequestDelete,
  onMinLevelChange,
  onPriceChange,
  onLocationChange,
  onCategoryChange,
}: ListTableRowProps) {
  const rowClassName = item.needsQrPrint
    ? "bg-red-50 hover:bg-red-100"
    : item.minStockLevel > 0 && item.quantity <= item.minStockLevel
      ? "bg-amber-50 hover:bg-amber-100"
      : "hover:bg-gray-50";

  return (
    <tr className={rowClassName}>
      <td className="px-4 py-4 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
      </td>
      <td className="hidden sm:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
        {item.sku}
      </td>
      <td className="hidden lg:table-cell px-3 lg:px-6 py-4 text-sm font-mono text-gray-500">
        <RollNumberCell rollNumbers={item.rollNumbers} rollNumber={item.rollNumber} />
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
        <span className="sm:hidden block text-xs text-gray-500 font-mono mt-0.5">{item.sku}</span>
        {onCategoryChange && (
          <div className="mt-0.5">
            <InlineCategoryEdit
              itemId={item.id}
              currentCategory={item.category}
              categories={categories}
              onCategoryChange={onCategoryChange}
            />
          </div>
        )}
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
          value={minLevel}
          onChange={(e) => onMinLevelChange(item.id, parseInt(e.target.value, 10) || 0)}
          className={`w-16 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
            hasPendingMinLevel ? "border-teal-500 bg-teal-50" : "border-gray-300"
          }`}
        />
      </td>
      <td className="hidden md:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-right">
        {canEditPrices ? (
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => onPriceChange(item.id, parseFloat(e.target.value) || 0)}
            className={`w-24 rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right ${
              hasPendingPrice ? "border-green-500 bg-green-50" : "border-gray-300"
            }`}
          />
        ) : (
          <span className="text-gray-900">{formatZAR(item.costPerUnit)}</span>
        )}
      </td>
      <td className="hidden lg:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm">
        <select
          value={locationValue || ""}
          onChange={(e) =>
            onLocationChange(item.id, e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className={`w-full rounded-md shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm ${
            hasPendingLocation ? "border-blue-500 bg-blue-50" : "border-gray-300"
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
          onClick={() => onEdit(item)}
          className="text-teal-600 hover:text-teal-900 mr-2 lg:mr-3"
        >
          Edit
        </button>
        <button
          onClick={() => onRequestDelete(item.id)}
          className="text-red-600 hover:text-red-900"
        >
          Del
        </button>
      </td>
    </tr>
  );
}

interface PaginationFooterProps {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: PageSize;
  onChangePageSize: (size: PageSize) => void;
  onChangePage: (page: number) => void;
}

function PaginationFooter({
  total,
  totalPages,
  currentPage,
  pageSize,
  onChangePageSize,
  onChangePage,
}: PaginationFooterProps) {
  return (
    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="text-sm text-gray-700 text-center sm:text-left">
        {pageSize > 0 ? (
          <>
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, total)}{" "}
            of {total} items
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
              onClick={() => onChangePageSize(size)}
              className={`px-2 py-1 text-sm rounded-md ${
                pageSize === size
                  ? "bg-teal-600 text-white"
                  : "border text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {size === 0 ? "All" : size}
            </button>
          ))}
        </div>
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangePage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => onChangePage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 text-sm border rounded-md text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
