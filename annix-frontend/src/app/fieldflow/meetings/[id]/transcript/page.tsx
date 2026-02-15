"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { MeetingAnalysis, Sentiment, TranscriptSegment } from "@/app/lib/api/fieldflowApi";
import {
  useMeeting,
  useMeetingRecording,
  useMeetingTranscript,
  useRetranscribeRecording,
  useTranscribeRecording,
} from "@/app/lib/query/hooks";

const speakerColors: Record<string, string> = {
  "Speaker 1": "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "Speaker 2": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Speaker 3": "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  "Speaker 4": "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  "Speaker 5": "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700",
};

const speakerTextColors: Record<string, string> = {
  "Speaker 1": "text-blue-700 dark:text-blue-300",
  "Speaker 2": "text-green-700 dark:text-green-300",
  "Speaker 3": "text-purple-700 dark:text-purple-300",
  "Speaker 4": "text-orange-700 dark:text-orange-300",
  "Speaker 5": "text-pink-700 dark:text-pink-300",
};

function speakerColor(label: string): string {
  return (
    speakerColors[label] ?? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
  );
}

function speakerTextColor(label: string): string {
  return speakerTextColors[label] ?? "text-gray-700 dark:text-gray-300";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function sentimentBadge(sentiment: Sentiment | null, score: number | null) {
  if (!sentiment) return null;

  const colors: Record<Sentiment, string> = {
    positive: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    neutral: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    negative: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  const icons: Record<Sentiment, string> = {
    positive:
      "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    neutral: "M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    negative: "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${colors[sentiment]}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[sentiment]} />
      </svg>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      {score !== null && ` (${score > 0 ? "+" : ""}${score})`}
    </span>
  );
}

function AnalysisSection({ analysis }: { analysis: MeetingAnalysis }) {
  return (
    <div className="space-y-6">
      {analysis.topics.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            Topics Discussed
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.topics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-md"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.questions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
            Questions Asked ({analysis.questions.length})
          </h4>
          <ul className="space-y-1">
            {analysis.questions.slice(0, 10).map((question, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-blue-500 mt-0.5">?</span>
                {question}
              </li>
            ))}
            {analysis.questions.length > 10 && (
              <li className="text-sm text-gray-500 italic">
                +{analysis.questions.length - 10} more questions
              </li>
            )}
          </ul>
        </div>
      )}

      {analysis.objections.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            Concerns & Objections ({analysis.objections.length})
          </h4>
          <ul className="space-y-1">
            {analysis.objections.slice(0, 5).map((objection, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-amber-500 mt-0.5">!</span>
                {objection}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.actionItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Action Items ({analysis.actionItems.length})
          </h4>
          <ul className="space-y-2">
            {analysis.actionItems.map((item, i) => (
              <li key={i} className="text-sm bg-gray-50 dark:bg-slate-700/50 p-2 rounded-md">
                <div className="text-gray-700 dark:text-gray-300">{item.task}</div>
                {item.assignee && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assigned to: {item.assignee}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.keyPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
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
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            Key Points
          </h4>
          <ul className="space-y-1">
            {analysis.keyPoints.slice(0, 5).map((point, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-yellow-500 mt-0.5">*</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TranscriptSegmentView({ segment }: { segment: TranscriptSegment }) {
  return (
    <div className={`p-3 rounded-lg border ${speakerColor(segment.speakerLabel)}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${speakerTextColor(segment.speakerLabel)}`}>
          {segment.speakerLabel}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
        </span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{segment.text}</p>
    </div>
  );
}

export default function TranscriptPage() {
  const params = useParams();
  const meetingId = Number(params.id);
  const [activeTab, setActiveTab] = useState<"transcript" | "analysis">("transcript");

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: recording, isLoading: recordingLoading } = useMeetingRecording(meetingId);
  const {
    data: transcript,
    isLoading: transcriptLoading,
    refetch: refetchTranscript,
  } = useMeetingTranscript(meetingId);
  const transcribe = useTranscribeRecording();
  const retranscribe = useRetranscribeRecording();

  const isLoading = meetingLoading || recordingLoading || transcriptLoading;

  if (isLoading) {
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

  if (!recording) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/fieldflow/meetings/${meetingId}`}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transcript</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Recording Available
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This meeting does not have a recording yet. Record the meeting to generate a transcript.
          </p>
          <Link
            href={`/fieldflow/meetings/${meetingId}/record`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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
        </div>
      </div>
    );
  }

  const handleTranscribe = async () => {
    await transcribe.mutateAsync(recording.id);
    refetchTranscript();
  };

  const handleRetranscribe = async () => {
    if (confirm("This will delete the existing transcript and create a new one. Continue?")) {
      await retranscribe.mutateAsync(recording.id);
      refetchTranscript();
    }
  };

  const isTranscribing =
    recording.processingStatus === "transcribing" || transcribe.isPending || retranscribe.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/fieldflow/meetings/${meetingId}`}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transcript</h1>
          <p className="text-gray-500 dark:text-gray-400">{meeting.title}</p>
        </div>
      </div>

      {!transcript ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isTranscribing ? "Transcribing..." : "No Transcript Yet"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isTranscribing
              ? "Please wait while the recording is being transcribed. This may take a few minutes."
              : "Click the button below to transcribe this recording using AI."}
          </p>
          {isTranscribing ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <button
              onClick={handleTranscribe}
              disabled={transcribe.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              Transcribe Recording
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transcript.wordCount}
                  </span>{" "}
                  words
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transcript.segments.length}
                  </span>{" "}
                  segments
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Language:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transcript.language.toUpperCase()}
                  </span>
                </div>
                {transcript.analysis &&
                  sentimentBadge(transcript.analysis.sentiment, transcript.analysis.sentimentScore)}
              </div>
              <button
                onClick={handleRetranscribe}
                disabled={retranscribe.isPending}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
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
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Re-transcribe
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="border-b border-gray-200 dark:border-slate-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("transcript")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "transcript"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "analysis"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Analysis
                  {transcript.analysis && transcript.analysis.actionItems.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                      {transcript.analysis.actionItems.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "transcript" ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {transcript.segments.map((segment, i) => (
                    <TranscriptSegmentView key={i} segment={segment} />
                  ))}
                </div>
              ) : transcript.analysis ? (
                <AnalysisSection analysis={transcript.analysis} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No analysis available for this transcript.
                </p>
              )}
            </div>
          </div>

          {transcript.processingTimeMs && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Processed in {(transcript.processingTimeMs / 1000).toFixed(1)}s using{" "}
              {transcript.whisperModel ?? "Whisper"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
