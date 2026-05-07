"use client";

import { toPairs as entries, isArray, isNumber, isString, keys } from "es-toolkit/compat";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { nixApi } from "@/app/lib/nix";
import {
  type NixExtractionSummary,
  useNixExtractionSession,
  useSetNixExtractionSessionStatus,
} from "@/app/lib/query/hooks";

export default function NixExtractionDraftPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const rawParam = params?.id;
  const sessionIdParam = rawParam;
  let parsedSessionId: number = Number.NaN;
  if (isString(sessionIdParam)) {
    parsedSessionId = Number.parseInt(sessionIdParam, 10);
  } else if (isArray(sessionIdParam)) {
    const first = sessionIdParam[0];
    parsedSessionId = first ? Number.parseInt(first, 10) : Number.NaN;
  }
  const validSessionId = Number.isFinite(parsedSessionId) ? parsedSessionId : null;

  const sessionQuery = useNixExtractionSession(validSessionId);
  const setStatus = useSetNixExtractionSessionStatus();

  const session = sessionQuery.data;
  const sessionExtractions = session?.extractions;
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

  const pdfPreview = usePdfPreview();
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const handleRetry = useCallback(
    async (extraction: NixExtractionSummary) => {
      try {
        setRetryingId(extraction.id);
        showToast(`Retrying extraction for ${extraction.documentName}...`, "info");
        await nixApi.retryExtraction(extraction.id);
        await sessionQuery.refetch();
        showToast(`Retry of ${extraction.documentName} complete.`, "success");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Retry failed", "error");
      } finally {
        setRetryingId(null);
      }
    },
    [showToast, sessionQuery],
  );

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

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteRef, setPromoteRef] = useState("");

  const handlePromoteOpen = useCallback(() => {
    setPromoteRef("");
    setPromoteOpen(true);
  }, []);

  const handlePromoteSubmit = useCallback(async () => {
    if (!validSessionId) return;
    try {
      const trimmed = promoteRef.trim();
      await setStatus.mutateAsync({
        sessionId: validSessionId,
        status: "promoted",
        promotedRef: trimmed.length > 0 ? trimmed : undefined,
      });
      setPromoteOpen(false);
      showToast("Session promoted to quote.", "success");
      router.push("/stock-control/portal/quotations");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to promote session", "error");
    }
  }, [validSessionId, setStatus, showToast, router, promoteRef]);

  const handleArchive = useCallback(async () => {
    if (!validSessionId) return;
    try {
      await setStatus.mutateAsync({ sessionId: validSessionId, status: "archived" });
      showToast("Session archived.", "info");
      router.push("/stock-control/portal/quotations");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to archive session", "error");
    }
  }, [validSessionId, setStatus, showToast, router]);

  if (!validSessionId) {
    return (
      <div className="p-6">
        <p className="text-red-600">Invalid session id.</p>
      </div>
    );
  }

  const isLoadingSession = sessionQuery.isLoading;
  const isErrorSession = sessionQuery.isError;
  if (isLoadingSession) {
    return <div className="p-6 text-sm text-gray-600">Loading session...</div>;
  }

  if (isErrorSession || !session) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load session — it may have been deleted or you may not have access.
      </div>
    );
  }

  const sessionTitle = session.title;
  const titleText = sessionTitle ? sessionTitle : `Draft from documents — session #${session.id}`;
  const promotedRefText = session.promotedRef;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/stock-control/portal/quotations" className="hover:text-gray-700 underline">
              Quotations
            </Link>
            <span>›</span>
            <span>Draft #{session.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{titleText}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Status: <span className="font-semibold capitalize">{session.status}</span>
            {promotedRefText && (
              <>
                {" "}
                — promoted to <span className="font-semibold">{promotedRefText}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.status !== "promoted" && (
            <button
              type="button"
              onClick={handlePromoteOpen}
              disabled={setStatus.isPending}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              Promote to quote
            </button>
          )}
          {session.status !== "archived" && session.status !== "promoted" && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={setStatus.isPending}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium shadow-sm hover:bg-gray-300 disabled:opacity-50"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      <ExtractionGroup
        title="Drawings"
        subtitle="Line items extracted from workshop sheets / drawings"
        tone="blue"
        extractions={drawingExtractions}
        onViewOriginal={handleViewOriginal}
        onRetry={handleRetry}
        retryingId={retryingId}
        emptyMessage="No drawings uploaded into this session yet."
      />

      <ExtractionGroup
        title="Specifications"
        subtitle="Clause-level facts; cross-linked codes from the drawings highlighted below"
        tone="purple"
        extractions={specExtractions}
        onViewOriginal={handleViewOriginal}
        onRetry={handleRetry}
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
          onRetry={handleRetry}
          retryingId={retryingId}
        />
      )}

      {session.status !== "promoted" && session.status !== "archived" && (
        <div className="flex items-center justify-center pt-2">
          <Link
            href={`/stock-control/portal/quotations/new-from-documents?session=${session.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700"
          >
            Add more documents to this draft
          </Link>
        </div>
      )}

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />

      <FormModal
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onSubmit={handlePromoteSubmit}
        title="Promote session to quote"
        submitLabel="Promote"
        loading={setStatus.isPending}
      >
        <p className="text-sm text-gray-700 mb-3">
          Optionally enter the reference of the quote this session was used to create. Leave blank
          to promote without a reference.
        </p>
        <input
          type="text"
          value={promoteRef}
          onChange={(event) => setPromoteRef(event.target.value)}
          placeholder="e.g. QUO-2026-0193"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </FormModal>
    </div>
  );
}

interface ExtractionGroupProps {
  title: string;
  subtitle: string;
  tone: "blue" | "purple" | "gray";
  extractions: NixExtractionSummary[];
  onViewOriginal: (extraction: NixExtractionSummary) => void;
  onRetry: (extraction: NixExtractionSummary) => void;
  retryingId: number | null;
  emptyMessage?: string;
  showSpecifications?: boolean;
}

function ExtractionGroup(props: ExtractionGroupProps) {
  const {
    title,
    subtitle,
    tone,
    extractions,
    onViewOriginal,
    onRetry,
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
              onRetry={onRetry}
              retryingId={retryingId}
              showSpecifications={showSpecifications}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ExtractionCardProps {
  extraction: NixExtractionSummary;
  onViewOriginal: (extraction: NixExtractionSummary) => void;
  onRetry: (extraction: NixExtractionSummary) => void;
  retryingId: number | null;
  showSpecifications?: boolean;
}

function ExtractionCard(props: ExtractionCardProps) {
  const { extraction, onViewOriginal, onRetry, retryingId, showSpecifications } = props;
  const rawItems = extraction.extractedItems;
  const items = (rawItems ? rawItems : []) as Array<Record<string, unknown>>;
  const rawData = extraction.extractedData;
  const data = (rawData ? rawData : {}) as Record<string, unknown>;
  const rawSpecs = data.specifications;
  const specifications = (rawSpecs ? rawSpecs : {}) as Record<string, unknown>;
  const specKeys = keys(specifications);
  const isRetrying = retryingId === extraction.id;
  const canRetry = Boolean(extraction.storagePath) && !isRetrying;

  return (
    <div className="bg-white rounded border border-gray-200 p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{extraction.documentName}</p>
          <p className="text-xs text-gray-500">
            Status: {extraction.status} • {items.length} item{items.length === 1 ? "" : "s"}
            {extraction.storagePath && " • saved to S3"}
          </p>
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onRetry(extraction)}
            disabled={!canRetry}
            className="text-xs text-orange-600 hover:text-orange-800 underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
            title={
              extraction.storagePath
                ? "Re-run extraction against the stored source"
                : "No stored source — re-upload the file from the upload page"
            }
          >
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
          <button
            type="button"
            onClick={() => onViewOriginal(extraction)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            View original
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-1 pr-3 font-medium">Mark / #</th>
                <th className="py-1 pr-3 font-medium">Description</th>
                <th className="py-1 pr-3 font-medium">Qty</th>
                <th className="py-1 pr-3 font-medium">Dimensions</th>
                <th className="py-1 pr-3 font-medium">Linings / Codes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <ItemRow key={idx} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSpecifications && specKeys.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-1">Specification clauses</h4>
          <div className="space-y-2">
            {entries(specifications).map(([clauseKey, clauseValue]) => (
              <SpecificationRow key={clauseKey} clauseKey={clauseKey} value={clauseValue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow(props: { item: Record<string, unknown> }) {
  const { item } = props;
  const itemNumber = item.itemNumber;
  const itemMark = item.mark;
  let mark: string = "—";
  if (isString(itemNumber) && itemNumber.length > 0) mark = itemNumber;
  else if (isString(itemMark) && itemMark.length > 0) mark = itemMark;

  const rawDescription = item.description;
  const description = isString(rawDescription) ? rawDescription : "";

  const rawQuantity = item.quantity;
  let quantity = 1;
  if (isNumber(rawQuantity)) {
    quantity = rawQuantity;
  } else if (rawQuantity !== undefined && rawQuantity !== null) {
    const parsed = Number(rawQuantity);
    quantity = Number.isFinite(parsed) ? parsed : 1;
  }

  const itemDiameter = item.diameter;
  const itemNb = item.nb;
  const diameter = itemDiameter ? itemDiameter : itemNb;

  const itemWt = item.wt;
  const itemWallThickness = item.wallThickness;
  const wallThickness = itemWallThickness ? itemWallThickness : itemWt;

  const itemLength = item.length;
  const itemLengthMm = item.lengthMm;
  const itemOverallLengthMm = item.overallLengthMm;
  const length = itemLength ? itemLength : itemLengthMm ? itemLengthMm : itemOverallLengthMm;

  const dimensionParts: string[] = [];
  if (diameter !== undefined && diameter !== null) dimensionParts.push(`NB ${String(diameter)}`);
  if (wallThickness !== undefined && wallThickness !== null)
    dimensionParts.push(`WT ${String(wallThickness)}`);
  if (length !== undefined && length !== null) dimensionParts.push(`L ${String(length)}`);
  const dimensions = dimensionParts.join(" × ");

  const codeCandidates = [
    item.coatingSystem,
    item.paintSystem,
    item.liningType,
    item.lining,
    item.materialClass,
    item.flangeConfig,
  ];
  const codes = codeCandidates.filter(
    (value): value is string => isString(value) && value.length > 0,
  );

  return (
    <tr className="border-b border-gray-100">
      <td className="py-1 pr-3 font-mono text-gray-700">{mark}</td>
      <td className="py-1 pr-3 text-gray-900 max-w-md truncate">{description}</td>
      <td className="py-1 pr-3 text-gray-900">{quantity}</td>
      <td className="py-1 pr-3 text-gray-700">{dimensions || "—"}</td>
      <td className="py-1 pr-3 text-gray-700">{codes.length > 0 ? codes.join(" / ") : "—"}</td>
    </tr>
  );
}

function SpecificationRow(props: { clauseKey: string; value: unknown }) {
  const { clauseKey, value } = props;
  if (clauseKey === "referencedCodes" && isArray(value)) {
    return (
      <p className="text-xs text-gray-600">
        <span className="font-semibold">Referenced codes:</span> {value.map(String).join(", ")}
      </p>
    );
  }

  const display = isString(value) ? value : JSON.stringify(value, null, 2);
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-800">
        <span className="font-semibold">{clauseKey}</span>
      </summary>
      <pre className="mt-1 whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-2">{display}</pre>
    </details>
  );
}
