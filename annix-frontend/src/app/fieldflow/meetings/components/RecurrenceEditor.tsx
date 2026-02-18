"use client";

import type {
  RecurrenceEndType,
  RecurrenceFrequency,
  RecurrenceOptions,
} from "@/app/lib/api/annixRepApi";

interface RecurrenceEditorProps {
  value: RecurrenceOptions;
  onChange: (options: RecurrenceOptions) => void;
}

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const FREQUENCIES: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const END_TYPES: Array<{ value: RecurrenceEndType; label: string }> = [
  { value: "never", label: "Never" },
  { value: "count", label: "After" },
  { value: "until", label: "On date" },
];

export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const updateField = <K extends keyof RecurrenceOptions>(
    field: K,
    fieldValue: RecurrenceOptions[K],
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const toggleWeekDay = (day: number) => {
    const currentDays = value.byWeekDay ?? [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    updateField("byWeekDay", newDays.length > 0 ? newDays : undefined);
  };

  const frequencyLabel = (freq: RecurrenceFrequency): string => {
    const labels: Record<RecurrenceFrequency, string> = {
      daily: "day",
      weekly: "week",
      monthly: "month",
      yearly: "year",
    };
    return labels[freq];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">Repeat every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={value.interval ?? 1}
          onChange={(e) => updateField("interval", parseInt(e.target.value, 10) || 1)}
          className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
        />
        <select
          value={value.frequency}
          onChange={(e) => updateField("frequency", e.target.value as RecurrenceFrequency)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
        >
          {FREQUENCIES.map((freq) => (
            <option key={freq.value} value={freq.value}>
              {freq.label}
            </option>
          ))}
        </select>
      </div>

      {value.frequency === "weekly" && (
        <div className="space-y-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Repeat on</span>
          <div className="flex gap-1">
            {WEEKDAYS.map((day) => {
              const isSelected = value.byWeekDay?.includes(day.value) ?? false;
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekDay(day.value)}
                  className={`w-10 h-10 text-sm font-medium rounded-full transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.frequency === "monthly" && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">On day</span>
          <input
            type="number"
            min={1}
            max={31}
            value={value.byMonthDay ?? 1}
            onChange={(e) => updateField("byMonthDay", parseInt(e.target.value, 10) || 1)}
            className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">of the month</span>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Ends</span>
        <div className="space-y-2">
          {END_TYPES.map((endType) => (
            <label key={endType.value} className="flex items-center gap-3">
              <input
                type="radio"
                name="endType"
                checked={value.endType === endType.value}
                onChange={() => updateField("endType", endType.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{endType.label}</span>

              {endType.value === "count" && value.endType === "count" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={value.count ?? 10}
                    onChange={(e) => updateField("count", parseInt(e.target.value, 10) || 10)}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">occurrences</span>
                </div>
              )}

              {endType.value === "until" && value.endType === "until" && (
                <input
                  type="date"
                  value={value.until ?? ""}
                  onChange={(e) => updateField("until", e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">{summarizeRecurrence(value)}</p>
      </div>
    </div>
  );
}

function summarizeRecurrence(options: RecurrenceOptions): string {
  const interval = options.interval ?? 1;
  let summary = "Repeats ";

  if (interval === 1) {
    summary += options.frequency;
  } else {
    const unit =
      options.frequency === "daily"
        ? "days"
        : options.frequency === "weekly"
          ? "weeks"
          : options.frequency === "monthly"
            ? "months"
            : "years";
    summary += `every ${interval} ${unit}`;
  }

  if (options.frequency === "weekly" && options.byWeekDay && options.byWeekDay.length > 0) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = options.byWeekDay.map((d) => dayNames[d]).join(", ");
    summary += ` on ${days}`;
  }

  if (options.frequency === "monthly" && options.byMonthDay) {
    summary += ` on day ${options.byMonthDay}`;
  }

  if (options.endType === "count" && options.count) {
    summary += `, ${options.count} times`;
  } else if (options.endType === "until" && options.until) {
    summary += `, until ${options.until}`;
  }

  return summary;
}

export function defaultRecurrenceOptions(): RecurrenceOptions {
  return {
    frequency: "weekly",
    interval: 1,
    byWeekDay: [1, 2, 3, 4, 5],
    endType: "never",
  };
}
