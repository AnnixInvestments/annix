"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { adminApiClient } from "@/app/lib/api/adminApi";
import type { CreateJobMarketSourceDto } from "@/app/lib/api/annixOrbitApi";
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
import { JobCard } from "./components/JobCard";
import { SourceCard } from "./components/SourceCard";

export default function AdminOrbitJobMarketPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "sources">("sources");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddSource, setShowAddSource] = useState(false);
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
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { runBulk } = useAdaptiveExtractionProgress();
  const [vetSummary, setVetSummary] = useState<string | null>(null);
  const [isVettingPending, setIsVettingPending] = useState(false);

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
    });

    try {
      const fetched = await adminApiClient.fetchOrbitSource(sourceId);
      hideExtraction();

      if (fetched.started) {
        setIngestionStatus((prev) => ({
          ...prev,
          [sourceId]: "Ingestion started in the background — refresh in ~90s to see results",
        }));
        return;
      }

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
          <h1 className="text-2xl font-bold text-gray-900">Annix Orbit — Job Market</h1>
          <p className="text-gray-600 mt-1">
            Manage platform-global job-board feeds that populate Browse Jobs for every seeker.
          </p>
        </div>
        <Link
          href="/admin/portal/branding/annix-orbit"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 whitespace-nowrap"
        >
          Branding
        </Link>
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

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "sources"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Data Sources ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "jobs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Ingested Jobs ({jobsTotal})
          </button>
        </nav>
      </div>

      {activeTab === "sources" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddSource(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Add Source
            </button>
          </div>

          {showAddSource && (
            <AddSourceForm
              providers={providersQuery.data}
              isLoading={providersQuery.isLoading}
              isError={providersQuery.isError}
              onSubmit={handleAddSource}
              onCancel={() => setShowAddSource(false)}
            />
          )}

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
                  onTrigger={() => handleTriggerIngestion(source.id)}
                  onToggle={() => handleToggleSource(source)}
                  onDelete={() => handleDeleteSource(source.id)}
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
    </div>
  );
}
