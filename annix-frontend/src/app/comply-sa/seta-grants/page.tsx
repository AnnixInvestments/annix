"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Info,
  Loader2,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useSetaGrantInfo } from "@/app/lib/query/hooks";

type GrantInfo = NonNullable<ReturnType<typeof useSetaGrantInfo>["data"]>;

const GRANT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Mandatory: BookOpen,
  Discretionary: Award,
  PIVOTAL: Target,
};

const GRANT_COLORS: Record<string, string> = {
  Mandatory: "bg-teal-500/10 text-teal-400",
  Discretionary: "bg-blue-500/10 text-blue-400",
  PIVOTAL: "bg-purple-500/10 text-purple-400",
};

const FALLBACK_DATA: GrantInfo = {
  overview:
    "The Skills Development Levy (SDL) is a compulsory levy collected by SARS to fund education and training in South Africa. Employers with an annual payroll above R500,000 must pay 1% of total payroll as SDL. Companies can reclaim a portion through SETA grant applications.",
  grants: [
    {
      type: "Mandatory",
      percentage: 20,
      description:
        "Employers can claim back 20% of their SDL contribution by submitting a Workplace Skills Plan (WSP) and Annual Training Report (ATR) to their relevant SETA by 30 April each year.",
      eligibility: "All SDL-paying employers who submit WSP/ATR on time",
    },
    {
      type: "Discretionary",
      percentage: null,
      description:
        "Additional funding available from SETAs for skills development projects aligned with sector priorities. Amounts vary based on SETA budget and project merit.",
      eligibility:
        "Employers who have submitted mandatory grants and propose qualifying training programmes",
    },
    {
      type: "PIVOTAL",
      percentage: null,
      description:
        "Professional, Vocational, Technical and Academic Learning programmes that result in a qualification registered on the NQF. Covers learnerships, apprenticeships, and bursaries.",
      eligibility:
        "Employers offering structured learning programmes leading to NQF-registered qualifications",
    },
  ],
  deadlines: [
    {
      name: "WSP/ATR Submission",
      date: "30 April",
      description:
        "Annual deadline for Workplace Skills Plan and Annual Training Report submission to your SETA",
    },
    {
      name: "Discretionary Grant Applications",
      date: "Varies by SETA",
      description: "Check your specific SETA for discretionary grant application windows",
    },
    {
      name: "PIVOTAL Grant Applications",
      date: "Varies by SETA",
      description: "PIVOTAL grant windows typically open between January and March",
    },
  ],
  steps: [
    "Register with your relevant SETA based on your SIC code",
    "Appoint a Skills Development Facilitator (SDF)",
    "Conduct a workplace skills audit",
    "Prepare the Workplace Skills Plan (WSP)",
    "Complete the Annual Training Report (ATR)",
    "Submit WSP/ATR via your SETA portal by 30 April",
    "Implement training as per your WSP",
    "Apply for discretionary grants when windows open",
  ],
};

function GrantCard({ grant }: { grant: GrantInfo["grants"][number] }) {
  const Icon = GRANT_ICONS[grant.type] ?? BookOpen;
  const iconColor = GRANT_COLORS[grant.type] ?? "bg-slate-500/10 text-slate-400";

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{grant.type} Grant</h3>
          {grant.percentage !== null && (
            <span className="text-xs text-teal-400 font-medium">{grant.percentage}% of SDL</span>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">{grant.description}</p>
      <div className="bg-slate-900/50 rounded-lg p-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">
          Eligibility
        </p>
        <p className="text-xs text-slate-300">{grant.eligibility}</p>
      </div>
    </div>
  );
}

export default function SetaGrantsPage() {
  const { data, isLoading } = useSetaGrantInfo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  const info = data ?? FALLBACK_DATA;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-teal-400" />
          SETA Grants
        </h1>
        <p className="text-slate-400 mt-1">
          Skills Development Levy grants and funding information
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-start gap-3">
        <Info className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">
            Understanding SDL and SETA Grants
          </h2>
          <p className="text-sm text-slate-400">{info.overview}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Grant Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {info.grants.map((grant) => (
            <GrantCard key={grant.type} grant={grant} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-teal-400" />
          Important Deadlines
        </h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
          {info.deadlines.map((deadline) => (
            <div key={deadline.name} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">{deadline.name}</h3>
                <span className="text-xs font-medium text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full">
                  {deadline.date}
                </span>
              </div>
              <p className="text-xs text-slate-400">{deadline.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Step-by-Step Guide</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <ol className="space-y-3">
            {info.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm text-slate-300 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Calculate your SDL contribution</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Use the Tax Tools calculator to estimate your SDL amount
          </p>
        </div>
        <Link
          href="/comply-sa/tax-tools"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg text-sm font-medium transition-colors"
        >
          Calculate my SDL
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
