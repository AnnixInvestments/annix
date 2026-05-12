"use client";

import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuoteCustomerView } from "@/app/lib/nix/components/quote";
import { useNixExtractionSession } from "@/app/lib/query/hooks";

/**
 * Customer-facing render of a promoted quote — same data as the editing
 * view, laid out in the supplier's letterhead style for printing /
 * sending to the customer. Reached from the working quote page's
 * "Preview customer quote" button.
 */
export default function CustomerQuotePreviewPage() {
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

  if (!validSessionId) return <div className="p-6 text-red-600">Invalid quote id.</div>;
  if (sessionQuery.isLoading)
    return <div className="p-6 text-sm text-gray-500">Loading quote…</div>;
  if (sessionQuery.isError || !session) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load this quote — the underlying session may have been deleted.
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen py-6">
      <div className="max-w-[900px] mx-auto px-4 print:max-w-none print:px-0">
        <div className="flex items-center justify-between mb-3 print:hidden">
          <Link
            href={`/stock-control/portal/quotations/quotes/${validSessionId}`}
            className="text-sm text-[#323288] hover:underline"
          >
            ← Back to editor
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-[#323288] text-white rounded hover:bg-[#2a2a73]"
          >
            Print
          </button>
        </div>
        <div className="bg-white shadow-md print:shadow-none">
          <QuoteCustomerView session={session} />
        </div>
      </div>
    </div>
  );
}
