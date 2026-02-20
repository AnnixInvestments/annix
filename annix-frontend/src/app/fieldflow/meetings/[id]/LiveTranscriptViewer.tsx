"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TeamsBotTranscriptEntry } from "@/app/lib/api/annixRepApi";
import {
  teamsBotEventsUrl,
  useLeaveTeamsMeeting,
  useTeamsBotSession,
  useTeamsBotTranscript,
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

function speakerColor(name: string): string {
  return speakerColors[name] ?? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600";
}

function speakerTextColor(name: string): string {
  return speakerTextColors[name] ?? "text-gray-700 dark:text-gray-300";
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface LiveTranscriptViewerProps {
  meetingId: number;
  sessionId: string;
  meetingTitle: string;
}

export function LiveTranscriptViewer({
  meetingId,
  sessionId,
  meetingTitle,
}: LiveTranscriptViewerProps) {
  const [entries, setEntries] = useState<TeamsBotTranscriptEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: session } = useTeamsBotSession(sessionId);
  const { data: initialTranscript } = useTeamsBotTranscript(sessionId);
  const leaveTeamsMeeting = useLeaveTeamsMeeting();

  useEffect(() => {
    if (initialTranscript?.entries) {
      setEntries(initialTranscript.entries);
    }
  }, [initialTranscript]);

  useEffect(() => {
    if (session?.participantCount !== undefined) {
      setParticipantCount(session.participantCount);
    }
  }, [session]);

  useEffect(() => {
    const url = teamsBotEventsUrl(sessionId);
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    eventSource.addEventListener("transcript", (event) => {
      const entry = JSON.parse(event.data) as TeamsBotTranscriptEntry;
      setEntries((prev) => [...prev, entry]);
    });

    eventSource.addEventListener("participant_joined", (event) => {
      const data = JSON.parse(event.data);
      setParticipantCount(data.count ?? participantCount + 1);
    });

    eventSource.addEventListener("participant_left", (event) => {
      const data = JSON.parse(event.data);
      setParticipantCount(data.count ?? Math.max(0, participantCount - 1));
    });

    eventSource.addEventListener("session_ended", () => {
      setConnected(false);
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId, participantCount]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  const handleLeave = async () => {
    if (confirm("Are you sure you want to remove the bot from this meeting?")) {
      await leaveTeamsMeeting.mutateAsync(sessionId);
    }
  };

  const isActive = session?.status === "active" || session?.status === "joining";

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Transcript</h1>
          <p className="text-gray-500 dark:text-gray-400">{meetingTitle}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {participantCount}
              </span>{" "}
              participant{participantCount !== 1 ? "s" : ""}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{entries.length}</span>{" "}
              entries
            </div>
          </div>
          {isActive && (
            <button
              onClick={handleLeave}
              disabled={leaveTeamsMeeting.isPending}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md disabled:opacity-50"
            >
              {leaveTeamsMeeting.isPending ? "Leaving..." : "Leave Meeting"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Transcript Entries
          </span>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
            />
            Auto-scroll
          </label>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="p-4 space-y-3 max-h-[600px] overflow-y-auto"
        >
          {entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-4 opacity-50"
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
              <p>Waiting for speech...</p>
              <p className="text-sm mt-1">The bot will transcribe speech as participants talk.</p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                className={`p-3 rounded-lg border ${speakerColor(entry.speakerName)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${speakerTextColor(entry.speakerName)}`}>
                    {entry.speakerName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{entry.text}</p>
                {entry.confidence < 0.8 && (
                  <span className="text-xs text-amber-500 dark:text-amber-400 mt-1 inline-block">
                    Low confidence ({Math.round(entry.confidence * 100)}%)
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {!isActive && entries.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            The bot has left the meeting. The transcript has been saved.
          </p>
          <Link
            href={`/fieldflow/meetings/${meetingId}`}
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
          >
            Return to meeting details
          </Link>
        </div>
      )}
    </div>
  );
}
