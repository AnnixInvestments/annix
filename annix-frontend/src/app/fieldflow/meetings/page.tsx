"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CreateMeetingDto,
  CreateRecurringMeetingDto,
  Meeting,
  MeetingStatus,
  RecurrenceOptions,
} from "@/app/lib/api/annixRepApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useCreateMeeting, useCreateRecurringMeeting, useMeetings } from "@/app/lib/query/hooks";
import { QueryErrorFallback } from "../components/ErrorBoundary";
import { MeetingListSkeleton } from "../components/Skeleton";
import { defaultRecurrenceOptions, RecurrenceEditor } from "./components/RecurrenceEditor";

const statusColors: Record<MeetingStatus, { bg: string; text: string }> = {
  scheduled: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  in_progress: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
  },
  cancelled: { bg: "bg-gray-100 dark:bg-gray-700/30", text: "text-gray-700 dark:text-gray-300" },
  no_show: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
};

const statusLabels: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const meetingTypeIcons: Record<string, string> = {
  in_person:
    "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
  phone:
    "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
  video:
    "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
};

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const colors = statusColors[meeting.status];

  return (
    <Link href={`/annix-rep/meetings/${meeting.id}`}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={meetingTypeIcons[meeting.meetingType]}
                />
              </svg>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
            >
              {statusLabels[meeting.status]}
            </span>
            {(meeting.isRecurring || meeting.recurringParentId) && (
              <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Recurring
              </span>
            )}
          </div>
          {meeting.summarySent && (
            <span className="text-xs text-green-600 dark:text-green-400">Summary sent</span>
          )}
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          {meeting.title}
        </h3>

        {meeting.prospect && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {meeting.prospect.companyName}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            {formatDateZA(new Date(meeting.scheduledStart))}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {new Date(meeting.scheduledStart).toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {meeting.location && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <span className="truncate">{meeting.location}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

function CreateMeetingModal({
  isOpen,
  onClose,
  onCreate,
  onCreateRecurring,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (dto: CreateMeetingDto) => void;
  onCreateRecurring: (dto: CreateRecurringMeetingDto) => void;
}) {
  const [formData, setFormData] = useState<CreateMeetingDto>({
    title: "",
    meetingType: "in_person",
    scheduledStart: "",
    scheduledEnd: "",
    location: "",
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceOptions>(defaultRecurrenceOptions());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.scheduledStart || !formData.scheduledEnd) return;

    if (isRecurring) {
      const startDate = new Date(formData.scheduledStart);
      const endDate = new Date(formData.scheduledEnd);
      onCreateRecurring({
        ...formData,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        recurrence,
      });
    } else {
      onCreate(formData);
    }

    setFormData({
      title: "",
      meetingType: "in_person",
      scheduledStart: "",
      scheduledEnd: "",
      location: "",
    });
    setIsRecurring(false);
    setRecurrence(defaultRecurrenceOptions());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"
          onClick={onClose}
        />
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Meeting</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="Meeting title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.meetingType}
                onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="in_person">In Person</option>
                <option value="phone">Phone</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledEnd}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="Meeting location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description ?? ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                placeholder="Meeting description or agenda"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Make this a recurring meeting
                </span>
              </label>

              {isRecurring && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {isRecurring ? "Create Recurring Meeting" : "Create Meeting"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { data: meetings, isLoading, error, refetch } = useMeetings();
  const createMeeting = useCreateMeeting();
  const createRecurringMeeting = useCreateRecurringMeeting();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | "all">("all");

  if (isLoading) {
    return <MeetingListSkeleton />;
  }

  if (error) {
    return (
      <QueryErrorFallback
        error={error}
        refetch={refetch}
        title="Unable to load meetings"
        message="We couldn't fetch your meetings. Please check your connection and try again."
      />
    );
  }

  const filteredMeetings = (meetings ?? []).filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const handleCreate = async (dto: CreateMeetingDto) => {
    const startDate = new Date(dto.scheduledStart);
    const endDate = new Date(dto.scheduledEnd);

    await createMeeting.mutateAsync({
      ...dto,
      scheduledStart: startDate.toISOString(),
      scheduledEnd: endDate.toISOString(),
    });
    setShowCreateModal(false);
  };

  const handleCreateRecurring = async (dto: CreateRecurringMeetingDto) => {
    await createRecurringMeeting.mutateAsync(dto);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meetings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your meetings and recordings</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/annix-rep/meetings/record"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            Start Recording
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Meeting
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            statusFilter === "all"
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
              : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
          }`}
        >
          All
        </button>
        {(Object.keys(statusLabels) as MeetingStatus[]).map((status) => {
          const colors = statusColors[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                statusFilter === status
                  ? `${colors.bg} ${colors.text} border-transparent`
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              {statusLabels[status]}
            </button>
          );
        })}
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {statusFilter !== "all" ? "No meetings match this filter" : "No meetings yet"}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Schedule your first meeting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}

      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        onCreateRecurring={handleCreateRecurring}
      />
    </div>
  );
}
