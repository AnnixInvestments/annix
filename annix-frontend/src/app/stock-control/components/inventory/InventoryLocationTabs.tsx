import type { StockControlLocation } from "@/app/lib/api/stockControlApi";
import type { LocationGroup } from "../../lib/useInventoryPageState";

interface InventoryLocationTabsProps {
  locations: StockControlLocation[];
  locationFilter: number | "";
  total: number;
  groupedData: LocationGroup[];
  onLocationChange: (value: string) => void;
}

export function InventoryLocationTabs({
  locations,
  locationFilter,
  total,
  groupedData,
  onLocationChange,
}: InventoryLocationTabsProps) {
  if (locations.length === 0) return null;

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
        <span className="ml-1.5 text-xs opacity-80">{total}</span>
      </button>
      {locations.map((loc) => {
        const locItemCount = groupedData.find((g) => g.locationId === loc.id)?.items.length ?? 0;
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
    </div>
  );
}
