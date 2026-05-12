"use client";

import { useEffect, useRef, useState } from "react";
import { useSaveQuoteDeliveryNoteRef, useSaveQuoteOrderNumber } from "@/app/lib/query/hooks";

export interface QuoteMetaBarProps {
  sessionId: number;
  /** Auto — sourced from session.createdAt; formatted as yyyy/mm/dd to match the Polymer Liners PDF format. */
  createdAt: string;
  /** Auto — the session's promotedRef (e.g. "QUO-2026-0014"). */
  ourReference: string | null;
  /** Editable — customer's PO / order reference (mirrors the example PDF's "Order No" column). */
  customerOrderNumber: string | null;
  /** Editable — delivery-note reference. Usually blank on a quote but the column exists on the PDF template. */
  deliveryNoteRef: string | null;
  /**
   * Up to 3 distinct Order-No candidates that Nix extracted from the
   * session's drawings / specs. Rendered as one-click "Use" chips below
   * the input when the field is empty. Empty array hides the row entirely.
   */
  suggestedOrderNumbers: string[];
}

/**
 * Thin metadata strip sitting between the Customer card and Specs & pricing.
 * Mirrors the header strip on the example Polymer Liners customer-facing
 * quote: Date | Order No | Our Reference. The customer's account code lives
 * on the customer card (already shown there); we don't duplicate it here.
 *
 * Order No is the only editable field — debounce-saved (1 s) like the
 * QuoteSpecsEditor bundle, so a refresh keeps the value without an explicit
 * Save button.
 */
export function QuoteMetaBar(props: QuoteMetaBarProps) {
  const {
    sessionId,
    createdAt,
    ourReference,
    customerOrderNumber,
    deliveryNoteRef,
    suggestedOrderNumbers,
  } = props;
  const [orderNumber, setOrderNumber] = useState(customerOrderNumber || "");
  const [deliveryNote, setDeliveryNote] = useState(deliveryNoteRef || "");
  const lastSavedOrderRef = useRef(customerOrderNumber || "");
  const lastSavedDeliveryRef = useRef(deliveryNoteRef || "");
  // Track when we've hydrated from props so the initial sync doesn't fire a
  // round-trip save. (Same pattern QuoteView uses for quoteEditorState.)
  const hydratedRef = useRef(false);

  const saveOrderNumber = useSaveQuoteOrderNumber();
  const saveDeliveryRef = useSaveQuoteDeliveryNoteRef();

  // Sync local state back to props if the session re-fetches (e.g. after
  // saving the customer card). Only on first render or when props change
  // server-side — we don't clobber the user mid-typing.
  useEffect(() => {
    if (!hydratedRef.current) {
      setOrderNumber(customerOrderNumber || "");
      setDeliveryNote(deliveryNoteRef || "");
      lastSavedOrderRef.current = customerOrderNumber || "";
      lastSavedDeliveryRef.current = deliveryNoteRef || "";
      hydratedRef.current = true;
    }
  }, [customerOrderNumber, deliveryNoteRef]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (orderNumber === lastSavedOrderRef.current) return;
    const handle = window.setTimeout(() => {
      saveOrderNumber.mutate(
        { sessionId, orderNumber: orderNumber.length > 0 ? orderNumber : null },
        {
          onSuccess: () => {
            lastSavedOrderRef.current = orderNumber;
          },
        },
      );
    }, 1000);
    return () => {
      window.clearTimeout(handle);
    };
  }, [orderNumber, sessionId, saveOrderNumber]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (deliveryNote === lastSavedDeliveryRef.current) return;
    const handle = window.setTimeout(() => {
      saveDeliveryRef.mutate(
        { sessionId, ref: deliveryNote.length > 0 ? deliveryNote : null },
        {
          onSuccess: () => {
            lastSavedDeliveryRef.current = deliveryNote;
          },
        },
      );
    }, 1000);
    return () => {
      window.clearTimeout(handle);
    };
  }, [deliveryNote, sessionId, saveDeliveryRef]);

  const formattedDate = formatQuoteDate(createdAt);

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-4 items-end">
      <MetaField label="Date" value={formattedDate} />
      <MetaField label="Our Reference" value={ourReference || "—"} />
      <MetaTextInput
        id={`order-no-${sessionId}`}
        label="Order No"
        value={orderNumber}
        onChange={setOrderNumber}
        placeholder="e.g. STEEL AFRICA - 32452E"
        suggestions={orderNumber.trim().length === 0 ? suggestedOrderNumbers : []}
        onAcceptSuggestion={(value) => setOrderNumber(value)}
      />
      <MetaTextInput
        id={`delivery-note-${sessionId}`}
        label="Delivery Note"
        value={deliveryNote}
        onChange={setDeliveryNote}
        placeholder="usually blank on quote"
      />
    </section>
  );
}

function MetaTextInput(props: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /**
   * Up to 3 one-click suggestion chips rendered immediately below the
   * input. Parent decides when they appear (typically only when the field
   * is empty AND there's something useful to recommend). Empty array =
   * no chips. Click a chip → onAcceptSuggestion fires with that value.
   */
  suggestions?: string[];
  onAcceptSuggestion?: (value: string) => void;
}) {
  const { id, label, value, onChange, placeholder, suggestions, onAcceptSuggestion } = props;
  const chips = suggestions ?? [];
  return (
    <div className="flex flex-col min-w-[12rem] flex-1">
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
      />
      {chips.length > 0 && onAcceptSuggestion && (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-gray-500 shrink-0">
            {chips.length === 1 ? "Suggested:" : "Suggested from documents:"}
          </span>
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onAcceptSuggestion(chip)}
              title="Click to use this suggestion"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[#323288] bg-[#323288]/5 border border-[#323288]/30 rounded hover:bg-[#323288] hover:text-white transition-colors"
            >
              <span className="truncate max-w-[14rem]">{chip}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                Use
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaField(props: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5">
        {props.label}
      </span>
      <span className="text-sm font-mono text-gray-900 px-2 py-1 bg-gray-50 border border-gray-200 rounded min-w-[8rem]">
        {props.value}
      </span>
    </div>
  );
}

function formatQuoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}
