"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DocumentBucket, type PendingDocument } from "@/app/components/uploads";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { type NixDocumentRole, nixApi } from "@/app/lib/nix";
import { DocNumberAutocomplete } from "@/app/lib/nix/components/library";
import {
  type NixExtractionSessionDto,
  useCreateNixExtractionSession,
  useNixExtractionSession,
} from "@/app/lib/query/hooks";

const ASCA_PROFILE_KEY = "asca-quote-documents";
const ASCA_SOURCE_MODULE = "asca";

interface BucketState {
  documents: PendingDocument[];
  confirmed: boolean;
  processing: boolean;
}

const emptyBucket: BucketState = {
  documents: [],
  confirmed: false,
  processing: false,
};

export default function QuoteFromDocumentsPage() {
  const router = useRouter();
  const auth = useStockControlAuth();
  const { showToast } = useToast();
  const userId = auth.user?.id;

  const searchParams = useSearchParams();
  const sessionParam = searchParams?.get("session");
  const parsedExistingSessionId = sessionParam ? Number.parseInt(sessionParam, 10) : Number.NaN;
  const existingSessionId = Number.isFinite(parsedExistingSessionId)
    ? parsedExistingSessionId
    : null;

  const [drawings, setDrawings] = useState<BucketState>(emptyBucket);
  const [specs, setSpecs] = useState<BucketState>(emptyBucket);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<NixExtractionSessionDto | null>(null);
  const [docNumberQuery, setDocNumberQuery] = useState("");

  const existingSessionQuery = useNixExtractionSession(existingSessionId);

  useEffect(() => {
    const fetched = existingSessionQuery.data;
    if (fetched && (session === null || session.id !== fetched.id)) {
      setSession(fetched);
    }
  }, [existingSessionQuery.data, session]);

  const createSessionMutation = useCreateNixExtractionSession();
  const { runBulk } = useAdaptiveExtractionProgress();

  const ensureSession = useCallback(async (): Promise<NixExtractionSessionDto> => {
    if (session) return session;
    const created = await createSessionMutation.mutateAsync({
      sourceModule: ASCA_SOURCE_MODULE,
      extractionProfile: ASCA_PROFILE_KEY,
    });
    setSession(created);
    return created;
  }, [session, createSessionMutation]);

  const addDocumentTo = useCallback(
    (set: typeof setDrawings) => (file: File) => {
      set((prev) => ({
        ...prev,
        documents: [
          ...prev.documents,
          { file, id: `${file.name}-${file.size}-${file.lastModified}` },
        ],
      }));
    },
    [],
  );

  const removeDocumentFrom = useCallback(
    (set: typeof setDrawings) => (id: string) => {
      set((prev) => ({
        ...prev,
        documents: prev.documents.filter((doc) => doc.id !== id),
      }));
    },
    [],
  );

  const processBucket = useCallback(
    async (bucket: BucketState, role: NixDocumentRole, label: string): Promise<void> => {
      const activeSession = await ensureSession();
      const result = await runBulk({
        brand: "stock-control",
        metricCategory: "asca-quote-extract",
        metricOperation: role,
        items: bucket.documents,
        itemId: (doc) => doc.id,
        itemLabel: (doc, i, t) =>
          `Reading ${role === "drawing" ? "drawing" : "specification"} ${i + 1} of ${t}: ${doc.file.name}`,
        run: async (doc) => {
          await nixApi.uploadAndProcess(doc.file, {
            userId,
            sourceModule: ASCA_SOURCE_MODULE,
            extractionProfile: ASCA_PROFILE_KEY,
            documentRole: role,
            sessionId: activeSession.id,
          });
        },
      });
      const succeeded = result.succeeded.length;
      const failed = result.failed.length;
      if (failed === 0) {
        showToast(`${label}: processed ${succeeded} document${succeeded === 1 ? "" : "s"}`);
      } else {
        showToast(`${label}: ${succeeded} succeeded, ${failed} failed`);
      }
    },
    [userId, showToast, ensureSession, runBulk],
  );

  const handleConfirmDrawings = useCallback(async () => {
    setErrorMessage(null);
    setDrawings((prev) => ({ ...prev, confirmed: true, processing: true }));
    try {
      await processBucket(drawings, "drawing", "Drawings");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Drawing upload failed");
      setDrawings((prev) => ({ ...prev, confirmed: false }));
    } finally {
      setDrawings((prev) => ({ ...prev, processing: false }));
    }
  }, [drawings, processBucket]);

  const handleConfirmSpecs = useCallback(async () => {
    setErrorMessage(null);
    setSpecs((prev) => ({ ...prev, confirmed: true, processing: true }));
    try {
      await processBucket(specs, "specification", "Specifications");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Specification upload failed");
      setSpecs((prev) => ({ ...prev, confirmed: false }));
    } finally {
      setSpecs((prev) => ({ ...prev, processing: false }));
    }
  }, [specs, processBucket]);

  const handleEmptyConfirm = useCallback(() => {
    setErrorMessage("Add at least one document before confirming.");
  }, []);

  const drawingsConfirmed = drawings.confirmed;
  const specsConfirmed = specs.confirmed;
  const reviewReady = session !== null && (drawingsConfirmed || specsConfirmed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New quote from documents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Drop customer drawings and specifications separately. Drawings extract first;
            specifications extract second with the drawings' items as Nix's context, so paint codes
            / material classes get cross-linked to the spec clauses that define them.
          </p>
        </div>
        <Link
          href="/stock-control/portal/quotations"
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Back to quotes
        </Link>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {errorMessage}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs text-blue-900 font-medium mb-1">Already have the doc number?</p>
        <p className="text-xs text-blue-800 mb-2">
          Search the mine library — if Nix has extracted it before for the same mine, jump straight
          to the existing extraction instead of re-uploading.
        </p>
        <DocNumberAutocomplete
          value={docNumberQuery}
          onChange={setDocNumberQuery}
          onUseExisting={(row) => {
            if (row.mineId) {
              router.push(`/stock-control/portal/library/mines/${row.mineId}`);
            } else {
              showToast(
                `Existing extraction #${row.extractionId} found, but no mine attached. Tag it from the draft view.`,
                "info",
              );
            }
          }}
          placeholder="e.g. LHU-0000-EP-2701-012-00"
          className="max-w-md"
        />
      </div>

      <DocumentBucket
        id="asca-drawings"
        title="Drawings"
        subtitle="Workshop sheets, BOQ, isometrics — extracted first"
        tone="blue"
        documents={drawings.documents}
        onAddDocument={addDocumentTo(setDrawings)}
        onRemoveDocument={removeDocumentFrom(setDrawings)}
        isConfirmed={drawings.confirmed}
        onConfirm={handleConfirmDrawings}
        onUnconfirm={() =>
          setDrawings((prev) => ({ ...prev, confirmed: false, processing: false }))
        }
        onConfirmEmpty={handleEmptyConfirm}
        isProcessing={drawings.processing}
        processingLabel="Nix is reading drawings..."
        confirmLabel="Send drawings to Nix"
      />

      <DocumentBucket
        id="asca-specs"
        title="Specifications"
        subtitle="Painting, rubber lining, fabrication, scope — cross-linked to drawing items"
        tone="purple"
        documents={specs.documents}
        onAddDocument={addDocumentTo(setSpecs)}
        onRemoveDocument={removeDocumentFrom(setSpecs)}
        isConfirmed={specs.confirmed}
        onConfirm={handleConfirmSpecs}
        onUnconfirm={() => setSpecs((prev) => ({ ...prev, confirmed: false, processing: false }))}
        onConfirmEmpty={handleEmptyConfirm}
        isProcessing={specs.processing}
        processingLabel="Nix is reading specs..."
        confirmLabel="Send specs to Nix"
      />

      {reviewReady && session && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-4 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-gray-900">Session #{session.id} ready</h3>
            <p className="text-sm text-gray-700 mt-1">
              Nix has finished reading. Continue to the draft review page to see the extracted items
              and build the quote.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/stock-control/portal/quotations/drafts/${session.id}`)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all whitespace-nowrap"
          >
            Continue to draft review
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
