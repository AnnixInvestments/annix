import Link from "next/link";

interface ToolColor {
  iconBg: string;
  iconBgHover: string;
  iconText: string;
  border: string;
}

const TOOL_COLORS: Record<string, ToolColor> = {
  indigo: {
    iconBg: "bg-indigo-600/10",
    iconBgHover: "group-hover:bg-indigo-600",
    iconText: "text-indigo-600",
    border: "hover:border-indigo-500",
  },
  orange: {
    iconBg: "bg-orange-500/10",
    iconBgHover: "group-hover:bg-orange-500",
    iconText: "text-orange-500",
    border: "hover:border-orange-500",
  },
  emerald: {
    iconBg: "bg-emerald-600/10",
    iconBgHover: "group-hover:bg-emerald-600",
    iconText: "text-emerald-600",
    border: "hover:border-emerald-500",
  },
  violet: {
    iconBg: "bg-violet-600/10",
    iconBgHover: "group-hover:bg-violet-600",
    iconText: "text-violet-600",
    border: "hover:border-violet-500",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconBgHover: "group-hover:bg-amber-500",
    iconText: "text-amber-500",
    border: "hover:border-amber-500",
  },
  slate: {
    iconBg: "bg-slate-500/10",
    iconBgHover: "group-hover:bg-slate-500",
    iconText: "text-slate-500",
    border: "hover:border-slate-500",
  },
};

interface AdminTool {
  href: string;
  label: string;
  description: string;
  icon: string;
  color: keyof typeof TOOL_COLORS;
}

// Global admin tools. RFQs and Global Messages are intentionally excluded — RFQs is
// this hub itself and Global Messages lives in the navbar.
const ADMIN_TOOLS: AdminTool[] = [
  {
    href: "/admin/portal/users",
    label: "Admin Users",
    description: "Manage admin accounts and roles",
    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    color: "indigo",
  },
  {
    href: "/admin/portal/feedback",
    label: "Feedback",
    description: "User feedback and issue tracking",
    icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
    color: "orange",
  },
  {
    href: "/admin/portal/secure-documents",
    label: "Secure Documents",
    description: "Encrypted document management",
    icon: "M16.5 10.5V6.75C16.5 4.26472 14.4853 2.25 12 2.25C9.51472 2.25 7.5 4.26472 7.5 6.75V10.5M6.75 21.75H17.25C18.4926 21.75 19.5 20.7426 19.5 19.5V12.75C19.5 11.5074 18.4926 10.5 17.25 10.5H6.75C5.50736 10.5 4.5 11.5074 4.5 12.75V19.5C4.5 20.7426 5.50736 21.75 6.75 21.75Z",
    color: "emerald",
  },
  {
    href: "/admin/portal/ai-usage",
    label: "AI Usage",
    description: "AI provider usage and token analytics",
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z",
    color: "violet",
  },
  {
    href: "/admin/portal/extraction-metrics",
    label: "Extraction Metrics",
    description: "Per-operation runs, durations and payload sizes",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    color: "amber",
  },
  {
    href: "/admin/portal/scheduled-jobs",
    label: "Scheduled Jobs",
    description: "Background task monitoring",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "slate",
  },
  {
    href: "/admin/portal/polling-jobs",
    label: "Polling Jobs",
    description: "Frontend query refetch intervals",
    icon: "M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21M12 3v9",
    color: "indigo",
  },
  {
    href: "/admin/portal/reference-data",
    label: "Reference Data",
    description: "Manage lookup tables and reference values",
    icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
    color: "amber",
  },
  {
    href: "/admin/portal/branding/annix-investments",
    label: "Company Branding",
    description: "Annix Investments holding-company brand and identity",
    icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
    color: "indigo",
  },
];

export function AdminToolsGrid(props: { badgeCounts?: Record<string, number> }) {
  const badgeCounts = props.badgeCounts;
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Administration</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ADMIN_TOOLS.map((tool) => {
          const c = TOOL_COLORS[tool.color];
          const badge = badgeCounts ? badgeCounts[tool.href] : undefined;
          const showBadge = badge !== undefined && badge > 0;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${c.border} hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${c.iconBg} ${c.iconBgHover} flex items-center justify-center flex-shrink-0 transition-colors`}
                >
                  <svg
                    className={`w-5 h-5 ${c.iconText} group-hover:text-white transition-colors`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={tool.icon}
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tool.label}
                    </h3>
                    {showBadge && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded-full text-white bg-orange-500">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
