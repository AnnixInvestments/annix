"use client";

import { isNumber } from "es-toolkit/compat";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { type NixDocumentRole, nixApi } from "@/app/lib/nix";
import { DocNumberAutocomplete } from "@/app/lib/nix/components/library";
import {
  extractionPassesOf,
  SmartDropzone,
  type SmartPendingDocument,
  useSmartDocuments,
} from "@/app/lib/nix/components/upload";
import { isEmlFile, parseEmail } from "@/app/lib/nix/emlAttachmentExtractor";
import {
  type NixExtractionSessionDto,
  useCreateNixExtractionSession,
  useFeatureFlagEnabled,
  useNixExtractionSession,
} from "@/app/lib/query/hooks";

const NIX_QUOTE_FROM_DOCS_FLAG = "STOCK_MGMT_NIX_QUOTE_FROM_DOCUMENTS";

const ASCA_PROFILE_KEY = "asca-quote-documents";
const ASCA_SOURCE_MODULE = "asca";

export default function QuoteFromDocumentsPage() {
  const router = useRouter();
  const auth = useStockControlAuth();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const nixQuoteFlag = useFeatureFlagEnabled(NIX_QUOTE_FROM_DOCS_FLAG);
  const userId = auth.user?.id;

  const searchParams = useSearchParams();
  const sessionParam = searchParams?.get("session");
  const parsedExistingSessionId = sessionParam ? Number.parseInt(sessionParam, 10) : Number.NaN;
  const existingSessionId = Number.isFinite(parsedExistingSessionId)
    ? parsedExistingSessionId
    : null;

  const smartDocs = useSmartDocuments();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
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
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const ensureSession = useCallback(async (): Promise<NixExtractionSessionDto> => {
    if (session) return session;
    const created = await createSessionMutation.mutateAsync({
      sourceModule: ASCA_SOURCE_MODULE,
      extractionProfile: ASCA_PROFILE_KEY,
    });
    setSession(created);
    return created;
  }, [session, createSessionMutation]);

  const addDocument = useCallback(
    (file: File) => {
      // .eml drops: parse the email in-browser, route its PDF / XLSX
      // attachments into the same bucket the .eml landed in. Inline
      // images (signatures) are skipped. The email body is surfaced as
      // a toast so client notes like 'Item 4 cancelled' aren't lost —
      // the quoter can copy any instructions into the session notes
      // after the bucket loads. parseEmail is the same helper the RFQ
      // ProjectDetailsStep uses.
      if (isEmlFile(file)) {
        void parseEmail(file)
          .then((parsed) => {
            if (!parsed) {
              alert({
                message: `Couldn't read ${file.name}. Save the attachments out of your mail client and drop them individually.`,
                variant: "error",
              });
              return;
            }
            let attachmentsAdded = 0;
            for (const attachment of parsed.attachments) {
              if (attachment.kind === "image") continue;
              smartDocs.addFile(attachment.file);
              attachmentsAdded += 1;
            }
            const subjectRaw = parsed.metadata.subject;
            const subject = subjectRaw ?? "(no subject)";
            const bodySnippet = parsed.metadata.bodyText
              ? parsed.metadata.bodyText.trim().slice(0, 240)
              : "";
            if (attachmentsAdded === 0) {
              showToast(`${file.name}: no extractable attachments found.`, "warning");
              return;
            }
            const noteHint = bodySnippet.length > 0 ? ` Body: "${bodySnippet}…"` : "";
            showToast(
              `Loaded ${attachmentsAdded} attachment${attachmentsAdded === 1 ? "" : "s"} from ${subject}.${noteHint} Log any client instructions in the quote notes after extraction.`,
              "info",
            );
          })
          .catch(() => {
            alert({ message: `Couldn't read ${file.name}.`, variant: "error" });
          });
        return;
      }
      smartDocs.addFile(file);
    },
    [showToast, alert, smartDocs],
  );

  const processPass = useCallback(
    async (
      role: NixDocumentRole,
      documents: SmartPendingDocument[],
      label: string,
    ): Promise<void> => {
      const activeSession = await ensureSession();
      const verdicts: Array<{
        filename: string;
        verdict: NonNullable<
          Awaited<ReturnType<typeof nixApi.uploadAndProcess>>["revisionVerdict"]
        >;
      }> = [];
      const result = await runBulk({
        brand: "stock-control",
        metricCategory: "asca-quote-extract",
        metricOperation: role,
        items: documents,
        itemId: (doc) => doc.id,
        itemLabel: (doc, i, t) =>
          `Reading ${label.toLowerCase()} ${i + 1} of ${t}: ${doc.file.name}`,
        run: async (doc) => {
          const response = await nixApi.uploadAndProcess(doc.file, {
            userId,
            sourceModule: ASCA_SOURCE_MODULE,
            extractionProfile: ASCA_PROFILE_KEY,
            documentRole: doc.role,
            sessionId: activeSession.id,
          });
          if (response.revisionVerdict) {
            verdicts.push({ filename: doc.file.name, verdict: response.revisionVerdict });
          }
        },
      });
      const succeeded = result.succeeded.length;
      const failed = result.failed.length;
      if (failed === 0) {
        showToast(`${label}: processed ${succeeded} document${succeeded === 1 ? "" : "s"}`);
      } else {
        showToast(`${label}: ${succeeded} succeeded, ${failed} failed`);
      }
      await surfaceRevisionVerdicts(verdicts, {
        showToast,
        showExtraction,
        hideExtraction,
      });
    },
    [userId, showToast, ensureSession, runBulk, showExtraction, hideExtraction],
  );

  // One button, two-pass orchestration (issue #266): even from a
  // single dropzone, drawings extract before specifications so the
  // spec prompt's cross-linking block still receives the drawings'
  // referencedCodes as session context. 'Other' goes last - no
  // cross-link dependency.
  const handleProcessAll = useCallback(async () => {
    if (smartDocs.documents.length === 0) {
      setErrorMessage("Add at least one document before sending to Nix.");
      return;
    }
    if (smartDocs.documents.some((doc) => doc.classifying)) {
      setErrorMessage("Still classifying a document - give it a second, or set its role manually.");
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const passes = extractionPassesOf(smartDocs.documents);
      const passLabels: Record<NixDocumentRole, string> = {
        drawing: "Drawings",
        specification: "Specifications",
        other: "Other documents",
      };
      await passes.reduce(
        (chain, pass) =>
          chain.then(() => processPass(pass.role, pass.documents, passLabels[pass.role])),
        Promise.resolve(),
      );
      setProcessedCount(smartDocs.documents.length);
      smartDocs.reset();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Document upload failed");
    } finally {
      setIsProcessing(false);
    }
  }, [smartDocs, processPass]);

  const reviewReady = session !== null && processedCount > 0;

  // Gate: this whole flow is the 'Nix quote from documents' add-on. When
  // the feature flag is off (base-tier deployment), redirect users back
  // to the Quotations list rather than letting them upload to a feature
  // they haven't paid for. Loading state shows nothing — avoids a flash
  // of the upload page before the flag resolves.
  if (nixQuoteFlag.isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }
  if (!nixQuoteFlag.enabled) {
    return (
      <div className="p-6 max-w-xl">
        <h1 className="text-xl font-semibold text-gray-900">Add-on not enabled</h1>
        <p className="text-sm text-gray-600 mt-2">
          The 'New quote from documents' AI feature isn't enabled on this deployment. Contact your
          Annix account manager if you'd like it activated.
        </p>
        <Link
          href="/stock-control/portal/quotations"
          className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to quotations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New quote from documents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Drop the whole customer pack in one place - Nix tags each file as a drawing,
            specification or other document. Drawings still extract first so paint codes / material
            classes cross-link to the spec clauses that define them.
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

      <SmartDropzone
        title="Customer documents"
        subtitle="Drawings, BOQ spreadsheets, painting / lining specs, scope docs - drop them all here"
        documents={smartDocs.documents}
        onAddDocument={addDocument}
        onRemoveDocument={smartDocs.removeDocument}
        onReclassify={smartDocs.reclassify}
        onProcess={handleProcessAll}
        isProcessing={isProcessing}
        processingLabel="Nix is reading documents..."
        processLabel="Send all to Nix"
      />

      {reviewReady && session && (
        <div className="bg-gradient-to-r from-emerald-50 to-[var(--sc-primary-50,#eeeef6)] border-2 border-emerald-300 rounded-lg p-4 flex items-center justify-between gap-4 shadow-sm">
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
      {AlertDialog}
    </div>
  );
}

type RevisionVerdict = NonNullable<
  Awaited<ReturnType<typeof nixApi.uploadAndProcess>>["revisionVerdict"]
>;

/**
 * Issues per-doc toasts summarising the revision-supersession verdicts that
 * came back from the bulk upload. Silent for 'first' / 'same'. 'newer' is
 * a positive — green confirmation that the system replaced an older copy.
 * 'older' / 'unknown' are warnings — the user uploaded something that's
 * out of date or can't be ordered against what's on file. The per-card
 * RevisionBadge already surfaces the persistent state; the toast here is
 * an at-the-moment alert so the user doesn't miss it.
 */
async function surfaceRevisionVerdicts(
  verdicts: Array<{ filename: string; verdict: RevisionVerdict }>,
  callbacks: {
    showToast: (msg: string, kind?: "success" | "error" | "warning") => void;
    showExtraction: (input: {
      brand: "stock-control";
      label: string;
      estimatedDurationMs: number;
    }) => void;
    hideExtraction: () => void;
  },
): Promise<void> {
  const { showToast, showExtraction, hideExtraction } = callbacks;
  for (const { filename, verdict } of verdicts) {
    if (verdict.action === "newer") {
      const previous = verdict.previousCanonicalRevision;
      const oldRev = previous ?? "?";
      showToast(
        `${filename}: replaced rev ${oldRev} with new revision — old version archived`,
        "success",
      );
    } else if (verdict.action === "older") {
      const latest = verdict.latestRevision;
      const latestRev = latest ?? "?";
      showToast(
        `${filename}: rev ${latestRev} is already on file — uploaded copy is older`,
        "warning",
      );
    } else if (verdict.action === "unknown") {
      const other = verdict.otherRevision;
      const otherRev = other ?? "?";
      showToast(
        `${filename}: revision differs from rev ${otherRev} on file but order is unclear — please check the badge`,
        "warning",
      );
    } else if (verdict.action === "duplicate-in-session") {
      // User re-uploaded the same file (filename match). Auto-retry the
      // existing extraction so Nix re-reads the document fresh, and use
      // the BRAND extraction-progress modal — not a toast — so the user
      // sees Nix working through the document end-to-end. Pool-level
      // dedup (poolItemsBySpec) handles any overlap with other drawings
      // in the session.
      const canonicalId = verdict.canonicalExtractionId;
      if (!isNumber(canonicalId)) continue;
      showExtraction({
        brand: "stock-control",
        label: `Re-extracting ${filename} — Nix is re-reading the whole document…`,
        estimatedDurationMs: 60_000,
      });
      try {
        await nixApi.retryExtraction(canonicalId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "re-extract failed";
        showToast(`${filename}: re-extract failed — ${msg}`, "error");
      } finally {
        hideExtraction();
      }
    }
  }
}
