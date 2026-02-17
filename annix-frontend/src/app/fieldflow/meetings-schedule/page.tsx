"use client";

import Link from "next/link";

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: "purple" | "pink" | "red";
  badge?: string;
}

function FeatureCard({ title, description, href, icon, color, badge }: FeatureCardProps) {
  const colorClasses = {
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "hover:border-purple-400",
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    },
    pink: {
      bg: "bg-pink-50 dark:bg-pink-900/20",
      text: "text-pink-600 dark:text-pink-400",
      border: "hover:border-pink-400",
      badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-600 dark:text-red-400",
      border: "hover:border-red-400",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  const colors = colorClasses[color];

  return (
    <Link href={href}>
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-gray-100 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer h-full ${colors.border}`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${colors.bg}`}>
            <svg
              className={`w-6 h-6 ${colors.text}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              {badge && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function MeetingsSchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meetings & Schedule</h1>
          <p className="text-gray-500 dark:text-gray-400">Plan and record your sales meetings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          title="Schedule"
          description="View your calendar with meetings, visits, and planned activities"
          href="/fieldflow/schedule"
          icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          color="purple"
        />
        <FeatureCard
          title="All Meetings"
          description="Browse your meeting history with recordings, transcripts, and summaries"
          href="/fieldflow/meetings"
          icon="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          color="pink"
        />
        <FeatureCard
          title="Record Meeting"
          description="Start a new meeting recording with AI-powered transcription"
          href="/fieldflow/meetings?action=record"
          icon="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
          color="red"
          badge="AI"
        />
      </div>
    </div>
  );
}
