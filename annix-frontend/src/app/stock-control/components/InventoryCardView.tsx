"use client";

import Link from "next/link";
import type { StockControlLocation, StockItem } from "@/app/lib/api/stockControlApi";

type SortField = "name" | "quantity" | "stockLevel" | "updatedAt";
type SortDirection = "asc" | "desc";
type GroupByOption = "location" | "category" | "stockLevel" | "none";
type StockLevelStatus = "critical" | "low" | "healthy";
type ThumbnailSize = "S" | "M" | "L" | "XL";

interface InventoryCardViewProps {
  items: StockItem[];
  locations: StockControlLocation[];
  groupBy: GroupByOption;
  sortField: SortField;
  sortDirection: SortDirection;
  lowStockOnly: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onEdit: (item: StockItem) => void;
  onDelete: (id: number) => void;
  canEditPrices: boolean;
  thumbnailSize: ThumbnailSize;
}

const AMBER_THRESHOLD_PCT = 20;

function stockLevelStatus(item: StockItem): StockLevelStatus {
  if (item.minStockLevel <= 0) return "healthy";
  if (item.quantity <= item.minStockLevel) return "critical";
  const amberThreshold = item.minStockLevel * (1 + AMBER_THRESHOLD_PCT / 100);
  if (item.quantity <= amberThreshold) return "low";
  return "healthy";
}

function stockLevelLabel(status: StockLevelStatus): string {
  if (status === "critical") return "Below Min";
  if (status === "low") return "Low";
  return "OK";
}

function stockLevelColor(status: StockLevelStatus): {
  dot: string;
  bg: string;
  text: string;
  bar: string;
} {
  if (status === "critical") {
    return {
      dot: "bg-red-500",
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      bar: "bg-red-500",
    };
  }
  if (status === "low") {
    return {
      dot: "bg-amber-500",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      bar: "bg-amber-500",
    };
  }
  return {
    dot: "bg-green-500",
    bg: "bg-white border-gray-200",
    text: "text-green-700",
    bar: "bg-green-500",
  };
}

function stockLevelPct(item: StockItem): number {
  if (item.minStockLevel <= 0) return 100;
  const maxLevel = item.minStockLevel * 3;
  const pct = Math.min(100, Math.round((item.quantity / maxLevel) * 100));
  return Math.max(2, pct);
}

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

function staffInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function sortItems(items: StockItem[], field: SortField, direction: SortDirection): StockItem[] {
  return [...items].sort((a, b) => {
    const dir = direction === "asc" ? 1 : -1;
    if (field === "name") return a.name.localeCompare(b.name) * dir;
    if (field === "quantity") return (a.quantity - b.quantity) * dir;
    if (field === "stockLevel") {
      const statusOrder: Record<StockLevelStatus, number> = {
        critical: 0,
        low: 1,
        healthy: 2,
      };
      const diff = statusOrder[stockLevelStatus(a)] - statusOrder[stockLevelStatus(b)];
      if (diff !== 0) return diff * dir;
      return a.name.localeCompare(b.name);
    }
    if (field === "updatedAt") {
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    }
    return 0;
  });
}

function groupItems(
  items: StockItem[],
  groupBy: GroupByOption,
  locations: StockControlLocation[],
): { label: string; items: StockItem[] }[] {
  if (groupBy === "none") return [{ label: "", items }];

  const locMap = new Map(locations.map((l) => [l.id, l.name]));
  const groups = new Map<string, StockItem[]>();

  items.forEach((item) => {
    let key: string;
    if (groupBy === "location") {
      key = item.locationId != null ? locMap.get(item.locationId) || "Unknown" : "No Location";
    } else if (groupBy === "category") {
      key = item.category || "Uncategorised";
    } else {
      key = stockLevelLabel(stockLevelStatus(item));
    }
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, item]);
  });

  return Array.from(groups.entries())
    .map(([label, groupItems]) => ({ label, items: groupItems }))
    .sort((a, b) => {
      if (groupBy === "stockLevel") {
        const order: Record<string, number> = { "Below Min": 0, Low: 1, OK: 2 };
        return (order[a.label] ?? 3) - (order[b.label] ?? 3);
      }
      if (a.label === "No Location" || a.label === "Uncategorised") return 1;
      if (b.label === "No Location" || b.label === "Uncategorised") return -1;
      return a.label.localeCompare(b.label);
    });
}

function gridClassForSize(size: ThumbnailSize): string {
  if (size === "S") return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3";
  if (size === "L") return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
  if (size === "XL") return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
  return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
}

function thumbnailClasses(size: ThumbnailSize): { image: string; placeholder: string; icon: string } {
  if (size === "S") return { image: "h-10 w-10 rounded object-cover", placeholder: "h-10 w-10 rounded bg-gray-100 flex items-center justify-center", icon: "h-5 w-5 text-gray-400" };
  if (size === "L") return { image: "h-24 w-24 rounded-lg object-cover", placeholder: "h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center", icon: "h-10 w-10 text-gray-400" };
  if (size === "XL") return { image: "h-40 w-full rounded-t-lg object-cover", placeholder: "h-40 w-full rounded-t-lg bg-gray-100 flex items-center justify-center", icon: "h-12 w-12 text-gray-400" };
  return { image: "h-16 w-16 rounded-lg object-cover", placeholder: "h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center", icon: "h-8 w-8 text-gray-400" };
}

function StockLevelBar(props: { item: StockItem }) {
  const { item } = props;
  const status = stockLevelStatus(item);
  const colors = stockLevelColor(status);
  const pct = stockLevelPct(item);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">
          {item.quantity} / {item.minStockLevel > 0 ? `min ${item.minStockLevel}` : "no min"}
        </span>
        <span className={`flex items-center gap-1 font-medium ${colors.text}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${colors.dot}`} />
          {stockLevelLabel(status)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ItemCard(props: {
  item: StockItem;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (item: StockItem) => void;
  onDelete: (id: number) => void;
  canEditPrices: boolean;
  thumbnailSize: ThumbnailSize;
}) {
  const { item, selected, onToggleSelect, onEdit, onDelete, canEditPrices, thumbnailSize } = props;
  const status = stockLevelStatus(item);
  const colors = stockLevelColor(status);
  const thumb = thumbnailClasses(thumbnailSize);

  const thumbnailElement = item.photoUrl ? (
    <img src={item.photoUrl} alt={item.name} className={thumb.image} loading="lazy" />
  ) : (
    <div className={thumb.placeholder}>
      <svg className={thumb.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </div>
  );

  if (thumbnailSize === "S") {
    return (
      <div
        className={`rounded-lg border p-2 transition-shadow hover:shadow-md ${colors.bg} ${selected ? "ring-2 ring-teal-500" : ""}`}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <div className="flex-shrink-0">{thumbnailElement}</div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <Link
              href={`/stock-control/portal/inventory/${item.id}`}
              className="text-xs font-semibold text-gray-900 hover:text-teal-700 truncate"
            >
              {item.name}
            </Link>
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
          </div>
        </div>
      </div>
    );
  }

  if (thumbnailSize === "XL") {
    return (
      <div
        className={`rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${colors.bg} ${selected ? "ring-2 ring-teal-500" : ""}`}
      >
        <div className="relative">
          {thumbnailElement}
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="absolute top-2 left-2 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/stock-control/portal/inventory/${item.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-teal-700 truncate"
            >
              {item.name}
            </Link>
            {item.needsQrPrint && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                NEW
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
          {item.category && <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>}
          <StockLevelBar item={item} />
          {canEditPrices && (
            <p className="text-xs text-gray-500 mt-1">{formatZAR(item.costPerUnit)} / unit</p>
          )}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
            <Link
              href={`/stock-control/portal/inventory/${item.id}`}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
            >
              View
            </Link>
            <button
              onClick={() => onEdit(item)}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 transition-shadow hover:shadow-md ${colors.bg} ${selected ? "ring-2 ring-teal-500" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <div className="flex-shrink-0">{thumbnailElement}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/stock-control/portal/inventory/${item.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-teal-700 truncate"
            >
              {item.name}
            </Link>
            {item.needsQrPrint && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                NEW
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
          {item.category && <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>}
          <StockLevelBar item={item} />
          {canEditPrices && (
            <p className="text-xs text-gray-500 mt-1">{formatZAR(item.costPerUnit)} / unit</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        <Link
          href={`/stock-control/portal/inventory/${item.id}`}
          className="text-xs text-teal-600 hover:text-teal-800 font-medium"
        >
          View
        </Link>
        <button
          onClick={() => onEdit(item)}
          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="text-xs text-red-600 hover:text-red-800 font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function InventoryCardView(props: InventoryCardViewProps) {
  const {
    items,
    locations,
    groupBy,
    sortField,
    sortDirection,
    lowStockOnly,
    selectedIds,
    onToggleSelect,
    onEdit,
    onDelete,
    canEditPrices,
    thumbnailSize,
  } = props;

  const filteredItems = lowStockOnly
    ? items.filter((item) => {
        const status = stockLevelStatus(item);
        return status === "critical" || status === "low";
      })
    : items;

  const sorted = sortItems(filteredItems, sortField, sortDirection);
  const groups = groupItems(sorted, groupBy, locations);

  if (filteredItems.length === 0) {
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {lowStockOnly ? "No low stock items" : "No items found"}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {lowStockOnly
            ? "All items are at healthy stock levels."
            : "Add a stock item to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label || "all"}>
          {group.label && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
              <span className="text-xs text-gray-500">
                {group.items.length} item{group.items.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className={gridClassForSize(thumbnailSize)}>
            {group.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                canEditPrices={canEditPrices}
                thumbnailSize={thumbnailSize}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { stockLevelStatus, stockLevelColor, stockLevelLabel, AMBER_THRESHOLD_PCT };
export type { SortField, SortDirection, GroupByOption, StockLevelStatus, ThumbnailSize };
