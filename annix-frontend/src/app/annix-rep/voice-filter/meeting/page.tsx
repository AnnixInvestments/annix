"use client";

import { useState } from "react";
import { fromISO } from "@/app/lib/datetime";
import {
  useStartVoiceMeeting,
  useStopVoiceMeeting,
  useVoiceAgentStatus,
  useVoiceProfile,
} from "@/app/lib/query/hooks";
import { useTranscriptStream } from "@/app/lib/voice-agent/useTranscriptStream";
import { AgentStatusBanner } from "../components/AgentStatusBanner";
import { ModuleHeader } from "../components/ModuleHeader";

export default function VoiceFilterMeetingPage() {
  const { data: agent } = useVoiceAgentStatus();
  const agentOnline = Boolean(agent);
  const { data: voiceProfile } = useVoiceProfile();

  const startMeeting = useStartVoiceMeeting();
  const stopMeeting = useStopVoiceMeeting();

  const [meetingName, setMeetingName] = useState("");
  const [recording, setRecording] = useState(false);
  const { entries, connected, reset } = useTranscriptStream(recording);

  const isEnrolled = Boolean(voiceProfile?.enrolled);
  const trimmedName = meetingName.trim();
  const canStart = agentOnline && trimmedName.length > 0 && !startMeeting.isPending;

  const handleStart = () => {
    reset();
    startMeeting.mutate(trimmedName, {
      onSuccess: () => setRecording(true),
    });
  };

  const handleStop = () => {
    stopMeeting.mutate(undefined, {
      onSettled: () => setRecording(false),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ModuleHeader
        title="Meeting Mode"
        subtitle="Record and transcribe multi-speaker meetings"
        backHref="/annix-pulse/voice-filter"
      />

      <AgentStatusBanner />

      {!isEnrolled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Enroll your voice on the <span className="font-medium">Voice Filter</span> page so you can
          be identified in the transcript.
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        {!recording ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="vf-meeting-name"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Meeting name
              </label>
              <input
                id="vf-meeting-name"
                type="text"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                placeholder="e.g. Weekly sales sync"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start recording
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Recording — {trimmedName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStop}
                disabled={stopMeeting.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                End meeting
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {connected ? "Live transcript connected" : "Connecting to transcript…"}
            </p>
          </div>
        )}
      </div>

      {recording && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Live transcript</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Waiting for speech to transcribe…
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const timeLabel = fromISO(entry.timestamp).toFormat("h:mm:ss a");
                return (
                  <div key={entry.key} className="flex gap-3">
                    <span className="w-20 flex-shrink-0 text-xs text-gray-400">{timeLabel}</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {entry.speakerName}:{" "}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{entry.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
