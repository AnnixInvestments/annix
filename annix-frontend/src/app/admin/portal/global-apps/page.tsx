"use client";

import Link from "next/link";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import { useAdminAttention } from "@/app/lib/query/hooks/admin/useAdminAttention";

function RfqIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function VoiceFilterIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function AnnixRepIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}

function AnnixOrbitIcon() {
  const brandingQuery = useBranding("annix-orbit");
  const brandingData = brandingQuery.data;
  const branding = brandingData || brandingFallback("annix-orbit");
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);
  return (
    <div
      className="w-10 h-10 rounded-lg bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url('${logoIcon}')` }}
    />
  );
}

function InsightsIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function TeacherAssistantIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
      />
    </svg>
  );
}

function AnnixSentinelIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AdminPortalIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.7498L11.25 14.9998L15 9.74985M12 2.71411C9.8495 4.75073 6.94563 5.99986 3.75 5.99986C3.69922 5.99986 3.64852 5.99955 3.59789 5.99892C3.2099 7.17903 3 8.43995 3 9.74991C3 15.3414 6.82432 20.0397 12 21.3719C17.1757 20.0397 21 15.3414 21 9.74991C21 8.43995 20.7901 7.17903 20.4021 5.99892C20.3515 5.99955 20.3008 5.99986 20.25 5.99986C17.0544 5.99986 14.1505 4.75073 12 2.71411Z"
      />
    </svg>
  );
}

function CoreIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

const MASTER_BRAND = {
  code: "annix-investments",
  title: "Annix Investments",
  subtitle: "The master Annix brand. Every app inherits these elements unless it overrides them.",
};

function MasterBrandLogo() {
  const brandingQuery = useBranding(MASTER_BRAND.code);
  const brandingData = brandingQuery.data;
  const branding = brandingData || brandingFallback(MASTER_BRAND.code);
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);
  return (
    <div
      className="w-12 h-12 rounded-xl bg-contain bg-center bg-no-repeat flex-shrink-0 bg-gray-900"
      style={{ backgroundImage: `url('${logoIcon}')` }}
    />
  );
}

function MasterBrandHero() {
  return (
    <Link href={`/admin/portal/branding/${MASTER_BRAND.code}`} className="group block">
      <div className="bg-gradient-to-r from-[#323288] to-[#4a4da3] rounded-xl p-6 text-white flex items-center gap-4 hover:shadow-lg transition-all">
        <MasterBrandLogo />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-blue-200 mb-1">Master brand</p>
          <h2 className="text-2xl font-bold mb-1">{MASTER_BRAND.title}</h2>
          <p className="text-blue-100">{MASTER_BRAND.subtitle}</p>
        </div>
        <span className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-white/15 text-sm font-medium whitespace-nowrap group-hover:bg-white/25 transition-colors">
          Edit master brand →
        </span>
      </div>
    </Link>
  );
}

function MessagesIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-6.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-6.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  );
}

interface AppCard {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  /** Stable identifier used to look up the app's "needs attention" count. */
  appCode?: string;
}

const adminApps: AppCard[] = [
  {
    href: "/admin/portal/dashboard",
    title: "Admin Dashboard",
    description: "Manage customers, suppliers, RFQs, and system settings.",
    icon: <AdminPortalIcon />,
    color: "bg-indigo-100 text-indigo-600",
    hoverColor: "hover:border-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/global-messages",
    title: "Global Messages",
    description: "View and manage messages across all applications.",
    icon: <MessagesIcon />,
    color: "bg-purple-100 text-purple-600",
    hoverColor: "hover:border-purple-400 group-hover:bg-purple-600 group-hover:text-white",
  },
];

const platformApps: AppCard[] = [
  {
    href: "/admin/portal/rfqs",
    title: "Annix Forge",
    description: "Industrial project execution — quote, build, inspect, deliver.",
    icon: <RfqIcon />,
    color: "bg-blue-100 text-blue-600",
    hoverColor: "hover:border-blue-400 group-hover:bg-blue-600 group-hover:text-white",
    appCode: "rfq",
  },
  {
    href: "/admin/portal/core",
    title: "Annix Core",
    description: "Operations platform — AU Rubber, Stock Control, and Core branding.",
    icon: <CoreIcon />,
    color: "bg-slate-100 text-slate-600",
    hoverColor: "hover:border-slate-400 group-hover:bg-slate-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/annix-rep",
    title: "Annix Pulse",
    description: "Mobile sales assistant with smart prospecting and route planning.",
    icon: <AnnixRepIcon />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit",
    title: "Annix Orbit",
    description: "Hiring, seeker tiers, FuturePath admissions, and branding — choose an area.",
    icon: <AnnixOrbitIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/annix-sentinel",
    title: "Annix Sentinel",
    description: "SA SME compliance dashboard with B-BBEE, tax tools, and regulatory tracking.",
    icon: <AnnixSentinelIcon />,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:border-rose-400 group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/insights",
    title: "Annix Insights",
    description: "Market data, news signals, and AI-driven portfolio insights.",
    icon: <InsightsIcon />,
    color: "bg-sky-100 text-sky-600",
    hoverColor: "hover:border-sky-400 group-hover:bg-sky-600 group-hover:text-white",
  },
  {
    href: "/teacher-assistant",
    title: "Teacher Assistant",
    description: "AI assistant for lesson planning, marking, and classroom admin.",
    icon: <TeacherAssistantIcon />,
    color: "bg-amber-100 text-amber-600",
    hoverColor: "hover:border-amber-400 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    href: "/voice-filter",
    title: "Voice Filter",
    description: "Speaker verification filter for authorized voice access.",
    icon: <VoiceFilterIcon />,
    color: "bg-cyan-100 text-cyan-600",
    hoverColor: "hover:border-cyan-400 group-hover:bg-cyan-600 group-hover:text-white",
  },
];

function AppCardComponent({ app, badge }: { app: AppCard; badge?: number }) {
  const showBadge = badge !== undefined && badge > 0;
  return (
    <Link href={app.href} className="group">
      <div
        className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border-2 border-transparent ${app.hoverColor.split(" ")[0]} hover:shadow-lg transition-all duration-300 h-full`}
      >
        {showBadge && (
          <span
            className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow"
            title={`${badge} item${badge === 1 ? "" : "s"} need attention`}
          >
            {badge}
          </span>
        )}
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${app.color} ${app.hoverColor.split(" ").slice(1).join(" ")} transition-colors`}
          >
            {app.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{app.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{app.description}</p>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function GlobalAppsPage() {
  const { admin } = useAdminAuth();
  const rawFirstName = admin?.firstName;
  const firstName = rawFirstName || "Admin";

  const attention = useAdminAttention();
  const attentionApps = attention.data?.apps;
  const attentionByApp = new Map((attentionApps ?? []).map((a) => [a.appCode, a.total]));
  const badgeFor = (app: AppCard): number | undefined =>
    app.appCode ? attentionByApp.get(app.appCode) : undefined;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#323288] to-[#4a4da3] rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {firstName}</h1>
        <p className="text-blue-100">
          Access all Annix platform applications from this central hub. Your admin session grants
          you access to all apps without re-authenticating.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-[#323288]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12.7498L11.25 14.9998L15 9.74985M12 2.71411C9.8495 4.75073 6.94563 5.99986 3.75 5.99986C3.69922 5.99986 3.64852 5.99955 3.59789 5.99892C3.2099 7.17903 3 8.43995 3 9.74991C3 15.3414 6.82432 20.0397 12 21.3719C17.1757 20.0397 21 15.3414 21 9.74991C21 8.43995 20.7901 7.17903 20.4021 5.99892C20.3515 5.99955 20.3008 5.99986 20.25 5.99986C17.0544 5.99986 14.1505 4.75073 12 2.71411Z"
            />
          </svg>
          Admin Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adminApps.map((app) => (
            <AppCardComponent key={app.href} app={app} />
          ))}
        </div>
        <div className="mt-4">
          <MasterBrandHero />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-[#323288]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          Platform Applications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platformApps.map((app) => (
            <AppCardComponent key={app.href} app={app} badge={badgeFor(app)} />
          ))}
        </div>
      </div>
    </div>
  );
}
