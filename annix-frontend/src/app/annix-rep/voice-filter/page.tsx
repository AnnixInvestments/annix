"use client";

import Link from "next/link";
import { fromJSDate, now } from "@/app/lib/datetime";
import { useCalendarEvents } from "@/app/lib/query/hooks";
import { AgentStatusBanner } from "./components/AgentStatusBanner";
import { ModuleHeader } from "./components/ModuleHeader";

interface ModeCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: "green" | "purple";
  tags: string[];
}

function ModeCard(props: ModeCardProps) {
  const { title, description, href, icon, color, tags } = props;
  const colorClasses = {
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-600 dark:text-green-400",
      border: "hover:border-green-400",
      tag: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "hover:border-purple-400",
      tag: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    },
  };
  const colors = colorClasses[color];

  return (
    <Link href={href}>
      <div
        className={`h-full rounded-2xl border-2 border-gray-100 bg-white p-7 text-center shadow-sm transition-all duration-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 ${colors.border}`}
      >
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${colors.bg}`}
        >
          <svg
            className={`h-8 w-8 ${colors.text}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2.5 py-1 text-xs ${colors.tag}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function VoiceFilterLandingPage() {
  const rangeStart = now().startOf("day");
  const rangeEnd = rangeStart.plus({ days: 14 }).endOf("day");
  const startISO = rangeStart.toISODate() ?? "";
  const endISO = rangeEnd.toISODate() ?? "";
  const { data: events, isLoading } = useCalendarEvents(startISO, endISO);

  const upcoming = events ? events.slice(0, 5) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <ModuleHeader
        title="Voice Filter"
        subtitle="Speaker verification and meeting capture"
        backHref="/annix-pulse"
      />

      <AgentStatusBanner />

      <div className="grid gap-5 md:grid-cols-2">
        <ModeCard
          title="Voice Filter"
          description="Protect your microphone so only your verified voice passes through. Unauthorized speakers are muted automatically."
          href="/annix-pulse/voice-filter/filter"
          icon="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          color="green"
          tags={["Single speaker", "Real-time verification", "VB-Cable output"]}
        />
        <ModeCard
          title="Meeting Mode"
          description="Record meetings with automatic speaker identification and AI-powered transcription for meeting minutes."
          href="/annix-pulse/voice-filter/meeting"
          icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          color="purple"
          tags={["Multi-speaker", "Voice enrollment", "Live transcript"]}
        />
      </div>

      <div className="border-t border-gray-200 pt-8 dark:border-slate-700">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Upcoming Meetings
          </h2>
          <Link
            href="/annix-pulse/settings/calendars"
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Manage calendars →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center rounded-xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((event) => {
              const start = fromJSDate(event.startTime);
              const end = fromJSDate(event.endTime);
              const monthLabel = start.toFormat("MMM").toUpperCase();
              const dayLabel = start.toFormat("d");
              const timeLabel = `${start.toFormat("EEE h:mm a")} - ${end.toFormat("h:mm a")}`;
              const meetingUrl = event.meetingUrl;

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                    <span className="text-xs font-medium">{monthLabel}</span>
                    <span className="text-lg font-bold leading-none">{dayLabel}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{timeLabel}</p>
                  </div>
                  {meetingUrl && (
                    <a
                      href={meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      Join
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming meetings</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <Link
                href="/annix-pulse/settings/calendars"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Connect your calendar
              </Link>{" "}
              to see meetings here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
