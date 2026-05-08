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
    async (extraction: NixExtractionSummary, page: number) => {
      try {
        const { url } = await nixApi.extractionDocumentUrl(extraction.id);
        if (!url) {
          showToast(
            "No source document on file for this extraction (predates S3 persistence).",
            "info",
          );
          return;
        }
        const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
        const separator = url.includes("#") ? "&" : "#";
        // page=N jumps to the page; view=FitH fits the page horizontally so
        // the user sees the full width without manual zoom. Both params are
        // honoured by Chrome / Edge / Firefox built-in PDF viewers.
        pdfPreview.open(`${url}${separator}page=${safePage}&view=FitH`, extraction.documentName);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to open document", "error");
      }
    },
    [showToast, pdfPreview],
  );

  const isMutable = session.status !== "promoted" && session.status !== "archived";

  return (
    <div className="space-y-4">
      <ExtractionGroup
        title="Drawings"
        subtitle="Line items extracted from workshop sheets / drawings"
        tone="blue"
        extractions={drawingExtractions}
        onViewOriginal={handleViewOriginal}
        onJumpToPage={handleJumpToPage}
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
        onViewOriginal={handleViewOriginal}
        onJumpToPage={handleJumpToPage}
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
          onViewOriginal={handleViewOriginal}
          onJumpToPage={handleJumpToPage}
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
    </div>
  );
}
