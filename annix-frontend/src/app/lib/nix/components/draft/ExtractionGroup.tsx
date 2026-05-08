"use client";

import type { NixExtractionSummary } from "@/app/lib/query/hooks";
import { ExtractionCard } from "./ExtractionCard";

/**
 * A coloured section grouping extractions by role (drawings, specs,
 * other). The host filters the session's extractions by role and
 * passes each group separately so the order ('drawings first, specs
 * second' for cross-linking) stays under host control.
 */
export function ExtractionGroup(props: {
  title: string;
  subtitle: string;
  tone: "blue" | "purple" | "gray";
  extractions: NixExtractionSummary[];
  onViewOriginal: (extraction: NixExtractionSummary) => void;
  onJumpToPage: (extraction: NixExtractionSummary, page: number) => void;
  onRetry: (extraction: NixExtractionSummary) => void;
  onItemSaved: () => void;
  retryingId: number | null;
  emptyMessage?: string;
  showSpecifications?: boolean;
}) {
  const {
    title,
    subtitle,
    tone,
    extractions,
    onViewOriginal,
    onJumpToPage,
    onRetry,
    onItemSaved,
    retryingId,
    emptyMessage,
    showSpecifications,
  } = props;

  let toneClasses = "bg-gray-50 border-gray-200";
  if (tone === "blue") toneClasses = "bg-blue-50 border-blue-200";
  else if (tone === "purple") toneClasses = "bg-purple-50 border-purple-200";

  const fallbackEmpty = "Nothing here yet.";
  const emptyText = emptyMessage ? emptyMessage : fallbackEmpty;

  return (
    <section className={`${toneClasses} rounded-lg border p-3`}>
      <header className="mb-2">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </header>

      {extractions.length === 0 ? (
        <p className="text-xs text-gray-500 italic">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {extractions.map((extraction) => (
            <ExtractionCard
              key={extraction.id}
              extraction={extraction}
              onViewOriginal={onViewOriginal}
              onJumpToPage={onJumpToPage}
              onRetry={onRetry}
              onItemSaved={onItemSaved}
              retryingId={retryingId}
              showSpecifications={showSpecifications}
            />
          ))}
        </div>
      )}
    </section>
  );
}
