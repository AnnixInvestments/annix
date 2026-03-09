"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type CreateJobMarketSourceDto,
  type ExternalJob,
  type JobMarketSource,
  type JobMarketStats,
  cvAssistantApiClient,
} from "@/app/lib/api/cvAssistantApi";

export default function JobMarketPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "sources">("jobs");
  const [stats, setStats] = useState<JobMarketStats | null>(null);
  const [sources, setSources] = useState<JobMarketSource[]>([]);
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddSource, setShowAddSource] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<Record<number, string>>({});

  const fetchData = useCallback(async () => {
    try {
      const [statsData, sourcesData, jobsData] = await Promise.all([
        cvAssistantApiClient.jobMarketStats(),
        cvAssistantApiClient.jobMarketSources(),
        cvAssistantApiClient.externalJobs({
          search: searchTerm || undefined,
          page: currentPage,
          limit: 20,
        }),
      ]);
      setStats(statsData);
      setSources(sourcesData);
      setJobs(jobsData.jobs);
      setJobsTotal(jobsData.total);
    } catch (error) {
      console.error("Failed to fetch job market data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const handleTriggerIngestion = async (sourceId: number) => {
    setIngestionStatus((prev) => ({ ...prev, [sourceId]: "running" }));
    try {
      const result = await cvAssistantApiClient.triggerIngestion(sourceId);
      setIngestionStatus((prev) => ({
        ...prev,
        [sourceId]: `Done: ${result.ingested} new, ${result.skipped} existing`,
      }));
      fetchData();
    } catch (error) {
      setIngestionStatus((prev) => ({
        ...prev,
        [sourceId]: `Error: ${error instanceof Error ? error.message : "Failed"}`,
      }));
    }
  };

  const handleToggleSource = async (source: JobMarketSource) => {
    try {
      await cvAssistantApiClient.updateJobMarketSource(source.id, {
        enabled: !source.enabled,
      });
      fetchData();
    } catch (error) {
      console.error("Failed to toggle source:", error);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    try {
      await cvAssistantApiClient.deleteJobMarketSource(sourceId);
      fetchData();
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  const handleAddSource = async (dto: CreateJobMarketSourceDto) => {
    try {
      await cvAssistantApiClient.createJobMarketSource(dto);
      setShowAddSource(false);
      fetchData();
    } catch (error) {
      console.error("Failed to create source:", error);
    }
  };

  const totalPages = Math.ceil(jobsTotal / 20);

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
          <p className="text-gray-600 mt-1">
            Browse external job listings and manage data sources
          </p>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <AddSourceForm
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
    </div>
  );
}

function JobCard({ job }: { job: ExternalJob }) {
  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const curr = currency ?? "ZAR";
    if (min && max) return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `From ${curr} ${min.toLocaleString()}`;
    return `Up to ${curr} ${max?.toLocaleString()}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedDate = job.postedAt
    ? new Date(job.postedAt).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {job.company && <span>{job.company}</span>}
            {job.locationRaw && (
              <>
                <span className="text-gray-300">|</span>
                <span>{job.locationRaw}</span>
              </>
            )}
            {postedDate && (
              <>
                <span className="text-gray-300">|</span>
                <span>{postedDate}</span>
              </>
            )}
          </div>
          {salary && (
            <p className="mt-1 text-sm font-medium text-green-700">{salary}</p>
          )}
          {job.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
          )}
          {job.category && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-violet-50 text-violet-700 rounded-full">
              {job.category}
            </span>
          )}
        </div>
        {job.sourceUrl && (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 flex-shrink-0 px-3 py-1.5 text-sm text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
          >
            View
          </a>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  source,
  ingestionStatus,
  onTrigger,
  onToggle,
  onDelete,
}: {
  source: JobMarketSource;
  ingestionStatus?: string;
  onTrigger: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const lastIngested = source.lastIngestedAt
    ? new Date(source.lastIngestedAt).toLocaleString("en-ZA")
    : "Never";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{source.name}</h3>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full uppercase">
              {source.provider}
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                source.enabled
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {source.enabled ? "Active" : "Disabled"}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-500 space-y-1">
            <p>Countries: {source.countryCodes.join(", ").toUpperCase()}</p>
            <p>
              API requests: {source.requestsToday} / {source.rateLimitPerDay} today
            </p>
            <p>Ingestion interval: every {source.ingestionIntervalHours}h</p>
            <p>Last ingested: {lastIngested}</p>
          </div>
          {ingestionStatus && (
            <p
              className={`mt-2 text-sm ${
                ingestionStatus === "running"
                  ? "text-violet-600"
                  : ingestionStatus.startsWith("Error")
                    ? "text-red-600"
                    : "text-green-600"
              }`}
            >
              {ingestionStatus === "running" ? "Ingesting..." : ingestionStatus}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTrigger}
            disabled={ingestionStatus === "running"}
            className="px-3 py-1.5 text-sm text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 disabled:opacity-50 transition-colors"
          >
            Ingest Now
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              source.enabled
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-green-600 border-green-200 hover:bg-green-50"
            }`}
          >
            {source.enabled ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSourceForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (dto: CreateJobMarketSourceDto) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Adzuna SA");
  const [apiId, setApiId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [countryCodes, setCountryCodes] = useState("za");
  const [intervalHours, setIntervalHours] = useState("6");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      provider: "adzuna",
      name,
      apiId: apiId || undefined,
      apiKey: apiKey || undefined,
      countryCodes: countryCodes
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
      ingestionIntervalHours: Number.parseInt(intervalHours, 10) || 6,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-gray-900">Add Job Source</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <input
            type="text"
            value="Adzuna"
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adzuna App ID</label>
          <input
            type="text"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            placeholder="Your Adzuna app_id"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adzuna App Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your Adzuna app_key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country Codes (comma-separated)
          </label>
          <input
            type="text"
            value={countryCodes}
            onChange={(e) => setCountryCodes(e.target.value)}
            placeholder="za, gb, us"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingestion Interval (hours)
          </label>
          <input
            type="number"
            value={intervalHours}
            onChange={(e) => setIntervalHours(e.target.value)}
            min="1"
            max="24"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Add Source
        </button>
      </div>
    </form>
  );
}
