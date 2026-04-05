"use client";

const MOCK_POS = [
  {
    id: 1,
    poNumber: "PO-2026-0312",
    supplier: "Example Steel Supplies",
    raisedBy: "Buyer A",
    raisedAt: "2026-04-03",
    expectedAt: "2026-04-10",
    lineCount: 8,
    committedValue: 426_000,
    received: 0,
    status: "sent",
  },
  {
    id: 2,
    poNumber: "PO-2026-0311",
    supplier: "Example Steel Supplies",
    raisedBy: "Buyer B",
    raisedAt: "2026-04-01",
    expectedAt: "2026-04-08",
    lineCount: 6,
    committedValue: 284_500,
    received: 100,
    status: "closed",
  },
  {
    id: 3,
    poNumber: "PO-2026-0310",
    supplier: "Sample Fittings Ltd",
    raisedBy: "Buyer A",
    raisedAt: "2026-03-31",
    expectedAt: "2026-04-15",
    lineCount: 14,
    committedValue: 118_750,
    received: 65,
    status: "partial",
  },
  {
    id: 4,
    poNumber: "PO-2026-0309",
    supplier: "Test Flange Co",
    raisedBy: "Buyer C",
    raisedAt: "2026-03-30",
    expectedAt: "2026-04-12",
    lineCount: 3,
    committedValue: 67_400,
    received: 0,
    status: "acknowledged",
  },
  {
    id: 5,
    poNumber: "PO-2026-0308",
    supplier: "Example Coatings Corp",
    raisedBy: "Buyer A",
    raisedAt: "2026-03-29",
    expectedAt: "2026-04-05",
    lineCount: 2,
    committedValue: 38_200,
    received: 0,
    status: "draft",
  },
];

function statusBadge(status: string): string {
  if (status === "closed") return "bg-green-100 text-green-800 border-green-200";
  if (status === "partial") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "sent") return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "acknowledged") return "bg-indigo-100 text-indigo-800 border-indigo-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatZar(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SupplierPurchaseOrdersPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Supplier POs</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Issue and track purchase orders sent to suppliers.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
        >
          New Purchase Order
        </button>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Open Commitment</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">R 934k</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Active POs</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">23</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Awaiting Ack</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">5</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Overdue</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">2</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search PO number…"
          className="rounded-md border-gray-300 text-sm"
        />
        <select className="rounded-md border-gray-300 text-sm">
          <option>All suppliers</option>
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All statuses</option>
          <option>Draft</option>
          <option>Sent</option>
          <option>Acknowledged</option>
          <option>Partial</option>
          <option>Closed</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                PO #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Raised
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Expected
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Lines
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Committed
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Received
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {MOCK_POS.map((po) => {
              const badgeClass = statusBadge(po.status);
              const committedDisplay = formatZar(po.committedValue);
              return (
                <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-[#323288]">{po.poNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {po.supplier}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {po.raisedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {po.expectedAt}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {po.lineCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {committedDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#323288] h-2 rounded-full"
                        style={{ width: `${po.received}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{po.received}%</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                    >
                      {po.status}
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
          What Supplier POs will do
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Generate from approved internal requisitions with one click</li>
          <li>Email PDF direct to supplier with branded letterhead and terms</li>
          <li>Supplier acknowledgement link (accept or counter)</li>
          <li>Open commitment tracking — stock on order visible on dashboards</li>
          <li>Partial receipt handling with back-order lines</li>
          <li>Three-way match: PO ↔ GRN ↔ Supplier Invoice</li>
          <li>Sage export of approved POs via existing Sage API integration</li>
        </ul>
      </div>
    </div>
  );
}
