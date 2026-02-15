"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { MeetingStatus, RecordingProcessingStatus } from "@/app/lib/api/fieldflowApi";
import { formatDateTimeZA } from "@/app/lib/datetime";
import {
  useCancelMeeting,
  useDeleteRecording,
  useEndMeeting,
  useMeeting,
  useMeetingRecording,
  useStartMeeting,
} from "@/app/lib/query/hooks";

const statusColors: Record<MeetingStatus, { bg: string; text: string; border: string }> = {
  scheduled: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  in_progress: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  completed: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
  cancelled: {
    bg: "bg-gray-50 dark:bg-gray-700/20",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
  },
  no_show: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
};

const statusLabels: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const recordingStatusLabels: Record<RecordingProcessingStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-gray-500" },
  uploading: { label: "Uploading...", color: "text-blue-500" },
  processing: { label: "Processing...", color: "text-yellow-500" },
  transcribing: { label: "Transcribing...", color: "text-purple-500" },
  completed: { label: "Ready", color: "text-green-500" },
  failed: { label: "Failed", color: "text-red-500" },
};

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = Number(params.id);

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: recording, isLoading: recordingLoading } = useMeetingRecording(meetingId);
  const startMeeting = useStartMeeting();
  const endMeeting = useEndMeeting();
  const cancelMeeting = useCancelMeeting();
  const deleteRecording = useDeleteRecording();

  if (meetingLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Meeting not found</p>
        <Link href="/fieldflow/meetings" className="mt-4 text-blue-600 hover:underline">
          Back to meetings
        </Link>
      </div>
    );
  }

  const colors = statusColors[meeting.status];
  const canStart = meeting.status === "scheduled";
  const canEnd = meeting.status === "in_progress";
  const canCancel = meeting.status === "scheduled" || meeting.status === "in_progress";
  const canRecord = meeting.status === "scheduled" || meeting.status === "in_progress";

  const handleStart = async () => {
    await startMeeting.mutateAsync(meetingId);
  };

  const handleEnd = async () => {
    await endMeeting.mutateAsync({ id: meetingId });
  };

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel this meeting?")) {
      await cancelMeeting.mutateAsync(meetingId);
    }
  };

  const handleDeleteRecording = async () => {
    if (!recording) return;
    if (confirm("Are you sure you want to delete this recording? This cannot be undone.")) {
      await deleteRecording.mutateAsync(recording.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow/meetings"
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{meeting.title}</h1>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}
            >
              {statusLabels[meeting.status]}
            </span>
          </div>
          {meeting.prospect && (
            <p className="text-gray-500 dark:text-gray-400">{meeting.prospect.companyName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>

            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Type</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {meeting.meetingType.replace("_", " ")}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Scheduled</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDateTimeZA(new Date(meeting.scheduledStart))}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Duration</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(
                    (new Date(meeting.scheduledEnd).getTime() -
                      new Date(meeting.scheduledStart).getTime()) /
                      60000,
                  )}{" "}
                  min
                </dd>
              </div>

              {meeting.location && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Location</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {meeting.location}
                  </dd>
                </div>
              )}

              {meeting.actualStart && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Started</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDateTimeZA(new Date(meeting.actualStart))}
                  </dd>
                </div>
              )}

              {meeting.actualEnd && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Ended</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDateTimeZA(new Date(meeting.actualEnd))}
                  </dd>
                </div>
              )}
            </dl>

            {meeting.description && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {meeting.description}
                </p>
              </div>
            )}

            {meeting.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {meeting.notes}
                </p>
              </div>
            )}

            {meeting.outcomes && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Outcomes
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {meeting.outcomes}
                </p>
              </div>
            )}
          </div>

          {recording && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recording</h2>
                <span
                  className={`text-sm font-medium ${recordingStatusLabels[recording.processingStatus].color}`}
                >
                  {recordingStatusLabels[recording.processingStatus].label}
                </span>
              </div>

              <dl className="space-y-3">
                {recording.durationSeconds && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Duration</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {Math.floor(recording.durationSeconds / 60)}:
                      {(recording.durationSeconds % 60).toString().padStart(2, "0")}
                    </dd>
                  </div>
                )}

                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">File Size</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {(recording.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </dd>
                </div>

                {recording.detectedSpeakersCount && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Speakers Detected</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {recording.detectedSpeakersCount}
                    </dd>
                  </div>
                )}

                {recording.speakerSegments && recording.speakerSegments.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Speech Segments</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {recording.speakerSegments.length}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-3">
                <Link
                  href={`/fieldflow/meetings/${meetingId}/transcript`}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md flex items-center gap-1"
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
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  View Transcript
                </Link>
                <Link
                  href={`/fieldflow/meetings/${meetingId}/summary`}
                  className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md flex items-center gap-1"
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
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  Email Summary
                </Link>
                <button
                  onClick={handleDeleteRecording}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                >
                  Delete Recording
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Actions</h3>
            <div className="space-y-2">
              {canStart && (
                <button
                  onClick={handleStart}
                  disabled={startMeeting.isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                    />
                  </svg>
                  {startMeeting.isPending ? "Starting..." : "Start Meeting"}
                </button>
              )}

              {canEnd && (
                <button
                  onClick={handleEnd}
                  disabled={endMeeting.isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
                      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                    />
                  </svg>
                  {endMeeting.isPending ? "Ending..." : "End Meeting"}
                </button>
              )}

              {canRecord && !recording && (
                <Link
                  href={`/fieldflow/meetings/${meetingId}/record`}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
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
                  Record Meeting
                </Link>
              )}

              {canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={cancelMeeting.isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  {cancelMeeting.isPending ? "Cancelling..." : "Cancel Meeting"}
                </button>
              )}
            </div>
          </div>

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Attendees
              </h3>
              <ul className="space-y-2">
                {meeting.attendees.map((attendee, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                      {attendee.charAt(0).toUpperCase()}
                    </span>
                    {attendee}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
