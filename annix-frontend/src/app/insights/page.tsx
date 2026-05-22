"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  ListChecks,
  Newspaper,
  PlayCircle,
  Signal,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import PortalToolbar, { type NavItem } from "@/app/components/PortalToolbar";
import { ApiError } from "@/app/lib/api/apiError";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useCronStatus, useRunFullCron } from "@/app/lib/query/hooks";
import { insightsKeys } from "@/app/lib/query/keys";
import { MacroSentimentPanel } from "./components/MacroSentimentPanel";
import { INSIGHTS_VERSION } from "./config/version";
import { useInsightsAuth } from "./context/InsightsAuthContext";

const NAV_ITEMS: NavItem[] = [];

export default function InsightsHomePage() {
  const { user, isLoading, isAuthenticated } = useInsightsAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <InsightsLoginCard />;
  }

  return <InsightsDashboard userEmail={user.email} />;
}

function InsightsLoginCard() {
  const { login } = useInsightsAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, rememberMe: true });
    } catch (err) {
      const apiMessage = err instanceof ApiError ? err.message : null;
      const fallback = err instanceof Error ? err.message : "Sign in failed.";
      const message = apiMessage ?? fallback;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF8A00] mb-4">
            <TrendingUp className="w-7 h-7 text-gray-900" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Annix Insights</h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">
            Private investment intelligence — sign in to continue.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent"
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-200"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#FF8A00] hover:bg-[#CC6900] disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-900 font-semibold py-2.5 rounded-lg transition-colors"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Annix Insights v{INSIGHTS_VERSION} · Private — no public registration.
        </p>
      </div>
    </div>
  );
}

function InsightsDashboard(props: { userEmail: string }) {
  const { logout } = useInsightsAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] text-white">
      <PortalToolbar
        portalType="insights"
        navItems={NAV_ITEMS}
        user={{ email: props.userEmail }}
        onLogout={logout}
        version={INSIGHTS_VERSION}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-8 text-slate-900 dark:text-white">
          <h2 className="text-2xl font-bold tracking-tight">Welcome.</h2>
          <p className="text-slate-600 dark:text-gray-400 mt-2 max-w-2xl">
            Annix Insights is the private investment-intelligence test harness. Phase 1 is live: you
            can curate the asset watchlist. Phase 2 adds historic price ingestion; the six paper
            portfolios start running at Phase 3. Progress is tracked in GitHub issue #287.
          </p>
        </div>

        <MacroSentimentPanel />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <Link
            href="/insights/watchlist"
            className="group bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 hover:border-[#FF8A00] hover:bg-slate-100 dark:hover:bg-gray-900/70 transition-colors text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <ListChecks className="w-6 h-6 text-[#FF8A00]" strokeWidth={2} />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#FF8A00] transition-colors" />
            </div>
            <h3 className="text-base font-semibold">Watchlist</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Track the symbols the signal engine will run against.
            </p>
          </Link>
          <Link
            href="/insights/paper-portfolios"
            className="group bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 hover:border-[#FF8A00] hover:bg-slate-100 dark:hover:bg-gray-900/70 transition-colors text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <Briefcase className="w-6 h-6 text-[#FF8A00]" strokeWidth={2} />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#FF8A00] transition-colors" />
            </div>
            <h3 className="text-base font-semibold">Paper portfolios</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Six fake-money portfolios running side-by-side — empirical answer to "is the signal
              engine actually any good?"
            </p>
          </Link>
          <Link
            href="/insights/signals"
            className="group bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 hover:border-[#FF8A00] hover:bg-slate-100 dark:hover:bg-gray-900/70 transition-colors text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <Signal className="w-6 h-6 text-[#FF8A00]" strokeWidth={2} />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#FF8A00] transition-colors" />
            </div>
            <h3 className="text-base font-semibold">Signals</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Daily 0-100 scores per asset across five signals. Phase 6 wires them to the four
              non-benchmark portfolios.
            </p>
          </Link>
          <Link
            href="/insights/news"
            className="group bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 hover:border-[#FF8A00] hover:bg-slate-100 dark:hover:bg-gray-900/70 transition-colors text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <Newspaper className="w-6 h-6 text-[#FF8A00]" strokeWidth={2} />
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#FF8A00] transition-colors" />
            </div>
            <h3 className="text-base font-semibold">News</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Daily news headlines pulled from Yahoo Finance, tagged by Gemini for sentiment and
              impact. Feeds the news-sentiment signal.
            </p>
          </Link>
        </div>

        <AdminActions />
      </main>
    </div>
  );
}

function AdminActions() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const qc = useQueryClient();
  const runMutation = useRunFullCron();
  const statusQuery = useCronStatus({ pollWhileRunning: true });

  const status = statusQuery.data;
  const isRunning = status?.isRunning === true;
  const rawLastFinishedAt = status?.lastRunFinishedAt;
  const lastFinishedAt = rawLastFinishedAt ?? null;
  const baselineFinishedAt = useRef<string | null | undefined>(undefined);
  const awaitingOutcome = useRef(false);

  useEffect(() => {
    if (status === undefined) return;
    if (baselineFinishedAt.current === undefined) {
      baselineFinishedAt.current = lastFinishedAt;
    }
  }, [status, lastFinishedAt]);

  useEffect(() => {
    // Only hijack the screen with the progress modal for a run the user
    // started from this page. Scheduled / catch-up crons run server-side and
    // must not interrupt anyone who simply opened the dashboard.
    if (isRunning && awaitingOutcome.current) {
      showExtraction({
        brand: "insights",
        label: "Running daily cron pipeline…",
        estimatedDurationMs: 5 * 60 * 1000,
      });
    }
  }, [isRunning, showExtraction]);

  useEffect(() => {
    if (lastFinishedAt === null) return;
    if (baselineFinishedAt.current === undefined) return;
    if (lastFinishedAt === baselineFinishedAt.current) return;
    baselineFinishedAt.current = lastFinishedAt;
    hideExtraction();
    qc.invalidateQueries({ queryKey: insightsKeys.all });
    const isAwaiting = awaitingOutcome.current;
    if (!isAwaiting) return;
    if (!status) return;
    awaitingOutcome.current = false;
    if (status.lastRunError !== null) {
      void confirm({
        title: "Cron failed",
        message: status.lastRunError,
        confirmLabel: "OK",
        hideCancel: true,
        variant: "danger",
      });
    } else {
      const durationMs = status.lastRunDurationMs;
      const seconds = durationMs !== null ? (durationMs / 1000).toFixed(1) : "?";
      void confirm({
        title: "Cron completed",
        message: `Full pipeline finished in ${seconds}s. Pages will refresh automatically.`,
        confirmLabel: "OK",
        hideCancel: true,
        variant: "info",
      });
    }
  }, [lastFinishedAt, status, hideExtraction, confirm, qc]);

  const handleRun = async () => {
    const confirmed = await confirm({
      title: "Run the full daily cron now?",
      message:
        "Triggers market-data ingestion, signal scoring, benchmark execution, signal-portfolio trade execution, and portfolio snapshots — the exact same pipeline as the 06:00 SAST cron. Takes ~3–8 minutes. Runs in the background; safe to navigate away.",
      confirmLabel: "Run now",
      variant: "info",
    });
    if (!confirmed) return;

    try {
      const result = await runMutation.mutateAsync();
      if (result.alreadyRunning) {
        await confirm({
          title: "Cron already running",
          message: "A run is already in progress. Progress will appear here when it completes.",
          confirmLabel: "OK",
          hideCancel: true,
          variant: "info",
        });
      } else {
        awaitingOutcome.current = true;
      }
      await statusQuery.refetch();
    } catch (err) {
      const apiMessage = err instanceof ApiError ? err.message : null;
      const fallback = err instanceof Error ? err.message : "Cron run failed.";
      await confirm({
        title: "Could not start cron",
        message: apiMessage ?? fallback,
        confirmLabel: "OK",
        hideCancel: true,
        variant: "danger",
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 mt-6 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-semibold">Admin actions</h3>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1 max-w-xl">
            Manually trigger the full daily pipeline (market data → signals → benchmark exec →
            signal-portfolio trades → snapshots) without waiting for the 06:00 SAST cron. Runs in
            the background; safe to navigate away.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || runMutation.isPending}
          className="inline-flex items-center gap-2 bg-[#FF8A00] hover:bg-[#CC6900] disabled:bg-slate-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          {isRunning ? "Running…" : runMutation.isPending ? "Starting…" : "Run daily cron now"}
        </button>
      </div>
      {ConfirmDialog}
    </div>
  );
}
