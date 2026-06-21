import type {
  PriceListImportCommitResult,
  PriceListImportMode,
} from "@/app/lib/api/stockControlApi";

interface PriceListImportModeSelectProps {
  value: PriceListImportMode;
  onChange: (value: PriceListImportMode) => void;
  itemNoun: string;
  disabled?: boolean;
}

function isPriceListImportMode(value: string): value is PriceListImportMode {
  return value === "replace" || value === "append" || value === "update";
}

export function PriceListImportModeSelect(props: PriceListImportModeSelectProps) {
  const value = props.value;
  const itemNoun = props.itemNoun;
  const disabled = props.disabled === true;
  const helpText =
    value === "replace"
      ? `Removes this supplier's existing ${itemNoun} then adds the imported rows.`
      : value === "append"
        ? `Adds every imported row as a new ${itemNoun.replace(/s$/, "")}.`
        : `Refreshes prices on matched ${itemNoun}, adds new ones, keeps the rest.`;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <span className="font-medium whitespace-nowrap">On import:</span>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            if (isPriceListImportMode(next)) {
              props.onChange(next);
            }
          }}
          aria-label="Import mode"
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
        >
          <option value="update">Update existing (match by name)</option>
          <option value="replace">Replace supplier</option>
          <option value="append">Append</option>
        </select>
      </label>
      <span className="text-xs text-gray-400">{helpText}</span>
    </div>
  );
}

export function priceListImportResultMessage(
  result: PriceListImportCommitResult,
  itemNoun: string,
): string {
  const updated = result.updated;
  const created = result.created;
  const imported = result.imported;
  if (updated != null || created != null) {
    const updatedCount = updated ?? 0;
    const createdCount = created ?? 0;
    return `Updated ${updatedCount}, added ${createdCount} ${itemNoun}.`;
  }
  const importedCount = imported ?? 0;
  return `Imported ${importedCount} ${itemNoun}.`;
}
