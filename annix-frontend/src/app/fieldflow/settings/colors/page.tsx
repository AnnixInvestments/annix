"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  annixRepApi,
  type CalendarColorScheme,
  type CalendarColorType,
  DEFAULT_MEETING_TYPE_COLORS,
  DEFAULT_STATUS_COLORS,
} from "@/app/lib/api/annixRepApi";

const MEETING_TYPE_LABELS: Record<string, string> = {
  in_person: "In Person",
  phone: "Phone Call",
  video: "Video Call",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

function ColorPicker({
  label,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  defaultValue: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full border border-gray-300 dark:border-slate-600"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
        />
        {value !== defaultValue && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default function ColorsSettingsPage() {
  const queryClient = useQueryClient();

  const { data: colorScheme, isLoading } = useQuery<CalendarColorScheme>({
    queryKey: ["annix-rep", "calendar-colors"],
    queryFn: () => annixRepApi.calendars.colors(),
  });

  const [meetingTypes, setMeetingTypes] = useState<Record<string, string>>(
    DEFAULT_MEETING_TYPE_COLORS,
  );
  const [statuses, setStatuses] = useState<Record<string, string>>(DEFAULT_STATUS_COLORS);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (colorScheme && !hasInitialized) {
    setMeetingTypes(colorScheme.meetingTypes);
    setStatuses(colorScheme.statuses);
    setHasInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const colors: Array<{ colorType: CalendarColorType; colorKey: string; colorValue: string }> =
        [];

      Object.entries(meetingTypes).forEach(([key, value]) => {
        colors.push({ colorType: "meeting_type", colorKey: key, colorValue: value });
      });

      Object.entries(statuses).forEach(([key, value]) => {
        colors.push({ colorType: "status", colorKey: key, colorValue: value });
      });

      return annixRepApi.calendars.setColors(colors);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annix-rep", "calendar-colors"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => annixRepApi.calendars.resetColors(),
    onSuccess: () => {
      setMeetingTypes(DEFAULT_MEETING_TYPE_COLORS);
      setStatuses(DEFAULT_STATUS_COLORS);
      queryClient.invalidateQueries({ queryKey: ["annix-rep", "calendar-colors"] });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await saveMutation.mutateAsync();
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/annix-rep/settings"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Colors</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-40 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/annix-rep/settings"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Colors</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Customize colors for meetings and statuses
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Colors"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Meeting Types
          </h2>
          <div className="space-y-1">
            {Object.entries(MEETING_TYPE_LABELS).map(([key, label]) => (
              <ColorPicker
                key={key}
                label={label}
                value={meetingTypes[key] ?? DEFAULT_MEETING_TYPE_COLORS[key]}
                onChange={(color) => setMeetingTypes((prev) => ({ ...prev, [key]: color }))}
                defaultValue={DEFAULT_MEETING_TYPE_COLORS[key]}
              />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Meeting Statuses
          </h2>
          <div className="space-y-1">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <ColorPicker
                key={key}
                label={label}
                value={statuses[key] ?? DEFAULT_STATUS_COLORS[key]}
                onChange={(color) => setStatuses((prev) => ({ ...prev, [key]: color }))}
                defaultValue={DEFAULT_STATUS_COLORS[key]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meeting Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MEETING_TYPE_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className="px-3 py-1 rounded-full text-sm text-white font-medium"
                  style={{ backgroundColor: meetingTypes[key] ?? DEFAULT_MEETING_TYPE_COLORS[key] }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statuses</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className="px-3 py-1 rounded-full text-sm text-white font-medium"
                  style={{ backgroundColor: statuses[key] ?? DEFAULT_STATUS_COLORS[key] }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
