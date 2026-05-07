"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DocumentBucket, type PendingDocument } from "@/app/components/uploads";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { nixApi } from "@/app/lib/nix";

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
  const [extractionIds, setExtractionIds] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    async (bucket: BucketState, profileLabel: string): Promise<number[]> => {
      const ids: number[] = [];
      for (const doc of bucket.documents) {
        const result = await nixApi.uploadAndProcess(doc.file, {
          userId,
          sourceModule: ASCA_SOURCE_MODULE,
          extractionProfile: ASCA_PROFILE_KEY,
        });
        if (result.extractionId) ids.push(result.extractionId);
      }
      showToast(`${profileLabel}: processed ${ids.length} document${ids.length === 1 ? "" : "s"}`);
      return ids;
    },
    [userId, showToast],
  );

  const handleConfirmDrawings = useCallback(async () => {
    setErrorMessage(null);
    setDrawings((prev) => ({ ...prev, confirmed: true, processing: true }));
    try {
      const ids = await processBucket(drawings, "Drawings");
      setExtractionIds((prev) => [...prev, ...ids]);
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
      const ids = await processBucket(specs, "Specifications");
      setExtractionIds((prev) => [...prev, ...ids]);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New quote from documents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Drop customer drawings and specifications separately. Nix extracts line items and
            applicable spec references against the ASCA quote profile.
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
        subtitle="Workshop sheets, BOQ, isometrics"
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
        subtitle="Painting, rubber lining, fabrication, scope"
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

      {extractionIds.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Extracted {extractionIds.length} document{extractionIds.length === 1 ? "" : "s"}
          </h3>
          <p className="text-xs text-gray-600 mb-2">Extraction IDs: {extractionIds.join(", ")}</p>
          <button
            type="button"
            onClick={() => router.push("/stock-control/portal/quotations")}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Continue to quote builder →
          </button>
        </div>
      )}
    </div>
  );
}
