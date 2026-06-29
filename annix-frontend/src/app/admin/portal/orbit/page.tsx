"use client";

import { AppAdminHub, type AppHubCard } from "@/app/components/admin/AppAdminHub";
import { useAdminOrbitDelistReportCount } from "@/app/lib/query/hooks";

function JobMarketIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function SeekersIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function SeekerTiersIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function EeTargetsIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  );
}

function AdmissionsIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 14l9-5-9-5-9 5 9 5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
      />
    </svg>
  );
}

function CredentialsIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
      />
    </svg>
  );
}

function DelistReportsIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
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

function AiCostIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 8.25h19.5M4.5 6h15A2.25 2.25 0 0121.75 8.25v7.5A2.25 2.25 0 0119.5 18h-15a2.25 2.25 0 01-2.25-2.25v-7.5A2.25 2.25 0 014.5 6zm2.25 8.25h3"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
      />
    </svg>
  );
}

const orbitAdminCards: AppHubCard[] = [
  {
    href: "/admin/portal/orbit/users",
    title: "Users",
    description:
      "Invite, configure and remove Orbit accounts — seekers, recruiters, employers and students.",
    icon: <UsersIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/job-market",
    title: "Job Market",
    description: "Manage job-board ingestion sources that populate Browse Jobs for every seeker.",
    icon: <JobMarketIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/seekers",
    title: "Seekers",
    description:
      "Browse and search every job seeker on the platform — CV status, tier and activity.",
    icon: <SeekersIcon />,
    color: "bg-cyan-100 text-cyan-600",
    hoverColor: "hover:border-cyan-400 group-hover:bg-cyan-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/seeker-tiers",
    title: "Seeker Tiers",
    description: "Look up a seeker and override the match-score tier that gates what they can see.",
    icon: <SeekerTiersIcon />,
    color: "bg-indigo-100 text-indigo-600",
    hoverColor: "hover:border-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/billing",
    title: "Billing",
    description: "Switch payments on or off for Seekers, Companies, Recruiters and Students.",
    icon: <BillingIcon />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/ee-targets",
    title: "EE Sectoral Targets",
    description:
      "Capture the B-BBEE sector targets the company Employment Equity report measures against.",
    icon: <EeTargetsIcon />,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:border-rose-400 group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/education-catalog",
    title: "Education Catalog",
    description:
      "Owner-verified institutions, faculties, programmes and scholarships that FuturePath matches against.",
    icon: <CatalogIcon />,
    color: "bg-amber-100 text-amber-600",
    hoverColor: "hover:border-amber-400 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/education-ingestion",
    title: "FuturePath Admissions",
    description:
      "Review AI-scraped university entry requirements and approve or correct marks before they go live to students.",
    icon: <AdmissionsIcon />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/credential-types",
    title: "Credentials",
    description: "Manage the deployment credentials seekers can track — add, edit and reorder.",
    icon: <CredentialsIcon />,
    color: "bg-teal-100 text-teal-600",
    hoverColor: "hover:border-teal-400 group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/dismiss-reasons",
    title: "Dismiss reasons",
    description:
      "Manage the 'Not for me' reasons seekers pick on a job — add, edit, reorder and set mute actions.",
    icon: <CredentialsIcon />,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:border-rose-400 group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/identity-reviews",
    title: "Identity reviews",
    description:
      "Seeker ID checks Nix wasn't sure about — compare the document, registration and CV names, then approve or confirm the mismatch.",
    icon: <CredentialsIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/delist-reports",
    title: "Delist reports",
    description:
      "Seeker-reported jobs that may have been taken down on the source site — review and confirm to remove for everyone.",
    icon: <DelistReportsIcon />,
    color: "bg-orange-100 text-orange-600",
    hoverColor: "hover:border-orange-400 group-hover:bg-orange-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/early-access",
    title: "Early Access",
    description:
      "Pre-launch waiting list — deduplicated registrants, sources, campaigns, referrals and CSV export.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
    color: "bg-orange-100 text-orange-600",
    hoverColor: "hover:border-orange-400 group-hover:bg-orange-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/seeker-testing",
    title: "Seeker Testing",
    description:
      "Beta testing & launch readiness — errors/latency from real users, workflow funnel, KPIs, bug tracker and the go-live checklist.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "bg-orange-100 text-orange-600",
    hoverColor: "hover:border-orange-400 group-hover:bg-orange-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/scheduled-jobs?app=orbit",
    title: "Scheduled Jobs",
    description: "Orbit background cron jobs — ingestion, alerts, POPIA purges. Pause and retune.",
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
    href: "/admin/portal/orbit/ai-cost",
    title: "AI Cost",
    description:
      "Gemini spend by feature + model over time — see exactly where the daily AI cost goes (ref #390).",
    icon: <AiCostIcon />,
    color: "bg-lime-100 text-lime-600",
    hoverColor: "hover:border-lime-400 group-hover:bg-lime-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/branding/annix-orbit",
    title: "Branding",
    description: "Orbit brand — logo, colours, tagline and watermark.",
    icon: <BrandingIcon />,
    color: "bg-sky-100 text-sky-600",
    hoverColor: "hover:border-sky-400 group-hover:bg-sky-600 group-hover:text-white",
  },
];

export default function OrbitAdminHubPage() {
  const delistCountQuery = useAdminOrbitDelistReportCount();
  const delistCountData = delistCountQuery.data;
  const delistCount = delistCountData ? delistCountData.count : 0;

  const cards = orbitAdminCards.map((card) =>
    card.href === "/admin/portal/orbit/delist-reports" ? { ...card, badge: delistCount } : card,
  );

  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Annix Orbit — Admin Hub"
      subtitle="Choose an area to manage — job market, seekers, tiers, EE targets, education catalog, FuturePath admissions, credentials, delist reports, and branding."
      cards={cards}
    />
  );
}
