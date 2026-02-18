"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CreateGoalDto,
  GoalPeriod,
  GoalProgress,
  SalesGoal,
} from "@/app/lib/api/fieldflowApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useCreateOrUpdateGoal,
  useDeleteGoal,
  useGoalProgress,
  useSalesGoals,
} from "@/app/lib/query/hooks";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-ZA");
}

const goalPeriodLabels: Record<GoalPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

interface GoalFormData {
  meetingsTarget: string;
  visitsTarget: string;
  newProspectsTarget: string;
  revenueTarget: string;
  dealsWonTarget: string;
}

function GoalEditForm({
  period,
  existingGoal,
  onSave,
  onCancel,
  isSaving,
}: {
  period: GoalPeriod;
  existingGoal: SalesGoal | null;
  onSave: (dto: CreateGoalDto) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<GoalFormData>({
    meetingsTarget: existingGoal?.meetingsTarget?.toString() ?? "",
    visitsTarget: existingGoal?.visitsTarget?.toString() ?? "",
    newProspectsTarget: existingGoal?.newProspectsTarget?.toString() ?? "",
    revenueTarget: existingGoal?.revenueTarget?.toString() ?? "",
    dealsWonTarget: existingGoal?.dealsWonTarget?.toString() ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dto: CreateGoalDto = {
      period,
      meetingsTarget: formData.meetingsTarget ? parseInt(formData.meetingsTarget, 10) : null,
      visitsTarget: formData.visitsTarget ? parseInt(formData.visitsTarget, 10) : null,
      newProspectsTarget: formData.newProspectsTarget
        ? parseInt(formData.newProspectsTarget, 10)
        : null,
      revenueTarget: formData.revenueTarget ? parseFloat(formData.revenueTarget) : null,
      dealsWonTarget: formData.dealsWonTarget ? parseInt(formData.dealsWonTarget, 10) : null,
    };
    onSave(dto);
  }

  function handleChange(field: keyof GoalFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meetings Target
          </label>
          <input
            type="number"
            min="0"
            value={formData.meetingsTarget}
            onChange={(e) => handleChange("meetingsTarget", e.target.value)}
            placeholder="e.g., 20"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Visits Target
          </label>
          <input
            type="number"
            min="0"
            value={formData.visitsTarget}
            onChange={(e) => handleChange("visitsTarget", e.target.value)}
            placeholder="e.g., 50"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Prospects Target
          </label>
          <input
            type="number"
            min="0"
            value={formData.newProspectsTarget}
            onChange={(e) => handleChange("newProspectsTarget", e.target.value)}
            placeholder="e.g., 15"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Revenue Target (R)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.revenueTarget}
            onChange={(e) => handleChange("revenueTarget", e.target.value)}
            placeholder="e.g., 500000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deals Won Target
          </label>
          <input
            type="number"
            min="0"
            value={formData.dealsWonTarget}
            onChange={(e) => handleChange("dealsWonTarget", e.target.value)}
            placeholder="e.g., 5"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Goal"}
        </button>
      </div>
    </form>
  );
}

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
    return (
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span>Not set</span>
      </div>
    );
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
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({percentage !== null ? `${percentage}%` : "-"})
          </span>
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-300`}
          style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function GoalCard({
  period,
  goal,
  progress,
  progressLoading,
  onEdit,
  onDelete,
  isDeleting,
}: {
  period: GoalPeriod;
  goal: SalesGoal | null;
  progress: GoalProgress | undefined;
  progressLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const hasAnyTarget =
    goal &&
    (goal.meetingsTarget !== null ||
      goal.visitsTarget !== null ||
      goal.newProspectsTarget !== null ||
      goal.revenueTarget !== null ||
      goal.dealsWonTarget !== null);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {goalPeriodLabels[period]} Goals
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit goals"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
          {hasAnyTarget && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Delete goals"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!hasAnyTarget ? (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No goals set for this period</p>
          <button
            onClick={onEdit}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Set up {goalPeriodLabels[period].toLowerCase()} goals
          </button>
        </div>
      ) : progressLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      ) : progress ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateZA(progress.periodStart)} - {formatDateZA(progress.periodEnd)}
          </p>

          <GoalProgressBar
            label="Meetings"
            actual={progress.meetings.actual}
            target={progress.meetings.target}
            percentage={progress.meetings.percentage}
          />

          <GoalProgressBar
            label="Visits"
            actual={progress.visits.actual}
            target={progress.visits.target}
            percentage={progress.visits.percentage}
          />

          <GoalProgressBar
            label="New Prospects"
            actual={progress.newProspects.actual}
            target={progress.newProspects.target}
            percentage={progress.newProspects.percentage}
          />

          <GoalProgressBar
            label="Revenue"
            actual={progress.revenue.actual}
            target={progress.revenue.target}
            percentage={progress.revenue.percentage}
            isCurrency
          />

          <GoalProgressBar
            label="Deals Won"
            actual={progress.dealsWon.actual}
            target={progress.dealsWon.target}
            percentage={progress.dealsWon.percentage}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function GoalsPage() {
  const [editingPeriod, setEditingPeriod] = useState<GoalPeriod | null>(null);

  const { data: goals, isLoading: goalsLoading } = useSalesGoals();
  const { data: weeklyProgress, isLoading: weeklyLoading } = useGoalProgress("weekly");
  const { data: monthlyProgress, isLoading: monthlyLoading } = useGoalProgress("monthly");
  const { data: quarterlyProgress, isLoading: quarterlyLoading } = useGoalProgress("quarterly");

  const createOrUpdateGoal = useCreateOrUpdateGoal();
  const deleteGoal = useDeleteGoal();

  function goalForPeriod(period: GoalPeriod): SalesGoal | null {
    return goals?.find((g) => g.period === period) ?? null;
  }

  function progressForPeriod(period: GoalPeriod): GoalProgress | undefined {
    if (period === "weekly") return weeklyProgress;
    if (period === "monthly") return monthlyProgress;
    return quarterlyProgress;
  }

  function progressLoadingForPeriod(period: GoalPeriod): boolean {
    if (period === "weekly") return weeklyLoading;
    if (period === "monthly") return monthlyLoading;
    return quarterlyLoading;
  }

  function handleSave(dto: CreateGoalDto) {
    createOrUpdateGoal.mutate(dto, {
      onSuccess: () => {
        setEditingPeriod(null);
      },
    });
  }

  function handleDelete(period: GoalPeriod) {
    if (
      confirm(
        `Are you sure you want to delete your ${goalPeriodLabels[period].toLowerCase()} goals?`,
      )
    ) {
      deleteGoal.mutate(period);
    }
  }

  const periods: GoalPeriod[] = ["weekly", "monthly", "quarterly"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Goals</h1>
          <p className="text-gray-500 dark:text-gray-400">Set and track your targets</p>
        </div>
      </div>

      {goalsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : editingPeriod ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {goalForPeriod(editingPeriod) ? "Edit" : "Set"} {goalPeriodLabels[editingPeriod]} Goals
          </h3>
          <GoalEditForm
            period={editingPeriod}
            existingGoal={goalForPeriod(editingPeriod)}
            onSave={handleSave}
            onCancel={() => setEditingPeriod(null)}
            isSaving={createOrUpdateGoal.isPending}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {periods.map((period) => (
            <GoalCard
              key={period}
              period={period}
              goal={goalForPeriod(period)}
              progress={progressForPeriod(period)}
              progressLoading={progressLoadingForPeriod(period)}
              onEdit={() => setEditingPeriod(period)}
              onDelete={() => handleDelete(period)}
              isDeleting={deleteGoal.isPending}
            />
          ))}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How Goals Work
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span>
              <strong>Weekly goals</strong> reset every Monday and track progress through Sunday.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span>
              <strong>Monthly goals</strong> reset on the 1st and track progress through month end.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span>
              <strong>Quarterly goals</strong> align with calendar quarters (Jan-Mar, Apr-Jun,
              etc.).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span>
              Progress is tracked automatically based on your meetings, visits, prospects, and won
              deals.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
