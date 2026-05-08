"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type ExtractionBrand,
  useExtractionProgress,
} from "@/app/components/ExtractionProgressModal";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
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
  const { runBulk } = useAdaptiveExtractionProgress();
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);

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

  // Re-extract every document in the session in one click. Loops via the
  // adaptive bulk progress hook so the user gets a centred branded modal
  // with per-file labels ('Re-extracting filename.pdf 2 of 7...') instead
  // of having to click Retry on each card individually.
  const retryableExtractions = useMemo(() => {
    const list = sessionExtractions || [];
    return list.filter((extraction) => Boolean(extraction.storagePath));
  }, [sessionExtractions]);

  const handleRetryAll = useCallback(async () => {
    if (retryableExtractions.length === 0) return;
    setBulkRetrying(true);
    try {
      const result = await runBulk({
        brand,
        metricCategory: "asca-quote-extract-bulk",
        items: retryableExtractions,
        itemId: (extraction) => extraction.id,
        itemLabel: (extraction, i, t) =>
          `Re-extracting ${extraction.documentName} (${i + 1} of ${t})…`,
        fallbackPerItemMs: 45_000,
        run: async (extraction) => {
          await nixApi.retryExtraction(extraction.id);
          // Refetch the session after each successful retry so the file
          // list updates from 'processing' → 'completed' in real time
          // while the bulk continues with the next file.
          await onSessionChanged();
        },
      });
      const succeeded = result.succeeded.length;
      const failed = result.failed.length;
      if (failed === 0) {
        showToast(`Re-extracted ${succeeded} document${succeeded === 1 ? "" : "s"}`, "success");
      } else {
        showToast(`Re-extracted ${succeeded}; ${failed} failed`, "info");
      }
    } finally {
      setBulkRetrying(false);
    }
  }, [retryableExtractions, runBulk, onSessionChanged, brand, showToast]);

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

  // Count how many of the retryable extractions are currently in-flight
  // (status === processing). Lets the persistent banner show 'X of N still
  // processing' so the user can tell at a glance whether the bulk has
  // finished, even if the centred progress modal gets dismissed.
  const stillProcessing = useMemo(() => {
    const list = sessionExtractions || [];
    return list.filter((extraction) => extraction.status === "processing").length;
  }, [sessionExtractions]);

  return (
    <div className="space-y-4">
      {/* Persistent banner — stays visible the entire time the bulk runs,
          even if the centred progress modal somehow gets dismissed (HMR,
          accidental navigation, etc.). The user can always see at the top
          of the page that work is still ongoing. */}
      {bulkRetrying && (
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-amber-100 border-2 border-amber-400 rounded-lg shadow-md">
          <svg
            className="w-5 h-5 text-amber-700 animate-spin flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="50"
              strokeDashoffset="20"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-amber-900">
              Re-extracting all {retryableExtractions.length} documents…
            </div>
            <div className="text-xs text-amber-800">
              {stillProcessing > 0
                ? `${stillProcessing} document${stillProcessing === 1 ? "" : "s"} still processing — please don't close this tab. Each PDF takes 30–60 seconds through Gemini.`
                : "Finalising — almost done."}
            </div>
          </div>
        </div>
      )}

      {isMutable && retryableExtractions.length > 1 && !bulkRetrying && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs text-amber-800">
            <span className="font-semibold">Re-extract all</span> runs every document in this draft
            again under the latest Nix prompt — useful after a prompt update or to reapply
            cross-reference rules so clauses land on the right files.
          </div>
          <button
            type="button"
            onClick={handleRetryAll}
            disabled={bulkRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded shadow-sm whitespace-nowrap disabled:opacity-50"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Re-extract all {retryableExtractions.length} documents
          </button>
        </div>
      )}

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
