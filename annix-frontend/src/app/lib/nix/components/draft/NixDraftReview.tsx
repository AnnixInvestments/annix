"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ExtractionBrand,
  useExtractionProgress,
} from "@/app/components/ExtractionProgressModal";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { nixApi } from "@/app/lib/nix";
import type { NixExtractionSessionDto, NixExtractionSummary } from "@/app/lib/query/hooks";
import { ExtractionGroup } from "./ExtractionGroup";
import { NixSpecViewerModal, useNixSpecViewer } from "./NixSpecViewer";
import { useSpecLookup } from "./useSpecLookup";

/**
 * Top-level draft-review block — drawings + specs + other groups,
 * the per-row Retry button (which opens the centred branded
 * progress modal), the per-cell inline edit + auto-feedback to the
 * Nix learning system, and the in-app PDF preview with click-to-page
 * jumping for spec clauses.
 *
 * Apps mount this inside their own page shell (which handles the
 * page header, breadcrumbs, promote-to-quote action, archive, etc.).
 * Pass the loaded session, a brand for modal theming, and an
 * onSessionChanged callback so the host can refetch when an item
 * is edited or an extraction is retried.
 */
export function NixDraftReview(props: {
  session: NixExtractionSessionDto;
  brand: ExtractionBrand;
  onSessionChanged: () => Promise<unknown> | undefined;
  addMoreDocumentsHref?: string;
}) {
  const { session, brand, onSessionChanged, addMoreDocumentsHref } = props;
  const { showToast } = useToast();
  const pdfPreview = usePdfPreview();
  const specViewer = useNixSpecViewer();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const sessionExtractions = session.extractions;
  const drawingExtractions = useMemo(() => {
    const list = sessionExtractions || [];
    return list.filter((extraction) => extraction.documentRole === "drawing");
  }, [sessionExtractions]);
  const specExtractions = useMemo(() => {
    const list = sessionExtractions || [];
    return list.filter((extraction) => extraction.documentRole === "specification");
  }, [sessionExtractions]);
  const otherExtractions = useMemo(() => {
    const list = sessionExtractions || [];
    return list.filter(
      (extraction) =>
        extraction.documentRole !== "drawing" && extraction.documentRole !== "specification",
    );
  }, [sessionExtractions]);

  const specLookup = useSpecLookup(specExtractions);

  const handleRetry = useCallback(
    async (extraction: NixExtractionSummary) => {
      try {
        setRetryingId(extraction.id);
        showExtraction({
          brand,
          label: `Re-extracting ${extraction.documentName}…`,
          estimatedDurationMs: 60_000,
        });
        await nixApi.retryExtraction(extraction.id);
        await onSessionChanged();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Retry failed", "error");
      } finally {
        hideExtraction();
        setRetryingId(null);
      }
    },
    [brand, showToast, onSessionChanged, showExtraction, hideExtraction],
  );

  const handleItemSaved = useCallback(() => {
    onSessionChanged();
  }, [onSessionChanged]);

  const handleViewOriginal = useCallback(
    async (extraction: NixExtractionSummary) => {
      try {
        const { url } = await nixApi.extractionDocumentUrl(extraction.id);
        if (!url) {
          showToast(
            "No source document on file for this extraction (predates S3 persistence).",
            "info",
          );
          return;
        }
        pdfPreview.open(url, extraction.documentName);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to open document", "error");
      }
    },
    [showToast, pdfPreview],
  );

  const handleJumpToPage = useCallback(
    (extraction: NixExtractionSummary, page: number) => {
      const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      // NixSpecViewer fetches via /api/nix/extraction/:id/document so the
      // react-pdf library doesn't hit S3 CORS — react-pdf uses fetch()
      // unlike the iframe-based PdfPreviewModal which loads cross-origin
      // without preflight.
      specViewer.open({
        extractionId: extraction.id,
        filename: extraction.documentName,
        page: safePage,
        searchHint: null,
      });
    },
    [specViewer],
  );

  // Used by drawing-row code chips: given a sourceExtractionId from the
  // SpecLookup map, find the spec extraction and jump straight to its
  // resolved-clause page in the PDF preview. The searchHint (clause key,
  // first words of the description) is passed to NixSpecViewer which walks
  // the rendered page's text layer for a match and scrolls THAT span into
  // view — so the user lands directly on the clause body, not the page
  // header.
  const handleJumpToSpec = useCallback(
    (sourceExtractionId: number, page: number | null, searchHint: string | null) => {
      const target = specExtractions.find((s) => s.id === sourceExtractionId);
      if (!target) {
        showToast("Spec source no longer in this draft.", "info");
        return;
      }
      const rawPage = page ?? 1;
      const safePage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
      specViewer.open({
        extractionId: target.id,
        filename: target.documentName,
        page: safePage,
        searchHint,
      });
    },
    [specExtractions, showToast, specViewer],
  );

  const isMutable = session.status !== "promoted" && session.status !== "archived";

  return (
    <div className="space-y-4">
      <ExtractionGroup
        title="Drawings"
        subtitle="Line items extracted from workshop sheets / drawings"
        tone="blue"
        extractions={drawingExtractions}
        specLookup={specLookup}
        onViewOriginal={handleViewOriginal}
        onJumpToPage={handleJumpToPage}
        onJumpToSpec={handleJumpToSpec}
        onRetry={handleRetry}
        onItemSaved={handleItemSaved}
        retryingId={retryingId}
        emptyMessage="No drawings uploaded into this session yet."
      />

      <ExtractionGroup
        title="Specifications"
        subtitle="Clause-level facts; cross-linked codes from the drawings highlighted below"
        tone="purple"
        extractions={specExtractions}
        specLookup={specLookup}
        onViewOriginal={handleViewOriginal}
        onJumpToPage={handleJumpToPage}
        onJumpToSpec={handleJumpToSpec}
        onRetry={handleRetry}
        onItemSaved={handleItemSaved}
        retryingId={retryingId}
        emptyMessage="No specification documents uploaded into this session yet."
        showSpecifications
      />

      {otherExtractions.length > 0 && (
        <ExtractionGroup
          title="Other documents"
          subtitle="Documents Nix couldn't classify as drawings or specs"
          tone="gray"
          extractions={otherExtractions}
          specLookup={specLookup}
          onViewOriginal={handleViewOriginal}
          onJumpToPage={handleJumpToPage}
          onJumpToSpec={handleJumpToSpec}
          onRetry={handleRetry}
          onItemSaved={handleItemSaved}
          retryingId={retryingId}
        />
      )}

      {isMutable && addMoreDocumentsHref && (
        <div className="flex items-center justify-center pt-2">
          <a
            href={addMoreDocumentsHref}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700"
          >
            Add more documents to this draft
          </a>
        </div>
      )}

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
      <NixSpecViewerModal state={specViewer.state} onClose={specViewer.close} />
    </div>
  );
}
