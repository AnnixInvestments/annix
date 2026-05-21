"use client";

import { isNumber } from "es-toolkit/compat";
import { useRouter } from "next/navigation";

interface MatchItem {
  invoiceNumber: string;
  // STI id when the invoice exists in our system (null on NOT_IN_SYSTEM rows).
  // Used to make each row click through to the STI detail page.
  taxInvoiceId?: number | null;
  statementAmount: number | null;
  systemAmount: number | null;
  matchResult: string;
  difference: number | null;
  // Cascade audit (Phase 1 backend). Null on the *Present fields means the
  // check is not applicable (e.g. NOT_IN_SYSTEM — we have no STI to follow
  // links from, or the STI carries no DN ref).
  linkedDeliveryNoteRef?: string | null;
  linkedDeliveryNotePresent?: boolean | null;
  // SDN db id when an ACTIVE row exists in our system — used to render the
  // SDN ref as a clickable link straight into the SDN detail page.
  linkedDeliveryNoteId?: number | null;
  linkedSupplierCocPresent?: boolean | null;
  // Same idea for the supplier CoC.
  linkedSupplierCocId?: number | null;
}

interface ReconciliationMatchViewProps {
  matchItems: MatchItem[];
  // Statement (reconciliation) id — forwarded into the STI link as a
  // ?from=statement&statementId={id} query param so the STI detail page can
  // render a "Back to statement" button.
  statementId: number;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "-";
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CascadeFlag({
  present,
  tooltip,
}: {
  present: boolean | null | undefined;
  tooltip?: string;
}) {
  if (present === true) {
    return (
      <span title={tooltip} className="text-green-600 dark:text-green-400">
        ✓
      </span>
    );
  }
  if (present === false) {
    return (
      <span
        title={tooltip ? `${tooltip} — missing` : "Missing"}
        className="text-red-600 dark:text-red-400 font-bold"
      >
        ✗
      </span>
    );
  }
  return (
    <span title="Not applicable" className="text-gray-400">
      —
    </span>
  );
}

const RESULT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  MATCHED: {
    bg: "bg-green-50 dark:bg-green-900/10",
    text: "text-green-700 dark:text-green-400",
    label: "Matched",
  },
  AMOUNT_DISCREPANCY: {
    bg: "bg-amber-50 dark:bg-amber-900/10",
    text: "text-amber-700 dark:text-amber-400",
    label: "Amount Discrepancy",
  },
  NOT_IN_SYSTEM: {
    bg: "bg-red-50 dark:bg-red-900/10",
    text: "text-red-700 dark:text-red-400",
    label: "Not in System",
  },
  NOT_ON_STATEMENT: {
    bg: "bg-blue-50 dark:bg-blue-900/10",
    text: "text-blue-700 dark:text-blue-400",
    label: "Not on Statement",
  },
};

export function ReconciliationMatchView(props: ReconciliationMatchViewProps) {
  const { matchItems, statementId } = props;
  const router = useRouter();

  if (matchItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No match data available. Run reconciliation first.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-3">Invoice No</th>
              <th className="px-4 py-3 text-right">Statement Amount</th>
              <th className="px-4 py-3 text-right">System Amount</th>
              <th className="px-4 py-3 text-right">Difference</th>
              <th
                className="px-4 py-3 text-center"
                title="Supplier Delivery Note linked to this STI"
              >
                SDN
              </th>
              <th className="px-4 py-3 text-center" title="Supplier CoC linked to this STI">
                SCoC
              </th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {matchItems.map((item, idx) => {
              const rawRESULT_STYLESByItemmatchresult = RESULT_STYLES[item.matchResult];
              const style = rawRESULT_STYLESByItemmatchresult || RESULT_STYLES.MATCHED;
              const rawTaxInvoiceId = item.taxInvoiceId;
              const hasStiLink = isNumber(rawTaxInvoiceId);
              return (
                <tr
                  key={`${item.invoiceNumber}-${idx}`}
                  onClick={
                    hasStiLink
                      ? () =>
                          router.push(
                            `/au-rubber/portal/tax-invoices/${rawTaxInvoiceId}?from=statement&statementId=${statementId}`,
                          )
                      : undefined
                  }
                  className={`border-b border-gray-100 dark:border-gray-700 ${style.bg} ${
                    hasStiLink
                      ? "cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-colors"
                      : ""
                  }`}
                  title={hasStiLink ? "Open the tax invoice" : undefined}
                >
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {item.invoiceNumber}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.statementAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.systemAmount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.difference !== null && item.difference !== 0 ? (
                      <span
                        className={
                          item.difference > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {item.difference > 0 ? "+" : ""}
                        {formatCurrency(item.difference)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <CascadeFlag
                        present={item.linkedDeliveryNotePresent}
                        tooltip={
                          item.linkedDeliveryNoteRef
                            ? `Linked SDN: ${item.linkedDeliveryNoteRef}`
                            : undefined
                        }
                      />
                      {item.linkedDeliveryNoteRef ? (
                        isNumber(item.linkedDeliveryNoteId) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/au-rubber/portal/delivery-notes/${item.linkedDeliveryNoteId}?from=statement&statementId=${statementId}`,
                              );
                            }}
                            className="text-[11px] text-orange-600 hover:text-orange-700 dark:text-orange-400 underline decoration-dotted underline-offset-2"
                            title="Open the supplier delivery note"
                          >
                            {item.linkedDeliveryNoteRef}
                          </button>
                        ) : (
                          <span
                            className="text-[11px] text-gray-500 dark:text-gray-400"
                            title="Referenced on the STI but not yet captured as an SDN"
                          >
                            {item.linkedDeliveryNoteRef}
                          </span>
                        )
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <CascadeFlag present={item.linkedSupplierCocPresent} />
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.text}`}
                    >
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
