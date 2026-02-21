"use client";

import Link from "next/link";
import { useEffect } from "react";

const CheckIcon = () => (
  <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export default function VoiceFilterSetupPage() {
  useEffect(() => {
    document.title = "Setup - Voice Filter";
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/voice-filter"
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors"
          >
            <BackIcon />
            <span className="ml-2">Back to Voice Filter</span>
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-white mb-4">Installation & Setup</h1>
            <p className="text-[#71767b] max-w-2xl mx-auto">
              Follow these steps to set up the Voice Filter on your system.
            </p>
          </div>

          <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-400 font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Enroll Your Voice</h3>
                <p className="text-[#71767b] text-sm">
                  Record a 10-second voice sample to create your unique speaker profile.
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-400 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Start the Filter</h3>
                <p className="text-[#71767b] text-sm">
                  The filter captures your microphone and verifies each speaker in real-time.
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-400 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Use Virtual Mic</h3>
                <p className="text-[#71767b] text-sm">
                  Select VB-Cable as your microphone in Discord, Teams, or other apps.
                </p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">Features</h2>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-[#e7e9ea]">
                  Real-time speaker verification with low latency
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-[#e7e9ea]">
                  Blocks unauthorized voices from passing through
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-[#e7e9ea]">
                  Works with any application that uses a microphone
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-[#e7e9ea]">
                  Voice activity detection to reduce background noise
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-[#e7e9ea]">
                  Optional AWS Voice ID integration for cloud verification
                </span>
              </li>
            </ul>

            <h2 className="text-xl font-bold text-white mb-4">Installation</h2>
            <div className="bg-[#1c1f23] rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-white mb-3">Prerequisites</h3>
              <ol className="list-decimal list-inside space-y-2 text-[#e7e9ea] mb-6">
                <li>
                  Install{" "}
                  <a
                    href="https://vb-audio.com/Cable/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    VB-Audio Virtual Cable
                  </a>{" "}
                  (free)
                </li>
                <li>Node.js 20 or later</li>
              </ol>

              <h3 className="font-semibold text-white mb-3">Setup</h3>
              <pre className="bg-[#0f1419] text-[#e7e9ea] p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`cd voice-filter
npm install
npm run devices    # List audio devices
npm run enroll     # Record your voice profile
npm run start      # Start the filter`}</code>
              </pre>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">Usage</h2>
            <div className="bg-[#1c1f23] rounded-xl p-6">
              <ol className="list-decimal list-inside space-y-3 text-[#e7e9ea]">
                <li>
                  Run <code className="bg-[#2f3336] px-2 py-0.5 rounded">npm run start</code> to
                  begin filtering
                </li>
                <li>
                  In your app (Discord, Teams, Windows Voice Access), select{" "}
                  <strong className="text-white">CABLE Output</strong> as your microphone
                </li>
                <li>Speak normally - only your voice will pass through</li>
                <li>Other voices will be muted automatically</li>
              </ol>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[#71767b] mb-4">
              The voice filter module is located in the{" "}
              <code className="text-cyan-400">voice-filter/</code> directory.
            </p>
            <Link
              href="/voice-filter"
              className="inline-flex items-center px-6 py-3 bg-cyan-600 text-white font-semibold rounded-full hover:bg-cyan-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
