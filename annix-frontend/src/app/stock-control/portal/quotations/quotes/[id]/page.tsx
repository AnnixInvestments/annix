"use client";

import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuoteView } from "@/app/lib/nix/components/quote";
import {
  quoteRefForSession,
  useFeatureFlagEnabled,
  useNixExtractionSession,
} from "@/app/lib/query/hooks";

const NIX_QUOTE_FROM_DOCS_FLAG = "STOCK_MGMT_NIX_QUOTE_FROM_DOCUMENTS";

export default function NixPromotedQuotePage() {
  const params = useParams();
  const rawParam = params?.id;
  let parsedSessionId: number = Number.NaN;
  if (isString(rawParam)) {
    parsedSessionId = Number.parseInt(rawParam, 10);
  } else if (isArray(rawParam)) {
    const first = rawParam[0];
    parsedSessionId = first ? Number.parseInt(first, 10) : Number.NaN;
  }
  const validSessionId = Number.isFinite(parsedSessionId) ? parsedSessionId : null;

  const sessionQuery = useNixExtractionSession(validSessionId);
  const session = sessionQuery.data;
  const flag = useFeatureFlagEnabled(NIX_QUOTE_FROM_DOCS_FLAG);

  if (flag.isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (!flag.enabled) {
    return (
      <div className="p-6 max-w-xl">
        <h1 className="text-xl font-semibold text-gray-900">Add-on not enabled</h1>
        <p className="text-sm text-gray-600 mt-2">
          The 'Quote from documents' AI feature isn't enabled on this deployment.
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

  if (!validSessionId) {
    return <div className="p-6 text-red-600">Invalid quote id.</div>;
  }
  if (sessionQuery.isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading quote…</div>;
  }
  const sessionLoadFailed = sessionQuery.isError;
  if (sessionLoadFailed || !session) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load this quote — the underlying session may have been deleted.
      </div>
    );
  }

  const quoteRef = quoteRefForSession(session);
  const sessionTitle = session.title;
  const titleText = sessionTitle ? sessionTitle : `Quote ${quoteRef}`;

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
            Status: <span className="font-semibold capitalize">{session.status}</span> — items
            pooled by coating + lining for the painting / lining scope.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/stock-control/portal/quotations/drafts/${session.id}`}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium shadow-sm hover:bg-gray-300"
          >
            Back to draft view
          </Link>
        </div>
      </div>

      <QuoteView session={session} hideNoScopeItems />
    </div>
  );
}
