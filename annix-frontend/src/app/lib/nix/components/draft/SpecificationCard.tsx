"use client";

import { isArray, isNumber, isObject, isString } from "es-toolkit/compat";
import { DetailsBlock } from "./DetailsBlock";
import { CODE_KIND_TONE, type CodeKind, extractProductDescriptors } from "./useSpecLookup";

/**
 * Renders a single Nix-extracted specification clause as an expandable
 * card with stat-cards / pill-chips / page-jump button.
 *
 * Pure presentation component — accepts the raw clause value and an
 * onJumpToPage callback that the host wires to its PDF preview modal.
 * Used by every app that consumes Nix specifications (ASCA quote draft,
 * RFQ BOQ review, future Annix Sentinel spec audits).
 *
 * The optional `kind` prop colours the heading pill to match the chip
 * styling drawing rows use for the same code — amber for coating, blue
 * for lining, emerald for material class, gray for flange config. Null
 * kind = no item references this code, so the heading stays neutral.
 */
export function SpecificationCard(props: {
  clauseKey: string;
  value: unknown;
  kind?: CodeKind | null;
  onJumpToPage: (page: number) => void;
}) {
  const { clauseKey, value, kind, onJumpToPage } = props;
  const headingTone = kind ? CODE_KIND_TONE[kind] : null;
  const headingClass = headingTone
    ? `inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded border text-sm ${headingTone.bg} ${headingTone.text} ${headingTone.border}`
    : "text-sm font-bold text-gray-900";

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
          <span className={headingClass}>{clauseKey}</span>
        </summary>
        <pre className="mt-1 whitespace-pre-wrap text-gray-700 bg-gray-50 rounded p-2">{value}</pre>
      </details>
    );
  }

  const obj = (value ?? {}) as Record<string, unknown>;
  const summary = isString(obj.summary) ? (obj.summary as string) : null;
  const description = isString(obj.description) ? (obj.description as string) : null;
  const headlineText = summary ?? description ?? "";
  const productDescriptors = extractProductDescriptors(obj);
  const inlineHeadingText = [headlineText.length > 0 ? headlineText : null, productDescriptors]
    .filter(Boolean)
    .join(" • ");
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
            <h3 className={headingClass}>
              <span className="font-bold">{clauseKey}</span>
              {headingTone && inlineHeadingText.length > 0 && (
                <span className="font-normal text-[11px] opacity-90 leading-snug">
                  — {inlineHeadingText}
                </span>
              )}
            </h3>
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
          {!headingTone && headlineText.length > 0 && (
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
