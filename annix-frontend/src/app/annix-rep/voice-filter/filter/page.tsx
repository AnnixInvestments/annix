"use client";

import { useState } from "react";
import {
  useStartFilter,
  useStopFilter,
  useVoiceAgentDevices,
  useVoiceAgentStatus,
  useVoiceFilterStatus,
  useVoiceProfile,
} from "@/app/lib/query/hooks";
import type { StartFilterConfig } from "@/app/lib/voice-agent/voiceAgentApi";
import { AgentStatusBanner } from "../components/AgentStatusBanner";
import { EnrollmentModal } from "../components/EnrollmentModal";
import { ModuleHeader } from "../components/ModuleHeader";

export default function VoiceFilterControlPage() {
  const { data: agent } = useVoiceAgentStatus();
  const agentOnline = Boolean(agent);

  const { data: voiceProfile } = useVoiceProfile();
  const { data: devices } = useVoiceAgentDevices(agentOnline);
  const { data: status } = useVoiceFilterStatus(agentOnline);
  const startFilter = useStartFilter();
  const stopFilter = useStopFilter();

  const [inputDeviceId, setInputDeviceId] = useState<string | null>(null);
  const [outputDeviceId, setOutputDeviceId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const isEnrolled = Boolean(voiceProfile?.enrolled);
  const isRunning = Boolean(status?.running);
  const level = status ? status.level : 0;
  const verifiedCount = status ? status.verifiedCount : 0;
  const blockedCount = status ? status.blockedCount : 0;
  const inputs = devices ? devices.inputs : [];
  const outputs = devices ? devices.outputs : [];

  const handleStart = () => {
    const config: StartFilterConfig = { inputDeviceId, outputDeviceId };
    startFilter.mutate(config);
  };

  const handleStop = () => {
    stopFilter.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ModuleHeader
        title="Voice Filter"
        subtitle="Only your verified voice passes through"
        backHref="/annix-pulse/voice-filter"
      />

      <AgentStatusBanner />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Voice profile</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEnrolled
                ? "Enrolled and ready for verification"
                : "Enroll your voice to enable verification"}
            </p>
          </div>
          <button
            type="button"
            disabled={!agentOnline}
            onClick={() => setEnrolling(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnrolled ? "Re-enroll" : "Enroll voice"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <label
            htmlFor="vf-input-device"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Microphone
          </label>
          <select
            id="vf-input-device"
            disabled={!agentOnline || isRunning}
            value={inputDeviceId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setInputDeviceId(value || null);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="">System default</option>
            {inputs.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <label
            htmlFor="vf-output-device"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Virtual output (VB-Cable)
          </label>
          <select
            id="vf-output-device"
            disabled={!agentOnline || isRunning}
            value={outputDeviceId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setOutputDeviceId(value || null);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="">Auto-detect</option>
            {outputs.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isRunning ? "Filter running" : "Filter stopped"}
            </span>
          </div>
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={stopFilter.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={!agentOnline || !isEnrolled || startFilter.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start
            </button>
          )}
        </div>

        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-150"
            style={{ width: `${Math.max(0, Math.min(100, level * 100))}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{verifiedCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Verified passes</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{blockedCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Blocked speakers</p>
          </div>
        </div>

        {!isEnrolled && (
          <p className="mt-4 text-center text-sm text-amber-600 dark:text-amber-400">
            Enroll your voice before starting the filter.
          </p>
        )}
      </div>

      <EnrollmentModal isOpen={enrolling} onClose={() => setEnrolling(false)} />
    </div>
  );
}
