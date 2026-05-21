"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  annixOrbitApiClient,
  type PublicJob,
  type SeekerRecommendedJob,
} from "@/app/lib/api/annixOrbitApi";
import { SeekerBrowseJobCard } from "@/app/lib/annix-orbit/components/SeekerBrowseJobCard";
import { SeekerJobCard } from "@/app/lib/annix-orbit/components/SeekerJobCard";
import {
  type SeekerFilterState,
  SeekerJobFilters,
} from "@/app/lib/annix-orbit/components/SeekerJobFilters";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitDismissSeekerMatch,
  useOrbitGrantSeekerMatchingConsent,
  useOrbitMuteSeekerCategory,
  useOrbitMuteSeekerCompany,
  useOrbitMyProfileStatus,
  useOrbitSeekerBrowseJobs,
  useOrbitSeekerColdStartJobs,
  useOrbitSeekerMatchingConsent,
  useOrbitSeekerRecommendedJobs,
  useOrbitSeekerRematch,
} from "@/app/lib/query/hooks";

export default function SeekerJobsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const profileStatusQuery = useOrbitMyProfileStatus();
  const profileStatus = profileStatusQuery.data;
  const hasCv = profileStatus ? profileStatus.hasCv : null;
  const profileReady = profileStatus != null;

  const consentQuery = useOrbitSeekerMatchingConsent(hasCv === true);
  const grantConsentMutation = useOrbitGrantSeekerMatchingConsent();
  const consentData = consentQuery.data;
  const consentReady = consentData != null;
  const consentHasCandidate = consentData ? consentData.hasCandidate : false;
  const consentGranted = consentData ? consentData.consented : false;
  const consentEnabled = consentReady && consentHasCandidate && consentGranted;

  const recommendedRefetchInterval: number | false = consentEnabled ? 120_000 : false;
  const recommendedQuery = useOrbitSeekerRecommendedJobs(consentEnabled, {
    // eslint-disable-next-line no-restricted-syntax -- 120s is the project floor; cold-start needs to detect embedding completion
    refetchInterval: recommendedRefetchInterval,
  });
  const recommendedHasMatches = recommendedQuery.data
    ? recommendedQuery.data.matches.length > 0
    : false;
  const recommendedReady = recommendedQuery.data != null;
  const coldStartEnabled = consentEnabled && recommendedReady && !recommendedHasMatches;
  const coldStartQuery = useOrbitSeekerColdStartJobs(coldStartEnabled);
  const dismissMutation = useOrbitDismissSeekerMatch();
  const rematchMutation = useOrbitSeekerRematch();
  const muteCompanyMutation = useOrbitMuteSeekerCompany();
  const muteCategoryMutation = useOrbitMuteSeekerCategory();
  const [filters, setFilters] = useState<SeekerFilterState>({
    search: "",
    provider: "all",
    province: "",
    city: "",
    category: "",
    minSalary: "",
  });
  const [consentDeclined, setConsentDeclined] = useState<boolean>(false);
  const consentPromptShown = useRef(false);

  const browseJobsEnabled = profileReady;
  const browseJobsQuery = useOrbitSeekerBrowseJobs({ limit: 100 }, browseJobsEnabled);
  const browseJobsData = browseJobsQuery.data;
  const browseJobs = useMemo(() => (browseJobsData ? browseJobsData.jobs : []), [browseJobsData]);

  const data = recommendedQuery.data;
  const coldStartData = coldStartQuery.data;
  const coldStartJobsCount = coldStartData ? coldStartData.jobs.length : 0;
  const showColdStart = recommendedReady && !recommendedHasMatches && coldStartJobsCount > 0;
  const matches = useMemo(() => {
    if (showColdStart && coldStartData) return coldStartData.jobs;
    return data ? data.matches : [];
  }, [data, coldStartData, showColdStart]);
  const embeddingPending = coldStartData ? coldStartData.embeddingPending : false;

  const providers = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.job.sourceProvider) set.add(m.job.sourceProvider);
    });
    return [...set].sort();
  }, [matches]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.job.category) set.add(m.job.category);
    });
    return [...set].sort();
  }, [matches]);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const provinceLower = filters.province.toLowerCase();
    const cityLower = filters.city.toLowerCase();
    const minSalaryNumber = filters.minSalary ? Number.parseFloat(filters.minSalary) : Number.NaN;
    const minSalary = Number.isFinite(minSalaryNumber) ? minSalaryNumber : null;

    return matches.filter((m) => {
      if (filters.provider !== "all" && m.job.sourceProvider !== filters.provider) {
        return false;
      }
      if (filters.category && m.job.category !== filters.category) {
        return false;
      }
      const rawCompany = m.job.company;
      const rawLocationArea = m.job.locationArea;
      const rawLocationRaw = m.job.locationRaw;
      const rawDescription = m.job.description;
      const locationArea = rawLocationArea || "";
      const locationRaw = rawLocationRaw || "";
      const description = rawDescription || "";
      const haystack = `${locationArea} ${locationRaw} ${description}`.toLowerCase();

      if (provinceLower && !haystack.includes(provinceLower)) {
        return false;
      }
      if (cityLower && !haystack.includes(cityLower)) {
        return false;
      }

      if (minSalary !== null) {
        const max = m.job.salaryMax;
        const min = m.job.salaryMin;
        const best = max != null ? max : min != null ? min : null;
        if (best != null && best < minSalary) {
          return false;
        }
      }

      if (term.length === 0) return true;
      const company = rawCompany || "";
      const titleMatch = m.job.title.toLowerCase().includes(term);
      const companyMatch = company.toLowerCase().includes(term);
      const locationMatch = haystack.includes(term);
      return titleMatch || companyMatch || locationMatch;
    });
  }, [matches, filters]);

  const handleApply = (match: SeekerRecommendedJob) => {
    const sourceUrl = match.job.sourceUrl;
    if (sourceUrl) {
      annixOrbitApiClient
        .recordSeekerApplyClick({
          matchId: match.matchId,
          externalJobId: match.externalJobId,
          sourceUrl,
        })
        .catch(() => {});
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast("No apply link available for this job", "error");
    }
  };

  const handleBrowseApply = (job: PublicJob) => {
    const sourceUrl = job.sourceUrl;
    if (!sourceUrl) {
      showToast("No apply link available for this job", "error");
      return;
    }
    const externalJobId = job.kind === "external" ? job.id : null;
    annixOrbitApiClient
      .recordSeekerApplyClick({
        matchId: null,
        externalJobId,
        sourceUrl,
      })
      .catch(() => {});
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

  const handleMuteCompany = (company: string) => {
    muteCompanyMutation.mutate(company, {
      onSuccess: (res) => {
        showToast(res.created ? `Muted "${company}"` : `"${company}" was already muted`, "success");
      },
      onError: () => {
        showToast("Failed to mute company", "error");
      },
    });
  };

  const handleMuteCategory = (category: string) => {
    muteCategoryMutation.mutate(category, {
      onSuccess: (res) => {
        showToast(
          res.created ? `Hid "${category}" roles` : `"${category}" roles were already hidden`,
          "success",
        );
      },
      onError: () => {
        showToast("Failed to hide category", "error");
      },
    });
  };

  const promptForConsent = useMemo(
    () => async () => {
      const accepted = await confirm({
        title: "Use my CV to match me to jobs?",
        message:
          "To recommend jobs, we'll convert your CV into a numerical 'embedding' and store match scores against external job listings on our servers. We will not share your CV with the source until you click Apply. You can withdraw any time from Settings → Privacy.",
        confirmLabel: "Yes, match me",
        cancelLabel: "Not now",
        variant: "info",
      });
      if (accepted) {
        try {
          await grantConsentMutation.mutateAsync();
          setConsentDeclined(false);
          showToast("Consent recorded — we'll start matching jobs to your CV", "success");
          consentQuery.refetch();
        } catch {
          showToast("Could not record consent right now — try again", "error");
        }
      } else {
        setConsentDeclined(true);
      }
    },
    [confirm, grantConsentMutation, showToast, consentQuery],
  );

  useEffect(() => {
    if (!consentReady) return;
    if (!consentHasCandidate) return;
    if (consentGranted) return;
    if (consentDeclined) return;
    if (consentPromptShown.current) return;
    consentPromptShown.current = true;
    void promptForConsent();
  }, [consentReady, consentHasCandidate, consentGranted, consentDeclined, promptForConsent]);

  const handleRematch = () => {
    rematchMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.triggered) {
          showToast("Rematch started — refresh in a minute or two", "success");
        } else if (result.reason === "rate-limited") {
          showToast(`Rematch on cooldown — try again in ${result.retryAfterSeconds}s`, "info");
        } else {
          showToast("Upload a CV first to rematch", "error");
        }
      },
      onError: () => {
        showToast("Couldn't trigger rematch right now", "error");
      },
    });
  };

  const profileLoading = profileStatusQuery.isLoading;
  const profileError = profileStatusQuery.isError;
  const consentLoading = consentQuery.isLoading;
  const consentError = consentQuery.isError;
  const matchesLoading = recommendedQuery.isLoading;
  const matchesError = recommendedQuery.isError;

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="Loading…" />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading jobs…
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="Browse open jobs." />
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load this page right now. Try refreshing.
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  if (hasCv === false) {
    return (
      <BrowseAllJobsView
        jobs={browseJobs}
        loading={browseJobsQuery.isLoading}
        error={browseJobsQuery.isError}
        onApply={handleBrowseApply}
        confirmDialog={ConfirmDialog}
        variant="no-cv"
      />
    );
  }

  const matchedSubtitle = "Opportunities ranked against your CV.";

  if (consentLoading || (consentEnabled && matchesLoading)) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle={matchedSubtitle} />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading your matches…
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  if (consentError || (consentEnabled && matchesError)) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle={matchedSubtitle} />
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your matches right now. Try refreshing the page.
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  if (!consentHasCandidate) {
    return (
      <BrowseAllJobsView
        jobs={browseJobs}
        loading={browseJobsQuery.isLoading}
        error={browseJobsQuery.isError}
        onApply={handleBrowseApply}
        confirmDialog={ConfirmDialog}
        variant="matches-pending"
      />
    );
  }

  if (!consentGranted) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle={matchedSubtitle} />
        <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
          <h2 className="text-lg font-semibold text-amber-900">We need your consent to match</h2>
          <p className="text-amber-900/80 mt-2 max-w-md mx-auto text-sm">
            Matching uses your CV to compute job recommendations. Under POPIA we need explicit
            consent before we can process it that way. You can withdraw any time from{" "}
            <Link
              href="/annix/orbit/seeker/settings"
              className="underline underline-offset-2 hover:text-amber-700"
            >
              Settings → Privacy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={() => {
              consentPromptShown.current = false;
              setConsentDeclined(false);
              void promptForConsent();
            }}
            disabled={grantConsentMutation.isPending}
            className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {grantConsentMutation.isPending ? "Recording…" : "Review consent"}
          </button>
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <BrowseAllJobsView
        jobs={browseJobs}
        loading={browseJobsQuery.isLoading}
        error={browseJobsQuery.isError}
        onApply={handleBrowseApply}
        confirmDialog={ConfirmDialog}
        variant="matches-pending"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={matchedSubtitle}
        showRematch
        onRematch={handleRematch}
        rematching={rematchMutation.isPending}
      />

      {showColdStart ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          {embeddingPending
            ? "Matching your CV to live job listings… showing recent SA roles in the meantime."
            : "Showing recent SA roles while we refine your matches."}
        </div>
      ) : null}

      <SeekerJobFilters
        state={filters}
        onChange={setFilters}
        providers={providers}
        categories={categories}
      />

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
              onMuteCompany={handleMuteCompany}
              onMuteCategory={handleMuteCategory}
              isDismissing={
                dismissMutation.isPending && dismissMutation.variables === match.matchId
              }
            />
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

interface BrowseAllJobsViewProps {
  jobs: PublicJob[];
  loading: boolean;
  error: boolean;
  onApply: (job: PublicJob) => void;
  confirmDialog: React.ReactNode;
  variant: "no-cv" | "matches-pending";
}

function BrowseAllJobsView(props: BrowseAllJobsViewProps) {
  const jobs = props.jobs;
  const variant = props.variant;
  const matchesPending = variant === "matches-pending";
  const subtitle = matchesPending
    ? "Your personalised matches are being prepared — browse all open jobs in the meantime."
    : "All open jobs — upload your CV to see your match scores.";

  return (
    <div className="space-y-6">
      <PageHeader subtitle={subtitle} />

      {matchesPending ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          Nix is still preparing your personalised job matches. In the meantime, here are all open
          jobs — you can browse and apply to any of them now.
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex flex-wrap items-center justify-between gap-2">
          <span>
            Browsing all open jobs. Upload your CV and Nix will rank these by how well they match
            you.
          </span>
          <Link
            href="/annix/orbit/seeker/profile"
            className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
          >
            Upload my CV
          </Link>
        </div>
      )}

      {props.loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading open jobs…
        </div>
      ) : props.error ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load open jobs right now. Try refreshing the page.
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No open jobs right now</h2>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            There are no open listings at the moment. Check back soon — new jobs are added
            regularly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <SeekerBrowseJobCard key={`${job.kind}-${job.id}`} job={job} onApply={props.onApply} />
          ))}
        </div>
      )}
      {props.confirmDialog}
    </div>
  );
}

interface PageHeaderProps {
  subtitle: string;
  showRematch?: boolean;
  onRematch?: () => void;
  rematching?: boolean;
}

function PageHeader(props: PageHeaderProps) {
  const showRematch = props.showRematch === true;
  const rematching = props.rematching === true;
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold text-white">Browse Jobs</h1>
        <p className="text-white/70 mt-2">{props.subtitle}</p>
      </div>
      {showRematch ? (
        <button
          type="button"
          onClick={props.onRematch}
          disabled={rematching}
          className="px-3 py-2 text-sm rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
        >
          {rematching ? "Rematching…" : "Rematch now"}
        </button>
      ) : null}
    </div>
  );
}
