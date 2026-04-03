"use client";

interface MatchItem {
  invoiceNumber: string;
  statementAmount: number | null;
  systemAmount: number | null;
  matchResult: string;
  difference: number | null;
}

interface ReconciliationMatchViewProps {
  matchItems: MatchItem[];
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "-";
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const { matchItems } = props;

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
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {matchItems.map((item, idx) => {
              const style = RESULT_STYLES[item.matchResult] || RESULT_STYLES.MATCHED;
              return (
                <tr
                  key={`${item.invoiceNumber}-${idx}`}
                  className={`border-b border-gray-100 dark:border-gray-700 ${style.bg}`}
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
