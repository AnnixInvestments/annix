"use client";

const MOCK_SUPPLIERS = [
  {
    id: 1,
    name: "Example Steel Supplies",
    onTimePct: 94,
    qualityPct: 98,
    priceVariancePct: -1.2,
    leadTimeDays: 6.4,
    deliveries: 42,
    rejections: 1,
    starRating: 4.7,
  },
  {
    id: 2,
    name: "Test Flange Co",
    onTimePct: 88,
    qualityPct: 95,
    priceVariancePct: 2.1,
    leadTimeDays: 8.1,
    deliveries: 28,
    rejections: 2,
    starRating: 4.2,
  },
  {
    id: 3,
    name: "Sample Fittings Ltd",
    onTimePct: 76,
    qualityPct: 92,
    priceVariancePct: 4.8,
    leadTimeDays: 11.3,
    deliveries: 19,
    rejections: 3,
    starRating: 3.5,
  },
  {
    id: 4,
    name: "Example Coatings Corp",
    onTimePct: 97,
    qualityPct: 99,
    priceVariancePct: -0.4,
    leadTimeDays: 4.2,
    deliveries: 31,
    rejections: 0,
    starRating: 4.9,
  },
  {
    id: 5,
    name: "Sample Fastener Works",
    onTimePct: 62,
    qualityPct: 88,
    priceVariancePct: 6.5,
    leadTimeDays: 14.7,
    deliveries: 12,
    rejections: 4,
    starRating: 2.8,
  },
];

function metricColour(value: number, good: number, ok: number): string {
  if (value >= good) return "text-green-600";
  if (value >= ok) return "text-amber-600";
  return "text-red-600";
}

function priceVarianceColour(value: number): string {
  if (value <= 0) return "text-green-600";
  if (value <= 3) return "text-amber-600";
  return "text-red-600";
}

function formatStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "⯨" : "") + "☆".repeat(empty);
}

export default function SupplierScorecardPage() {
  const sortedSuppliers = [...MOCK_SUPPLIERS].sort((a, b) => b.starRating - a.starRating);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Supplier Scorecard
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Performance metrics for each supplier: on-time delivery, quality, and price.
        </p>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Avg On-Time</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">83%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Avg Quality</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">94%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Active Suppliers</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {MOCK_SUPPLIERS.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Under-Performing</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">1</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                On-Time %
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Quality %
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Price Var %
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Lead Time
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Deliveries
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Rejects
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedSuppliers.map((sup) => {
              const onTimeClass = metricColour(sup.onTimePct, 90, 75);
              const qualityClass = metricColour(sup.qualityPct, 95, 85);
              const priceClass = priceVarianceColour(sup.priceVariancePct);
              const leadClass = sup.leadTimeDays <= 7 ? "text-green-600" : "text-amber-600";
              const stars = formatStars(sup.starRating);
              const priceSign = sup.priceVariancePct > 0 ? "+" : "";
              return (
                <tr key={sup.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {sup.name}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${onTimeClass}`}>
                    {sup.onTimePct}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${qualityClass}`}>
                    {sup.qualityPct}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${priceClass}`}>
                    {priceSign}
                    {sup.priceVariancePct.toFixed(1)}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${leadClass}`}>
                    {sup.leadTimeDays.toFixed(1)}d
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {sup.deliveries}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {sup.rejections}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-[#FFA500] text-base leading-none">{stars}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{sup.starRating.toFixed(1)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Metrics calculated
          </h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>On-time % — GRN date vs PO expected date</li>
            <li>Quality % — accepted qty / received qty from QC inspections</li>
            <li>Price variance — invoiced price vs original PO price</li>
            <li>Lead time — days from PO raised to GRN posted</li>
            <li>Rejection count — failed QC inspections in period</li>
            <li>Overall star rating — weighted composite of all metrics</li>
          </ul>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Planned features
          </h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>Period selector (month / quarter / YTD / custom)</li>
            <li>Drill-down to underlying GRNs and invoices per supplier</li>
            <li>Trend sparklines for each metric over last 12 months</li>
            <li>Configurable scoring weights per metric</li>
            <li>Preferred supplier flag with RFQ auto-routing</li>
            <li>Export scorecard to PDF for supplier review meetings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
