"use client";

const MOCK_QUOTES = [
  {
    id: 1,
    quoteNumber: "QUO-2026-0187",
    customer: "Example Mining Co",
    subject: "DN100 spool assemblies x 12",
    raisedBy: "Sales A",
    raisedAt: "2026-04-03",
    validUntil: "2026-05-03",
    lineCount: 8,
    totalValue: 487_200,
    status: "sent",
  },
  {
    id: 2,
    quoteNumber: "QUO-2026-0186",
    customer: "Sample Chemical Works",
    subject: "Rubber-lined pipework refurb",
    raisedBy: "Sales B",
    raisedAt: "2026-04-02",
    validUntil: "2026-05-02",
    lineCount: 15,
    totalValue: 1_240_000,
    status: "won",
  },
  {
    id: 3,
    quoteNumber: "QUO-2026-0185",
    customer: "Test Power Station",
    subject: "Tee and flange fabrication",
    raisedBy: "Sales A",
    raisedAt: "2026-03-30",
    validUntil: "2026-04-30",
    lineCount: 22,
    totalValue: 892_500,
    status: "negotiating",
  },
  {
    id: 4,
    quoteNumber: "QUO-2026-0184",
    customer: "Example Refinery Ltd",
    subject: "Emergency bend replacement",
    raisedBy: "Sales C",
    raisedAt: "2026-03-28",
    validUntil: "2026-04-11",
    lineCount: 3,
    totalValue: 145_800,
    status: "lost",
  },
  {
    id: 5,
    quoteNumber: "QUO-2026-0183",
    customer: "Sample Water Utility",
    subject: "DN600 HDPE spools",
    raisedBy: "Sales B",
    raisedAt: "2026-03-27",
    validUntil: "2026-04-27",
    lineCount: 6,
    totalValue: 376_400,
    status: "draft",
  },
];

function statusBadge(status: string): string {
  if (status === "won") return "bg-green-100 text-green-800 border-green-200";
  if (status === "lost") return "bg-red-100 text-red-800 border-red-200";
  if (status === "negotiating") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "sent") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatZar(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QuotationsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quotations</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Quotes and RFQ responses issued to customers.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
        >
          New Quotation
        </button>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Open Pipeline</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">R 1.8m</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Win Rate</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">62%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Awaiting Response</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">9</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Expiring This Week</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">3</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search quote number / customer…"
          className="rounded-md border-gray-300 text-sm"
        />
        <select className="rounded-md border-gray-300 text-sm">
          <option>All customers</option>
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All statuses</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Negotiating</option>
          <option>Won</option>
          <option>Lost</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Quote #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Subject
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Raised
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Valid Until
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Lines
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Value
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {MOCK_QUOTES.map((q) => {
              const badgeClass = statusBadge(q.status);
              const valueDisplay = formatZar(q.totalValue);
              return (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-[#323288]">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.customer}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.subject}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.raisedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {q.validUntil}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {q.lineCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {valueDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                    >
                      {q.status}
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
          What Quotations will do
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Generate from customer RFQ attachments using AI line extraction</li>
          <li>Reuse material pricing from stock cards and supplier quotes</li>
          <li>Auto-calculate fabrication weld metres, labour, markup</li>
          <li>Branded PDF export emailed direct to customer contact</li>
          <li>Revision history per quote (v1, v2…) with diff view</li>
          <li>Convert won quote to customer Purchase Order with one click</li>
          <li>Pipeline value, win rate and aged pipeline on dashboard</li>
        </ul>
      </div>
    </div>
  );
}
