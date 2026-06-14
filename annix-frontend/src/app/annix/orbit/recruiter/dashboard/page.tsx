"use client";

import Link from "next/link";
import { useState } from "react";
import { DateInput } from "@/app/components/ui/DateInput";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import type { OrbitKpiValue } from "@/app/lib/api/annixOrbitApi";
import { formatShortDate, now } from "@/app/lib/datetime";
import { useOrbitRecruiterDashboard } from "@/app/lib/query/hooks";
import { RecruiterAssistantSearch } from "../candidates/components/RecruiterAssistantSearch";
import { PipelineFunnel } from "./components/PipelineFunnel";
import { RevenueChart } from "./components/RevenueChart";
import { SourceDonut } from "./components/SourceDonut";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstNameOf(name: string | null | undefined): string {
  if (!name) return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

function compactRand(value: number): string {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `R${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return `R${value.toLocaleString("en-ZA")}`;
}

function Delta(props: { kpi: OrbitKpiValue }) {
  const delta = props.kpi.deltaPct;
  if (delta === null) {
    return <span className="text-[11px] text-gray-400">vs last period</span>;
  }
  const positive = delta >= 0;
  return (
    <span className={`text-[11px] font-medium ${positive ? "text-green-600" : "text-red-600"}`}>
      {positive ? "↑" : "↓"} {Math.abs(delta)}% vs last period
    </span>
  );
}

function KpiCard(props: { label: string; value: string; kpi: OrbitKpiValue; tone: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
      <div className={`inline-flex w-9 h-9 rounded-xl items-center justify-center ${props.tone}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
      </div>
      <div className="mt-3 text-2xl font-bold text-[#252560] dark:text-white">{props.value}</div>
      <div className="text-sm text-gray-600 dark:text-[#c0c0eb]">{props.label}</div>
      <div className="mt-1">
        <Delta kpi={props.kpi} />
      </div>
    </div>
  );
}

function Panel(props: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-bold text-[#252560] dark:text-white">{props.title}</h2>
        {props.action}
      </div>
      {props.children}
    </div>
  );
}

export default function RecruiterDashboardPage() {
  const auth = useAnnixOrbitAuth();
  const userName = auth.user ? auth.user.name : null;
  const start = now();
  const [to, setTo] = useState(start.toISODate() ?? "");
  const [from, setFrom] = useState(start.minus({ days: 29 }).toISODate() ?? "");

  const dashboardQuery = useOrbitRecruiterDashboard(from, to);
  const data = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">
            {greeting(start.hour)}, {firstNameOf(userName)} 👋
          </h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Here's what's happening with your recruitment business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateInput value={from} onChange={setFrom} max={to} ariaLabel="From date" />
          <span className="text-gray-400">–</span>
          <DateInput value={to} onChange={setTo} min={from} ariaLabel="To date" />
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your dashboard — please try again.
        </div>
      ) : isLoading || !data ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              label="Total Candidates"
              value={data.kpis.totalCandidates.value.toLocaleString("en-ZA")}
              kpi={data.kpis.totalCandidates}
              tone="bg-purple-100 text-purple-600"
            />
            <KpiCard
              label="Active Clients"
              value={data.kpis.activeClients.value.toLocaleString("en-ZA")}
              kpi={data.kpis.activeClients}
              tone="bg-emerald-100 text-emerald-600"
            />
            <KpiCard
              label="Active Jobs"
              value={data.kpis.activeJobs.value.toLocaleString("en-ZA")}
              kpi={data.kpis.activeJobs}
              tone="bg-blue-100 text-blue-600"
            />
            <KpiCard
              label="Submissions"
              value={data.kpis.submissions.value.toLocaleString("en-ZA")}
              kpi={data.kpis.submissions}
              tone="bg-amber-100 text-amber-600"
            />
            <KpiCard
              label="Placements"
              value={data.kpis.placements.value.toLocaleString("en-ZA")}
              kpi={data.kpis.placements}
              tone="bg-indigo-100 text-indigo-600"
            />
            <KpiCard
              label="Revenue"
              value={compactRand(data.kpis.revenue.value)}
              kpi={data.kpis.revenue}
              tone="bg-rose-100 text-rose-600"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Panel title="Recruitment Pipeline">
              <PipelineFunnel
                stages={data.pipeline.stages}
                conversionRate={data.pipeline.conversionRate}
              />
            </Panel>
            <Panel title="Revenue Overview">
              <div className="text-2xl font-bold text-[#252560] dark:text-white mb-2">
                {compactRand(data.revenueTotal)}
              </div>
              <RevenueChart series={data.revenueSeries} />
            </Panel>
            <Panel
              title="Top Performing Consultants"
              action={
                <Link
                  href="/annix/orbit/recruiter/reports"
                  className="text-xs text-[#323288] hover:text-[#252560] font-medium"
                >
                  Reports →
                </Link>
              }
            >
              {data.topConsultants.gated ? (
                <p className="text-sm text-gray-500 dark:text-[#c0c0eb]">
                  The consultant leaderboard is part of the Leader plan. Upgrade to rank your team
                  by placements and revenue.
                </p>
              ) : data.topConsultants.items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#c0c0eb]">
                  No placements in this period yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.topConsultants.items.map((consultant, index) => (
                    <li
                      key={consultant.userId === null ? `unattributed-${index}` : consultant.userId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-xs text-gray-400">{index + 1}</span>
                        <span className="truncate text-sm text-[#252560] dark:text-white">
                          {consultant.name}
                          <span className="text-gray-400">
                            {" "}
                            · {consultant.placements} placement
                            {consultant.placements === 1 ? "" : "s"}
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-[#252560] dark:text-white shrink-0">
                        {compactRand(consultant.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Panel
              title="Recent Placements"
              action={
                <Link
                  href="/annix/orbit/recruiter/placements"
                  className="text-xs text-[#323288] hover:text-[#252560] font-medium"
                >
                  View all →
                </Link>
              }
            >
              {data.recentPlacements.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#c0c0eb]">No placements recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentPlacements.map((placement) => (
                    <li key={placement.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#252560] dark:text-white truncate">
                          {placement.candidateName}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {placement.jobTitle}
                          {placement.clientName ? ` · ${placement.clientName}` : ""}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-emerald-600 shrink-0">
                        {placement.fee === null ? "—" : compactRand(placement.fee)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Candidate Source Breakdown">
              <SourceDonut total={data.sourceBreakdown.total} items={data.sourceBreakdown.items} />
            </Panel>
            <Panel
              title="Upcoming Interviews"
              action={
                <Link
                  href="/annix/orbit/recruiter/interviews"
                  className="text-xs text-[#323288] hover:text-[#252560] font-medium"
                >
                  View →
                </Link>
              }
            >
              {data.upcomingInterviews.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#c0c0eb]">
                  No candidates at interview stage.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.upcomingInterviews.map((interview) => (
                    <li
                      key={interview.submissionId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#252560] dark:text-white truncate">
                          {interview.candidateName}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {interview.jobTitle}
                          {interview.clientName ? ` · ${interview.clientName}` : ""}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-amber-600 shrink-0">
                        {interview.interviewAt
                          ? formatShortDate(interview.interviewAt)
                          : "Interview"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1">
              <RecruiterAssistantSearch />
            </div>
            <Panel
              title="Compliance Alerts"
              action={
                <Link
                  href="/annix/orbit/recruiter/candidates"
                  className="text-xs text-[#323288] hover:text-[#252560] font-medium"
                >
                  View →
                </Link>
              }
            >
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#252560] dark:text-white">
                  {data.complianceAlerts.candidateCount}
                </span>
                <span className="text-sm text-gray-600 dark:text-[#c0c0eb]">
                  candidate{data.complianceAlerts.candidateCount === 1 ? "" : "s"} with expiring or
                  expired documents
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {data.complianceAlerts.credentialCount} credential
                {data.complianceAlerts.credentialCount === 1 ? "" : "s"} need attention
              </p>
            </Panel>
            <Panel
              title="Tasks"
              action={
                <Link
                  href="/annix/orbit/recruiter/tasks"
                  className="text-xs text-[#323288] hover:text-[#252560] font-medium"
                >
                  View tasks →
                </Link>
              }
            >
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#252560] dark:text-white">
                  {data.tasksDue}
                </span>
                <span className="text-sm text-gray-600 dark:text-[#c0c0eb]">tasks due today</span>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
