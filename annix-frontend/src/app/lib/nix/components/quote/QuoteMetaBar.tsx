"use client";

import { useEffect, useRef, useState } from "react";
import { useSaveQuoteOrderNumber } from "@/app/lib/query/hooks";

export interface QuoteMetaBarProps {
  sessionId: number;
  /** Auto — sourced from session.createdAt; formatted as yyyy/mm/dd to match the Polymer Liners PDF format. */
  createdAt: string;
  /** Auto — the session's promotedRef (e.g. "QUO-2026-0014"). */
  ourReference: string | null;
  /** Editable — customer's PO / order reference (mirrors the example PDF's "Order No" column). */
  customerOrderNumber: string | null;
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
  const { sessionId, createdAt, ourReference, customerOrderNumber } = props;
  const [orderNumber, setOrderNumber] = useState(customerOrderNumber || "");
  const lastSavedRef = useRef(customerOrderNumber || "");
  // Track when we've hydrated from props so the initial sync doesn't fire a
  // round-trip save. (Same pattern QuoteView uses for quoteEditorState.)
  const hydratedRef = useRef(false);

  const saveOrderNumber = useSaveQuoteOrderNumber();

  // Sync local state back to props if the session re-fetches (e.g. after
  // saving the customer card). Only on first render or when props change
  // server-side — we don't clobber the user mid-typing.
  useEffect(() => {
    if (!hydratedRef.current) {
      setOrderNumber(customerOrderNumber || "");
      lastSavedRef.current = customerOrderNumber || "";
      hydratedRef.current = true;
    }
  }, [customerOrderNumber]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (orderNumber === lastSavedRef.current) return;
    const handle = window.setTimeout(() => {
      saveOrderNumber.mutate(
        { sessionId, orderNumber: orderNumber.length > 0 ? orderNumber : null },
        {
          onSuccess: () => {
            lastSavedRef.current = orderNumber;
          },
        },
      );
    }, 1000);
    return () => {
      window.clearTimeout(handle);
    };
  }, [orderNumber, sessionId, saveOrderNumber]);

  const formattedDate = formatQuoteDate(createdAt);

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-4 items-end">
      <MetaField label="Date" value={formattedDate} />
      <MetaField label="Our Reference" value={ourReference || "—"} />
      <div className="flex flex-col min-w-[12rem] flex-1">
        <label
          htmlFor={`order-no-${sessionId}`}
          className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5"
        >
          Order No
        </label>
        <input
          id={`order-no-${sessionId}`}
          type="text"
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="e.g. STEEL AFRICA - 32452E"
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
        />
      </div>
    </section>
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
