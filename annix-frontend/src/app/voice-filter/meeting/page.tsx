"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  confidence: number;
}

export default function VoiceFilterMeetingPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingName, setMeetingName] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [enrolledSpeakers, setEnrolledSpeakers] = useState<string[]>(["Andy", "Unknown Speaker 1"]);

  useEffect(() => {
    document.title = "Meeting Mode - Voice Filter";
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartMeeting = () => {
    if (!meetingName.trim()) {
      setMeetingName(`Meeting ${new Date().toLocaleDateString()}`);
    }
    setIsRecording(true);
    setElapsedTime(0);
    setTranscript([]);
  };

  const handleStopMeeting = () => {
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e7e9ea]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1f26] to-[#141a21] border-b border-[#2f3336] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/voice-filter"
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#71767b] hover:text-white"
            >
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <span>👥</span> Meeting Mode
              </h1>
              <p className="text-sm text-[#71767b]">Multi-speaker recording with transcription</p>
            </div>
          </div>
          {isRecording && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
              <span className="text-lg font-mono text-white">{formatTime(elapsedTime)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!isRecording ? (
          /* Pre-meeting Setup */
          <div className="max-w-lg mx-auto">
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#7856ff]/20 to-[#f91880]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                  👥
                </div>
                <h2 className="text-xl font-semibold mb-2">Start a Meeting</h2>
                <p className="text-[#71767b] text-sm">
                  Record your meeting with automatic speaker identification and live transcription.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-[#71767b] mb-2">Meeting Name</label>
                  <input
                    type="text"
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                    placeholder="Enter meeting name"
                    className="w-full px-4 py-3 bg-[#0f1419] border border-[#2f3336] rounded-lg text-white placeholder-[#536471] focus:border-[#7856ff] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#71767b] mb-2">Enrolled Speakers</label>
                  <div className="flex flex-wrap gap-2">
                    {enrolledSpeakers.map((speaker) => (
                      <span
                        key={speaker}
                        className="px-3 py-1.5 bg-[#7856ff]/20 text-[#7856ff] rounded-full text-sm flex items-center gap-1.5"
                      >
                        <UserIcon />
                        {speaker}
                      </span>
                    ))}
                    <button className="px-3 py-1.5 border border-dashed border-[#2f3336] text-[#71767b] rounded-full text-sm hover:border-[#7856ff] hover:text-[#7856ff] transition-colors">
                      + Add Speaker
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartMeeting}
                className="w-full py-4 bg-[#7856ff] text-white font-semibold rounded-full hover:bg-[#6a4de0] transition-colors flex items-center justify-center gap-2"
              >
                <MicIcon />
                Start Recording
              </button>

              <p className="text-center text-xs text-[#536471] mt-4">
                Make sure your microphone is connected and working
              </p>
            </div>
          </div>
        ) : (
          /* Active Meeting */
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Transcript Panel */}
            <div className="lg:col-span-2">
              <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#2f3336] flex items-center justify-between">
                  <h3 className="font-semibold">Live Transcript</h3>
                  <span className="text-xs text-[#71767b]">{transcript.length} entries</span>
                </div>
                <div className="h-[500px] overflow-y-auto p-5">
                  {transcript.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#71767b]">
                      <div className="text-4xl mb-3">🎤</div>
                      <p className="text-sm">Waiting for speech...</p>
                      <p className="text-xs mt-1">Start speaking to see the transcript</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transcript.map((entry) => (
                        <div key={entry.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#7856ff]/20 flex items-center justify-center text-[#7856ff] text-sm font-medium flex-shrink-0">
                            {entry.speaker[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{entry.speaker}</span>
                              <span className="text-xs text-[#536471]">{entry.timestamp}</span>
                            </div>
                            <p className="text-[#e7e9ea]">{entry.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Meeting Info */}
              <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5">
                <h3 className="font-semibold mb-3">Meeting Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#71767b]">Name</span>
                    <span>{meetingName || "Untitled Meeting"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71767b]">Duration</span>
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71767b]">Speakers</span>
                    <span>{enrolledSpeakers.length}</span>
                  </div>
                </div>
              </div>

              {/* Active Speakers */}
              <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-5">
                <h3 className="font-semibold mb-3">Active Speakers</h3>
                <div className="space-y-2">
                  {enrolledSpeakers.map((speaker) => (
                    <div
                      key={speaker}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#7856ff]/20 flex items-center justify-center text-[#7856ff] text-sm font-medium">
                        {speaker[0]}
                      </div>
                      <span className="text-sm">{speaker}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stop Button */}
              <button
                onClick={handleStopMeeting}
                className="w-full py-4 bg-red-500/20 text-red-400 font-semibold rounded-full hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <StopIcon />
                End Meeting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
