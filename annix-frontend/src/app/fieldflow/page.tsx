"use client";

import Link from "next/link";
import { formatDateZA } from "@/app/lib/datetime";
import { useFollowUpsDue } from "@/app/lib/query/hooks";

interface SectionCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
  featureCount: number;
}

function SectionCard({ title, description, href, icon, color, featureCount }: SectionCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "hover:border-blue-400",
      badge: "bg-blue-600 text-white",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-600 dark:text-green-400",
      border: "hover:border-green-400",
      badge: "bg-green-600 text-white",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-600 dark:text-purple-400",
      border: "hover:border-purple-400",
      badge: "bg-purple-600 text-white",
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-600 dark:text-orange-400",
      border: "hover:border-orange-400",
      badge: "bg-orange-600 text-white",
    },
  };

  const colors = colorClasses[color];

  return (
    <Link href={href}>
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-gray-100 dark:border-slate-700 p-8 hover:shadow-xl transition-all duration-300 cursor-pointer h-full ${colors.border}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`p-5 rounded-2xl ${colors.bg} mb-5`}>
            <svg
              className={`w-10 h-10 ${colors.text}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${colors.badge}`}>
            {featureCount} features
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AnnixRepDashboard() {
  const { data: followUpsDue } = useFollowUpsDue();

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Annix Rep</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Mobile sales field assistant for prospecting, meetings, and route planning
        </p>
      </div>

      {followUpsDue && followUpsDue.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Follow-ups Due ({followUpsDue.length})
                </h3>
                <div className="space-y-2">
                  {followUpsDue.slice(0, 5).map((prospect) => (
                    <Link
                      key={prospect.id}
                      href={`/annix-rep/prospects/${prospect.id}`}
                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {prospect.companyName}
                      </span>
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        {prospect.nextFollowUpAt
                          ? formatDateZA(prospect.nextFollowUpAt.toString())
                          : "Overdue"}
                      </span>
                    </Link>
                  ))}
                  {followUpsDue.length > 5 && (
                    <Link
                      href="/annix-rep/prospects"
                      className="block text-center text-sm text-amber-700 dark:text-amber-300 hover:underline py-1"
                    >
                      View all {followUpsDue.length} follow-ups
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <SectionCard
          title="Prospecting"
          description="Find and manage your sales prospects with location-based discovery"
          href="/annix-rep/prospecting"
          icon="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          color="blue"
          featureCount={3}
        />
        <SectionCard
          title="Meetings & Schedule"
          description="Plan, record, and manage your sales meetings and calendar"
          href="/annix-rep/meetings-schedule"
          icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          color="purple"
          featureCount={3}
        />
        <SectionCard
          title="Analytics"
          description="Track your sales performance with charts and insights"
          href="/annix-rep/analytics"
          icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          color="green"
          featureCount={7}
        />
        <SectionCard
          title="Goals & Targets"
          description="Set and track weekly, monthly, and quarterly sales targets"
          href="/annix-rep/goals"
          icon="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          color="orange"
          featureCount={5}
        />
        <SectionCard
          title="AI Features"
          description="Powered by artificial intelligence for transcription and insights"
          href="/annix-rep/ai-features"
          icon="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
          color="orange"
          featureCount={3}
        />
        <SectionCard
          title="Integrations"
          description="Connect with your existing calendars, CRM, and tools"
          href="/annix-rep/integrations"
          icon="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          color="blue"
          featureCount={3}
        />
        <SectionCard
          title="Reports"
          description="Generate and export activity, sales, and territory reports"
          href="/annix-rep/reports"
          icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          color="purple"
          featureCount={4}
        />
      </div>
    </div>
  );
}
