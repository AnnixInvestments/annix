"use client";

import {
  toPairs as entries,
  isArray,
  isBoolean,
  isNumber,
  isObject,
  isString,
  keys,
} from "es-toolkit/compat";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
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
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const handleRetry = useCallback(
    async (extraction: NixExtractionSummary) => {
      try {
        setRetryingId(extraction.id);
        showExtraction({
          brand: "stock-control",
          label: `Re-extracting ${extraction.documentName}…`,
          estimatedDurationMs: 60_000,
        });
        await nixApi.retryExtraction(extraction.id);
        await sessionQuery.refetch();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Retry failed", "error");
      } finally {
        hideExtraction();
        setRetryingId(null);
      }
    },
    [showToast, sessionQuery, showExtraction, hideExtraction],
  );

  const handleItemSaved = useCallback(() => {
    sessionQuery.refetch();
  }, [sessionQuery]);

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
        // the user sees the full width without manual zoom (better default
        // than the browser's 'auto' on first open). Both params are honoured
        // by Chrome / Edge / Firefox built-in PDF viewers.
        pdfPreview.open(`${url}${separator}page=${safePage}&view=FitH`, extraction.documentName);
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
  onJumpToPage: (extraction: NixExtractionSummary, page: number) => void;
  onRetry: (extraction: NixExtractionSummary) => void;
  onItemSaved: () => void;
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

interface ExtractionCardProps {
  extraction: NixExtractionSummary;
  onViewOriginal: (extraction: NixExtractionSummary) => void;
  onJumpToPage: (extraction: NixExtractionSummary, page: number) => void;
  onRetry: (extraction: NixExtractionSummary) => void;
  onItemSaved: () => void;
  retryingId: number | null;
  showSpecifications?: boolean;
}

function ExtractionCard(props: ExtractionCardProps) {
  const {
    extraction,
    onViewOriginal,
    onJumpToPage,
    onRetry,
    onItemSaved,
    retryingId,
    showSpecifications,
  } = props;
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
                <ItemRow
                  key={idx}
                  item={item}
                  index={idx}
                  extractionId={extraction.id}
                  onSaved={onItemSaved}
                />
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
              <SpecificationRow
                key={clauseKey}
                clauseKey={clauseKey}
                value={clauseValue}
                onJumpToPage={(page) => onJumpToPage(extraction, page)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow(props: {
  item: Record<string, unknown>;
  index: number;
  extractionId: number;
  onSaved: () => void;
}) {
  const { item, index, extractionId, onSaved } = props;
  const itemNumber = item.itemNumber;
  const itemMark = item.mark;
  let mark: string = "—";
  if (isString(itemNumber) && itemNumber.length > 0) mark = itemNumber;
  else if (isString(itemMark) && itemMark.length > 0) mark = itemMark;
  const itemNumberKey = isString(itemNumber) && itemNumber.length > 0 ? itemNumber : undefined;

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

  const rowKey = { itemNumber: itemNumberKey, index };

  const coating = isString(item.coatingSystem) ? (item.coatingSystem as string) : "";
  const lining = isString(item.liningType) ? (item.liningType as string) : "";
  const materialClass = isString(item.materialClass) ? (item.materialClass as string) : "";
  const flangeConfig = isString(item.flangeConfig) ? (item.flangeConfig as string) : "";
  const codeParts = [coating, lining, materialClass, flangeConfig].filter((p) => p.length > 0);
  const codesDisplay = codeParts.length > 0 ? codeParts.join(" / ") : "—";

  return (
    <tr className="border-b border-gray-100">
      <td className="py-1 pr-3 font-mono text-gray-700">{mark}</td>
      <td className="py-1 pr-3 text-gray-900 max-w-md">
        <EditableCell
          extractionId={extractionId}
          rowKey={rowKey}
          field="description"
          value={description}
          onSaved={onSaved}
        />
      </td>
      <td className="py-1 pr-3 text-gray-900">
        <EditableCell
          extractionId={extractionId}
          rowKey={rowKey}
          field="quantity"
          value={String(quantity)}
          onSaved={onSaved}
          numeric
        />
      </td>
      <td className="py-1 pr-3 text-gray-700">{dimensions || "—"}</td>
      <td className="py-1 pr-3 text-gray-700">
        <CodesEditor
          extractionId={extractionId}
          rowKey={rowKey}
          coating={coating}
          lining={lining}
          materialClass={materialClass}
          flangeConfig={flangeConfig}
          display={codesDisplay}
          onSaved={onSaved}
        />
      </td>
    </tr>
  );
}

function EditableCell(props: {
  extractionId: number;
  rowKey: { itemNumber?: string; index?: number };
  field: string;
  value: string;
  onSaved: () => void;
  numeric?: boolean;
}) {
  const { extractionId, rowKey, field, value, onSaved, numeric } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const payload: string | number | null =
        numeric && draft.length > 0 ? Number(draft) : draft.length === 0 ? null : draft;
      await nixApi.patchExtractionItem(extractionId, rowKey, field, payload);
      onSaved();
    } catch {
      // toast not necessary — surface failure by reverting and a brief shake later
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type={numeric ? "number" : "text"}
        value={draft}
        autoFocus
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") cancelEdit();
        }}
        className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={startEdit}
      className="text-left w-full hover:bg-blue-50 rounded px-1 py-0.5 truncate"
      title="Click to edit"
    >
      {value || <span className="text-gray-400">—</span>}
    </button>
  );
}

function CodesEditor(props: {
  extractionId: number;
  rowKey: { itemNumber?: string; index?: number };
  coating: string;
  lining: string;
  materialClass: string;
  flangeConfig: string;
  display: string;
  onSaved: () => void;
}) {
  const { extractionId, rowKey, coating, lining, materialClass, flangeConfig, display, onSaved } =
    props;
  const [open, setOpen] = useState(false);
  const [c, setC] = useState(coating);
  const [l, setL] = useState(lining);
  const [m, setM] = useState(materialClass);
  const [f, setF] = useState(flangeConfig);
  const [saving, setSaving] = useState(false);

  const cancel = () => {
    setC(coating);
    setL(lining);
    setM(materialClass);
    setF(flangeConfig);
    setOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ops: Array<[string, string]> = [
        ["coatingSystem", c],
        ["liningType", l],
        ["materialClass", m],
        ["flangeConfig", f],
      ];
      const original: Record<string, string> = {
        coatingSystem: coating,
        liningType: lining,
        materialClass: materialClass,
        flangeConfig: flangeConfig,
      };
      for (const [field, val] of ops) {
        if (val !== original[field]) {
          await nixApi.patchExtractionItem(
            extractionId,
            rowKey,
            field,
            val.length === 0 ? null : val,
          );
        }
      }
      onSaved();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left hover:bg-blue-50 rounded px-1 py-0.5"
        title="Click to edit codes"
      >
        {display}
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1 p-2 bg-blue-50 border border-blue-200 rounded">
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Coating
        <input
          type="text"
          value={c}
          disabled={saving}
          onChange={(e) => setC(e.target.value)}
          placeholder="(empty = uncoated)"
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Lining
        <input
          type="text"
          value={l}
          disabled={saving}
          onChange={(e) => setL(e.target.value)}
          placeholder="(empty = unlined)"
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Material class
        <input
          type="text"
          value={m}
          disabled={saving}
          onChange={(e) => setM(e.target.value)}
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Flange / ends
        <input
          type="text"
          value={f}
          disabled={saving}
          onChange={(e) => setF(e.target.value)}
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <div className="col-span-2 flex justify-end gap-2 mt-1">
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function SpecificationRow(props: {
  clauseKey: string;
  value: unknown;
  onJumpToPage: (page: number) => void;
}) {
  const { clauseKey, value, onJumpToPage } = props;
  if (clauseKey === "referencedCodes" && isArray(value)) {
    return (
      <p className="text-xs text-gray-600">
        <span className="font-semibold">Referenced codes:</span> {value.map(String).join(", ")}
      </p>
    );
  }

  if (isString(value)) {
    return (
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-800">
          <span className="font-semibold">{clauseKey}</span>
        </summary>
        <pre className="mt-1 whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-2">{value}</pre>
      </details>
    );
  }

  const obj = (value ?? {}) as Record<string, unknown>;
  const summary = isString(obj.summary) ? (obj.summary as string) : null;
  const description = isString(obj.description) ? (obj.description as string) : null;
  const headlineText = summary ?? description ?? "";
  const rawApplicableMarks = obj.applicableMarks;
  const applicableMarks = isArray(rawApplicableMarks)
    ? (rawApplicableMarks as unknown[]).filter(isString)
    : [];
  const applicableScope = isString(obj.applicableScope) ? (obj.applicableScope as string) : null;
  const rawPage = obj.pageReference;
  let pageReference: number | null = null;
  if (isNumber(rawPage)) pageReference = rawPage;
  else if (isString(rawPage)) {
    const parsed = Number.parseInt(rawPage, 10);
    pageReference = Number.isFinite(parsed) ? parsed : null;
  }
  const rawDetails = obj.details;
  const detailsObj = isObject(rawDetails) ? (rawDetails as Record<string, unknown>) : null;

  let scopeText = "";
  if (applicableScope === "all") scopeText = "Applies to all items";
  else if (applicableScope === "items" && applicableMarks.length > 0)
    scopeText = `Applies to items ${applicableMarks.join(", ")}`;
  else if (applicableMarks.length > 0) scopeText = `Applies to items ${applicableMarks.join(", ")}`;

  return (
    <details className="group bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow open:shadow-md">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-start gap-3">
        <svg
          className="w-4 h-4 mt-0.5 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900">{clauseKey}</h3>
            {pageReference !== null && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onJumpToPage(pageReference);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-medium whitespace-nowrap"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Page {pageReference}
              </button>
            )}
          </div>
          {headlineText.length > 0 && (
            <p className="mt-1 text-xs text-gray-700 leading-snug">{headlineText}</p>
          )}
          {(applicableScope === "all" || applicableMarks.length > 0) && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                {applicableScope === "all" ? "Applies to" : "Items"}
              </span>
              {applicableScope === "all" ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                  All items
                </span>
              ) : (
                applicableMarks.map((mark) => (
                  <span
                    key={mark}
                    className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[11px] font-mono border border-purple-200"
                  >
                    {mark}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      </summary>
      {detailsObj && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <DetailsBlock details={detailsObj} />
        </div>
      )}
      {!detailsObj && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <pre className="mt-3 whitespace-pre-wrap text-[11px] text-gray-700 bg-gray-50 rounded p-2">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
    </details>
  );
}

interface ParsedKey {
  label: string;
  unit: string | null;
}

function parseKey(key: string): ParsedKey {
  let body = key;
  let unit: string | null = null;
  const unitMatch = body.match(/_(mm|m|kg|kPa|MPa|µm|um|hrs|hours|percent|degC|degF)$/i);
  if (unitMatch) {
    const u = unitMatch[1];
    if (u === "percent") unit = "%";
    else if (u === "hours") unit = "hrs";
    else if (u === "degC") unit = "°C";
    else if (u === "degF") unit = "°F";
    else if (u === "um") unit = "µm";
    else unit = u;
    body = body.slice(0, -unitMatch[0].length);
  }
  const words = body
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/);
  const label = words
    .map((w, i) => {
      if (w.length === 0) return w;
      if (w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
  return { label, unit };
}

function humaniseKey(key: string): string {
  const { label, unit } = parseKey(key);
  return unit ? `${label} (${unit})` : label;
}

function isPureNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

function looksLikeNumberWithUnit(value: unknown): boolean {
  if (isPureNumber(value)) return true;
  if (isString(value)) {
    const trimmed = value.trim();
    return /^-?\d+(\.\d+)?\s*(?:°[CF]|µm|um|mm|cm|m|MPa|kPa|N\/mm|IRHD|%|hrs|hours|kg)?$/i.test(
      trimmed,
    );
  }
  return false;
}

function tryRangeString(nested: Record<string, unknown>, unit: string): string | null {
  // Collapse { min: -40, max: 75 } into "-40 to 75 °C".
  const minRaw = nested.min;
  const minimumRaw = nested.minimum;
  const lowerRaw = nested.lower;
  const maxRaw = nested.max;
  const maximumRaw = nested.maximum;
  const upperRaw = nested.upper;
  const min = minRaw ?? minimumRaw ?? lowerRaw;
  const max = maxRaw ?? maximumRaw ?? upperRaw;
  if (min === undefined || max === undefined) return null;
  if (!isPureNumber(min) || !isPureNumber(max)) return null;
  return `${min} to ${max} ${unit}`.trim();
}

function StatCard(props: { label: string; value: string; unit: string | null }) {
  const { label, value, unit } = props;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-bold text-gray-900 tabular-nums">{value}</span>
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}

function DetailsBlock(props: { details: Record<string, unknown> }) {
  const { details } = props;
  const rows = entries(details).filter(
    ([, v]) =>
      v !== null && v !== undefined && v !== "" && !(isArray(v) && (v as unknown[]).length === 0),
  );
  if (rows.length === 0) return null;

  const stats: { key: string; label: string; value: string; unit: string | null }[] = [];
  const texts: { key: string; label: string; display: string }[] = [];
  const arrays: { key: string; label: string; items: string[] }[] = [];
  const sections: { key: string; label: string; nested: Record<string, unknown> }[] = [];

  for (const [k, v] of rows) {
    const { label, unit } = parseKey(k);

    if (isObject(v) && !isArray(v)) {
      const nested = v as Record<string, unknown>;
      // Try to collapse { min, max } into a range stat
      const range = tryRangeString(nested, unit ?? "");
      if (range) {
        stats.push({ key: k, label, value: range, unit: null });
        continue;
      }
      sections.push({ key: k, label, nested });
      continue;
    }

    if (isArray(v)) {
      const items = (v as unknown[])
        .filter((entry) => entry !== null && entry !== undefined && entry !== "")
        .map((entry) =>
          isString(entry) || isNumber(entry) ? String(entry) : JSON.stringify(entry),
        );
      if (items.length > 0) arrays.push({ key: k, label, items });
      continue;
    }

    if (looksLikeNumberWithUnit(v) && (unit || isPureNumber(v))) {
      const numValue = isPureNumber(v) ? String(v) : (v as string).trim();
      stats.push({ key: k, label, value: numValue, unit });
      continue;
    }

    let display: string;
    if (isString(v)) display = v;
    else if (isPureNumber(v)) display = String(v);
    else if (isBoolean(v)) display = v ? "Yes" : "No";
    else display = JSON.stringify(v);
    texts.push({ key: k, label: unit ? `${label} (${unit})` : label, display });
  }

  return (
    <div className="mt-3 space-y-3">
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {stats.map((s) => (
            <StatCard key={s.key} label={s.label} value={s.value} unit={s.unit} />
          ))}
        </div>
      )}

      {texts.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {texts.map((t) => (
            <div key={t.key} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                {t.label}
              </dt>
              <dd className="mt-0.5 text-sm text-gray-800 break-words">{t.display}</dd>
            </div>
          ))}
        </dl>
      )}

      {arrays.map((a) => (
        <div key={a.key}>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">
            {a.label}
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            {a.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {sections.map((s) => (
        <div key={s.key} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-bold text-gray-800 mb-1 pb-1 border-b border-gray-100">
            {s.label}
          </div>
          <DetailsBlock details={s.nested} />
        </div>
      ))}
    </div>
  );
}
