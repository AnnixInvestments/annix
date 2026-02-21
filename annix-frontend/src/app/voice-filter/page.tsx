"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useVoiceFilterAuth } from "@/app/context/VoiceFilterAuthContext";
import { voiceFilterApi, VoiceFilterCalendarEvent } from "@/app/lib/api/voiceFilterApi";
import { fromISO } from "@/app/lib/datetime";

const MicrophoneIcon = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
    />
  </svg>
);

export default function VoiceFilterPage() {
  const { isAuthenticated, isLoading, user, logout } = useVoiceFilterAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<VoiceFilterCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadUpcomingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const result = await voiceFilterApi.calendarUpcoming(5);
      setUpcomingEvents(result.events);
    } catch {
      setUpcomingEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Voice Filter - Annix";

    if (isAuthenticated) {
      loadUpcomingEvents();
    }
  }, [isAuthenticated, loadUpcomingEvents]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e7e9ea]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1f26] to-[#141a21] border-b border-[#2f3336] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1d9bf0] to-[#7856ff] rounded-lg flex items-center justify-center text-lg">
              🎙️
            </div>
            <span className="text-lg font-semibold">Annix Voice Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/voice-filter/setup"
              className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-md hover:bg-white/15 transition-colors flex items-center gap-2"
            >
              <span>📖</span> Setup Guide
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-md hover:bg-white/15 transition-colors"
            >
              Back to Annix
            </Link>
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3 ml-2 pl-3 border-l border-white/20">
                    <span className="text-sm text-[#71767b]">{user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/voice-filter/login"
                    className="px-4 py-1.5 text-sm bg-[#1d9bf0] text-white rounded-md hover:bg-[#1a8cd8] transition-colors ml-2"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-[#1d9bf0]/15 to-[#7856ff]/15 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">
            🎤
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to Voice Filter</h1>
          <p className="text-[#71767b] max-w-lg mx-auto">
            Secure your audio with voice verification or capture multi-speaker meetings with
            automatic transcription.
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {/* Voice Filter Mode */}
          <Link href="/voice-filter/filter" className="group">
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-7 text-center transition-all hover:border-[#00ba7c] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00ba7c]/20 to-[#1d9bf0]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                🔐
              </div>
              <h2 className="text-lg font-semibold mb-2">Voice Filter</h2>
              <p className="text-[#71767b] text-sm mb-4">
                Protect your microphone by only allowing your voice through. Unauthorized speakers
                are automatically muted.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-5">
                <span className="text-xs px-2.5 py-1 bg-[#00ba7c]/10 text-[#00ba7c] rounded-full">
                  Single Speaker
                </span>
                <span className="text-xs px-2.5 py-1 bg-[#00ba7c]/10 text-[#00ba7c] rounded-full">
                  Real-time Verification
                </span>
                <span className="text-xs px-2.5 py-1 bg-[#00ba7c]/10 text-[#00ba7c] rounded-full">
                  VB-Cable Output
                </span>
              </div>
              <span className="inline-block px-6 py-2.5 bg-[#00ba7c] text-white text-sm font-semibold rounded-full group-hover:bg-[#00a36c] transition-colors">
                Open Voice Filter
              </span>
            </div>
          </Link>

          {/* Meeting Mode */}
          <Link href="/voice-filter/meeting" className="group">
            <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-7 text-center transition-all hover:border-[#7856ff] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">
              <div className="w-16 h-16 bg-gradient-to-br from-[#7856ff]/20 to-[#f91880]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                👥
              </div>
              <h2 className="text-lg font-semibold mb-2">Meeting Mode</h2>
              <p className="text-[#71767b] text-sm mb-4">
                Record meetings with automatic speaker identification and AI-powered transcription
                for meeting minutes.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-5">
                <span className="text-xs px-2.5 py-1 bg-[#7856ff]/10 text-[#7856ff] rounded-full">
                  Multi-Speaker
                </span>
                <span className="text-xs px-2.5 py-1 bg-[#7856ff]/10 text-[#7856ff] rounded-full">
                  Voice Enrollment
                </span>
                <span className="text-xs px-2.5 py-1 bg-[#7856ff]/10 text-[#7856ff] rounded-full">
                  Live Transcript
                </span>
              </div>
              <span className="inline-block px-6 py-2.5 bg-[#7856ff] text-white text-sm font-semibold rounded-full group-hover:bg-[#6a4de0] transition-colors">
                Start Meeting
              </span>
            </div>
          </Link>
        </div>

        {/* Upcoming Meetings Section */}
        <div className="border-t border-[#2f3336] pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span>📅</span> Upcoming Meetings
            </h2>
            <Link href="/voice-filter/calendar" className="text-sm text-[#1d9bf0] hover:underline">
              {isAuthenticated ? "Manage calendars →" : "Connect calendar →"}
            </Link>
          </div>

          {eventsLoading ? (
            <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1d9bf0]" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const startTime = fromISO(event.startTime);
                const endTime = fromISO(event.endTime);
                const now = fromISO(new Date().toISOString());
                const isToday = startTime.hasSame(now, "day");
                const isTomorrow = startTime.hasSame(now.plus({ days: 1 }), "day");
                const daysUntil = startTime.diff(now, "days").days;
                const isThisWeek = daysUntil >= 0 && daysUntil < 7;

                const dateLabel = isToday
                  ? "Today"
                  : isTomorrow
                    ? "Tomorrow"
                    : isThisWeek
                      ? startTime.toFormat("EEE")
                      : startTime.toFormat("MMM d");

                return (
                  <div
                    key={event.id}
                    className="bg-[#16181c] border border-[#2f3336] rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-[#1d9bf0]/10 rounded-lg flex flex-col items-center justify-center text-[#1d9bf0]">
                      <span className="text-xs font-medium">
                        {startTime.toFormat("MMM").toUpperCase()}
                      </span>
                      <span className="text-lg font-bold leading-none">{startTime.toFormat("d")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{event.title}</h3>
                      <p className="text-sm text-[#71767b]">
                        {dateLabel} · {startTime.toFormat("h:mm a")} - {endTime.toFormat("h:mm a")}
                      </p>
                    </div>
                    {event.meetingUrl && (
                      <a
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-sm font-medium bg-[#00ba7c] text-white rounded-full hover:bg-[#00a36c] transition-colors"
                      >
                        Join
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">📅</div>
              <p className="text-[#71767b] text-sm">No upcoming meetings</p>
              <p className="text-[#71767b] text-xs mt-2">
                <Link href="/voice-filter/calendar" className="text-[#1d9bf0] hover:underline">
                  Connect your calendar
                </Link>{" "}
                to see meetings here
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs text-[#536471]">
          <p>
            Need help? Check the{" "}
            <Link href="/voice-filter/setup" className="text-[#1d9bf0] hover:underline">
              setup guide
            </Link>{" "}
            or{" "}
            <Link href="/voice-filter/filter" className="text-[#1d9bf0] hover:underline">
              configure settings
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
