"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { PlatformMeetingRecord } from "@/app/lib/api/annixRepApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import { useMeetingPlatformConnection, usePlatformRecordings } from "@/app/lib/query/hooks";

const PLATFORM_NAMES: Record<string, string> = {
  zoom: "Zoom",
  teams: "Microsoft Teams",
  google_meet: "Google Meet",
};

function RecordingStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: {
      bg: "bg-gray-100 dark:bg-slate-700",
      text: "text-gray-600 dark:text-gray-400",
      label: "Pending",
    },
    downloading: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-400",
      label: "Downloading",
    },
    downloaded: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-400",
      label: "Downloaded",
    },
    processing: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-400",
      label: "Processing",
    },
    transcribing: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-800 dark:text-purple-400",
      label: "Transcribing",
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-400",
      label: "Completed",
    },
    failed: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-400",
      label: "Failed",
    },
    no_recording: {
      bg: "bg-gray-100 dark:bg-slate-700",
      text: "text-gray-500 dark:text-gray-500",
      label: "No Recording",
    },
  };

  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function RecordingCard({ record }: { record: PlatformMeetingRecord }) {
  const duration = record.durationSeconds
    ? `${Math.floor(record.durationSeconds / 60)}m ${record.durationSeconds % 60}s`
    : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {record.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDateLongZA(new Date(record.startTime))}
            {record.endTime && ` - ${formatDateLongZA(new Date(record.endTime))}`}
          </p>
        </div>
        <RecordingStatusBadge status={record.recordingStatus} />
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {duration && (
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
            {duration}
          </span>
        )}
        {record.participantCount != null && record.participantCount > 0 && (
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
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            {record.participantCount} participants
          </span>
        )}
      </div>

      {record.meetingId && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <Link
            href={`/fieldflow/meetings/${record.meetingId}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
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
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            View Meeting
          </Link>
        </div>
      )}
    </div>
  );
}

export default function PlatformRecordingsPage() {
  const params = useParams();
  const connectionId = Number(params.id);

  const { data: connection, isLoading: connectionLoading } =
    useMeetingPlatformConnection(connectionId);
  const { data: recordings, isLoading: recordingsLoading } = usePlatformRecordings(
    connectionId,
    50,
  );

  const isLoading = connectionLoading || recordingsLoading;

  const recordingsByStatus = recordings
    ? {
        completed: recordings.filter((r) => r.recordingStatus === "completed"),
        processing: recordings.filter((r) =>
          ["downloading", "downloaded", "processing", "transcribing"].includes(r.recordingStatus),
        ),
        pending: recordings.filter((r) => r.recordingStatus === "pending"),
        failed: recordings.filter((r) => ["failed", "no_recording"].includes(r.recordingStatus)),
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow/settings/integrations"
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {connection
              ? `${PLATFORM_NAMES[connection.platform] ?? connection.platform} Recordings`
              : "Platform Recordings"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {connection?.accountEmail ?? "View all synced recordings from this platform"}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading recordings...
        </div>
      )}

      {!isLoading && recordings && recordings.length === 0 && (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Recordings Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Recordings will appear here after your meetings end and recordings become available.
          </p>
        </div>
      )}

      {recordingsByStatus && (
        <div className="space-y-6">
          {recordingsByStatus.processing.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing ({recordingsByStatus.processing.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recordingsByStatus.processing.map((record) => (
                  <RecordingCard key={record.id} record={record} />
                ))}
              </div>
            </div>
          )}

          {recordingsByStatus.pending.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Pending ({recordingsByStatus.pending.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recordingsByStatus.pending.map((record) => (
                  <RecordingCard key={record.id} record={record} />
                ))}
              </div>
            </div>
          )}

          {recordingsByStatus.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Completed ({recordingsByStatus.completed.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recordingsByStatus.completed.map((record) => (
                  <RecordingCard key={record.id} record={record} />
                ))}
              </div>
            </div>
          )}

          {recordingsByStatus.failed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Failed / No Recording ({recordingsByStatus.failed.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recordingsByStatus.failed.map((record) => (
                  <RecordingCard key={record.id} record={record} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
