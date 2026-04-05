"use client";

const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: "Example Mining Co",
    onTimePaymentPct: 96,
    avgDaysToPay: 28,
    ytdRevenue: 4_280_000,
    orderCount: 42,
    disputes: 0,
    creditLimit: 2_000_000,
    creditUsed: 487_200,
    starRating: 4.8,
  },
  {
    id: 2,
    name: "Sample Chemical Works",
    onTimePaymentPct: 91,
    avgDaysToPay: 32,
    ytdRevenue: 6_120_000,
    orderCount: 28,
    disputes: 1,
    creditLimit: 3_000_000,
    creditUsed: 0,
    starRating: 4.5,
  },
  {
    id: 3,
    name: "Test Power Station",
    onTimePaymentPct: 68,
    avgDaysToPay: 52,
    ytdRevenue: 3_450_000,
    orderCount: 19,
    disputes: 3,
    creditLimit: 1_500_000,
    creditUsed: 892_500,
    starRating: 2.9,
  },
  {
    id: 4,
    name: "Example Refinery Ltd",
    onTimePaymentPct: 88,
    avgDaysToPay: 35,
    ytdRevenue: 2_180_000,
    orderCount: 31,
    disputes: 1,
    creditLimit: 1_000_000,
    creditUsed: 72_900,
    starRating: 4.1,
  },
  {
    id: 5,
    name: "Sample Water Utility",
    onTimePaymentPct: 54,
    avgDaysToPay: 71,
    ytdRevenue: 1_240_000,
    orderCount: 12,
    disputes: 2,
    creditLimit: 800_000,
    creditUsed: 376_400,
    starRating: 2.4,
  },
];

function paymentColour(pct: number): string {
  if (pct >= 90) return "text-green-600";
  if (pct >= 75) return "text-amber-600";
  return "text-red-600";
}

function daysColour(days: number): string {
  if (days <= 30) return "text-green-600";
  if (days <= 45) return "text-amber-600";
  return "text-red-600";
}

function formatZar(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `R ${(value / 1_000).toFixed(0)}k`;
  return `R ${value.toLocaleString("en-ZA")}`;
}

function formatStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "⯨" : "") + "☆".repeat(empty);
}

export default function CustomerScorecardPage() {
  const sortedCustomers = [...MOCK_CUSTOMERS].sort((a, b) => b.ytdRevenue - a.ytdRevenue);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Customer Scorecard
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Payment behaviour, order frequency and credit utilization per customer.
        </p>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">YTD Revenue</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            R 17.3m
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Avg Days To Pay</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">44d</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">Active Disputes</div>
          <div className="mt-1 text-2xl font-semibold text-purple-600">7</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-xs uppercase text-gray-500 font-medium">At Credit Limit</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">1</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/20">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                On-Time %
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Avg Days
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                YTD Revenue
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Orders
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Disputes
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Credit Used
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedCustomers.map((c) => {
              const payClass = paymentColour(c.onTimePaymentPct);
              const daysClass = daysColour(c.avgDaysToPay);
              const revenueDisplay = formatZar(c.ytdRevenue);
              const creditPct = Math.round((c.creditUsed / c.creditLimit) * 100);
              const creditClass =
                creditPct >= 90 ? "bg-red-500" : creditPct >= 60 ? "bg-amber-500" : "bg-[#323288]";
              const creditUsedDisplay = formatZar(c.creditUsed);
              const creditLimitDisplay = formatZar(c.creditLimit);
              const stars = formatStars(c.starRating);
              return (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {c.name}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${payClass}`}>
                    {c.onTimePaymentPct}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${daysClass}`}>
                    {c.avgDaysToPay}d
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {revenueDisplay}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {c.orderCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    {c.disputes}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-28 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${creditClass}`}
                        style={{ width: `${Math.min(creditPct, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {creditUsedDisplay} / {creditLimitDisplay}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-[#FFA500] text-base leading-none">{stars}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.starRating.toFixed(1)}</div>
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
            <li>On-time payment % — invoices paid on/before due date</li>
            <li>Average days to pay — weighted by invoice value</li>
            <li>YTD revenue — sum of paid + outstanding invoices this year</li>
            <li>Order count — POs raised in rolling 12 months</li>
            <li>Active disputes — open dispute flags on invoices</li>
            <li>Credit utilization — outstanding balance vs configured limit</li>
            <li>Overall star rating — weighted composite of payment + volume</li>
          </ul>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Planned features
          </h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>Credit limit hold — block new POs when limit reached</li>
            <li>Monthly statement auto-email to customer finance team</li>
            <li>Payment reminder automation at +7 / +14 / +30 day intervals</li>
            <li>Trend sparklines for revenue and payment behaviour</li>
            <li>VIP customer flag with priority routing</li>
            <li>Export scorecard to PDF for sales review meetings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
