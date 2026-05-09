"use client";

import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import { NixDraftReview } from "@/app/lib/nix/components/draft";
import { useNixExtractionSession, useSetNixExtractionSessionStatus } from "@/app/lib/query/hooks";

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

  const handleSessionChanged = useCallback(async () => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

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

  // Save & exit — every cell edit / retry / re-extract already persists
  // the moment the user makes the change, so the draft is implicitly saved
  // at all times. This button just gives the user an explicit affordance
  // to leave with confidence and return to the quotes list. Status stays
  // 'draft', so picking up later resumes from the same review state.
  const handleSaveAndExit = useCallback(() => {
    showToast("Draft saved — pick up where you left off from the Quotations list.", "success");
    router.push("/stock-control/portal/quotations");
  }, [showToast, router]);

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

      <NixDraftReview
        session={session}
        brand="stock-control"
        onSessionChanged={handleSessionChanged}
        addMoreDocumentsHref={`/stock-control/portal/quotations/new-from-documents?session=${session.id}`}
      />

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
