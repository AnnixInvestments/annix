"use client";

import { useState } from "react";
import type { CreateJobMarketSourceDto } from "@/app/lib/api/cvAssistantApi";
import {
  useCvCreateJobMarketSource,
  useCvDeleteJobMarketSource,
  useCvExternalJobs,
  useCvJobMarketSources,
  useCvJobMarketStats,
  useCvTriggerIngestion,
  useCvUpdateJobMarketSource,
} from "@/app/lib/query/hooks";
import { AddSourceForm } from "../components/AddSourceForm";
import { JobCard } from "../components/JobCard";
import { SourceCard } from "../components/SourceCard";

export default function JobMarketPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "sources">("jobs");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddSource, setShowAddSource] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<Record<number, string>>({});

  const { data: stats } = useCvJobMarketStats();
  const { data: sources = [] } = useCvJobMarketSources();
  const { data: jobsData, isLoading } = useCvExternalJobs({
    search: appliedSearch || null,
    page: currentPage,
    limit: 20,
  });

  const jobs = jobsData?.jobs || [];
  const jobsTotal = jobsData?.total || 0;
  const totalPages = Math.ceil(jobsTotal / 20);

  const triggerIngestion = useCvTriggerIngestion();
  const updateSource = useCvUpdateJobMarketSource();
  const deleteSource = useCvDeleteJobMarketSource();
  const createSource = useCvCreateJobMarketSource();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInput);
  };

  const handleTriggerIngestion = (sourceId: number) => {
    setIngestionStatus((prev) => ({ ...prev, [sourceId]: "running" }));
    triggerIngestion.mutate(sourceId, {
      onSuccess: (result) => {
        setIngestionStatus((prev) => ({
          ...prev,
          [sourceId]: `Done: ${result.ingested} new, ${result.skipped} existing`,
        }));
      },
      onError: (error) => {
        setIngestionStatus((prev) => ({
          ...prev,
          [sourceId]: `Error: ${error instanceof Error ? error.message : "Failed"}`,
        }));
      },
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Market</h1>
          <p className="text-gray-600 mt-1">Browse external job listings and manage data sources</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Jobs Ingested</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalJobs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">New This Week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.jobsLast7Days}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Active Sources</p>
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
            onClick={() => setActiveTab("jobs")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "jobs"
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Job Listings ({jobsTotal})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "sources"
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Data Sources ({sources.length})
          </button>
        </nav>
      </div>

      {activeTab === "jobs" && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search jobs by title or company..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Search
            </button>
          </form>

          {jobs.length === 0 ? (
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

      {activeTab === "sources" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddSource(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
            >
              Add Source
            </button>
          </div>

          {showAddSource && (
            <AddSourceForm onSubmit={handleAddSource} onCancel={() => setShowAddSource(false)} />
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
    </div>
  );
}
