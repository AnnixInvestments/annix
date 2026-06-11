"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface BrandedErrorScreenProps {
  /**
   * The error caught by the route's error boundary or by `<ErrorBoundary>`.
   * Stack traces and raw `.message` are NEVER shown to end users — they
   * only surface inside the collapsible 'Technical details' panel, which is
   * itself gated on `process.env.NODE_ENV !== "production"`.
   */
  error: Error & { digest?: string };
  reset: () => void;
  /** Where the 'Back to dashboard' button links. */
  backHref: string;
  /** Label for the back button. Defaults to 'Back to dashboard'. */
  backLabel?: string;
  /**
   * Hex/Tailwind class for the brand-coloured 'Try again' button. Different
   * apps use different brand colours: stock-control teal, AU Rubber yellow,
   * etc. Pass a Tailwind class string (e.g. 'bg-teal-600 hover:bg-teal-700').
   */
  brandButtonClass?: string;
  /**
   * Human label of the area where the error happened — shown to end users
   * as 'We hit a snag in {area}.' so they understand what's broken.
   * E.g. 'Stock Control', 'AU Rubber', 'Quotations'.
   */
  area: string;
}

/**
 * The single user-facing error UI for this app. Replaces every error.tsx
 * fallback and the inner ErrorBoundary fallback so end users never see
 * raw error messages or stack traces — only a friendly, branded screen
 * with a stable support code they can quote when they report the problem.
 *
 * In development (NODE_ENV !== 'production') the technical details panel
 * is collapsed-but-available so engineers can still self-diagnose. In
 * production it is hidden entirely.
 *
 * Why this matters: end users seeing 'ReferenceError: useState is not
 * defined' is a trust-shattering UX. The support code lets us tie a user
 * report to a specific error without exposing internals.
 */
export function BrandedErrorScreen(props: BrandedErrorScreenProps) {
  const { error, reset, backHref, area } = props;
  const backLabel = props.backLabel ? props.backLabel : "Back to dashboard";
  const brandButtonClass = props.brandButtonClass
    ? props.brandButtonClass
    : "bg-teal-600 hover:bg-teal-700";

  const supportCode = useMemo(() => buildSupportCode(error), [error]);
  const [techExpanded, setTechExpanded] = useState(false);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex items-center justify-center min-h-96 py-12 px-4">
      <div className="text-center max-w-xl w-full">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg
            className="w-7 h-7 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">We hit a snag in {area}.</h2>
        <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          The error was logged automatically. You can keep working — try the action again, or head
          back to the dashboard. If the problem keeps happening, share the support code below with
          the Annix team and we'll take a look.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs">
          <span className="text-gray-500 uppercase tracking-wider font-medium">Support code</span>
          <code className="font-mono text-gray-900">{supportCode}</code>
          <CopyButton value={supportCode} />
        </div>

        <div className="flex gap-3 justify-center mt-6">
          <Link
            href={backHref}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
          >
            {backLabel}
          </Link>
          <button
            type="button"
            onClick={reset}
            className={`px-4 py-2 text-white rounded-md text-sm font-medium ${brandButtonClass}`}
          >
            Try again
          </button>
        </div>

        {isDev && (
          <div className="mt-8 text-left">
            <button
              type="button"
              onClick={() => setTechExpanded((s) => !s)}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              {techExpanded ? "Hide" : "Show"} technical details (dev only)
            </button>
            {techExpanded && (
              <pre className="mt-2 text-[11px] bg-gray-900 text-gray-100 p-3 rounded overflow-auto max-h-64">
                {error.name}: {error.message}
                {error.digest ? `\n\ndigest: ${error.digest}` : ""}
                {error.stack ? `\n\n${error.stack}` : ""}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton(props: { value: string }) {
  const { value } = props;
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="text-gray-500 hover:text-gray-800"
      aria-label="Copy support code"
      title="Copy support code"
    >
      {copied ? (
        <span className="text-xs text-green-600 font-medium">Copied</span>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * Builds a short, stable support code from an Error so a user can quote it
 * back to support and we can correlate it with the server-side log entry.
 *
 * Strategy:
 *  - Prefer the Next.js `digest` property when available (present in
 *    production server-component errors and stable across renders).
 *  - Otherwise hash a stable string built from `error.name + error.message`.
 *
 * The result is rendered as 'ERR-XXXX-XXXX' (8 hex chars) so it's both
 * recognisable and unambiguous over the phone.
 */
function buildSupportCode(error: Error & { digest?: string }): string {
  const seed = error.digest ? error.digest : `${error.name}|${error.message}`;
  const hash = Array.from(seed).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  const left = hash.toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
  const right = ((hash ^ 0x9e3779b1) >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
  return `ERR-${left}-${right}`;
}
