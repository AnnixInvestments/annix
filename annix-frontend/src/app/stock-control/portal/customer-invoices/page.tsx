"use client";

const MOCK_INVOICES = [
  {
    id: 1,
    invoiceNumber: "INV-2026-01142",
    customer: "Example Mining Co",
    poReference: "4500892345",
    raisedAt: "2026-04-02",
    dueAt: "2026-05-02",
    totalValue: 487_200,
    outstanding: 487_200,
    status: "sent",
  },
  {
    id: 2,
    invoiceNumber: "INV-2026-01141",
    customer: "Sample Chemical Works",
    poReference: "CW-PO-88221",
    raisedAt: "2026-03-30",
    dueAt: "2026-04-29",
    totalValue: 1_240_000,
    outstanding: 0,
    status: "paid",
  },
  {
    id: 3,
    invoiceNumber: "INV-2026-01140",
    customer: "Test Power Station",
    poReference: "TPS/PUR/2026/0311",
    raisedAt: "2026-03-18",
    dueAt: "2026-04-17",
    totalValue: 892_500,
    outstanding: 892_500,
    status: "overdue",
  },
  {
    id: 4,
    invoiceNumber: "INV-2026-01139",
    customer: "Example Refinery Ltd",
    poReference: "ER-2026-4421",
    raisedAt: "2026-03-15",
    dueAt: "2026-04-14",
    totalValue: 145_800,
    outstanding: 72_900,
    status: "part_paid",
  },
  {
    id: 5,
    invoiceNumber: "INV-2026-01138",
    customer: "Sample Water Utility",
    poReference: "SWU-PO-20260308",
    raisedAt: "2026-03-10",
    dueAt: "2026-04-09",
    totalValue: 376_400,
    outstanding: 376_400,
    status: "disputed",
  },
];

function statusBadge(status: string): string {
  if (status === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (status === "part_paid") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "overdue") return "bg-red-100 text-red-800 border-red-200";
  if (status === "disputed") return "bg-purple-100 text-purple-800 border-purple-200";
  if (status === "sent") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatZar(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CustomerInvoicesPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Sales Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Outgoing invoices raised against customer delivery notes.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
        >
          New Invoice
        </button>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Total Outstanding</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            R 1.83m
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Overdue 30d+</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">R 893k</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Disputed</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">R 376k</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Paid This Month</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">R 1.24m</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search invoice / PO reference…"
          className="rounded-md border-gray-300 text-sm"
        />
        <select className="rounded-md border-gray-300 text-sm">
          <option>All customers</option>
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All statuses</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Part Paid</option>
          <option>Paid</option>
          <option>Overdue</option>
          <option>Disputed</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Invoice #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                PO Ref
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Raised
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Due
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Outstanding
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {MOCK_INVOICES.map((inv) => {
              const badgeClass = statusBadge(inv.status);
              const totalDisplay = formatZar(inv.totalValue);
              const outstandingDisplay = formatZar(inv.outstanding);
              const outstandingClass = inv.outstanding > 0 ? "text-red-600" : "text-gray-500";
              return (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-[#323288]">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {inv.customer}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {inv.poReference}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {inv.raisedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {inv.dueAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {totalDisplay}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${outstandingClass}`}>
                    {outstandingDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                    >
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          What Sales Invoices will do
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Auto-generate from signed-off delivery notes (one click)</li>
          <li>Pull customer PO reference and payment terms from the originating PO</li>
          <li>Branded PDF with VAT calculation and bank details</li>
          <li>Email direct to customer finance contact</li>
          <li>Payment allocation and aged debtor tracking</li>
          <li>Dispute flag with notes and attachments</li>
          <li>Credit note linkage for returns and adjustments</li>
          <li>Sage export via existing Sage API integration (rate-limited)</li>
        </ul>
      </div>
    </div>
  );
}
