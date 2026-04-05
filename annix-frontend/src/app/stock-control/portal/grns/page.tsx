"use client";

const MOCK_GRNS = [
  {
    id: 1,
    grnNumber: "GRN-2026-00142",
    supplier: "Example Steel Supplies",
    poNumber: "PO-2026-0311",
    deliveryNote: "DN-88421",
    receivedAt: "2026-04-02",
    receivedBy: "Storeman A",
    lineCount: 6,
    status: "posted",
    totalValue: 284_500,
  },
  {
    id: 2,
    grnNumber: "GRN-2026-00141",
    supplier: "Test Flange Co",
    poNumber: "PO-2026-0298",
    deliveryNote: "DN-88402",
    receivedAt: "2026-04-01",
    receivedBy: "Storeman B",
    lineCount: 2,
    status: "posted",
    totalValue: 52_300,
  },
  {
    id: 3,
    grnNumber: "GRN-2026-00140",
    supplier: "Sample Fittings Ltd",
    poNumber: "PO-2026-0305",
    deliveryNote: "DN-88395",
    receivedAt: "2026-03-30",
    receivedBy: "Storeman A",
    lineCount: 14,
    status: "draft",
    totalValue: 118_750,
  },
  {
    id: 4,
    grnNumber: "GRN-2026-00139",
    supplier: "Example Coatings Corp",
    poNumber: "PO-2026-0287",
    deliveryNote: "DN-88340",
    receivedAt: "2026-03-28",
    receivedBy: "Storeman C",
    lineCount: 4,
    status: "posted",
    totalValue: 96_200,
  },
];

function statusBadge(status: string): string {
  if (status === "posted") return "bg-green-100 text-green-800 border-green-200";
  if (status === "draft") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatZar(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function GrnsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Goods Received Notes
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Formal receiving records raised when supplier deliveries are accepted into stock.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
        >
          New GRN
        </button>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Open GRNs</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">12</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Posted This Month</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">47</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Pending Match</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">8</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Month Value</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">R 1.8m</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search GRN / PO / DN…"
          className="rounded-md border-gray-300 text-sm"
        />
        <select className="rounded-md border-gray-300 text-sm">
          <option>All suppliers</option>
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All statuses</option>
          <option>Draft</option>
          <option>Posted</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                GRN #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                PO #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                DN #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Received
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                By
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
            {MOCK_GRNS.map((grn) => {
              const badgeClass = statusBadge(grn.status);
              const valueDisplay = formatZar(grn.totalValue);
              return (
                <tr key={grn.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-[#323288]">{grn.grnNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {grn.supplier}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {grn.poNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {grn.deliveryNote}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {grn.receivedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {grn.receivedBy}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {grn.lineCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {valueDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                    >
                      {grn.status}
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
          What GRNs will do
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Auto-generate from accepted delivery notes</li>
          <li>Storeman sign-off with photo evidence of received stock</li>
          <li>Close matching open PO lines and bump committed → on-hand</li>
          <li>Feed stock movement history for audit trail</li>
          <li>Support partial receipts and back-orders against the originating PO</li>
          <li>Three-way match gate for supplier invoice posting (PO ↔ GRN ↔ Invoice)</li>
        </ul>
      </div>
    </div>
  );
}
