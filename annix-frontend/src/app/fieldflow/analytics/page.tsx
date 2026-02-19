"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ActivityHeatmapCell,
  GoalPeriod,
  GoalProgress,
  MeetingsOverTime,
  ProspectFunnel,
  ProspectStatus,
  RevenuePipeline,
  TopProspect,
  WinLossRateTrend,
} from "@/app/lib/api/annixRepApi";
import { formatDateZA } from "@/app/lib/datetime";
import { AnalyticsSkeleton, SkeletonStatCard } from "../components/Skeleton";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-ZA");
}

import {
  useActivityHeatmap,
  useAnalyticsSummary,
  useGoalProgress,
  useMeetingsOverTime,
  useProspectFunnel,
  useRevenuePipeline,
  useTopProspects,
  useWinLossRateTrends,
} from "@/app/lib/query/hooks";

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
}

function MeetingsChart({
  data,
  period,
  onPeriodChange,
}: {
  data: MeetingsOverTime[];
  period: "week" | "month";
  onPeriodChange: (p: "week" | "month") => void;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meetings Over Time</h3>
        <div className="flex gap-1">
          <button
            onClick={() => onPeriodChange("week")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              period === "week"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => onPeriodChange("month")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              period === "month"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="flex items-end gap-2 h-40">
        {data.map((item) => (
          <div key={item.period} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{
                  height: `${(item.count / maxCount) * 100}%`,
                  minHeight: item.count > 0 ? "4px" : "0",
                }}
              />
              {item.cancelled > 0 && (
                <div
                  className="w-full bg-red-400 rounded-t absolute bottom-0"
                  style={{
                    height: `${(item.cancelled / maxCount) * 100}%`,
                    minHeight: "2px",
                  }}
                />
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.period}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Total</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  );
}

const statusLabels: Record<ProspectStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const statusColors: Record<ProspectStatus, string> = {
  new: "bg-gray-400",
  contacted: "bg-blue-400",
  qualified: "bg-yellow-400",
  proposal: "bg-purple-400",
  won: "bg-green-500",
  lost: "bg-red-400",
};

function ProspectFunnelChart({ data }: { data: ProspectFunnel[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const pipelineData = data.filter((d) => d.status !== "won" && d.status !== "lost");
  const outcomesData = data.filter((d) => d.status === "won" || d.status === "lost");

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prospect Funnel</h3>
      <div className="space-y-3">
        {pipelineData.map((item) => (
          <div key={item.status} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
              {statusLabels[item.status]}
            </div>
            <div className="flex-1 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
              <div
                className={`h-full ${statusColors[item.status]} flex items-center justify-end px-2`}
                style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: "fit-content" }}
              >
                <span className="text-xs font-medium text-white">{item.count}</span>
              </div>
            </div>
            <div className="w-24 text-right text-sm text-gray-500 dark:text-gray-400">
              R{formatCurrency(item.totalValue)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-4">
        {outcomesData.map((item) => (
          <div
            key={item.status}
            className={`p-3 rounded-lg ${
              item.status === "won"
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                item.status === "won"
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {statusLabels[item.status]}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{item.count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              R{formatCurrency(item.totalValue)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinLossChart({ data }: { data: WinLossRateTrend[] }) {
  const maxValue = Math.max(...data.flatMap((d) => [d.won, d.lost]), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Win/Loss Rate Trends
      </h3>
      <div className="flex items-end gap-4 h-32">
        {data.map((item) => (
          <div key={item.period} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs font-medium text-gray-900 dark:text-white">{item.winRate}%</div>
            <div className="relative w-full flex gap-1 h-24">
              <div
                className="flex-1 bg-green-500 rounded-t"
                style={{ height: `${(item.won / maxValue) * 100}%` }}
              />
              <div
                className="flex-1 bg-red-400 rounded-t"
                style={{ height: `${(item.lost / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.period}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Won</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span>Lost</span>
        </div>
      </div>
    </div>
  );
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ActivityHeatmapChart({ data }: { data: ActivityHeatmapCell[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const hours = Array.from({ length: 14 }, (_, i) => i + 6);

  const cellData = (day: number, hour: number) => {
    const cell = data.find((d) => d.dayOfWeek === day && d.hour === hour);
    return cell?.count ?? 0;
  };

  const intensityColor = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-slate-700";
    const intensity = count / maxCount;
    if (intensity <= 0.25) return "bg-blue-200 dark:bg-blue-900/30";
    if (intensity <= 0.5) return "bg-blue-300 dark:bg-blue-800/50";
    if (intensity <= 0.75) return "bg-blue-400 dark:bg-blue-700/70";
    return "bg-blue-500 dark:bg-blue-600";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Activity Heatmap (Last 30 Days)
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="flex gap-1 mb-1 ml-10">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                {hour}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {dayNames.map((day, dayIndex) => (
              <div key={day} className="flex gap-1 items-center">
                <div className="w-8 text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {day}
                </div>
                {hours.map((hour) => {
                  const count = cellData(dayIndex, hour);
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-5 rounded ${intensityColor(count)}`}
                      title={`${day} ${hour}:00 - ${count} visits`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-slate-700" />
          <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-900/30" />
          <div className="w-4 h-4 rounded bg-blue-300 dark:bg-blue-800/50" />
          <div className="w-4 h-4 rounded bg-blue-400 dark:bg-blue-700/70" />
          <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function RevenuePipelineChart({ data }: { data: RevenuePipeline[] }) {
  const totalValue = data.reduce((sum, d) => sum + d.totalValue, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Revenue Pipeline</h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        R{formatCurrency(totalValue)}
      </p>
      {totalValue > 0 && (
        <div className="h-6 flex rounded-lg overflow-hidden mb-4">
          {data.map(
            (item) =>
              item.totalValue > 0 && (
                <div
                  key={item.status}
                  className={`${statusColors[item.status]}`}
                  style={{ width: `${(item.totalValue / totalValue) * 100}%` }}
                  title={`${statusLabels[item.status]}: R${formatCurrency(item.totalValue)}`}
                />
              ),
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${statusColors[item.status]}`} />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statusLabels[item.status]}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                R{formatCurrency(item.totalValue)} ({item.count})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProspectsList({ data }: { data: TopProspect[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Top Prospects by Value
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No prospects with estimated values
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((prospect, index) => (
            <Link
              key={prospect.id}
              href={`/annix-rep/prospects/${prospect.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {prospect.companyName}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      prospect.status === "won"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : prospect.status === "lost"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
                    }`}
                  >
                    {statusLabels[prospect.status]}
                  </span>
                  {prospect.lastContactedAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last: {formatDateZA(prospect.lastContactedAt.toString())}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  R{formatCurrency(prospect.estimatedValue)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const goalPeriodLabels: Record<GoalPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

function GoalProgressBar({
  label,
  actual,
  target,
  percentage,
  isCurrency,
}: {
  label: string;
  actual: number;
  target: number | null;
  percentage: number | null;
  isCurrency?: boolean;
}) {
  if (target === null) {
    return null;
  }

  const progressColor =
    percentage !== null
      ? percentage >= 100
        ? "bg-green-500"
        : percentage >= 75
          ? "bg-blue-500"
          : percentage >= 50
            ? "bg-yellow-500"
            : "bg-red-400"
      : "bg-gray-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {isCurrency ? `R${formatCurrency(actual)}` : actual} /{" "}
          {isCurrency ? `R${formatCurrency(target)}` : target}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-300`}
          style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-right">
        {percentage !== null ? `${percentage}%` : "-"}
      </p>
    </div>
  );
}

function GoalProgressCard({
  data,
  period,
  onPeriodChange,
  isLoading,
}: {
  data: GoalProgress | undefined;
  period: GoalPeriod;
  onPeriodChange: (p: GoalPeriod) => void;
  isLoading: boolean;
}) {
  const periods: GoalPeriod[] = ["weekly", "monthly", "quarterly"];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Goal Progress</h3>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                period === p
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              {goalPeriodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 py-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      ) : !data ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No goals set for this period</p>
          <Link
            href="/annix-rep/goals"
            className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Set up goals
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateZA(data.periodStart)} - {formatDateZA(data.periodEnd)}
          </p>

          <GoalProgressBar
            label="Meetings"
            actual={data.meetings.actual}
            target={data.meetings.target}
            percentage={data.meetings.percentage}
          />

          <GoalProgressBar
            label="Visits"
            actual={data.visits.actual}
            target={data.visits.target}
            percentage={data.visits.percentage}
          />

          <GoalProgressBar
            label="New Prospects"
            actual={data.newProspects.actual}
            target={data.newProspects.target}
            percentage={data.newProspects.percentage}
          />

          <GoalProgressBar
            label="Revenue"
            actual={data.revenue.actual}
            target={data.revenue.target}
            percentage={data.revenue.percentage}
            isCurrency
          />

          <GoalProgressBar
            label="Deals Won"
            actual={data.dealsWon.actual}
            target={data.dealsWon.target}
            percentage={data.dealsWon.percentage}
          />
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [meetingsPeriod, setMeetingsPeriod] = useState<"week" | "month">("week");
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("monthly");

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: meetingsOverTime } = useMeetingsOverTime(meetingsPeriod, 8);
  const { data: prospectFunnel } = useProspectFunnel();
  const { data: winLossTrends } = useWinLossRateTrends(6);
  const { data: activityHeatmap } = useActivityHeatmap();
  const { data: revenuePipeline } = useRevenuePipeline();
  const { data: topProspects } = useTopProspects(10);
  const { data: goalProgress, isLoading: goalProgressLoading } = useGoalProgress(goalPeriod);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/annix-rep"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Track your sales performance</p>
        </div>
      </div>

      {summaryLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Prospects"
              value={summary?.totalProspects ?? 0}
              subValue={`${summary?.activeProspects ?? 0} active`}
            />
            <StatCard
              label="Total Meetings"
              value={summary?.totalMeetings ?? 0}
              subValue={`${summary?.completedMeetings ?? 0} completed`}
            />
            <StatCard
              label="Pipeline Value"
              value={`R${formatCurrency(summary?.totalPipelineValue ?? 0)}`}
            />
            <StatCard
              label="Win Rate"
              value={summary?.winRate !== null ? `${summary?.winRate}%` : "-"}
              subValue={
                summary?.avgDealCycledays !== null
                  ? `Avg cycle: ${summary?.avgDealCycledays} days`
                  : undefined
              }
            />
          </div>

          <GoalProgressCard
            data={goalProgress}
            period={goalPeriod}
            onPeriodChange={setGoalPeriod}
            isLoading={goalProgressLoading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {meetingsOverTime && (
              <MeetingsChart
                data={meetingsOverTime}
                period={meetingsPeriod}
                onPeriodChange={setMeetingsPeriod}
              />
            )}
            {prospectFunnel && <ProspectFunnelChart data={prospectFunnel} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {winLossTrends && <WinLossChart data={winLossTrends} />}
            {revenuePipeline && <RevenuePipelineChart data={revenuePipeline} />}
          </div>

          {activityHeatmap && <ActivityHeatmapChart data={activityHeatmap} />}

          {topProspects && <TopProspectsList data={topProspects} />}
        </>
      )}
    </div>
  );
}
