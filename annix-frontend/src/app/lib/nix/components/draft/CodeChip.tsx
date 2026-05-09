"use client";

import { CODE_KIND_TONE, type CodeKind, type ResolvedCode } from "./useSpecLookup";

/**
 * Renders one drawing-item code (R1, SC1, "Linatex Linard 60") as a chip.
 * Resolved chips are clickable and show the spec summary inline + a tooltip;
 * unresolved chips render as plain inline text so the user can still see what
 * the drawing said even when no spec defines the code.
 */
export function CodeChip(props: {
  code: string;
  resolved: ResolvedCode | null;
  kind: CodeKind;
  onJumpToSpec: (extractionId: number, page: number | null, searchHint: string | null) => void;
}) {
  const { code, resolved, kind, onJumpToSpec } = props;

  // Unresolved code: just plain text — the drawing recorded it but no spec
  // explains it, so there's nothing useful to surface beyond the code itself.
  if (!resolved) {
    return <span className="text-gray-700">{code}</span>;
  }

  const tone = CODE_KIND_TONE[kind];
  const tooltipParts: string[] = [resolved.code];
  if (resolved.summary) tooltipParts.push(resolved.summary);
  if (resolved.productDescriptors) tooltipParts.push(resolved.productDescriptors);
  const tooltip = `${tooltipParts.join(" — ")}\nFrom: ${resolved.sourceDocumentName}${
    resolved.pageReference !== null ? ` (page ${resolved.pageReference})` : ""
  }`;
  // Show summary AND products together — the quoter needs the headline
  // ('6mm bore, 3mm flange face') AND the brand specifics ('Carboguard
  // 890 @ 100-150μm') side by side. When products is empty (lining
  // specs without compound brand names, or paint specs where Gemini
  // could only extract a colour), the summary stands alone. When the
  // product extractor filtered all the values as placeholders (Varies
  // per item/service / Refer to Tables…), products will be null and
  // the summary still surfaces correctly.
  const products = resolved.productDescriptors;
  const summaryText = resolved.summary;
  const inlineParts = [summaryText, products].filter(Boolean) as string[];
  const inlineText = inlineParts.join(" • ");

  return (
    <button
      type="button"
      onClick={() =>
        onJumpToSpec(resolved.sourceExtractionId, resolved.pageReference, resolved.searchHint)
      }
      title={tooltip}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${tone.bg} ${tone.text} ${tone.border} hover:brightness-95 hover:underline cursor-pointer text-left`}
    >
      <span className="font-medium">{code}</span>
      {inlineText.length > 0 && (
        <span className="text-[10px] opacity-75 truncate max-w-[60ch]">— {inlineText}</span>
      )}
    </button>
  );
}
