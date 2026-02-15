"use client";

import Link from "next/link";
import { useEffect } from "react";

const MicrophoneIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

export default function VoiceFilterPage() {
  useEffect(() => {
    document.title = "Voice Filter - Annix";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-cyan-300 hover:text-cyan-200 mb-8 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-cyan-500 bg-opacity-20 rounded-3xl text-cyan-400 mb-6">
              <MicrophoneIcon />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Voice Filter</h1>
            <p className="text-xl text-cyan-200 max-w-2xl mx-auto">
              Speaker verification filter that only passes through your authorized voice to other
              applications.
            </p>
          </div>

          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-600 font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Enroll Your Voice</h3>
                <p className="text-gray-600 text-sm">
                  Record a 10-second voice sample to create your unique speaker profile.
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-600 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Start the Filter</h3>
                <p className="text-gray-600 text-sm">
                  The filter captures your microphone and verifies each speaker in real-time.
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-600 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Use Virtual Mic</h3>
                <p className="text-gray-600 text-sm">
                  Select VB-Cable as your microphone in Discord, Teams, or other apps.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-gray-700">
                  Real-time speaker verification with low latency
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-gray-700">
                  Blocks unauthorized voices from passing through
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-gray-700">
                  Works with any application that uses a microphone
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-gray-700">
                  Voice activity detection to reduce background noise
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-gray-700">
                  Optional AWS Voice ID integration for cloud verification
                </span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Installation</h2>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Prerequisites</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
                <li>
                  Install{" "}
                  <a
                    href="https://vb-audio.com/Cable/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:underline"
                  >
                    VB-Audio Virtual Cable
                  </a>{" "}
                  (free)
                </li>
                <li>Node.js 20 or later</li>
              </ol>

              <h3 className="font-semibold text-gray-900 mb-3">Setup</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`cd voice-filter
npm install
npm run devices    # List audio devices
npm run enroll     # Record your voice profile
npm run start      # Start the filter`}</code>
              </pre>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Usage</h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                <li>
                  Run <code className="bg-gray-200 px-2 py-0.5 rounded">npm run start</code> to
                  begin filtering
                </li>
                <li>
                  In your app (Discord, Teams, Windows Voice Access), select{" "}
                  <strong>CABLE Output</strong> as your microphone
                </li>
                <li>Speak normally - only your voice will pass through</li>
                <li>Other voices will be muted automatically</li>
              </ol>
            </div>
          </div>

          <div className="text-center">
            <p className="text-cyan-200 mb-4">
              The voice filter module is located in the{" "}
              <code className="text-cyan-300">voice-filter/</code> directory.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
