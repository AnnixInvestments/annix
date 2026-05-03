"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cvAssistantApiClient, type PublicJob } from "@/app/lib/api/cvAssistantApi";
import { formatRelative } from "@/app/lib/datetime";

const PAGE_SIZE = 20;

export default function CvAssistantPublicJobsPage() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    cvAssistantApiClient
      .publicJobs({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        country: country || undefined,
      })
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load jobs");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, country]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <Link href="/cv-assistant" className="text-sm text-[#c0c0eb] hover:text-white">
              ← CV Assistant home
            </Link>
            <Link href="/cv-assistant/login" className="text-sm text-[#c0c0eb] hover:text-white">
              Sign in
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Browse jobs</h1>
          <p className="text-[#c0c0eb] mt-2">
            Public preview — sign up as an individual to get matched and apply.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or company"
              className="px-4 py-3 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#9999d6] focus:outline-none"
            />
            <select
              value={country}
              onChange={(e) => {
                setPage(1);
                setCountry(e.target.value);
              }}
              className="px-4 py-3 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#9999d6] focus:outline-none"
            >
              <option value="">All countries</option>
              <option value="za">South Africa</option>
              <option value="gb">United Kingdom</option>
              <option value="us">United States</option>
              <option value="au">Australia</option>
            </select>
            <button
              type="submit"
              className="bg-white text-[#252560] px-5 py-3 rounded-lg font-medium hover:bg-[#f0f0fc] transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {isLoading
              ? "Loading jobs..."
              : total === 0
                ? "No jobs found"
                : `${total} job${total === 1 ? "" : "s"}`}
          </p>
          <Link
            href="/cv-assistant/register/individual"
            className="text-sm font-medium text-[#323288] hover:text-[#252560]"
          >
            Sign up to apply →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <PublicJobCard job={job} />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function PublicJobCard(props: { job: PublicJob }) {
  const { job } = props;
  const locationArea = job.locationArea;
  const locationRaw = job.locationRaw;
  const fallbackCountry = job.country.toUpperCase();
  const location = locationArea || locationRaw || fallbackCountry;
  const salary = formatSalary(job);
  const posted = formatRelative(job.postedAt);
  const isAnnixJob = job.kind === "annix";
  const referenceNumber = job.referenceNumber;
  const applyHref =
    isAnnixJob && referenceNumber
      ? `/cv-assistant/jobs/${referenceNumber}`
      : "/cv-assistant/register/individual";
  const applyLabel = isAnnixJob && referenceNumber ? "View & apply" : "Sign up to apply";

  return (
    <article className="bg-white rounded-xl border border-[#e0e0f5] p-5 hover:border-[#9999d6] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">{job.title}</h2>
            {isAnnixJob ? (
              <span className="text-[10px] uppercase tracking-wider bg-[#FFA500]/15 text-[#9c5800] px-2 py-0.5 rounded-full font-semibold">
                Posted on Annix
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-600">
            {job.company && <span>{job.company}</span>}
            <span>•</span>
            <span>{location}</span>
            {salary && (
              <>
                <span>•</span>
                <span className="text-gray-900 font-medium">{salary}</span>
              </>
            )}
            {posted && (
              <>
                <span>•</span>
                <span>{posted}</span>
              </>
            )}
          </div>
          {job.extractedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.extractedSkills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="text-xs bg-[#f0f0fc] text-[#252560] px-2 py-1 rounded-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href={applyHref}
          className="bg-[#323288] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#252560] transition-colors whitespace-nowrap"
        >
          {applyLabel}
        </Link>
      </div>
    </article>
  );
}

function formatSalary(job: PublicJob): string | null {
  const min = job.salaryMin;
  const max = job.salaryMax;
  const currencyRaw = job.salaryCurrency;
  const currency = currencyRaw || "";
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    return `${currency} ${formatNumber(min)} – ${formatNumber(max)}`.trim();
  }
  if (min != null) {
    return `${currency} from ${formatNumber(min)}`.trim();
  }
  const safeMax = max ?? 0;
  return `${currency} up to ${formatNumber(safeMax)}`.trim();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(value);
}
