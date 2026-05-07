"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DocumentBucket, type PendingDocument } from "@/app/components/uploads";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { type NixDocumentRole, nixApi } from "@/app/lib/nix";
import { type NixExtractionSessionDto, useCreateNixExtractionSession } from "@/app/lib/query/hooks";

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

  const [drawings, setDrawings] = useState<BucketState>(emptyBucket);
  const [specs, setSpecs] = useState<BucketState>(emptyBucket);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<NixExtractionSessionDto | null>(null);

  const createSessionMutation = useCreateNixExtractionSession();

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
      let processedCount = 0;
      for (const doc of bucket.documents) {
        await nixApi.uploadAndProcess(doc.file, {
          userId,
          sourceModule: ASCA_SOURCE_MODULE,
          extractionProfile: ASCA_PROFILE_KEY,
          documentRole: role,
          sessionId: activeSession.id,
        });
        processedCount += 1;
      }
      showToast(`${label}: processed ${processedCount} document${processedCount === 1 ? "" : "s"}`);
    },
    [userId, showToast, ensureSession],
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
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Session #{session.id} ready</h3>
          <p className="text-xs text-gray-600 mb-2">
            Continue to the draft review page to see what Nix found and build the quote.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/stock-control/portal/quotations/drafts/${session.id}`)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Continue to draft review →
          </button>
        </div>
      )}
    </div>
  );
}
