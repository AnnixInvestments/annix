"use client";

import type { NixExtractionSummary } from "@/app/lib/query/hooks";

/**
 * Tiny inline badge under each extraction card header showing where this
 * extraction sits in the mine-document library's revision history:
 *   - 'Latest rev 03'                — the canonical record for this docNumber
 *   - 'Superseded — see rev 04'      — older record, click to jump to the canonical
 *   - 'No revision captured'         — Gemini didn't extract a revision
 *
 * Only renders when the extraction has a documentNumber (otherwise revision
 * tracking doesn't apply — drawing-pack documents that aren't mine specs).
 */
export function RevisionBadge(props: { extraction: NixExtractionSummary }) {
  const { extraction } = props;
  const documentNumber = extraction.documentNumber;
  if (!documentNumber) return null;
  const revision = extraction.documentRevision;
  const isLatest = extraction.isLatestRevision !== false;
  const supersededBy = extraction.supersededByExtractionId;

  if (!revision) {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-500">
        <span className="px-1.5 py-0.5 rounded border bg-gray-50 border-gray-200">
          No revision captured
        </span>
      </span>
    );
  }

  if (isLatest) {
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[10px]">
        <span className="px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200 font-medium">
          Latest rev {revision}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 mt-1 text-[10px]">
      <span className="px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200 font-medium">
        Superseded — rev {revision}
      </span>
      {supersededBy && (
        <a
          href={`#extraction-${supersededBy}`}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          see latest →
        </a>
      )}
    </span>
  );
}
