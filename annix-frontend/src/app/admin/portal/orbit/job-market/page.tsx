"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { adminApiClient } from "@/app/lib/api/adminApi";
import type {
  CreateJobMarketSourceDto,
  JobSourceCredentialField,
} from "@/app/lib/api/annixOrbitApi";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import {
  useAdminCreateOrbitJobMarketSource,
  useAdminDeleteOrbitJobMarketSource,
  useAdminOrbitExternalJobs,
  useAdminOrbitJobMarketProviders,
  useAdminOrbitJobMarketSources,
  useAdminOrbitJobMarketStats,
  useAdminUpdateOrbitJobMarketSource,
} from "@/app/lib/query/hooks";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";
import { AddSourceForm } from "./components/AddSourceForm";
import { EnabledCountriesControl } from "./components/EnabledCountriesControl";
import { FindDuplicatesModal } from "./components/FindDuplicatesModal";
import { IngestionScheduleControl } from "./components/IngestionScheduleControl";
import { JobCard } from "./components/JobCard";
import { RetentionCapControl } from "./components/RetentionCapControl";
import { SourceCard } from "./components/SourceCard";

// Background crawl/DPSA ingestion returns immediately; we keep the branded
// progress popup up and poll the source's lastIngestedAt until the run finishes
// (it advances only on completion), so the admin sees it working.
async function lastIngestedFor(sourceId: number): Promise<string | null> {
  try {
    const sources = await adminApiClient.orbitJobMarketSources();
    const match = sources.find((source) => source.id === sourceId);
    return match ? match.lastIngestedAt : null;
  } catch {
    return null;
  }
}

async function ingestErrorFor(sourceId: number): Promise<string | null> {
  try {
    const sources = await adminApiClient.orbitJobMarketSources();
    const match = sources.find((source) => source.id === sourceId);
    return match ? match.lastIngestionError : null;
  } catch {
    return null;
  }
}

async function waitForBackgroundIngestion(sourceId: number): Promise<boolean> {
  // Capture the baseline from a fresh fetch (the React Query cache can be stale,
  // which would make the poll think the run already finished and flash closed).
  // Returns true once the run reports completion (lastIngestedAt changes), false
  // if it never does within the window — e.g. a disabled source (DPSA without
  // DPSA_INGESTION_ENABLED) returns 0 without touching lastIngestedAt.
  const baseline = await lastIngestedFor(sourceId);
  const poll = async (attempt: number): Promise<boolean> => {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 5000));
    const current = await lastIngestedFor(sourceId);
    if (current && current !== baseline) return true;
    if (attempt >= 60) return false;
    return poll(attempt + 1);
  };
  return poll(0);
}

async function jobCountForSource(sourceId: number): Promise<number> {
  try {
    const stats = await adminApiClient.orbitJobMarketStats();
    const match = stats.sources.find((source) => source.id === sourceId);
    return match ? match.jobCount : 0;
  } catch {
    return 0;
  }
}

export default function AdminOrbitJobMarketPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "sources">("sources");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<Record<number, string>>({});

  const statsQuery = useAdminOrbitJobMarketStats();
  const sourcesQuery = useAdminOrbitJobMarketSources();
  const providersQuery = useAdminOrbitJobMarketProviders();
  const jobsQuery = useAdminOrbitExternalJobs({
    search: appliedSearch || null,
    page: currentPage,
    limit: 20,
  });

  const stats = statsQuery.data;
  const statsSources = stats ? stats.sources : [];
  const jobCountBySource = new Map(statsSources.map((s) => [s.id, s.jobCount]));
  const providersData = providersQuery.data;
  const credentialFieldsByProvider = new Map<string, JobSourceCredentialField[]>(
    (providersData ?? []).map((p) => [p.id, p.credentialFields]),
  );
  const sourcesData = sourcesQuery.data;
  const sources = sourcesData ?? [];
  const jobsData = jobsQuery.data;
  const jobs = jobsData ? jobsData.jobs : [];
  const jobsTotal = jobsData ? jobsData.total : 0;
  const totalPages = Math.ceil(jobsTotal / 20);

  const createSource = useAdminCreateOrbitJobMarketSource();
  const updateSource = useAdminUpdateOrbitJobMarketSource();
  const deleteSource = useAdminDeleteOrbitJobMarketSource();
  const queryClient = useQueryClient();
  const { showExtraction, hideExtraction, updateExtraction } = useExtractionProgress();
  const { runBulk } = useAdaptiveExtractionProgress();
  const [vetSummary, setVetSummary] = useState<string | null>(null);
  const [isVettingPending, setIsVettingPending] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillSummary, setBackfillSummary] = useState<string | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeSummary, setCategorizeSummary] = useState<string | null>(null);

  const handleBackfillEmbeddings = async () => {
    setIsBackfilling(true);
    setBackfillSummary(null);
    showExtraction({
      brand: "annix-orbit",
      label: "Starting embedding backfill…",
      estimatedDurationMs: 8000,
    });
    try {
      const triggered = await adminApiClient.backfillOrbitEmbeddings();
      const stats = await metricsApi
        .extractionStats("orbit-embedding-backfill", "all")
        .catch(() => null);
      const learnedMs = stats ? stats.averageMs : null;
      updateExtraction({
        label: triggered.alreadyRunning
          ? "Embedding backfill already running — tracking progress…"
          : "Embedding CVs & jobs so Nix can match…",
        estimatedDurationMs: learnedMs || 240_000,
      });

      const poll = async (attempt: number): Promise<void> => {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 4000));
        const coverage = await adminApiClient.orbitEmbeddingCoverage().catch(() => null);
        if (coverage) {
          const embedded = coverage.jobsEmbedded + coverage.candidatesEmbedded;
          const total = coverage.jobsTotal + coverage.candidatesTotal;
          updateExtraction({
            label: `Embedding CVs & jobs so Nix can match — ${embedded} / ${total} done…`,
          });
          if (!coverage.running) return;
        }
        if (attempt >= 225) return;
        return poll(attempt + 1);
      };
      await poll(0);

      hideExtraction();
      const finalCoverage = await adminApiClient.orbitEmbeddingCoverage().catch(() => null);
      if (finalCoverage) {
        const lastError = finalCoverage.lastError;
        const base = `Embedded ${finalCoverage.jobsEmbedded}/${finalCoverage.jobsTotal} jobs and ${finalCoverage.candidatesEmbedded}/${finalCoverage.candidatesTotal} CVs.`;
        setBackfillSummary(lastError ? `${base} Last error: ${lastError}` : base);
      } else {
        setBackfillSummary("Embedding backfill finished.");
      }
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    } catch (error) {
      hideExtraction();
      setBackfillSummary(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfillCategories = async () => {
    setIsCategorizing(true);
    setCategorizeSummary(null);
    showExtraction({
      brand: "annix-orbit",
      label: "Starting category backfill…",
      estimatedDurationMs: 8000,
      backgroundSafe: true,
    });
    try {
      const triggered = await adminApiClient.backfillOrbitCategories();
      const stats = await metricsApi
        .extractionStats("orbit-category-backfill", "all")
        .catch(() => null);
      const learnedMs = stats ? stats.averageMs : null;
      updateExtraction({
        label: triggered.alreadyRunning
          ? "Category backfill already running — tracking progress…"
          : "Classifying jobs into categories…",
        estimatedDurationMs: learnedMs || 180_000,
      });

      const poll = async (attempt: number): Promise<void> => {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 4000));
        const coverage = await adminApiClient.orbitCategoryCoverage().catch(() => null);
        if (coverage) {
          updateExtraction({
            label: `Classifying jobs into categories — ${coverage.classified} / ${coverage.total} done…`,
          });
          if (!coverage.running) return;
        }
        if (attempt >= 225) return;
        return poll(attempt + 1);
      };
      await poll(0);

      hideExtraction();
      const finalCoverage = await adminApiClient.orbitCategoryCoverage().catch(() => null);
      if (finalCoverage) {
        const lastError = finalCoverage.lastError;
        const base = `Categorized ${finalCoverage.classified}/${finalCoverage.total} jobs.`;
        setCategorizeSummary(lastError ? `${base} Last error: ${lastError}` : base);
      } else {
        setCategorizeSummary("Category backfill finished.");
      }
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    } catch (error) {
      hideExtraction();
      setCategorizeSummary(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleVetPending = async () => {
    setIsVettingPending(true);
    setVetSummary("Loading pending jobs…");
    try {
      const pending = jobs.filter((j) => j.vettedAt == null);
      if (pending.length === 0) {
        setVetSummary("No pending jobs to vet.");
        setIsVettingPending(false);
        return;
      }
      const result = await runBulk({
        brand: "annix-orbit",
        metricCategory: "orbit-job-vetting",
        metricOperation: "single-job",
        items: pending,
        itemId: (job) => job.id,
        itemLabel: (job, i, t) => `Vetting ${i + 1} of ${t}: ${job.title}`,
        fallbackPerItemMs: 1500,
        run: async (job) => {
          await adminApiClient.vetOrbitJob(job.id);
        },
      });
      setVetSummary(`Vetted ${result.succeeded.length}, ${result.failed.length} failed.`);
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    } catch (error) {
      setVetSummary(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsVettingPending(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInput);
  };

  const handleTriggerIngestion = async (sourceId: number) => {
    const sourceMatch = sources.find((s) => s.id === sourceId);
    const sourceName = sourceMatch ? sourceMatch.name : "source";
    const requiresVetting = sourceMatch ? sourceMatch.requiresVetting : true;
    setIngestionStatus((prev) => ({ ...prev, [sourceId]: "running" }));

    showExtraction({
      brand: "annix-orbit",
      label: `Fetching jobs from ${sourceName}…`,
      estimatedDurationMs: 8000,
      backgroundSafe: true,
    });

    try {
      const baselineCount = await jobCountForSource(sourceId);
      const fetched = await adminApiClient.fetchOrbitSource(sourceId);

      if (fetched.started) {
        const provider = sourceMatch ? sourceMatch.provider : "";
        const stats = await metricsApi
          .extractionStats("orbit-source-ingest", provider)
          .catch(() => null);
        const learnedMs = stats ? stats.averageMs : null;
        updateExtraction({
          label: `Crawling ${sourceName} in the background…`,
          estimatedDurationMs: learnedMs || 120_000,
        });
        const completed = await waitForBackgroundIngestion(sourceId);
        hideExtraction();
        queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
        const afterCount = await jobCountForSource(sourceId);
        const delta = afterCount - baselineCount;

        if (completed) {
          const ingestError = await ingestErrorFor(sourceId);
          if (ingestError) {
            setIngestionStatus((prev) => ({
              ...prev,
              [sourceId]: "Error: last run failed — see the details above.",
            }));
            return;
          }
          const message =
            delta > 0
              ? `Done — ${delta} new job${delta === 1 ? "" : "s"} ingested. Re-run to fetch more.`
              : "Done — no new jobs found (all current postings already ingested).";
          setIngestionStatus((prev) => ({ ...prev, [sourceId]: message }));
          return;
        }

        // The poll window elapsed before the source marked itself complete. The
        // run keeps going server-side (it survives this page), so report what has
        // already landed rather than claiming nothing happened. A climbing job
        // count means it is actively ingesting; a flat count for a gate-able
        // source (DPSA) hints it may be disabled.
        const stillRunningMessage =
          delta > 0
            ? `${delta} new job${delta === 1 ? "" : "s"} ingested so far — still fetching in the background. Refresh in a few minutes for the final count.`
            : provider === "dpsa"
              ? "No new jobs yet — DPSA ingestion may be disabled (needs DPSA_INGESTION_ENABLED) or found nothing new."
              : "Still fetching in the background — large sources can take several minutes. Refresh shortly to see the new jobs.";
        setIngestionStatus((prev) => ({ ...prev, [sourceId]: stillRunningMessage }));
        return;
      }

      hideExtraction();

      if (fetched.savedIds.length === 0 || !requiresVetting) {
        const suffix = requiresVetting ? "" : " (no vetting needed)";
        setIngestionStatus((prev) => ({
          ...prev,
          [sourceId]: `Done: ${fetched.ingested} new, ${fetched.skipped} existing${suffix}`,
        }));
        queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
        return;
      }

      const result = await runBulk({
        brand: "annix-orbit",
        metricCategory: "orbit-job-vetting",
        metricOperation: "single-job",
        items: fetched.savedIds,
        itemId: (id) => id,
        itemLabel: (_id, i, t) => `Vetting ${i + 1} of ${t} new jobs…`,
        fallbackPerItemMs: 1500,
        run: async (id) => {
          await adminApiClient.vetOrbitJob(id);
        },
      });

      setIngestionStatus((prev) => ({
        ...prev,
        [sourceId]: `Done: ${fetched.ingested} new, ${fetched.skipped} existing — vetted ${result.succeeded.length}, ${result.failed.length} failed`,
      }));
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    } catch (error) {
      hideExtraction();
      setIngestionStatus((prev) => ({
        ...prev,
        [sourceId]: `Error: ${error instanceof Error ? error.message : "Failed"}`,
      }));
    }
  };

  const handleToggleSource = (source: { id: number; enabled: boolean }) => {
    updateSource.mutate({ id: source.id, data: { enabled: !source.enabled } });
  };

  const handleDeleteSource = (sourceId: number) => {
    deleteSource.mutate(sourceId);
  };

  const handleAddSource = (dto: CreateJobMarketSourceDto) => {
    createSource.mutate(dto, {
      onSuccess: () => setShowAddSource(false),
    });
  };

  if (sourcesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/portal/orbit"
            className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
          >
            ← Orbit admin hub
          </Link>
          <h1 className="text-2xl font-bold text-orange-500">Annix Orbit — Job Market</h1>
          <p className="text-orange-400 mt-1">
            Manage platform-global job-board feeds that populate Browse Jobs for every seeker.
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total jobs ingested</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalJobs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">New this week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.jobsLast7Days}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Active sources</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.sources.filter((s) => s.enabled).length} / {stats.sources.length}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "sources"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-orange-300 hover:text-orange-400 hover:border-orange-300"
            }`}
          >
            Data Sources ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "jobs"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-orange-300 hover:text-orange-400 hover:border-orange-300"
            }`}
          >
            Ingested Jobs ({jobsTotal})
          </button>
        </nav>
        {activeTab === "sources" && (
          <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
            <button
              type="button"
              onClick={handleBackfillCategories}
              disabled={isCategorizing}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              title="Classify any jobs missing a category (rule-based, then AI for the rest) so the seeker category filter is complete"
            >
              {isCategorizing ? "Categorizing…" : "Backfill Categories"}
            </button>
            <button
              type="button"
              onClick={handleBackfillEmbeddings}
              disabled={isBackfilling}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              title="Embed any CVs and jobs that are missing an embedding so Nix can match them"
            >
              {isBackfilling ? "Backfilling…" : "Backfill Embeddings"}
            </button>
            <button
              type="button"
              onClick={() => setShowDuplicates(true)}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Find Duplicates
            </button>
            <button
              type="button"
              onClick={() => setShowAddSource(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Add Source
            </button>
          </div>
        )}
      </div>

      {activeTab === "sources" && (
        <div className="space-y-4">
          {(backfillSummary || categorizeSummary) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {backfillSummary && <span>{backfillSummary}</span>}
              {categorizeSummary && <span>{categorizeSummary}</span>}
            </div>
          )}

          {showAddSource && (
            <AddSourceForm
              providers={providersQuery.data}
              isLoading={providersQuery.isLoading}
              isError={providersQuery.isError}
              onSubmit={handleAddSource}
              onCancel={() => setShowAddSource(false)}
            />
          )}

          <EnabledCountriesControl />

          <RetentionCapControl />

          <IngestionScheduleControl />

          {sources.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                No data sources configured yet. Click &quot;Add Source&quot; to connect to a job
                board API.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  ingestionStatus={ingestionStatus[source.id]}
                  jobCount={jobCountBySource.get(source.id)}
                  credentialFields={credentialFieldsByProvider.get(source.provider)}
                  saving={updateSource.isPending}
                  onTrigger={() => handleTriggerIngestion(source.id)}
                  onToggle={() => handleToggleSource(source)}
                  onDelete={() => handleDeleteSource(source.id)}
                  onSave={(data) => updateSource.mutate({ id: source.id, data })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="flex flex-1 min-w-[300px] gap-3">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search jobs by title or company..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </form>
            <div className="flex items-center gap-3">
              {vetSummary && <span className="text-sm text-gray-600">{vetSummary}</span>}
              <button
                type="button"
                onClick={handleVetPending}
                disabled={isVettingPending}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {isVettingPending ? "Vetting…" : "Vet pending jobs"}
              </button>
            </div>
          </div>

          {jobsQuery.isLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              Loading ingested jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {sources.length === 0
                  ? "No data sources configured. Add a source in the Data Sources tab to start ingesting jobs."
                  : "No jobs found. Try adjusting your search or trigger an ingestion from the Data Sources tab."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <FindDuplicatesModal isOpen={showDuplicates} onClose={() => setShowDuplicates(false)} />
    </div>
  );
}
