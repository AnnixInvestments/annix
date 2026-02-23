"use client";

import Link from "next/link";
import { useAdminAuth } from "@/app/context/AdminAuthContext";

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

function RubberIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
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

function StockControlIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
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

function CvAssistantIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 3v5a1 1 0 001 1h5"
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
  isExternal?: boolean;
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
    href: "/rfq-portal",
    title: "RFQ Platform",
    description: "Pipeline quotation management for customers and suppliers.",
    icon: <RfqIcon />,
    color: "bg-blue-100 text-blue-600",
    hoverColor: "hover:border-blue-400 group-hover:bg-blue-600 group-hover:text-white",
    isExternal: true,
  },
  {
    href: "/au-rubber/login",
    title: "AU Rubber App",
    description: "Manage rubber lining products, orders, and companies.",
    icon: <RubberIcon />,
    color: "bg-yellow-100 text-yellow-600",
    hoverColor: "hover:border-yellow-400 group-hover:bg-yellow-600 group-hover:text-white",
    isExternal: true,
  },
  {
    href: "/voice-filter",
    title: "Voice Filter",
    description: "Speaker verification filter for authorized voice access.",
    icon: <VoiceFilterIcon />,
    color: "bg-cyan-100 text-cyan-600",
    hoverColor: "hover:border-cyan-400 group-hover:bg-cyan-600 group-hover:text-white",
    isExternal: true,
  },
  {
    href: "/annix-rep/setup",
    title: "Annix Rep",
    description: "Mobile sales assistant with smart prospecting and route planning.",
    icon: <AnnixRepIcon />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
    isExternal: true,
  },
  {
    href: "/stock-control/login",
    title: "Stock Control",
    description: "Manage stock items, job allocations, and inventory tracking.",
    icon: <StockControlIcon />,
    color: "bg-teal-100 text-teal-600",
    hoverColor: "hover:border-teal-400 group-hover:bg-teal-600 group-hover:text-white",
    isExternal: true,
  },
  {
    href: "/cv-assistant/login",
    title: "CV Assistant",
    description: "AI-powered candidate screening and reference checking.",
    icon: <CvAssistantIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
    isExternal: true,
  },
];

function AppCardComponent({ app }: { app: AppCard }) {
  const linkProps = app.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Link href={app.href} {...linkProps} className="group">
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border-2 border-transparent ${app.hoverColor.split(" ")[0]} hover:shadow-lg transition-all duration-300 h-full`}
      >
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

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#323288] to-[#4a4da3] rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {admin?.firstName ?? "Admin"}</h1>
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
            <AppCardComponent key={app.href} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}
