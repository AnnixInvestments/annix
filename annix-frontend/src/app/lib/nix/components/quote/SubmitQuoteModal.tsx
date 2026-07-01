"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCoreAwareHref } from "@/app/core/portal/lib/coreAwareHref";
import { useSubmitNixQuote } from "@/app/lib/query/hooks";

type SubmitChoice = "print" | "email" | "both" | "save";

/**
 * Modal that appears when the quoter clicks "Submit Quote" on the working
 * quote page. Stamps `submittedAt` on the session, then routes to the
 * appropriate next view:
 *
 *   - Print          → /preview?print=1   (preview auto-fires window.print on mount)
 *   - Email          → /preview?email=1   (preview auto-opens its email modal)
 *   - Print & Email  → /preview?print=1&email=1
 *   - Just save      → /quotations         (back to the hub)
 *
 * Rendered into a body-level portal so it's not constrained by the
 * QuoteView's vertical layout. Styling matches the project ConfirmModal
 * (Stock Control palette + backdrop blur).
 */
export function SubmitQuoteModal(props: {
  sessionId: number;
  /** Quote grand total incl VAT, snapshotted onto the session so the
   *  Quotations hub can show a Value column. */
  quoteTotalIncVat: number;
  onClose: () => void;
}) {
  const { sessionId, quoteTotalIncVat, onClose } = props;
  const router = useRouter();
  const coreHref = useCoreAwareHref();
  const submit = useSubmitNixQuote();
  const [error, setError] = useState<string | null>(null);
  const [busyChoice, setBusyChoice] = useState<SubmitChoice | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portal target only exists post-hydration — defer the createPortal call.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc closes the modal (matches ConfirmModal behaviour).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busyChoice === null) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [busyChoice, onClose]);

  const handleChoice = (choice: SubmitChoice) => {
    setError(null);
    setBusyChoice(choice);
    submit.mutate(
      { sessionId, quoteTotalIncVat },
      {
        onSuccess: () => {
          if (choice === "save") {
            router.push(coreHref("/stock-control/portal/quotations"));
            return;
          }
          const params = new URLSearchParams();
          if (choice === "print" || choice === "both") params.set("print", "1");
          if (choice === "email" || choice === "both") params.set("email", "1");
          router.push(
            `${coreHref(`/stock-control/portal/quotations/quotes/${sessionId}/preview`)}?${params.toString()}`,
          );
        },
        onError: (err) => {
          setBusyChoice(null);
          setError(err instanceof Error ? err.message : "Submit failed");
        },
      },
    );
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-quote-title"
    >
      <button
        type="button"
        aria-label="Close submit dialog"
        className="fixed inset-0 bg-black/10 backdrop-blur-md cursor-default"
        onClick={() => busyChoice === null && onClose()}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-[#323288] text-white">
          <h2 id="submit-quote-title" className="text-base font-semibold tracking-wide">
            Submit quote
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busyChoice !== null}
            className="text-white/80 hover:text-white text-xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            How would you like to finalise this quote? All options save the quote so it appears in
            the Quotations hub with an Edit button.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ChoiceButton
              label="Print"
              hint="Open the customer-facing PDF in a print preview."
              busy={busyChoice === "print"}
              disabled={busyChoice !== null && busyChoice !== "print"}
              onClick={() => handleChoice("print")}
            />
            <ChoiceButton
              label="Email"
              hint="Send the PDF to the customer."
              busy={busyChoice === "email"}
              disabled={busyChoice !== null && busyChoice !== "email"}
              onClick={() => handleChoice("email")}
            />
            <ChoiceButton
              label="Print & Email"
              hint="Email the customer, then print a copy."
              busy={busyChoice === "both"}
              disabled={busyChoice !== null && busyChoice !== "both"}
              onClick={() => handleChoice("both")}
            />
            <ChoiceButton
              label="Just save"
              hint="No print, no email — return to the hub."
              busy={busyChoice === "save"}
              disabled={busyChoice !== null && busyChoice !== "save"}
              onClick={() => handleChoice("save")}
            />
          </div>
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}
        </div>
        <footer className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busyChoice !== null}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#323288]/40 disabled:opacity-50"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ChoiceButton(props: {
  label: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { label, hint, busy, disabled, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left p-3 border border-gray-300 rounded-md hover:border-[#323288] hover:bg-[#323288]/5 focus:outline-none focus:ring-2 focus:ring-[#323288]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <div className="text-sm font-semibold text-[#323288] flex items-center gap-1.5">
        {busy && (
          <svg
            className="w-3.5 h-3.5 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
            <path
              d="M22 12a10 10 0 00-10-10"
              strokeWidth={3}
              strokeLinecap="round"
              className="opacity-75"
            />
          </svg>
        )}
        {busy ? `${label}…` : label}
      </div>
      <div className="text-[11px] text-gray-600 mt-0.5">{hint}</div>
    </button>
  );
}
