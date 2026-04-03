"use client";

interface CompanySummary {
  companyId: number;
  companyName: string;
  balance: number;
  vatTotal: number;
  amountPayable: number;
}

interface AccountsSummaryTableProps {
  companies: CompanySummary[];
  grandTotal: number;
  grandVat: number;
  grandPayable: number;
  entityLabel: string;
}

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountsSummaryTable(props: AccountsSummaryTableProps) {
  const { companies, grandTotal, grandVat, grandPayable, entityLabel } = props;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-2">{entityLabel}</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">VAT</th>
              <th className="px-4 py-2 text-right">Amount Payable</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.companyId} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{c.companyName}</td>
                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                  {formatCurrency(c.balance)}
                </td>
                <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                  {formatCurrency(c.vatTotal)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(c.amountPayable)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-yellow-50 dark:bg-yellow-900/20 font-bold text-gray-900 dark:text-gray-100">
              <td className="px-4 py-3">GRAND TOTAL</td>
              <td className="px-4 py-3 text-right">{formatCurrency(grandTotal)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(grandVat)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(grandPayable)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
