"use client";

interface InvoiceLine {
  id: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  totalAmount: number;
  vatAmount: number;
  isCreditNote: boolean;
}

interface CompanyAccount {
  companyId: number;
  companyName: string;
  discountPercent: number;
  invoices: InvoiceLine[];
  subtotal: number;
  creditTotal: number;
  balance: number;
  discountAmount: number;
  vatTotal: number;
  amountPayable: number;
}

interface AccountsTableProps {
  companies: CompanyAccount[];
}

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountsTable(props: AccountsTableProps) {
  const rawInvInvoiceDate = inv.invoiceDate;
  const { companies } = props;

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No invoices found for this period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {companies.map((company) => (
        <div
          key={company.companyId}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {company.companyName}
            </h3>
            {company.discountPercent > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Discount: {company.discountPercent}%
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-2">Invoice No</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                  <th className="px-4 py-2 text-right">VAT</th>
                </tr>
              </thead>
              <tbody>
                {company.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-100 dark:border-gray-700 ${
                      inv.isCreditNote ? "bg-red-50 dark:bg-red-900/10" : ""
                    }`}
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {rawInvInvoiceDate || "-"}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                      {inv.isCreditNote ? "-" : formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                      {inv.isCreditNote ? `(${formatCurrency(Math.abs(inv.totalAmount))})` : "-"}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(inv.vatAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold text-gray-900 dark:text-gray-100">
                  <td className="px-4 py-2" colSpan={2}>
                    Subtotal
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(company.subtotal)}</td>
                  <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                    {company.creditTotal > 0 ? `(${formatCurrency(company.creditTotal)})` : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(company.vatTotal)}</td>
                </tr>
                {company.discountAmount > 0 && (
                  <tr className="text-gray-600 dark:text-gray-400">
                    <td className="px-4 py-1" colSpan={2}>
                      Discount ({company.discountPercent}%)
                    </td>
                    <td className="px-4 py-1 text-right" colSpan={3}>
                      ({formatCurrency(company.discountAmount)})
                    </td>
                  </tr>
                )}
                <tr className="bg-yellow-50 dark:bg-yellow-900/20 font-bold text-gray-900 dark:text-gray-100">
                  <td className="px-4 py-2" colSpan={2}>
                    Amount Payable
                  </td>
                  <td className="px-4 py-2 text-right" colSpan={3}>
                    {formatCurrency(company.amountPayable)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
