"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  SeekerFunnelRow,
  SeekerLatencyStat,
  SeekerProgressRow,
  SeekerReadinessCriterion,
  SeekerTestEventRow,
  SeekerTestingIssue,
  SeekerTestPhase,
} from "@/app/lib/api/seeker-testing.types";
import { brandingCssVars } from "@/app/lib/branding/branding";
import { formatDateZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import {
  useAdminCreateSeekerTestingIssue,
  useAdminOrbitSeekerTestingErrorsLatency,
  useAdminOrbitSeekerTestingIssues,
  useAdminOrbitSeekerTestingOverview,
  useAdminOrbitSeekerTestingPhases,
  useAdminOrbitSeekerTestingReadiness,
  useAdminOrbitSeekerTestingUsers,
  useAdminRecalculateSeekerReadiness,
  useAdminUpdateSeekerTestingIssue,
  useAdminUpdateSeekerTestingPhase,
  useBranding,
} from "@/app/lib/query/hooks";

const TOTAL_STEPS = 12;
const PHASE_STATUSES = ["pending", "active", "complete"];
const ISSUE_STATUSES = ["open", "in_progress", "resolved", "ignored"];
const SEVERITIES = ["low", "medium", "high", "critical"];

function humanise(value: string): string {
  const spaced = value.replace(/_/g, " ");
  const words = spaced.split(" ");
  const titled = words.map((word) => {
    const head = word.charAt(0).toUpperCase();
    const tail = word.slice(1);
    return `${head}${tail}`;
  });
  return titled.join(" ");
}

function formatSeconds(value: number | null): string {
  if (value === null) {
    return "—";
  }
  const total = Math.max(0, Math.round(value));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : String(secs);
  return `${mins}:${paddedSecs}`;
}

function formatTs(value: string | null): string {
  if (!value) {
    return "—";
  }
  return formatDateZA(value);
}

function statusBadgeClass(status: string): string {
  const normalised = status.toLowerCase();
  if (normalised.includes("ready") || normalised === "pass" || normalised === "complete") {
    return "bg-green-500/20 text-green-300 border border-green-500/40";
  }
  if (normalised.includes("not") || normalised === "fail" || normalised === "blocked") {
    return "bg-red-500/20 text-red-300 border border-red-500/40";
  }
  return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
}

function severityClass(severity: string): string {
  const normalised = severity.toLowerCase();
  if (normalised === "critical") {
    return "bg-red-500/20 text-red-300";
  }
  if (normalised === "high") {
    return "bg-orange-500/20 text-orange-300";
  }
  if (normalised === "medium") {
    return "bg-amber-500/20 text-amber-300";
  }
  return "bg-slate-500/20 text-slate-300";
}

function issueStatusClass(status: string): string {
  const normalised = status.toLowerCase();
  if (normalised === "resolved") {
    return "bg-green-500/20 text-green-300";
  }
  if (normalised === "in_progress") {
    return "bg-blue-500/20 text-blue-300";
  }
  if (normalised === "ignored") {
    return "bg-slate-500/20 text-slate-300";
  }
  return "bg-amber-500/20 text-amber-300";
}

function KpiCard(props: { label: string; value: string }) {
  const label = props.label;
  const value = props.value;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function CriterionRow(props: { criterion: SeekerReadinessCriterion }) {
  const criterion = props.criterion;
  const actualLabel = criterion.actual === null ? "—" : String(criterion.actual);
  const pass = criterion.pass;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-200">{criterion.label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-300">
          {actualLabel} / {criterion.target}
        </span>
        <span className={`text-lg ${pass ? "text-green-400" : "text-red-400"}`}>
          {pass ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}

function FunnelBar(props: { row: SeekerFunnelRow; accent: string }) {
  const row = props.row;
  const accent = props.accent;
  const pct = Math.max(0, Math.min(100, row.pct));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-200">{humanise(row.stepKey)}</span>
        <span className="text-slate-400">
          {row.count} · {row.pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

function FailuresTable(props: { failures: SeekerTestEventRow[] }) {
  const failures = props.failures;
  if (failures.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        No recent failures recorded.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Candidate</th>
            <th className="px-4 py-3 font-medium">Page</th>
            <th className="px-4 py-3 font-medium">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {failures.map((row) => {
            const candidate = row.candidateId === null ? "—" : String(row.candidateId);
            const rawPage = row.page;
            const page = rawPage || "—";
            const rawMessage = row.errorMessage;
            const message = rawMessage || "—";
            return (
              <tr key={row.id} className="text-slate-200">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatTs(row.ts)}</td>
                <td className="px-4 py-3 font-medium">{row.eventName}</td>
                <td className="px-4 py-3 text-slate-400">{candidate}</td>
                <td className="px-4 py-3 text-slate-400">{page}</td>
                <td className="px-4 py-3 text-red-300">{message}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LatencyTable(props: { latency: SeekerLatencyStat[] }) {
  const latency = props.latency;
  if (latency.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        No latency samples yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Samples</th>
            <th className="px-4 py-3 font-medium">p50 (ms)</th>
            <th className="px-4 py-3 font-medium">p95 (ms)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {latency.map((stat) => (
            <tr key={stat.eventName} className="text-slate-200">
              <td className="px-4 py-3 font-medium">{stat.eventName}</td>
              <td className="px-4 py-3 text-slate-400">{stat.samples}</td>
              <td className="px-4 py-3 text-slate-300">{stat.p50Ms}</td>
              <td className="px-4 py-3 text-slate-300">{stat.p95Ms}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhaseRow(props: {
  phase: SeekerTestPhase;
  onStatusChange: (id: string, status: string) => void;
  disabled: boolean;
}) {
  const phase = props.phase;
  const onStatusChange = props.onStatusChange;
  const disabled = props.disabled;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-white">{phase.name}</p>
        <p className="text-xs text-slate-400">
          {phase.actualUsers} / {phase.targetUsers} users
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(phase.status)}`}
        >
          {humanise(phase.status)}
        </span>
        <select
          value={phase.status}
          disabled={disabled}
          onChange={(e) => onStatusChange(phase.id, e.target.value)}
          className="rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {PHASE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanise(status)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function UsersTable(props: { users: SeekerProgressRow[] }) {
  const users = props.users;
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        No test users yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Candidate</th>
            <th className="px-4 py-3 font-medium">Completed steps</th>
            <th className="px-4 py-3 font-medium">Time to first value</th>
            <th className="px-4 py-3 font-medium">Registered</th>
            <th className="px-4 py-3 font-medium">Last active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((user) => (
            <tr key={user.id} className="text-slate-200">
              <td className="px-4 py-3 font-medium">{user.candidateId}</td>
              <td className="px-4 py-3 text-slate-300">
                {user.completedSteps}/{TOTAL_STEPS}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {formatSeconds(user.timeToFirstValueSeconds)}
              </td>
              <td className="px-4 py-3 text-slate-400">{formatTs(user.registeredAt)}</td>
              <td className="px-4 py-3 text-slate-400">{formatTs(user.lastActiveAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssuesTable(props: {
  issues: SeekerTestingIssue[];
  onStatusChange: (id: string, status: string) => void;
  disabled: boolean;
}) {
  const issues = props.issues;
  const onStatusChange = props.onStatusChange;
  const disabled = props.disabled;
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        No issues logged yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Severity</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Page</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {issues.map((issue) => {
            const rawIssuePage = issue.page;
            const page = rawIssuePage || "—";
            return (
              <tr key={issue.id} className="text-slate-200">
                <td className="px-4 py-3 font-medium">{issue.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityClass(issue.severity)}`}
                  >
                    {humanise(issue.severity)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${issueStatusClass(issue.status)}`}
                    >
                      {humanise(issue.status)}
                    </span>
                    <select
                      value={issue.status}
                      disabled={disabled}
                      onChange={(e) => onStatusChange(issue.id, e.target.value)}
                      className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      {ISSUE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {humanise(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{page}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  const title = props.title;
  const subtitle = props.subtitle;
  const children = props.children;
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function SeekerTestingPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();

  const brandingQuery = useBranding("annix-orbit");
  const overviewQuery = useAdminOrbitSeekerTestingOverview();
  const errorsLatencyQuery = useAdminOrbitSeekerTestingErrorsLatency();
  const usersQuery = useAdminOrbitSeekerTestingUsers();
  const readinessQuery = useAdminOrbitSeekerTestingReadiness();
  const phasesQuery = useAdminOrbitSeekerTestingPhases();
  const issuesQuery = useAdminOrbitSeekerTestingIssues();

  const recalculate = useAdminRecalculateSeekerReadiness();
  const updatePhase = useAdminUpdateSeekerTestingPhase();
  const createIssue = useAdminCreateSeekerTestingIssue();
  const updateIssue = useAdminUpdateSeekerTestingIssue();

  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("medium");

  const branding = brandingQuery.data;
  const cssVars = branding ? brandingCssVars(branding) : {};
  const accent = "var(--brand-accent)";

  const readinessReport = readinessQuery.data;
  const current = readinessReport ? readinessReport.current : null;

  const overview = overviewQuery.data;
  const funnel = overview ? overview.funnel : [];

  const errorsLatency = errorsLatencyQuery.data;
  const recentFailures = errorsLatency ? errorsLatency.recentFailures : [];
  const latency = errorsLatency ? errorsLatency.latency : [];

  const usersData = usersQuery.data;
  const users = usersData ? usersData : [];

  const phasesData = phasesQuery.data;
  const phases = phasesData ? phasesData : [];

  const issuesData = issuesQuery.data;
  const issues = issuesData ? issuesData : [];

  const recalcPending = recalculate.isPending;

  const handleRecalculate = () => {
    recalculate.mutate(undefined, {
      onSuccess: () => showToast("Readiness recalculated.", "success"),
      onError: () =>
        alert({ message: "Could not recalculate readiness — please try again.", variant: "error" }),
    });
  };

  const handlePhaseStatus = (id: string, status: string) => {
    updatePhase.mutate(
      { id, body: { status } },
      {
        onSuccess: () => showToast("Phase updated.", "success"),
        onError: () => alert({ message: "Could not update phase.", variant: "error" }),
      },
    );
  };

  const handleIssueStatus = (id: string, status: string) => {
    updateIssue.mutate(
      { id, body: { status } },
      {
        onSuccess: () => showToast("Issue updated.", "success"),
        onError: () => alert({ message: "Could not update issue.", variant: "error" }),
      },
    );
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const title = issueTitle.trim();
    const description = issueDescription.trim();
    if (!title) {
      showToast("Please enter an issue title.", "warning");
      return;
    }
    createIssue.mutate(
      { title, description, severity: issueSeverity },
      {
        onSuccess: () => {
          showToast("Issue logged.", "success");
          setIssueTitle("");
          setIssueDescription("");
          setIssueSeverity("medium");
        },
        onError: () => alert({ message: "Could not log issue.", variant: "error" }),
      },
    );
  };

  const statusLabel = current ? current.status : "Loading…";
  const ttfvLabel = current ? formatSeconds(current.avgTtfvSeconds) : "—";
  const errorRateLabel = current ? `${current.errorRatePct.toFixed(1)}%` : "—";

  return (
    <div
      style={cssVars as React.CSSProperties}
      className="min-h-screen space-y-6 rounded-2xl bg-slate-950 p-6 text-white"
    >
      {AlertDialog}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seeker Testing &amp; Launch Readiness</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Track the Annix Orbit seeker pilot — readiness criteria, error &amp; latency health, the
            onboarding funnel, test phases, participants and logged issues.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalcPending}
          style={{ backgroundColor: accent }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {recalcPending ? "Recalculating…" : "Recalculate"}
        </button>
      </header>

      <SectionCard
        title="Launch readiness"
        subtitle="Each criterion compares the live actual against its launch target."
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-slate-400">Current status</span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(statusLabel)}`}
          >
            {statusLabel}
          </span>
        </div>
        {current ? (
          current.criteria.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
              No readiness criteria defined.
            </div>
          ) : (
            <div className="space-y-2">
              {current.criteria.map((criterion) => (
                <CriterionRow key={criterion.key} criterion={criterion} />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Loading readiness…
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="CV uploads" value={current ? String(current.cvUploads) : "—"} />
        <KpiCard
          label="Completed profiles"
          value={current ? String(current.completedProfiles) : "—"}
        />
        <KpiCard
          label="Successful analyses"
          value={current ? String(current.successfulAnalyses) : "—"}
        />
        <KpiCard label="Job views" value={current ? String(current.jobViews) : "—"} />
        <KpiCard label="Applications" value={current ? String(current.applications) : "—"} />
        <KpiCard label="Avg time to first value" value={ttfvLabel} />
        <KpiCard label="Error rate" value={errorRateLabel} />
        <KpiCard
          label="Open critical bugs"
          value={current ? String(current.openCriticalBugs) : "—"}
        />
      </div>

      <SectionCard
        title="Errors & Latency"
        subtitle="The primary health signal for the pilot — recent failures and per-event latency."
      >
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Recent failures
            </h3>
            <FailuresTable failures={recentFailures} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Latency
            </h3>
            <LatencyTable latency={latency} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Workflow funnel"
        subtitle="Where seekers progress to — and drop off from — in onboarding."
      >
        {funnel.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            No funnel data yet.
          </div>
        ) : (
          <div className="space-y-4">
            {funnel.map((row) => (
              <FunnelBar key={row.stepKey} row={row} accent={accent} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Test phases"
        subtitle="Pilot rollout stages and their participant counts."
      >
        {phases.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            No phases defined yet.
          </div>
        ) : (
          <div className="space-y-3">
            {phases.map((phase) => (
              <PhaseRow
                key={phase.id}
                phase={phase}
                onStatusChange={handlePhaseStatus}
                disabled={updatePhase.isPending}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Test users" subtitle="Per-participant onboarding progress and activity.">
        <UsersTable users={users} />
      </SectionCard>

      <SectionCard title="Issues" subtitle="Log and triage issues raised during testing.">
        <form
          onSubmit={handleCreateIssue}
          className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
        >
          <input
            type="text"
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            placeholder="Issue title"
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <input
            type="text"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Description"
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <select
            value={issueSeverity}
            onChange={(e) => setIssueSeverity(e.target.value)}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {humanise(severity)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createIssue.isPending}
            style={{ backgroundColor: accent }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {createIssue.isPending ? "Logging…" : "Log issue"}
          </button>
        </form>
        <IssuesTable
          issues={issues}
          onStatusChange={handleIssueStatus}
          disabled={updateIssue.isPending}
        />
      </SectionCard>
    </div>
  );
}
