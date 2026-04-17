import { isObject } from "es-toolkit/compat";
import Link from "next/link";
import type { StockControlLocation, StockItem } from "@/app/lib/api/stockControlApi";
import { formatZAR } from "../../lib/currency";
import type { LocationGroup } from "../../lib/useInventoryPageState";
import { HelpTooltip } from "../HelpTooltip";

interface InventoryGroupedViewProps {
  groupedData: LocationGroup[];
  total: number;
  selectedIds: Set<number>;
  canEditPrices: boolean;
  locations: StockControlLocation[];
  pendingMinLevels: Map<number, number>;
  pendingPrices: Map<number, number>;
  pendingLocations: Map<number, number | null>;
  onToggleGroupExpanded: (locationId: number | null) => void;
  onExpandAllGroups: () => void;
  onCollapseAllGroups: () => void;
  onUpdateSelectedIds: (ids: Set<number>) => void;
  onToggleSelectItem: (id: number) => void;
  onEditItem: (item: StockItem) => void;
  onRequestDelete: (id: number) => void;
  onMinLevelChange: (itemId: number, value: number) => void;
  onPriceChange: (itemId: number, value: number) => void;
  onLocationChange: (itemId: number, value: number | null) => void;
  minLevelForItem: (item: StockItem) => number;
  priceForItem: (item: StockItem) => number;
  locationForItem: (item: StockItem) => number | null;
}

export function InventoryGroupedView({
  groupedData,
  total,
  selectedIds,
  canEditPrices,
  locations,
  pendingMinLevels,
  pendingPrices,
  pendingLocations,
  onToggleGroupExpanded,
  onExpandAllGroups,
  onCollapseAllGroups,
  onUpdateSelectedIds,
  onToggleSelectItem,
  onEditItem,
  onRequestDelete,
  onMinLevelChange,
  onPriceChange,
  onLocationChange,
  minLevelForItem,
  priceForItem,
  locationForItem,
}: InventoryGroupedViewProps) {
  return (
    <>
      {groupedData.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {groupedData.length} location{groupedData.length !== 1 ? "s" : ""}, {total} items total
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onExpandAllGroups}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              Expand All
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={onCollapseAllGroups}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {groupedData.length === 0 ? (
          <EmptyState />
        ) : (
          groupedData.map((group) => {
            const locationId = group.locationId;
            return (
              <LocationGroupCard
                key={locationId || "no-location"}
                group={group}
                selectedIds={selectedIds}
                canEditPrices={canEditPrices}
                locations={locations}
                pendingMinLevels={pendingMinLevels}
                pendingPrices={pendingPrices}
                pendingLocations={pendingLocations}
                onToggleGroupExpanded={onToggleGroupExpanded}
                onUpdateSelectedIds={onUpdateSelectedIds}
                onToggleSelectItem={onToggleSelectItem}
                onEditItem={onEditItem}
                onRequestDelete={onRequestDelete}
                onMinLevelChange={onMinLevelChange}
                onPriceChange={onPriceChange}
                onLocationChange={onLocationChange}
                minLevelForItem={minLevelForItem}
                priceForItem={priceForItem}
                locationForItem={locationForItem}
              />
            );
          })
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
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
  );
}

interface LocationGroupCardProps {
  group: LocationGroup;
  selectedIds: Set<number>;
  canEditPrices: boolean;
  locations: StockControlLocation[];
  pendingMinLevels: Map<number, number>;
  pendingPrices: Map<number, number>;
  pendingLocations: Map<number, number | null>;
  onToggleGroupExpanded: (locationId: number | null) => void;
  onUpdateSelectedIds: (ids: Set<number>) => void;
  onToggleSelectItem: (id: number) => void;
  onEditItem: (item: StockItem) => void;
  onRequestDelete: (id: number) => void;
  onMinLevelChange: (itemId: number, value: number) => void;
  onPriceChange: (itemId: number, value: number) => void;
  onLocationChange: (itemId: number, value: number | null) => void;
  minLevelForItem: (item: StockItem) => number;
  priceForItem: (item: StockItem) => number;
  locationForItem: (item: StockItem) => number | null;
}

function LocationGroupCard({
  group,
  selectedIds,
  canEditPrices,
  locations,
  pendingMinLevels,
  pendingPrices,
  pendingLocations,
  onToggleGroupExpanded,
  onUpdateSelectedIds,
  onToggleSelectItem,
  onEditItem,
  onRequestDelete,
  onMinLevelChange,
  onPriceChange,
  onLocationChange,
  minLevelForItem,
  priceForItem,
  locationForItem,
}: LocationGroupCardProps) {
  const groupLocId = group.locationId;
  const isUnassigned = groupLocId === null;

  const handleGroupCheckbox = () => {
    const groupIds = group.items.map((item) => item.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      onUpdateSelectedIds(new Set([...selectedIds].filter((id) => !groupIds.includes(id))));
    } else {
      onUpdateSelectedIds(new Set([...selectedIds, ...groupIds]));
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-x-auto">
      <button
        onClick={() => onToggleGroupExpanded(groupLocId)}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className={`font-semibold ${isUnassigned ? "text-amber-800" : "text-gray-900"}`}>
            {group.locationName}
          </span>
          <span className={`text-sm ${isUnassigned ? "text-amber-600" : "text-gray-500"}`}>
            ({group.items.length} item{group.items.length !== 1 ? "s" : ""})
          </span>
        </div>
        <span className={`text-sm ${isUnassigned ? "text-amber-700" : "text-gray-600"}`}>
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
                    onChange={handleGroupCheckbox}
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
                .filter((item): item is StockItem => item != null && isObject(item))
                .map((item) => (
                  <GroupedTableRow
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    canEditPrices={canEditPrices}
                    locations={locations}
                    hasPendingMinLevel={pendingMinLevels.has(item.id)}
                    hasPendingPrice={pendingPrices.has(item.id)}
                    hasPendingLocation={pendingLocations.has(item.id)}
                    onToggleSelect={onToggleSelectItem}
                    onEdit={onEditItem}
                    onRequestDelete={onRequestDelete}
                    onMinLevelChange={onMinLevelChange}
                    onPriceChange={onPriceChange}
                    onLocationChange={onLocationChange}
                    minLevel={minLevelForItem(item)}
                    price={priceForItem(item)}
                    locationValue={locationForItem(item)}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface GroupedTableRowProps {
  item: StockItem;
  isSelected: boolean;
  canEditPrices: boolean;
  locations: StockControlLocation[];
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
}

function GroupedTableRow({
  item,
  isSelected,
  canEditPrices,
  locations,
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
}: GroupedTableRowProps) {
  const category = item.category;
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
      <td className="hidden lg:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {category || "-"}
      </td>
      <td className="hidden xl:table-cell px-3 lg:px-6 py-4 whitespace-nowrap text-sm">
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
