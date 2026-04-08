import type { GroupByOption, SortDirection, SortField, ThumbnailSize } from "../InventoryCardView";

interface InventoryFilterBarProps {
  search: string;
  categoryFilter: string;
  categories: string[];
  viewMode: string;
  thumbnailSize: ThumbnailSize;
  cardGroupBy: GroupByOption;
  cardSortField: SortField;
  cardSortDirection: SortDirection;
  lowStockOnly: boolean;
  listGroupByCategory: boolean;
  isAutoCategorizing: boolean;
  onSearch: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onChangeViewMode: (mode: "list" | "grouped" | "cards") => void;
  onChangeThumbSize: (size: ThumbnailSize) => void;
  onUpdateCardGroupBy: (value: GroupByOption) => void;
  onUpdateCardSort: (field: SortField, direction: SortDirection) => void;
  onToggleLowStockOnly: () => void;
  onToggleListGroupByCategory: () => void;
  onAutoCategorize: () => void;
  onNormalizeRubber: () => void;
}

export function InventoryFilterBar({
  search,
  categoryFilter,
  categories,
  viewMode,
  thumbnailSize,
  cardGroupBy,
  cardSortField,
  cardSortDirection,
  lowStockOnly,
  listGroupByCategory,
  isAutoCategorizing,
  onSearch,
  onCategoryChange,
  onChangeViewMode,
  onChangeThumbSize,
  onUpdateCardGroupBy,
  onUpdateCardSort,
  onToggleLowStockOnly,
  onToggleListGroupByCategory,
  onAutoCategorize,
  onNormalizeRubber,
}: InventoryFilterBarProps) {
  return (
    <>
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
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="block w-full pl-10 rounded-md bg-white border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ViewModeSwitcher viewMode={viewMode} onChangeViewMode={onChangeViewMode} />
          {viewMode === "cards" && (
            <ThumbnailSizePicker
              thumbnailSize={thumbnailSize}
              onChangeThumbSize={onChangeThumbSize}
            />
          )}
        </div>
      </div>

      {viewMode === "cards" && (
        <CardViewControls
          cardGroupBy={cardGroupBy}
          cardSortField={cardSortField}
          cardSortDirection={cardSortDirection}
          lowStockOnly={lowStockOnly}
          onUpdateCardGroupBy={onUpdateCardGroupBy}
          onUpdateCardSort={onUpdateCardSort}
          onToggleLowStockOnly={onToggleLowStockOnly}
        />
      )}

      {viewMode === "list" && (
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleListGroupByCategory}
            className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
              listGroupByCategory
                ? "bg-teal-100 text-teal-800 border-teal-300"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg
              className={`w-4 h-4 mr-1.5 ${listGroupByCategory ? "text-teal-600" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Group by Category
          </button>
          <button
            onClick={onAutoCategorize}
            disabled={isAutoCategorizing}
            className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAutoCategorizing ? (
              <div className="w-4 h-4 mr-1.5 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
            ) : (
              <svg
                className="w-4 h-4 mr-1.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
            {isAutoCategorizing ? "Categorizing..." : "Auto-Categorize"}
          </button>
          <button
            onClick={onNormalizeRubber}
            className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Fix Rubber Names
          </button>
        </div>
      )}
    </>
  );
}

interface ViewModeSwitcherProps {
  viewMode: string;
  onChangeViewMode: (mode: "list" | "grouped" | "cards") => void;
}

function ViewModeSwitcher({ viewMode, onChangeViewMode }: ViewModeSwitcherProps) {
  return (
    <div className="flex rounded-md shadow-sm">
      <button
        onClick={() => onChangeViewMode("cards")}
        className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
          viewMode === "cards"
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
        onClick={() => onChangeViewMode("grouped")}
        className={`px-3 py-2 text-sm font-medium border-t border-r border-b ${
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
        onClick={() => onChangeViewMode("list")}
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
  );
}

interface ThumbnailSizePickerProps {
  thumbnailSize: ThumbnailSize;
  onChangeThumbSize: (size: ThumbnailSize) => void;
}

function ThumbnailSizePicker({ thumbnailSize, onChangeThumbSize }: ThumbnailSizePickerProps) {
  return (
    <div className="flex items-center rounded-md shadow-sm border border-gray-300">
      {(["S", "M", "L", "XL"] as const).map((size, idx) => (
        <button
          key={size}
          onClick={() => onChangeThumbSize(size)}
          className={`px-2.5 py-2 text-xs font-semibold transition-colors ${
            thumbnailSize === size
              ? "bg-teal-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          } ${idx === 0 ? "rounded-l-md" : ""} ${idx === 3 ? "rounded-r-md" : ""} ${idx > 0 ? "border-l border-gray-300" : ""}`}
        >
          {size}
        </button>
      ))}
    </div>
  );
}

interface CardViewControlsProps {
  cardGroupBy: GroupByOption;
  cardSortField: SortField;
  cardSortDirection: SortDirection;
  lowStockOnly: boolean;
  onUpdateCardGroupBy: (value: GroupByOption) => void;
  onUpdateCardSort: (field: SortField, direction: SortDirection) => void;
  onToggleLowStockOnly: () => void;
}

function CardViewControls({
  cardGroupBy,
  cardSortField,
  cardSortDirection,
  lowStockOnly,
  onUpdateCardGroupBy,
  onUpdateCardSort,
  onToggleLowStockOnly,
}: CardViewControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <select
        value={cardGroupBy}
        onChange={(e) => onUpdateCardGroupBy(e.target.value as GroupByOption)}
        className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
      >
        <option value="none">No Grouping</option>
        <option value="location">Group by Location</option>
        <option value="category">Group by Category</option>
        <option value="stockLevel">Group by Stock Level</option>
      </select>
      <select
        value={`${cardSortField}-${cardSortDirection}`}
        onChange={(e) => {
          const [field, dir] = e.target.value.split("-") as [SortField, SortDirection];
          onUpdateCardSort(field, dir);
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
        onClick={onToggleLowStockOnly}
        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
          lowStockOnly
            ? "bg-amber-100 text-amber-800 border-amber-300"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }`}
      >
        <svg
          className={`w-4 h-4 mr-1.5 ${lowStockOnly ? "text-amber-600" : "text-gray-400"}`}
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
  );
}
