"use client";

import Link from "next/link";

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: "indigo" | "orange" | "teal";
  badge?: string;
}

function FeatureCard({ title, description, href, icon, color, badge }: FeatureCardProps) {
  const colorClasses = {
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      text: "text-indigo-600 dark:text-indigo-400",
      border: "hover:border-indigo-400",
      badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-600 dark:text-orange-400",
      border: "hover:border-orange-400",
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    },
    teal: {
      bg: "bg-teal-50 dark:bg-teal-900/20",
      text: "text-teal-600 dark:text-teal-400",
      border: "hover:border-teal-400",
      badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
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

export default function AIFeaturesPage() {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Features</h1>
          <p className="text-gray-500 dark:text-gray-400">Powered by artificial intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          title="Transcription"
          description="Automatic speech-to-text with speaker detection using Whisper AI"
          href="/fieldflow/meetings"
          icon="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          color="indigo"
          badge="Whisper"
        />
        <FeatureCard
          title="Meeting Summaries"
          description="AI-generated summaries with key points, action items, and insights"
          href="/fieldflow/meetings"
          icon="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
          color="orange"
          badge="AI"
        />
        <FeatureCard
          title="Route Planning"
          description="Optimize your travel routes between prospects and meetings"
          href="/fieldflow/schedule"
          icon="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
          color="teal"
          badge="Coming Soon"
        />
      </div>
    </div>
  );
}
