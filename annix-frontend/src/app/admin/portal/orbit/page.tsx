"use client";

import { AppAdminHub, type AppHubCard } from "@/app/components/admin/AppAdminHub";

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

const orbitAdminCards: AppHubCard[] = [
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
    href: "/admin/portal/branding/annix-orbit",
    title: "Branding",
    description: "Orbit brand — logo, colours, tagline and watermark.",
    icon: <BrandingIcon />,
    color: "bg-sky-100 text-sky-600",
    hoverColor: "hover:border-sky-400 group-hover:bg-sky-600 group-hover:text-white",
  },
];

export default function OrbitAdminHubPage() {
  return (
    <AppAdminHub
      appKey="annix-orbit"
      title="Annix Orbit — Admin Hub"
      subtitle="Choose an area to manage — job market, seekers, tiers, EE targets, education catalog, FuturePath admissions, and branding."
      cards={orbitAdminCards}
    />
  );
}
