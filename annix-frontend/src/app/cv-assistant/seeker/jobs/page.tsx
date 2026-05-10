"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { SeekerRecommendedJob } from "@/app/lib/api/cvAssistantApi";
import { SeekerJobCard } from "@/app/lib/cv-assistant/components/SeekerJobCard";
import { useCvDismissSeekerMatch, useCvSeekerRecommendedJobs } from "@/app/lib/query/hooks";

export default function SeekerJobsPage() {
  const { showToast } = useToast();
  const recommendedQuery = useCvSeekerRecommendedJobs();
  const dismissMutation = useCvDismissSeekerMatch();
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const data = recommendedQuery.data;
  const matches = useMemo(() => (data ? data.matches : []), [data]);
  const hasCandidate = data ? data.hasCandidate : false;

  const providers = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.job.sourceProvider) set.add(m.job.sourceProvider);
    });
    return [...set].sort();
  }, [matches]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return matches.filter((m) => {
      if (providerFilter !== "all" && m.job.sourceProvider !== providerFilter) {
        return false;
      }
      if (term.length === 0) return true;
      const rawCompany = m.job.company;
      const rawLocation = m.job.locationRaw;
      const company = rawCompany || "";
      const locationRaw = rawLocation || "";
      const titleMatch = m.job.title.toLowerCase().includes(term);
      const companyMatch = company.toLowerCase().includes(term);
      const locationMatch = locationRaw.toLowerCase().includes(term);
      return titleMatch || companyMatch || locationMatch;
    });
  }, [matches, providerFilter, searchTerm]);

  const handleApply = (match: SeekerRecommendedJob) => {
    if (match.job.sourceUrl) {
      window.open(match.job.sourceUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast("No apply link available for this job", "error");
    }
  };

  const handleDismiss = (matchId: number) => {
    dismissMutation.mutate(matchId, {
      onSuccess: () => {
        showToast("Match dismissed", "success");
      },
      onError: () => {
        showToast("Failed to dismiss match", "error");
      },
    });
  };

  if (recommendedQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading your matches…
        </div>
      </div>
    );
  }

  if (recommendedQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your matches right now. Try refreshing the page.
        </div>
      </div>
    );
  }

  if (!hasCandidate) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Upload your CV first</h2>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            We need your CV before we can match you to jobs. Head to your profile to upload it.
          </p>
          <Link
            href="/cv-assistant/seeker/profile"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Go to my CV
          </Link>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No matches yet</h2>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            We're still matching jobs to your profile. New matches usually appear within an hour of
            uploading your CV. Make sure your skills are up to date in your CV for better matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title, company, or location"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {providers.length > 1 ? (
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All sources</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No matches fit those filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((match) => (
            <SeekerJobCard
              key={match.matchId}
              match={match}
              onApply={handleApply}
              onDismiss={handleDismiss}
              isDismissing={
                dismissMutation.isPending && dismissMutation.variables === match.matchId
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Browse Jobs</h1>
      <p className="text-white/70 mt-2">Opportunities ranked against your CV.</p>
    </div>
  );
}
