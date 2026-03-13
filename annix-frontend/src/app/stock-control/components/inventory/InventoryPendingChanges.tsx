interface InventoryPendingChangesProps {
  selectedIdsSize: number;
  pendingMinLevelsSize: number;
  pendingPricesSize: number;
  pendingLocationsSize: number;
  isPrintingLabels: boolean;
  isSavingMinLevels: boolean;
  isSavingPrices: boolean;
  isSavingLocations: boolean;
  onClearSelection: () => void;
  onPrintSelected: () => void;
  onClearMinLevels: () => void;
  onSaveMinLevels: () => void;
  onClearPrices: () => void;
  onSavePrices: () => void;
  onClearLocations: () => void;
  onSaveLocations: () => void;
}

export function InventoryPendingChanges({
  selectedIdsSize,
  pendingMinLevelsSize,
  pendingPricesSize,
  pendingLocationsSize,
  isPrintingLabels,
  isSavingMinLevels,
  isSavingPrices,
  isSavingLocations,
  onClearSelection,
  onPrintSelected,
  onClearMinLevels,
  onSaveMinLevels,
  onClearPrices,
  onSavePrices,
  onClearLocations,
  onSaveLocations,
}: InventoryPendingChangesProps) {
  return (
    <>
      {selectedIdsSize > 0 && (
        <SelectionBanner
          selectedCount={selectedIdsSize}
          isPrintingLabels={isPrintingLabels}
          onClear={onClearSelection}
          onPrintSelected={onPrintSelected}
        />
      )}

      {pendingMinLevelsSize > 0 && (
        <PendingChangeBanner
          count={pendingMinLevelsSize}
          label="min level"
          colorScheme="amber"
          isSaving={isSavingMinLevels}
          saveLabel="Save All Changes"
          onDiscard={onClearMinLevels}
          onSave={onSaveMinLevels}
        />
      )}

      {pendingPricesSize > 0 && (
        <PendingChangeBanner
          count={pendingPricesSize}
          label="price"
          colorScheme="green"
          isSaving={isSavingPrices}
          saveLabel="Save Price Changes"
          onDiscard={onClearPrices}
          onSave={onSavePrices}
        />
      )}

      {pendingLocationsSize > 0 && (
        <PendingChangeBanner
          count={pendingLocationsSize}
          label="location"
          colorScheme="blue"
          isSaving={isSavingLocations}
          saveLabel="Save Location Changes"
          onDiscard={onClearLocations}
          onSave={onSaveLocations}
        />
      )}
    </>
  );
}

interface SelectionBannerProps {
  selectedCount: number;
  isPrintingLabels: boolean;
  onClear: () => void;
  onPrintSelected: () => void;
}

function SelectionBanner({
  selectedCount,
  isPrintingLabels,
  onClear,
  onPrintSelected,
}: SelectionBannerProps) {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <span className="text-sm font-medium text-teal-800">
        {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <div className="flex items-center gap-3">
        <button onClick={onClear} className="text-sm text-teal-700 hover:text-teal-900">
          Clear
        </button>
        <button
          onClick={onPrintSelected}
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
  );
}

type ColorScheme = "amber" | "green" | "blue";

interface PendingChangeBannerProps {
  count: number;
  label: string;
  colorScheme: ColorScheme;
  isSaving: boolean;
  saveLabel: string;
  onDiscard: () => void;
  onSave: () => void;
}

const COLOR_MAP: Record<ColorScheme, { bg: string; border: string; text: string; discardText: string; buttonBg: string; buttonHover: string }> = {
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    discardText: "text-amber-700 hover:text-amber-900",
    buttonBg: "bg-amber-600",
    buttonHover: "hover:bg-amber-700",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    discardText: "text-green-700 hover:text-green-900",
    buttonBg: "bg-green-600",
    buttonHover: "hover:bg-green-700",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    discardText: "text-blue-700 hover:text-blue-900",
    buttonBg: "bg-blue-600",
    buttonHover: "hover:bg-blue-700",
  },
};

function PendingChangeBanner({
  count,
  label,
  colorScheme,
  isSaving,
  saveLabel,
  onDiscard,
  onSave,
}: PendingChangeBannerProps) {
  const colors = COLOR_MAP[colorScheme];

  return (
    <div
      className={`${colors.bg} ${colors.border} border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}
    >
      <span className={`text-sm font-medium ${colors.text}`}>
        {count} unsaved {label} change{count !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-3">
        <button onClick={onDiscard} className={`text-sm ${colors.discardText}`}>
          Discard Changes
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white ${colors.buttonBg} ${colors.buttonHover} disabled:opacity-50`}
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          {isSaving ? "Saving..." : saveLabel}
        </button>
      </div>
    </div>
  );
}
