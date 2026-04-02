import type { StockControlLocation } from "@/app/lib/api/stockControlApi";

interface InventoryLocationTabsProps {
  locations: StockControlLocation[];
  locationFilter: number | "" | "uncategorized";
  total: number;
  locationCounts: Map<number | null, number>;
  onLocationChange: (value: string) => void;
}

export function InventoryLocationTabs({
  locations,
  locationFilter,
  total,
  locationCounts,
  onLocationChange,
}: InventoryLocationTabsProps) {
  if (locations.length === 0) return null;

  const uncategorizedCount = locationCounts.get(null) || 0;
  const allTotal = Array.from(locationCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onLocationChange("")}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          locationFilter === ""
            ? "bg-teal-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All Locations
        <span className="ml-1.5 text-xs opacity-80">{allTotal || total}</span>
      </button>
      {locations.map((loc) => {
        const locItemCount = locationCounts.get(loc.id) || 0;
        return (
          <button
            key={loc.id}
            onClick={() => onLocationChange(String(loc.id))}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              locationFilter === loc.id
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {loc.name}
            <span className="ml-1.5 text-xs opacity-80">{locItemCount}</span>
          </button>
        );
      })}
      <button
        onClick={() => onLocationChange("uncategorized")}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          locationFilter === "uncategorized"
            ? "bg-teal-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        Uncategorized
        <span className="ml-1.5 text-xs opacity-80">{uncategorizedCount}</span>
      </button>
    </div>
  );
}
