"use client";

import type { ResolvedCode } from "./useSpecLookup";

/**
 * Renders one drawing-item code (R1, SC1, "Linatex Linard 60") as a chip.
 * Resolved chips are clickable and show the spec summary inline + a tooltip;
 * unresolved chips render as plain inline text so the user can still see what
 * the drawing said even when no spec defines the code.
 */
export function CodeChip(props: {
  code: string;
  resolved: ResolvedCode | null;
  kind: "coating" | "lining" | "materialClass" | "flangeConfig";
  onJumpToSpec: (extractionId: number, page: number | null) => void;
}) {
  const { code, resolved, kind, onJumpToSpec } = props;

  // Unresolved code: just plain text — the drawing recorded it but no spec
  // explains it, so there's nothing useful to surface beyond the code itself.
  if (!resolved) {
    return <span className="text-gray-700">{code}</span>;
  }

  const tone = TONE[kind];
  const tooltip = resolved.summary
    ? `${resolved.code} — ${resolved.summary}\nFrom: ${resolved.sourceDocumentName}${
        resolved.pageReference !== null ? ` (page ${resolved.pageReference})` : ""
      }`
    : `${resolved.code}\nFrom: ${resolved.sourceDocumentName}${
        resolved.pageReference !== null ? ` (page ${resolved.pageReference})` : ""
      }`;

  return (
    <button
      type="button"
      onClick={() => onJumpToSpec(resolved.sourceExtractionId, resolved.pageReference)}
      title={tooltip}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${tone.bg} ${tone.text} ${tone.border} hover:brightness-95 hover:underline cursor-pointer text-left`}
    >
      <span className="font-medium">{code}</span>
      {resolved.summary && (
        <span className="text-[10px] opacity-75 truncate max-w-[24ch]">— {resolved.summary}</span>
      )}
    </button>
  );
}

const TONE: Record<
  "coating" | "lining" | "materialClass" | "flangeConfig",
  { bg: string; text: string; border: string }
> = {
  coating: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  lining: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  materialClass: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  flangeConfig: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};
