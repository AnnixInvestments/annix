"use client";

import {
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileBadge2,
  FileSearch,
  Flag,
  GraduationCap,
  IdCard,
  Megaphone,
  Palette,
  School,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { AppHubCard } from "@/app/components/admin/AppAdminHub";

export const orbitModuleCards: AppHubCard[] = [
  {
    href: "/admin/portal/orbit/student",
    title: "Student",
    description: "FuturePath education, admissions and student-facing setup.",
    icon: <GraduationCap className="h-7 w-7" />,
    color: "bg-amber-100 text-amber-600",
    hoverColor: "hover:border-amber-400 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/seeker",
    title: "Seeker",
    description: "Job seekers, job feed controls, tiers, testing and launch readiness.",
    icon: <Users className="h-7 w-7" />,
    color: "bg-cyan-100 text-cyan-600",
    hoverColor: "hover:border-cyan-400 group-hover:bg-cyan-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/recruiter",
    title: "Recruiter",
    description: "Recruiter accounts, access and team administration.",
    icon: <BriefcaseBusiness className="h-7 w-7" />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/company",
    title: "Company",
    description: "Employer accounts, job distribution and compliance targets.",
    icon: <Building2 className="h-7 w-7" />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
];

export const orbitSharedCards: AppHubCard[] = [
  {
    href: "/admin/portal/branding/annix-orbit",
    title: "Branding",
    description: "Orbit brand, logo, colours, tagline and watermark.",
    icon: <Palette className="h-7 w-7" />,
    color: "bg-sky-100 text-sky-600",
    hoverColor: "hover:border-sky-400 group-hover:bg-sky-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/scheduled-jobs?app=orbit",
    title: "Scheduled Jobs",
    description: "Orbit cron jobs, ingestion, alerts and POPIA purges.",
    icon: <CalendarClock className="h-7 w-7" />,
    color: "bg-slate-100 text-slate-600",
    hoverColor: "hover:border-slate-400 group-hover:bg-slate-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/ai-cost",
    title: "AI Cost",
    description: "Gemini spend by feature and model over time.",
    icon: <Banknote className="h-7 w-7" />,
    color: "bg-lime-100 text-lime-600",
    hoverColor: "hover:border-lime-400 group-hover:bg-lime-600 group-hover:text-white",
  },
];

export const orbitStudentCards: AppHubCard[] = [
  {
    href: "/admin/portal/orbit/education-catalog",
    title: "Education Catalog",
    description: "Owner-verified institutions, faculties, programmes and scholarships.",
    icon: <School className="h-7 w-7" />,
    color: "bg-amber-100 text-amber-600",
    hoverColor: "hover:border-amber-400 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/education-ingestion",
    title: "FuturePath Admissions",
    description: "Review AI-scraped university entry requirements before they go live.",
    icon: <BookOpen className="h-7 w-7" />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
];

export function orbitSeekerCards(delistCount: number): AppHubCard[] {
  return [
    {
      href: "/admin/portal/orbit/job-market",
      title: "Job Market",
      description: "Manage job-board ingestion sources that populate Browse Jobs.",
      icon: <BriefcaseBusiness className="h-7 w-7" />,
      color: "bg-violet-100 text-violet-600",
      hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/seekers",
      title: "Seekers",
      description: "Browse and search seekers by CV status, tier and activity.",
      icon: <Users className="h-7 w-7" />,
      color: "bg-cyan-100 text-cyan-600",
      hoverColor: "hover:border-cyan-400 group-hover:bg-cyan-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/seeker-tiers",
      title: "Seeker Tiers",
      description: "Override the match-score tier that gates what a seeker can see.",
      icon: <Zap className="h-7 w-7" />,
      color: "bg-indigo-100 text-indigo-600",
      hoverColor: "hover:border-indigo-400 group-hover:bg-indigo-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/credential-types",
      title: "Credentials",
      description: "Manage deployment credentials seekers can track.",
      icon: <FileBadge2 className="h-7 w-7" />,
      color: "bg-teal-100 text-teal-600",
      hoverColor: "hover:border-teal-400 group-hover:bg-teal-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/dismiss-reasons",
      title: "Dismiss reasons",
      description: "Manage the 'Not for me' reasons seekers pick on a job.",
      icon: <IdCard className="h-7 w-7" />,
      color: "bg-rose-100 text-rose-600",
      hoverColor: "hover:border-rose-400 group-hover:bg-rose-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/identity-reviews",
      title: "Identity reviews",
      description: "Review seeker ID checks Nix was not sure about.",
      icon: <ShieldCheck className="h-7 w-7" />,
      color: "bg-purple-100 text-purple-600",
      hoverColor: "hover:border-purple-400 group-hover:bg-purple-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/delist-reports",
      title: "Delist reports",
      description: "Review seeker-reported jobs that may have been taken down.",
      icon: <Flag className="h-7 w-7" />,
      color: "bg-orange-100 text-orange-600",
      hoverColor: "hover:border-orange-400 group-hover:bg-orange-600 group-hover:text-white",
      badge: delistCount,
    },
    {
      href: "/admin/portal/orbit/early-access",
      title: "Early Access",
      description: "Pre-launch waiting list, sources, campaigns and CSV export.",
      icon: <Clock className="h-7 w-7" />,
      color: "bg-yellow-100 text-yellow-600",
      hoverColor: "hover:border-yellow-400 group-hover:bg-yellow-600 group-hover:text-white",
    },
    {
      href: "/admin/portal/orbit/seeker-testing",
      title: "Seeker Testing",
      description: "Beta testing, launch readiness, bug tracker and go-live checklist.",
      icon: <CheckCircle2 className="h-7 w-7" />,
      color: "bg-orange-100 text-orange-600",
      hoverColor: "hover:border-orange-400 group-hover:bg-orange-600 group-hover:text-white",
    },
  ];
}

export const orbitRecruiterCards: AppHubCard[] = [
  {
    href: "/admin/portal/orbit/users",
    title: "Users",
    description: "Invite, configure and remove recruiter accounts.",
    icon: <Users className="h-7 w-7" />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
];

export const orbitCompanyCards: AppHubCard[] = [
  {
    href: "/admin/portal/orbit/users",
    title: "Users",
    description: "Invite, configure and remove employer accounts.",
    icon: <Users className="h-7 w-7" />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/job-posting",
    title: "Job Posting",
    description: "Free channels Orbit Company should wire up first for distribution.",
    icon: <Megaphone className="h-7 w-7" />,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:border-emerald-400 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/orbit/ee-targets",
    title: "EE Sectoral Targets",
    description: "Capture the B-BBEE sector targets the EE report measures against.",
    icon: <FileSearch className="h-7 w-7" />,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:border-rose-400 group-hover:bg-rose-600 group-hover:text-white",
  },
];
