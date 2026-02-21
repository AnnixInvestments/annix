"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
    />
  </svg>
);

const StopIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function VoiceFilterPage() {
  const [isActive, setIsActive] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verified" | "rejected">(
    "idle",
  );
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    document.title = "Voice Filter - Annix";
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
        if (Math.random() > 0.7) {
          setVerificationStatus(Math.random() > 0.2 ? "verified" : "rejected");
          setTimeout(() => setVerificationStatus("idle"), 1500);
        }
      }, 100);
    } else {
      setAudioLevel(0);
      setVerificationStatus("idle");
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleToggleFilter = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e7e9ea]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1f26] to-[#141a21] border-b border-[#2f3336] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/voice-filter"
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#71767b] hover:text-white"
            >
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <span>🔐</span> Voice Filter
              </h1>
              <p className="text-sm text-[#71767b]">Single-speaker voice verification</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle
              className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-md hover:bg-white/15 transition-colors"
              iconClassName="w-4 h-4 text-white"
            />
            <div
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                isActive ? "bg-[#00ba7c]/20 text-[#00ba7c]" : "bg-[#71767b]/20 text-[#71767b]"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Main Control Panel */}
          <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-6">
            <div className="text-center mb-8">
              {/* Audio Visualization */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-100 ${
                    isActive ? "bg-[#00ba7c]/20" : "bg-[#2f3336]"
                  }`}
                  style={{
                    transform: isActive ? `scale(${1 + audioLevel / 200})` : "scale(1)",
                  }}
                />
                <div
                  className={`absolute inset-4 rounded-full flex items-center justify-center ${
                    isActive ? "bg-[#00ba7c]/30" : "bg-[#1c1f23]"
                  }`}
                >
                  <MicIcon />
                </div>
                {verificationStatus === "verified" && (
                  <div className="absolute -right-1 -top-1 w-8 h-8 bg-[#00ba7c] rounded-full flex items-center justify-center text-white">
                    <CheckIcon />
                  </div>
                )}
                {verificationStatus === "rejected" && (
                  <div className="absolute -right-1 -top-1 w-8 h-8 bg-[#f4212e] rounded-full flex items-center justify-center text-white">
                    <XIcon />
                  </div>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-2">
                {isActive ? "Filter Active" : "Filter Inactive"}
              </h2>
              <p className="text-[#71767b] text-sm mb-6">
                {isActive
                  ? "Only your voice passes through to the virtual microphone"
                  : "Click below to start the voice filter"}
              </p>

              <button
                onClick={handleToggleFilter}
                disabled={!isEnrolled}
                className={`w-full py-4 font-semibold rounded-full transition-colors flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-[#00ba7c] text-white hover:bg-[#00a36c]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isActive ? (
                  <>
                    <StopIcon />
                    Stop Filter
                  </>
                ) : (
                  <>
                    <MicIcon />
                    Start Filter
                  </>
                )}
              </button>

              {!isEnrolled && (
                <p className="text-sm text-[#f4212e] mt-3">
                  Please enroll your voice first before using the filter
                </p>
              )}
            </div>
          </div>

          {/* Status Panel */}
          <div className="space-y-4">
            {/* Voice Profile */}
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Voice Profile</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#00ba7c]/20 flex items-center justify-center text-[#00ba7c] text-xl">
                  🎤
                </div>
                <div className="flex-1">
                  <p className="font-medium">Primary Profile</p>
                  <p className="text-sm text-[#71767b]">
                    {isEnrolled ? "Enrolled and ready" : "Not enrolled"}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${isEnrolled ? "bg-[#00ba7c]" : "bg-[#71767b]"}`}
                />
              </div>
            </div>

            {/* Audio Devices */}
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Audio Devices</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#71767b]">Input</span>
                  <span>Default Microphone</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#71767b]">Output</span>
                  <span>CABLE Input (VB-Audio)</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#71767b] mb-1">Verified</p>
                  <p className="text-2xl font-semibold text-[#00ba7c]">0</p>
                </div>
                <div>
                  <p className="text-[#71767b] mb-1">Blocked</p>
                  <p className="text-2xl font-semibold text-[#f4212e]">0</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex gap-3">
              <Link
                href="/voice-filter/setup"
                className="flex-1 py-3 text-center text-sm font-medium border border-[#2f3336] rounded-full hover:bg-white/5 transition-colors"
              >
                Setup Guide
              </Link>
              <Link
                href="/voice-filter/calendar"
                className="flex-1 py-3 text-center text-sm font-medium border border-[#2f3336] rounded-full hover:bg-white/5 transition-colors"
              >
                Calendar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
