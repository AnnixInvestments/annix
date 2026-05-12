import { memo } from "react";
import type { ExportableSubsection, ExportFormat } from "../types";

interface GroupExportsButtonsProps {
  groupName: string;
  subsections: ExportableSubsection[];
  onExport: (format: ExportFormat, groupName: string, subsections: ExportableSubsection[]) => void;
}

/**
 * Renders the four export-format buttons (Excel / CSV / PDF / Word) for
 * a BOQ material-group header. Returns null when every sub-section is
 * empty, so the buttons only appear on populated groups.
 *
 * Wrapped in `React.memo` to skip re-renders when the parent re-renders
 * but the (groupName, subsections, onExport) triplet is referentially
 * stable. The host must pass `onExport` from a `useCallback` for memo
 * to be effective.
 */
const GroupExportsButtonsInner = (props: GroupExportsButtonsProps) => {
  const { groupName, subsections, onExport } = props;
  const hasContent = subsections.some((s) => s.items.size > 0);
  if (!hasContent) return null;
  const buttonClass =
    "text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 font-medium";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={buttonClass}
        onClick={() => onExport("excel", groupName, subsections)}
        title={`Download the entire ${groupName} group as one Excel workbook`}
      >
        Excel
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onExport("csv", groupName, subsections)}
        title={`Download the entire ${groupName} group as one CSV file`}
      >
        CSV
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onExport("pdf", groupName, subsections)}
        title={`Print or save the entire ${groupName} group as PDF`}
      >
        PDF
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onExport("word", groupName, subsections)}
        title={`Download the entire ${groupName} group as Word (.doc)`}
      >
        Word
      </button>
    </div>
  );
};

export const GroupExportsButtons = memo(GroupExportsButtonsInner);
