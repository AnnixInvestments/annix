"use client";

import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@/app/components/Toast";
import { NixDraftReview } from "@/app/lib/nix/components/draft";
import {
  quoteRefForSession,
  useFeatureFlagEnabled,
  useNixExtractionSession,
  useSetNixExtractionSessionStatus,
} from "@/app/lib/query/hooks";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";

const NIX_QUOTE_FROM_DOCS_FLAG = "STOCK_MGMT_NIX_QUOTE_FROM_DOCUMENTS";

export default function NixExtractionDraftPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const nixQuoteFlag = useFeatureFlagEnabled(NIX_QUOTE_FROM_DOCS_FLAG);
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

  const handleSessionChanged = useCallback(async () => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

  const handlePromote = useCallback(async () => {
    if (!validSessionId || !session) return;
    const ref = quoteRefForSession(session);
    const extractions = session.extractions;
    const drawingExtractions = extractions ? extractions : [];
    const drawingCount = drawingExtractions.filter((e) => e.documentRole === "drawing").length;
    const proceed = await confirm({
      title: `Promote ${ref}?`,
      message: `This will build a customer-facing quote from ${drawingCount} drawing extraction${drawingCount === 1 ? "" : "s"} — items pooled by coating + lining spec — and lock the draft. You'll still be able to view the draft, but further edits will need to be made on the quote.`,
      confirmLabel: "Promote to quote",
      variant: "info",
    });
    if (!proceed) return;
    try {
      await setStatus.mutateAsync({
        sessionId: validSessionId,
        status: "promoted",
        promotedRef: ref,
      });
      router.push(`/stock-control/portal/quotations/quotes/${validSessionId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to promote session", "error");
    }
  }, [validSessionId, session, confirm, setStatus, router, showToast]);

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

  // Save & exit — every cell edit / retry / re-extract already persists
  // the moment the user makes the change, so the draft is implicitly saved
  // at all times. This button just gives the user an explicit affordance
  // to leave with confidence and return to the quotes list. Status stays
  // 'draft', so picking up later resumes from the same review state.
  const handleSaveAndExit = useCallback(async () => {
    if (!session) {
      router.push("/stock-control/portal/quotations");
      return;
    }
    const ref = quoteRefForSession(session);
    await confirm({
      title: "Draft saved",
      message: `Saved as ${ref}. You'll find it under 'In-progress drafts' on the Quotations page — click the reference to come back to where you left off.`,
      confirmLabel: "Go to Quotations",
      hideCancel: true,
      variant: "info",
    });
    router.push("/stock-control/portal/quotations");
  }, [session, confirm, router]);

  if (!validSessionId) {
    return (
      <div className="p-6">
        <p className="text-red-600">Invalid session id.</p>
      </div>
    );
  }

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
  const quoteRef = quoteRefForSession(session);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/stock-control/portal/quotations" className="hover:text-gray-700 underline">
              Quotations
            </Link>
            <span>›</span>
            <span className="font-mono text-[#323288]">{quoteRef}</span>
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
          {session.status === "draft" && (
            <button
              type="button"
              onClick={handleSaveAndExit}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700"
              title="Every edit on this page is saved as you make it. This button just takes you back to the quotes list — pick up later from there."
            >
              Save & exit
            </button>
          )}
          {session.status !== "promoted" && (
            <button
              type="button"
              onClick={handlePromote}
              disabled={setStatus.isPending}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              Promote to quote
            </button>
          )}
          {session.status === "promoted" && (
            <Link
              href={`/stock-control/portal/quotations/quotes/${session.id}`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-green-700"
            >
              View quote
            </Link>
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

      <NixDraftReview
        session={session}
        brand="stock-control"
        onSessionChanged={handleSessionChanged}
        addMoreDocumentsHref={`/stock-control/portal/quotations/new-from-documents?session=${session.id}`}
      />

      {ConfirmDialog}
    </div>
  );
}
