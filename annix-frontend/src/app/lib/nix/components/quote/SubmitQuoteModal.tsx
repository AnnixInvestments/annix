"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
 * The preview page (`/quotations/quotes/[id]/preview`) handles the auto-
 * trigger semantics so this modal stays a thin dispatcher.
 */
export function SubmitQuoteModal(props: { sessionId: number; onClose: () => void }) {
  const { sessionId, onClose } = props;
  const router = useRouter();
  const submit = useSubmitNixQuote();
  const [error, setError] = useState<string | null>(null);
  const [busyChoice, setBusyChoice] = useState<SubmitChoice | null>(null);

  const handleChoice = (choice: SubmitChoice) => {
    setError(null);
    setBusyChoice(choice);
    submit.mutate(
      { sessionId },
      {
        onSuccess: () => {
          if (choice === "save") {
            router.push("/stock-control/portal/quotations");
            return;
          }
          const params = new URLSearchParams();
          if (choice === "print" || choice === "both") params.set("print", "1");
          if (choice === "email" || choice === "both") params.set("email", "1");
          router.push(
            `/stock-control/portal/quotations/quotes/${sessionId}/preview?${params.toString()}`,
          );
        },
        onError: (err) => {
          setBusyChoice(null);
          setError(err instanceof Error ? err.message : "Submit failed");
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Submit quote</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busyChoice !== null}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="p-4 space-y-3">
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
        <footer className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busyChoice !== null}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
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
      className="text-left p-3 border border-gray-300 rounded hover:border-[#323288] hover:bg-[#323288]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <div className="text-sm font-semibold text-[#323288]">{busy ? `${label}…` : label}</div>
      <div className="text-[11px] text-gray-600 mt-0.5">{hint}</div>
    </button>
  );
}
