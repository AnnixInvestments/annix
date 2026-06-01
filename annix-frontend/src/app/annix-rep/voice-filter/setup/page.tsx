"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { setVoiceAgentBaseUrl, voiceAgentBaseUrl } from "@/app/lib/voice-agent/voiceAgentApi";
import { ModuleHeader } from "../components/ModuleHeader";

const STEPS = [
  {
    title: "Enroll your voice",
    body: "Record a short voice sample to create your unique speaker profile.",
  },
  {
    title: "Start the filter",
    body: "The desktop agent captures your microphone and verifies each speaker in real time.",
  },
  {
    title: "Use the virtual mic",
    body: "Select VB-Cable as your microphone in Teams, Meet, or any other app.",
  },
];

const FEATURES = [
  "Real-time speaker verification with low latency",
  "Blocks unauthorized voices from passing through",
  "Works with any application that uses a microphone",
  "Voice activity detection to reduce background noise",
  "AWS Voice ID integration for cloud verification",
];

export default function VoiceFilterSetupPage() {
  const { showToast } = useToast();
  const [agentUrl, setAgentUrl] = useState(() => voiceAgentBaseUrl());

  const handleSaveAgentUrl = () => {
    setVoiceAgentBaseUrl(agentUrl.trim());
    showToast("Desktop agent address saved", "success");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ModuleHeader
        title="Setup"
        subtitle="Install and connect the Voice Filter desktop agent"
        backHref="/annix-pulse/voice-filter"
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">How it works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                {index + 1}
              </div>
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Features</h2>
        <ul className="space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Prerequisites</h2>
        <ol className="mb-6 list-inside list-decimal space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>
            Install{" "}
            <a
              href="https://vb-audio.com/Cable/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              VB-Audio Virtual Cable
            </a>{" "}
            (free)
          </li>
          <li>Node.js 20 or later</li>
          <li>Run the Voice Filter desktop agent on your computer</li>
        </ol>

        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
          Desktop agent address
        </h2>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Annix Pulse talks to the agent running on your computer. The default is fine for most
          setups — only change it if the agent runs on a different port or machine.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={agentUrl}
            onChange={(e) => setAgentUrl(e.target.value)}
            placeholder="http://localhost:47823"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSaveAgentUrl}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
