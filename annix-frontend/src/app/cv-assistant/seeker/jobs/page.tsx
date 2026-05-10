"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { SeekerRecommendedJob } from "@/app/lib/api/cvAssistantApi";
import { SeekerJobCard } from "@/app/lib/cv-assistant/components/SeekerJobCard";
import {
  type SeekerFilterState,
  SeekerJobFilters,
} from "@/app/lib/cv-assistant/components/SeekerJobFilters";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useCvDismissSeekerMatch,
  useCvGrantSeekerMatchingConsent,
  useCvSeekerMatchingConsent,
  useCvSeekerRecommendedJobs,
  useCvSeekerRematch,
} from "@/app/lib/query/hooks";

export default function SeekerJobsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const consentQuery = useCvSeekerMatchingConsent();
  const grantConsentMutation = useCvGrantSeekerMatchingConsent();
  const consentData = consentQuery.data;
  const consentReady = consentData != null;
  const consentHasCandidate = consentData ? consentData.hasCandidate : false;
  const consentGranted = consentData ? consentData.consented : false;
  const consentEnabled = consentReady && consentHasCandidate && consentGranted;

  const recommendedQuery = useCvSeekerRecommendedJobs(consentEnabled);
  const dismissMutation = useCvDismissSeekerMatch();
  const rematchMutation = useCvSeekerRematch();
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

  const data = recommendedQuery.data;
  const matches = useMemo(() => (data ? data.matches : []), [data]);
  const hasCandidate = data ? data.hasCandidate : consentHasCandidate;

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

  const consentLoading = consentQuery.isLoading;
  const consentError = consentQuery.isError;
  const matchesLoading = recommendedQuery.isLoading;
  const matchesError = recommendedQuery.isError;

  if (consentLoading || (consentEnabled && matchesLoading)) {
    return (
      <div className="space-y-6">
        <PageHeader />
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
        <PageHeader />
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your matches right now. Try refreshing the page.
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  if (!consentHasCandidate) {
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
        {ConfirmDialog}
      </div>
    );
  }

  if (!consentGranted) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
          <h2 className="text-lg font-semibold text-amber-900">We need your consent to match</h2>
          <p className="text-amber-900/80 mt-2 max-w-md mx-auto text-sm">
            Matching uses your CV to compute job recommendations. Under POPIA we need explicit
            consent before we can process it that way. You can withdraw any time from{" "}
            <Link
              href="/cv-assistant/seeker/settings"
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
      <div className="space-y-6">
        <PageHeader showRematch onRematch={handleRematch} rematching={rematchMutation.isPending} />
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No matches yet</h2>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            We're still matching jobs to your profile. New matches usually appear within an hour of
            uploading your CV. Make sure your skills are up to date in your CV for better matches.
          </p>
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader showRematch onRematch={handleRematch} rematching={rematchMutation.isPending} />

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

interface PageHeaderProps {
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
        <p className="text-white/70 mt-2">Opportunities ranked against your CV.</p>
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
