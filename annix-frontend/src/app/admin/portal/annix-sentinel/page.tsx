"use client";

import { AppAdminHub, type AppHubCard } from "@/app/components/admin/AppAdminHub";

function OpenAppIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

function BrandingIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
      />
    </svg>
  );
}

const cards: AppHubCard[] = [
  {
    href: "/annix-sentinel/dashboard",
    title: "Open Annix Sentinel",
    description: "SA SME compliance dashboard with B-BBEE, tax tools and regulatory tracking.",
    icon: <OpenAppIcon />,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:border-rose-400 group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/scheduled-jobs?app=sentinel",
    title: "Scheduled Jobs",
    description: "Sentinel cron jobs — regulatory sync, deadlines, document expiry and retention.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "bg-slate-100 text-slate-600",
    hoverColor: "hover:border-slate-400 group-hover:bg-slate-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/branding/annix-sentinel",
    title: "Branding",
    description: "Annix Sentinel brand — logo, colours and identity.",
    icon: <BrandingIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
];

export default function AnnixSentinelAdminHubPage() {
  return (
    <AppAdminHub
      appKey="annix-sentinel"
      title="Annix Sentinel — Admin Hub"
      subtitle="Open the app or manage its branding."
      cards={cards}
    />
  );
}
