"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  type SourcingBucket,
  type SourcingPlan,
  useDraftSourcingAi,
  usePlanSourcing,
  useReassignSourcingItem,
  useSendSourcingBucket,
  useSourcingPlan,
  useUpdateSourcingDraftBody,
} from "@/app/lib/query/hooks";

function defaultDraftBody(bucket: SourcingBucket): string {
  const lines = bucket.items.map(
    (item) => `- Row ${item.rowNumber}: ${item.description} (${item.quantity} ${item.unit})`,
  );
  return [
    `Dear ${bucket.name},`,
    "",
    `Please provide a quotation for the following ${bucket.category} items:`,
    "",
    ...lines,
    "",
    "Kind regards,",
  ].join("\n");
}

function scoreBandClass(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-800 border-green-300";
  if (score >= 40) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
      <span className="font-semibold text-gray-500">Match score:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden="true" />
        70 or higher — good
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
        40–69 — partial
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
        below 40 — weak
      </span>
    </div>
  );
}

function friendlySendError(error: Error): string {
  const message = error.message;
  if (message.includes("Session expired")) {
    return message;
  }
  if (message.includes("Forbidden") || message.includes("403")) {
    return "You don't have permission to send for this session.";
  }
  if (message.includes("No deliverable email")) {
    return "This supplier has no email on file, so the request can't be sent yet.";
  }
  return "Something went wrong sending the request — please try again.";
}

function Spinner(props: { label: string }) {
  const { label } = props;
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <svg
        className="w-10 h-10 text-orange-500 animate-spin"
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
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}

function LineItemRow(props: {
  item: SourcingBucket["items"][number];
  otherBuckets: SourcingBucket[];
  reassigning: boolean;
  disabled: boolean;
  onReassign: (rowNumber: number, targetBucketRef: string) => void;
}) {
  const { item, otherBuckets, reassigning, disabled, onReassign } = props;
  const warnings = item.warnings;
  const reasons = item.reasons;
  const hasReasons = reasons.length > 0;

  const handleSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const target = event.target.value;
      if (target) onReassign(item.rowNumber, target);
    },
    [item.rowNumber, onReassign],
  );

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-gray-100 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 tabular-nums">
            Row {item.rowNumber}
          </span>
          <span className="text-sm font-medium text-gray-900">{item.description}</span>
          {item.dualRoute && (
            <span
              className="inline-flex items-center rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800"
              title="This item intentionally goes to two suppliers (e.g. steel fabrication + lining)."
            >
              Dual-route
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 tabular-nums">
            {item.quantity} {item.unit}
          </span>
          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${scoreBandClass(
              item.score,
            )}`}
            title="Capability match score (0–100) for this supplier."
          >
            Score {Math.round(item.score)}
          </span>
          {warnings.map((warning) => (
            <span
              key={warning}
              className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
            >
              ⚠ {warning}
            </span>
          ))}
        </div>
        {hasReasons && (
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-500">Why this supplier: </span>
            {reasons.join(" · ")}
          </p>
        )}
      </div>

      {otherBuckets.length > 0 && (
        <div className="flex-shrink-0">
          <label className="sr-only" htmlFor={`move-${item.rowNumber}`}>
            Move row {item.rowNumber} to another supplier
          </label>
          <select
            id={`move-${item.rowNumber}`}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
            value=""
            disabled={disabled || reassigning}
            onChange={handleSelect}
          >
            <option value="">{reassigning ? "Moving…" : "Move to…"}</option>
            {otherBuckets.map((bucket) => (
              <option key={bucket.bucketRef} value={bucket.bucketRef}>
                {bucket.name} ({bucket.category})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function SourcingBucketCard(props: {
  bucket: SourcingBucket;
  allBuckets: SourcingBucket[];
  sendingEnabled: boolean;
  aiDraftEnabled: boolean;
  reassigningRow: number | null;
  savingDraft: boolean;
  sending: boolean;
  draftingAi: boolean;
  mutating: boolean;
  onReassign: (rowNumber: number, targetBucketRef: string) => void;
  onSaveDraft: (bucketRef: string, body: string) => void;
  onDraftAi: (bucketRef: string) => void;
  onSend: (bucketRef: string, email: string | null, body: string, isDirty: boolean) => void;
}) {
  const {
    bucket,
    allBuckets,
    sendingEnabled,
    aiDraftEnabled,
    reassigningRow,
    savingDraft,
    sending,
    draftingAi,
    mutating,
    onReassign,
    onSaveDraft,
    onDraftAi,
    onSend,
  } = props;

  const computedDefault = useMemo(() => defaultDraftBody(bucket), [bucket]);
  const [body, setBody] = useState(() => {
    const stored = bucket.draftBody;
    return stored ?? defaultDraftBody(bucket);
  });

  const lastPersistedRef = useRef(bucket.draftBody);
  useEffect(() => {
    const incoming = bucket.draftBody;
    if (incoming !== lastPersistedRef.current) {
      lastPersistedRef.current = incoming;
      setBody(incoming ?? defaultDraftBody(bucket));
    }
  }, [bucket]);

  const storedBody = bucket.draftBody;
  const persistedBody = storedBody ?? "";
  const isDirty = body !== persistedBody;

  const otherBuckets = useMemo(
    () => allBuckets.filter((candidate) => candidate.bucketRef !== bucket.bucketRef),
    [allBuckets, bucket.bucketRef],
  );

  const handleBlur = useCallback(() => {
    if (isDirty) onSaveDraft(bucket.bucketRef, body);
  }, [isDirty, body, bucket.bucketRef, onSaveDraft]);

  const handleResetDefault = useCallback(() => {
    setBody(computedDefault);
    onSaveDraft(bucket.bucketRef, computedDefault);
  }, [computedDefault, bucket.bucketRef, onSaveDraft]);

  const itemCount = bucket.items.length;

  const handleSendClick = useCallback(() => {
    onSend(bucket.bucketRef, bucket.email, body, isDirty);
  }, [onSend, bucket.bucketRef, bucket.email, body, isDirty]);

  const handleSaveDraftClick = useCallback(() => {
    onSaveDraft(bucket.bucketRef, body);
  }, [onSaveDraft, bucket.bucketRef, body]);

  const handleDraftAiClick = useCallback(() => {
    onDraftAi(bucket.bucketRef);
  }, [onDraftAi, bucket.bucketRef]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-l-4 border-orange-500 bg-orange-50/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900">{bucket.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-800">
              {bucket.category}
            </span>
            <span>
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            {bucket.email ? (
              <span className="truncate">{bucket.email}</span>
            ) : (
              <span className="text-red-600">no email on file</span>
            )}
          </div>
        </div>
        {sendingEnabled ? (
          <button
            type="button"
            onClick={handleSendClick}
            disabled={mutating || sending || itemCount === 0}
            title={itemCount === 0 ? "Add at least one item before sending." : undefined}
            className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send request"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveDraftClick}
            disabled={mutating || savingDraft}
            className="inline-flex items-center gap-1.5 rounded-md border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm hover:bg-orange-50 disabled:opacity-50"
          >
            {savingDraft ? "Saving…" : "Save draft"}
          </button>
        )}
      </div>

      <div className="px-4">
        {bucket.items.map((item) => (
          <LineItemRow
            key={item.rowNumber}
            item={item}
            otherBuckets={otherBuckets}
            reassigning={reassigningRow === item.rowNumber}
            disabled={mutating}
            onReassign={onReassign}
          />
        ))}
        {itemCount === 0 && (
          <p className="py-4 text-sm text-gray-400">
            No items in this bucket — move rows here from another supplier.
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor={`draft-${bucket.bucketRef}`}
            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Draft email
          </label>
          <div className="flex items-center gap-2">
            {savingDraft && <span className="text-[11px] text-gray-400">Saving…</span>}
            {aiDraftEnabled ? (
              <button
                type="button"
                onClick={handleDraftAiClick}
                disabled={mutating || draftingAi}
                title="AI drafts a suggested email — you can edit it before sending."
                className="inline-flex items-center gap-1.5 rounded-md border border-orange-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-700 shadow-sm hover:bg-orange-50 disabled:opacity-50"
              >
                {draftingAi ? "Drafting…" : "Draft with AI"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="AI drafting is in preview (disabled)"
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-400"
              >
                Draft with AI
              </button>
            )}
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={mutating}
              className="text-[11px] font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              Reset to default
            </button>
          </div>
        </div>
        <textarea
          id={`draft-${bucket.bucketRef}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onBlur={handleBlur}
          rows={6}
          className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          {aiDraftEnabled
            ? "AI drafts a suggested email — you can edit it before sending."
            : "AI drafting is in preview (disabled)."}
        </p>
      </div>
    </div>
  );
}

function UnmatchedPanel(props: { plan: SourcingPlan }) {
  const { plan } = props;
  const unmatched = plan.unmatchedItems;
  const candidates = plan.manualCandidates;
  const categoriesWithout = plan.categoriesWithoutSupplier;

  if (unmatched.length === 0 && candidates.length === 0 && categoriesWithout.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <h3 className="text-sm font-bold text-amber-900">Needs manual attention</h3>

      {categoriesWithout.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-amber-800">No registered supplier for:</span>
            {categoriesWithout.map((category) => (
              <span
                key={category}
                className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              >
                {category}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-amber-700">
            Register a capability-matched preferred supplier for these categories, then use
            Recalculate split to include them.
          </p>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Unmatched items
          </p>
          <ul className="mt-1 space-y-1">
            {unmatched.map((item) => (
              <li key={item.rowNumber} className="text-xs text-amber-900">
                <span className="font-semibold tabular-nums">Row {item.rowNumber}:</span>{" "}
                {item.description}
                <span className="text-amber-700"> — {item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            External preferred suppliers
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            Manual assignment to these suppliers is coming — the backend does not yet accept an
            external target for reassignment.
          </p>
          <ul className="mt-1 space-y-1">
            {candidates.map((candidate) => (
              <li
                key={candidate.preferredSupplierId}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-2.5 py-1.5"
              >
                <span className="text-xs font-medium text-gray-800">{candidate.name}</span>
                <span className="text-[11px] text-gray-500">
                  {candidate.email ? candidate.email : "no email"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SourcingReview(props: { sessionId: number }) {
  const { sessionId } = props;
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const planQuery = useSourcingPlan(sessionId);
  const planMutation = usePlanSourcing(sessionId);
  const reassignMutation = useReassignSourcingItem(sessionId);
  const draftMutation = useUpdateSourcingDraftBody(sessionId);
  const draftAiMutation = useDraftSourcingAi(sessionId);
  const sendMutation = useSendSourcingBucket(sessionId);

  const rawPlan = planQuery.data;
  const plan = rawPlan ?? null;

  const reassignVars = reassignMutation.variables;
  const reassigningRow = reassignMutation.isPending && reassignVars ? reassignVars.rowNumber : null;
  const draftVars = draftMutation.variables;
  const savingDraftRef = draftMutation.isPending && draftVars ? draftVars.bucketRef : null;
  const draftAiVars = draftAiMutation.variables;
  const draftingAiRef = draftAiMutation.isPending && draftAiVars ? draftAiVars.bucketRef : null;
  const sendVars = sendMutation.variables;
  const sendingRef = sendMutation.isPending && sendVars ? sendVars.bucketRef : null;

  const reassignPending = reassignMutation.isPending;
  const draftPending = draftMutation.isPending;
  const draftAiPending = draftAiMutation.isPending;
  const planPending = planMutation.isPending;
  const mutating = reassignPending || draftPending || draftAiPending || planPending;

  const handlePlan = useCallback(() => {
    planMutation.mutate(undefined, {
      onError: () => {
        showToast("Could not build the supplier plan — please try again.", "error");
      },
    });
  }, [planMutation, showToast]);

  const handleRecalculate = useCallback(async () => {
    const ok = await confirm({
      title: "Recalculate supplier split?",
      message:
        "This rebuilds the plan from the extracted items and discards any manual moves and draft-email edits.",
      confirmLabel: "Recalculate",
      variant: "warning",
    });
    if (!ok) return;
    handlePlan();
  }, [confirm, handlePlan]);

  const handleReassign = useCallback(
    (rowNumber: number, targetBucketRef: string) => {
      reassignMutation.mutate(
        { rowNumber, targetBucketRef },
        {
          onError: () => {
            showToast("Could not move that item — please try again.", "error");
          },
        },
      );
    },
    [reassignMutation, showToast],
  );

  const handleSaveDraft = useCallback(
    (bucketRef: string, body: string) => {
      draftMutation.mutate(
        { bucketRef, body },
        {
          onError: () => {
            showToast("Could not save the draft email — please try again.", "error");
          },
        },
      );
    },
    [draftMutation, showToast],
  );

  const handleDraftAi = useCallback(
    (bucketRef: string) => {
      draftAiMutation.mutate(
        { bucketRef },
        {
          onError: () => {
            showToast("Could not draft the email with AI — please try again.", "error");
          },
        },
      );
    },
    [draftAiMutation, showToast],
  );

  const handleSend = useCallback(
    async (bucketRef: string, email: string | null, body: string, isDirty: boolean) => {
      if (isDirty) {
        try {
          await draftMutation.mutateAsync({ bucketRef, body });
        } catch {
          showToast("Could not save your draft before sending — please try again.", "error");
          return;
        }
      }

      const recipient = email ?? "this supplier";
      const ok = await confirm({
        title: "Send sourcing request?",
        message: `Send this request to ${recipient}?`,
        confirmLabel: "Send request",
        variant: "info",
      });
      if (!ok) return;

      sendMutation.mutate(
        { bucketRef },
        {
          onSuccess: (result) => {
            if (result.skipped) {
              const reason = result.reason;
              if (reason === "feature-disabled") {
                showToast("Sending is not enabled yet — your draft has been saved.", "info");
              } else {
                const detail = reason ?? "unknown reason";
                showToast(`Not sent (${detail}).`, "info");
              }
              return;
            }
            showToast("Sourcing request sent to the supplier.", "success");
          },
          onError: (err) => {
            showToast(friendlySendError(err), "error");
          },
        },
      );
    },
    [draftMutation, confirm, sendMutation, showToast],
  );

  if (planQuery.isLoading) {
    return <Spinner label="Loading your sourcing plan…" />;
  }

  if (planMutation.isPending) {
    return <Spinner label="Matching your extracted items against your preferred suppliers…" />;
  }

  if (plan === null) {
    const buildFailed = planMutation.isError;
    const loadFailed = planQuery.isError;
    const failed = buildFailed || loadFailed;
    const onRetry = loadFailed ? () => planQuery.refetch() : handlePlan;
    const headline = loadFailed
      ? "We couldn't load your sourcing plan"
      : buildFailed
        ? "We couldn't build the plan"
        : "Split this RFQ across your suppliers";
    const detail = loadFailed
      ? "Something went wrong loading your saved plan. Please try again."
      : buildFailed
        ? "Something went wrong matching your items. Please try again."
        : "Nix will match the extracted line items against your preferred, capability-registered suppliers and group them into per-supplier requests you can review before sending.";
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">
          🧭
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{headline}</h3>
          <p className="mt-1 max-w-md text-sm text-gray-500">{detail}</p>
          {!failed && (
            <p className="mt-2 max-w-md text-xs text-gray-400">
              No preferred suppliers registered yet? Add capability-matched preferred suppliers
              first so Nix has candidates to split this RFQ across.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
        >
          {failed ? "Try again" : "Find suppliers"}
        </button>
        {ConfirmDialog}
      </div>
    );
  }

  const buckets = plan.autoBuckets;
  const hasBuckets = buckets.length > 0;
  const sendingEnabled = plan.sendingEnabled;
  const aiDraftEnabled = plan.aiDraftEnabled;
  const matchedRows = new Set(
    buckets.flatMap((bucket) => bucket.items.map((item) => item.rowNumber)),
  ).size;
  const needAttention = plan.unmatchedItems.length;
  const totalRows = matchedRows + needAttention;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Supplier sourcing review</h2>
          <p className="text-xs text-gray-500">
            {buckets.length} supplier bucket{buckets.length === 1 ? "" : "s"} — review each request,
            reassign items, then send.
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700">
            {matchedRows} of {totalRows} row{totalRows === 1 ? "" : "s"} matched
            {needAttention > 0 ? (
              <span className="text-amber-700"> · {needAttention} need attention</span>
            ) : (
              <span className="text-green-700"> · all accounted for</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={mutating}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Recalculate split
        </button>
      </div>

      <ScoreLegend />

      {!sendingEnabled && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Sending is disabled in this preview — your drafts are saved.
        </div>
      )}

      {!hasBuckets && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700">
            No registered supplier matched any extracted item.
          </p>
          <p className="mt-1">
            Register capability-matched preferred suppliers, then use Recalculate split to route
            these items. In the meantime, review the manual-attention panel below.
          </p>
        </div>
      )}

      {buckets.map((bucket) => (
        <SourcingBucketCard
          key={bucket.bucketRef}
          bucket={bucket}
          allBuckets={buckets}
          sendingEnabled={sendingEnabled}
          aiDraftEnabled={aiDraftEnabled}
          reassigningRow={reassigningRow}
          savingDraft={savingDraftRef === bucket.bucketRef}
          sending={sendingRef === bucket.bucketRef}
          draftingAi={draftingAiRef === bucket.bucketRef}
          mutating={mutating}
          onReassign={handleReassign}
          onSaveDraft={handleSaveDraft}
          onDraftAi={handleDraftAi}
          onSend={handleSend}
        />
      ))}

      <UnmatchedPanel plan={plan} />

      {ConfirmDialog}
    </div>
  );
}
