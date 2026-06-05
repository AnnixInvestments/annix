"use client";

import { isString } from "es-toolkit/compat";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandedErrorScreen } from "@/app/components/BrandedErrorScreen";
import {
  useExtractionProgress,
  withExtractionProgress,
} from "@/app/components/ExtractionProgressModal";
import { ConfirmModal } from "@/app/components/modals/ConfirmModal";
import { useToast } from "@/app/components/Toast";
import { SeekerBrowseJobCard } from "@/app/lib/annix-orbit/components/SeekerBrowseJobCard";
import { SeekerJobCard } from "@/app/lib/annix-orbit/components/SeekerJobCard";
import {
  type SeekerFilterState,
  SeekerJobFilters,
} from "@/app/lib/annix-orbit/components/SeekerJobFilters";
import {
  annixOrbitApiClient,
  type PublicJob,
  type SeekerRecommendedFilters,
  type SeekerRecommendedJob,
} from "@/app/lib/api/annixOrbitApi";
import { nowMillis } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useDebouncedValue } from "@/app/lib/hooks/useDebouncedValue";
import {
  useOrbitAcknowledgeDismissWarning,
  useOrbitDismissSeekerMatch,
  useOrbitGrantSeekerMatchingConsent,
  useOrbitMuteSeekerCategory,
  useOrbitMuteSeekerCompany,
  useOrbitMyProfileStatus,
  useOrbitReportJobDelisted,
  useOrbitSeekerBrowseJobs,
  useOrbitSeekerColdStartJobs,
  useOrbitSeekerDismissReasons,
  useOrbitSeekerEntitlements,
  useOrbitSeekerJobFacets,
  useOrbitSeekerMatchingConsent,
  useOrbitSeekerRecommendedJobs,
  useOrbitSeekerRematch,
} from "@/app/lib/query/hooks";
import { useOrbitPushNotifications } from "../../hooks/useOrbitPushNotifications";

const NIX_SEARCH_PENDING_KEY = "orbit-nix-search-pending";
const NIX_SEARCH_PENDING_TTL_MS = 12 * 60 * 1000;

interface NixPendingSearch {
  startCount: number;
  startedAt: number;
}

// Paid feature — Nix-powered job matching. Toggled on for testing; will become
// a subscription gate.
const HELP_ME_FIND_A_JOB_ENABLED = true;

function readNixPending(): NixPendingSearch | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(NIX_SEARCH_PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NixPendingSearch;
  } catch {
    return null;
  }
}

function writeNixPending(value: NixPendingSearch): void {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NIX_SEARCH_PENDING_KEY, JSON.stringify(value));
}

function clearNixPending(): void {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NIX_SEARCH_PENDING_KEY);
}

export default function SeekerJobsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const extractionProgress = useExtractionProgress();
  const profileStatusQuery = useOrbitMyProfileStatus();
  const profileStatus = profileStatusQuery.data;
  const hasCv = profileStatus ? profileStatus.hasCv : null;
  const profileReady = profileStatus != null;

  const consentQuery = useOrbitSeekerMatchingConsent(hasCv === true);
  const grantConsentMutation = useOrbitGrantSeekerMatchingConsent();
  const consentData = consentQuery.data;
  const consentQuota = consentData?.quota;
  const quotaRemaining = consentQuota ? consentQuota.remaining : null;
  const consentReady = consentData != null;
  const consentHasCandidate = consentData ? consentData.hasCandidate : false;
  const consentGranted = consentData ? consentData.consented : false;
  const consentEnabled = consentReady && consentHasCandidate && consentGranted;

  const [filters, setFilters] = useState<SeekerFilterState>({
    search: "",
    provider: "all",
    province: "",
    city: "",
    category: "",
    minSalary: "",
  });
  const filtersActive =
    filters.search !== "" ||
    filters.provider !== "all" ||
    filters.province !== "" ||
    filters.city !== "" ||
    filters.category !== "" ||
    filters.minSalary !== "";
  const serverFilters = useMemo<SeekerRecommendedFilters>(() => {
    const next: SeekerRecommendedFilters = {};
    const search = filters.search.trim();
    if (search) next.search = search;
    if (filters.provider !== "all") next.provider = filters.provider;
    if (filters.province) next.province = filters.province;
    if (filters.city) next.city = filters.city;
    if (filters.category) next.category = filters.category;
    if (filters.minSalary) next.minSalary = filters.minSalary;
    return next;
  }, [filters]);
  const debouncedServerFilters = useDebouncedValue(serverFilters, 350);

  const recommendedRefetchInterval: number | false =
    consentEnabled && !filtersActive ? 120_000 : false;
  const recommendedQuery = useOrbitSeekerRecommendedJobs(consentEnabled, {
    // eslint-disable-next-line no-restricted-syntax -- 120s is the project floor; cold-start needs to detect embedding completion
    refetchInterval: recommendedRefetchInterval,
    filters: debouncedServerFilters,
  });
  const recommendedHasMatches = recommendedQuery.data
    ? recommendedQuery.data.matches.length > 0
    : false;
  const recommendedReady = recommendedQuery.data != null;
  const coldStartEnabled =
    consentEnabled && recommendedReady && !recommendedHasMatches && !filtersActive;
  const coldStartQuery = useOrbitSeekerColdStartJobs(coldStartEnabled);
  const dismissReasonsQuery = useOrbitSeekerDismissReasons();
  const dismissReasonsData = dismissReasonsQuery.data;
  const dismissReasons = dismissReasonsData ? dismissReasonsData : [];
  const dismissMutation = useOrbitDismissSeekerMatch();
  const acknowledgeDismissWarning = useOrbitAcknowledgeDismissWarning();
  const dismissWarningAcknowledged = profileStatus
    ? profileStatus.dismissWarningAcknowledged
    : false;
  const [pendingDismiss, setPendingDismiss] = useState<{
    matchId: number;
    reason?: string;
  } | null>(null);
  const [dismissDontShowAgain, setDismissDontShowAgain] = useState<boolean>(false);
  const rematchMutation = useOrbitSeekerRematch();
  const muteCompanyMutation = useOrbitMuteSeekerCompany();
  const muteCategoryMutation = useOrbitMuteSeekerCategory();
  const reportDelistedMutation = useOrbitReportJobDelisted();
  const pushNotifications = useOrbitPushNotifications();
  const [consentDeclined, setConsentDeclined] = useState<boolean>(false);
  const [nixSearching, setNixSearching] = useState<boolean>(false);
  const [nixSearchEstimateMs, setNixSearchEstimateMs] = useState<number>(90_000);
  const consentPromptShown = useRef(false);

  useEffect(() => {
    annixOrbitApiClient
      .seekerJobSearchEstimate()
      .then((result) => {
        const learned = result.estimatedDurationMs;
        if (learned > 0) setNixSearchEstimateMs(learned);
      })
      .catch(() => {});
  }, []);

  // When the page regains focus/visibility, refetch so a search that finished
  // while the user was away (locked screen / another tab) is reflected promptly.
  const recommendedRefetch = recommendedQuery.refetch;
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        recommendedRefetch().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
    };
  }, [recommendedRefetch]);

  // Return-banner: if a Nix search was pending and matches have since landed,
  // surface a banner — works whether the user stayed, locked their screen, or
  // navigated away and came back.
  const recommendedDataForBanner = recommendedQuery.data;
  useEffect(() => {
    // While a search is actively being watched (modal up), runNixSearch handles
    // the success toast — only the "returned after leaving" case needs a banner.
    if (nixSearching) return;
    if (!recommendedDataForBanner) return;
    const pending = readNixPending();
    if (!pending) return;
    const matchCount = recommendedDataForBanner.total;
    if (matchCount > pending.startCount) {
      clearNixPending();
      const added = matchCount - pending.startCount;
      showToast(
        `Your Nix matches are ready — ${added} new role${added === 1 ? "" : "s"} matched to your CV.`,
        "success",
      );
    } else if (nowMillis() - pending.startedAt > NIX_SEARCH_PENDING_TTL_MS) {
      clearNixPending();
    }
  }, [recommendedDataForBanner, showToast, nixSearching]);

  const browseJobsEnabled = profileReady;
  const [browseLimit, setBrowseLimit] = useState(100);
  const browseJobsQuery = useOrbitSeekerBrowseJobs({ limit: browseLimit }, browseJobsEnabled);
  const browseJobsData = browseJobsQuery.data;
  const browseJobs = useMemo(() => (browseJobsData ? browseJobsData.jobs : []), [browseJobsData]);

  const data = recommendedQuery.data;
  const coldStartData = coldStartQuery.data;
  const coldStartJobsCount = coldStartData ? coldStartData.jobs.length : 0;
  const showColdStart =
    recommendedReady && !recommendedHasMatches && coldStartJobsCount > 0 && !filtersActive;
  const matches = useMemo(() => {
    if (showColdStart && coldStartData) return coldStartData.jobs;
    return data ? data.matches : [];
  }, [data, coldStartData, showColdStart]);
  const embeddingPending = coldStartData ? coldStartData.embeddingPending : false;

  // Facets: every dropdown lists only the provinces/cities/categories/sources that
  // actually have a match in the seeker's set, recomputed as filters narrow (each
  // facet excludes its own dimension server-side, so a choice never empties its
  // own dropdown and no zero-result option is ever offered).
  const facetsQuery = useOrbitSeekerJobFacets(consentEnabled, debouncedServerFilters);
  const facets = facetsQuery.data;
  const providers = facets ? facets.sources : [];
  const provinceOptions = facets ? facets.provinces : [];
  const cityOptions = facets ? facets.cities : [];
  const categoryOptions = facets ? facets.categories : [];

  // The server already applies every filter (province/city/category/source/salary
  // on canonical fields, plus search) and returns the ranked page. This only adds
  // instant client-side narrowing on the search text while the 350ms debounce to
  // the server is in flight — it must NOT re-apply the dropdown filters, or it
  // would wrongly drop jobs (e.g. a "Benoni, Ekurhuleni" job has no "Gauteng"
  // text but is correctly in Gauteng via its canonical province).
  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (term.length === 0) return matches;
    return matches.filter((m) => {
      const company = m.job.company || "";
      const locationArea = m.job.locationArea || "";
      const locationRaw = m.job.locationRaw || "";
      const description = m.job.description || "";
      const keywordHaystack =
        `${m.job.title} ${company} ${locationArea} ${locationRaw} ${description}`.toLowerCase();
      return keywordHaystack.includes(term);
    });
  }, [matches, filters]);

  const handleApply = (match: SeekerRecommendedJob) => {
    const sourceUrl = match.job.sourceUrl;
    if (!sourceUrl) {
      showToast("No apply link available for this job", "error");
      return;
    }
    annixOrbitApiClient
      .recordSeekerApplyClick({
        matchId: match.matchId,
        externalJobId: match.externalJobId,
        sourceUrl,
      })
      .catch((err) => {
        console.warn("Failed to record apply-click for match", match.matchId, err);
      });
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
      .catch((err) => {
        console.warn("Failed to record apply-click for external job", externalJobId, err);
      });
  };

  const runDismiss = (matchId: number, reason?: string) => {
    dismissMutation.mutate(
      { matchId, reason },
      {
        onSuccess: () => {
          showToast("Thanks — Nix will use that to refine your matches.", "success");
        },
        onError: () => {
          showToast("Failed to dismiss match", "error");
        },
      },
    );
  };

  const handleDismiss = (matchId: number, reason?: string) => {
    if (dismissWarningAcknowledged) {
      runDismiss(matchId, reason);
      return;
    }
    setDismissDontShowAgain(false);
    setPendingDismiss({ matchId, reason });
  };

  const confirmPendingDismiss = () => {
    const target = pendingDismiss;
    if (!target) return;
    if (dismissDontShowAgain) {
      acknowledgeDismissWarning.mutate();
    }
    runDismiss(target.matchId, target.reason);
    setPendingDismiss(null);
  };

  const handleReportDelisted = async (externalJobId: number) => {
    const confirmed = await confirm({
      title: "Report this job as delisted?",
      message:
        "Only do this if the job has been removed from the source website. Our team will review it, and once confirmed it will be removed for everyone.",
      confirmLabel: "Report delisted",
      variant: "warning",
    });
    if (!confirmed) return;
    reportDelistedMutation.mutate(externalJobId, {
      onSuccess: () => {
        showToast(
          "Thanks — we'll review this listing and remove it if it's been taken down.",
          "success",
        );
      },
      onError: () => {
        showToast("Couldn't report this job — please try again.", "error");
      },
    });
  };

  const handleMuteCompany = async (company: string) => {
    const confirmed = await confirm({
      title: `Mute "${company}"?`,
      message: `You'll stop seeing jobs from "${company}" in your matches.`,
      confirmLabel: "Mute company",
      variant: "warning",
    });
    if (!confirmed) return;
    muteCompanyMutation.mutate(company, {
      onSuccess: (res) => {
        showToast(res.created ? `Muted "${company}"` : `"${company}" was already muted`, "success");
      },
      onError: () => {
        showToast("Failed to mute company", "error");
      },
    });
  };

  const handleMuteCategory = async (category: string) => {
    const confirmed = await confirm({
      title: `Hide "${category}" roles?`,
      message: `You'll stop seeing "${category}" roles in your matches.`,
      confirmLabel: "Hide roles",
      variant: "warning",
    });
    if (!confirmed) return;
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
    () => async (): Promise<boolean> => {
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
          return true;
        } catch {
          showToast("Could not record consent right now — try again", "error");
          return false;
        }
      }
      setConsentDeclined(true);
      return false;
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

  // Matching runs fire-and-forget on the server (~1–2 min), so after the trigger
  // we poll for results and keep the branded progress modal up until they land.
  const waitForMatches = async (startCount: number): Promise<boolean> => {
    const startedAt = nowMillis();
    const deadline = startedAt + 120_000;
    const minVisibleMs = 4000;
    const poll = async (): Promise<boolean> => {
      if (nowMillis() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      let count = startCount;
      try {
        const refetched = await recommendedQuery.refetch();
        const refetchedData = refetched.data;
        count = refetchedData ? refetchedData.total : startCount;
      } catch {
        // transient refetch failure (e.g. backend restarting) — keep polling
      }
      if (count > startCount) return true;
      const elapsed = nowMillis() - startedAt;
      if (startCount > 0 && elapsed >= minVisibleMs) return true;
      return poll();
    };
    return poll();
  };

  const runNixSearch = async () => {
    setNixSearching(true);
    const recommendedData = recommendedQuery.data;
    const startCount = recommendedData ? recommendedData.total : 0;
    // Record the search so that if the user locks their screen or leaves the
    // page, the return-banner (and the completion push) can still tell them
    // when matches land.
    writeNixPending({ startCount, startedAt: nowMillis() });
    let quotaBlock: { used: number; allowance: number } | null = null;
    try {
      // The branded progress popup wraps the whole search so it appears the moment
      // Nix starts. The trigger is best-effort: a transient hiccup (backend
      // restarting, or the candidate still embedding right after consent) must not
      // abort the search — server-side matching is fire-and-forget, so we keep
      // polling for results regardless.
      const outcome = await withExtractionProgress(
        extractionProgress,
        {
          brand: "annix-orbit",
          label: "Nix is reading your CV and searching the jobs…",
          estimatedDurationMs: nixSearchEstimateMs,
        },
        async (): Promise<"found" | "pending" | "cooldown" | "quota"> => {
          let rateLimited = false;
          try {
            const result = await rematchMutation.mutateAsync();
            if (!result.triggered && result.reason === "rate-limited") {
              rateLimited = true;
            }
            if (!result.triggered && result.reason === "quota-exceeded") {
              quotaBlock = { used: result.used, allowance: result.allowance };
            }
          } catch {
            // best-effort trigger — keep going and poll for results
          }
          if (quotaBlock) {
            return "quota";
          }
          if (rateLimited) {
            await recommendedQuery.refetch().catch(() => {});
            return "cooldown";
          }
          const found = await waitForMatches(startCount);
          return found ? "found" : "pending";
        },
      );
      if (outcome === "quota") {
        clearNixPending();
        const block = quotaBlock as { used: number; allowance: number } | null;
        const allowance = block ? block.allowance : 0;
        await consentQuery.refetch().catch(() => {});
        await confirm({
          title: "You've used your monthly matches",
          message: `You've used all ${allowance} of your "Help me Find a Job" matches this month. Your matches reset at the start of next month — higher plans with more matches are coming soon.`,
          confirmLabel: "Got it",
          variant: "info",
          hideCancel: true,
        });
      } else if (outcome === "found") {
        clearNixPending();
        showToast("Nix found jobs that match your CV.", "success");
      } else if (outcome === "cooldown") {
        clearNixPending();
        showToast("Nix searched recently — your matches are up to date.", "info");
      } else {
        // Still running server-side — keep the pending marker so the return-banner
        // and push notification surface the result once matches land.
        showToast(
          "Nix is still searching — you can leave this page and we'll let you know when your matches are ready.",
          "info",
        );
      }
    } catch {
      showToast("Nix couldn't finish the search — please try again in a moment.", "error");
    } finally {
      setNixSearching(false);
    }
  };

  // "Help me Find a Job": no CV → send to the CV page; CV present → fire Nix
  // (grant consent first if needed, which kicks off matching, otherwise rematch).
  const handleHelpFindJob = async () => {
    // Best-effort: ask to enable notifications (within this click gesture) so a
    // completion push can reach the user if they lock their screen / leave.
    void pushNotifications.requestPermissionAndSubscribe();
    if (!consentGranted) {
      consentPromptShown.current = false;
      setConsentDeclined(false);
      const granted = await promptForConsent();
      if (!granted) return;
    }
    await runNixSearch();
  };
  const isRematching = rematchMutation.isPending;
  const isGrantingConsent = grantConsentMutation.isPending;
  const helpSearching = isRematching || isGrantingConsent || nixSearching;
  const jobCount = browseJobsData ? browseJobsData.total : 0;
  const hasMoreBrowse = browseJobs.length < jobCount;
  const browseLoadingMore = browseJobsQuery.isFetching && browseJobs.length > 0;
  const handleLoadMoreBrowse = () => setBrowseLimit((current) => current + 100);

  const entitlementsQuery = useOrbitSeekerEntitlements();
  const entitlements = entitlementsQuery.data;
  const entitlementsSuccess = entitlementsQuery.isSuccess;
  const entitlementsResolved = entitlementsSuccess || entitlementsQuery.isError;
  const jobListingSiteEnabled = entitlements ? entitlements.features.jobListingSite === true : true;
  const browseLocked = entitlementsQuery.isSuccess && !jobListingSiteEnabled;
  const browseJobsLoading = browseJobsQuery.isLoading;
  const browseListLoading = browseJobsLoading || !entitlementsResolved;

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
        <BrandedErrorScreen
          area="Browse Jobs"
          error={toError(profileStatusQuery.error)}
          reset={() => void profileStatusQuery.refetch()}
          backHref="/annix/orbit/seeker/dashboard"
          brandButtonClass="bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)]"
        />
        {ConfirmDialog}
      </div>
    );
  }

  if (hasCv === false) {
    return (
      <BrowseAllJobsView
        jobs={browseJobs}
        loading={browseListLoading}
        error={browseJobsQuery.isError}
        onRetry={() => void browseJobsQuery.refetch()}
        onApply={handleBrowseApply}
        onReportDelisted={handleReportDelisted}
        confirmDialog={ConfirmDialog}
        variant="no-cv"
        jobCount={jobCount}
        matchCount={data ? data.total : 0}
        hasCv={false}
        searching={helpSearching}
        onHelpFindJob={handleHelpFindJob}
        quotaRemaining={quotaRemaining}
        hasMore={hasMoreBrowse}
        loadingMore={browseLoadingMore}
        onLoadMore={handleLoadMoreBrowse}
        browseLocked={browseLocked}
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
    const failedQuery = consentError ? consentQuery : recommendedQuery;
    return (
      <div className="space-y-6">
        <PageHeader subtitle={matchedSubtitle} />
        <BrandedErrorScreen
          area="your job matches"
          error={toError(failedQuery.error)}
          reset={() => void failedQuery.refetch()}
          backHref="/annix/orbit/seeker/dashboard"
          brandButtonClass="bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)]"
        />
        {ConfirmDialog}
      </div>
    );
  }

  if (!consentHasCandidate) {
    return (
      <BrowseAllJobsView
        jobs={browseJobs}
        loading={browseListLoading}
        error={browseJobsQuery.isError}
        onRetry={() => void browseJobsQuery.refetch()}
        onApply={handleBrowseApply}
        onReportDelisted={handleReportDelisted}
        confirmDialog={ConfirmDialog}
        variant="matches-pending"
        jobCount={jobCount}
        matchCount={data ? data.total : 0}
        hasCv={true}
        searching={helpSearching}
        onHelpFindJob={handleHelpFindJob}
        quotaRemaining={quotaRemaining}
        hasMore={hasMoreBrowse}
        loadingMore={browseLoadingMore}
        onLoadMore={handleLoadMoreBrowse}
        browseLocked={browseLocked}
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

  if (matches.length === 0 && !filtersActive) {
    return (
      <BrowseAllJobsView
        jobs={browseJobs}
        loading={browseListLoading}
        error={browseJobsQuery.isError}
        onRetry={() => void browseJobsQuery.refetch()}
        onApply={handleBrowseApply}
        onReportDelisted={handleReportDelisted}
        confirmDialog={ConfirmDialog}
        variant="matches-pending"
        jobCount={jobCount}
        matchCount={data ? data.total : 0}
        hasCv={true}
        searching={helpSearching}
        onHelpFindJob={handleHelpFindJob}
        quotaRemaining={quotaRemaining}
        hasMore={hasMoreBrowse}
        loadingMore={browseLoadingMore}
        onLoadMore={handleLoadMoreBrowse}
        browseLocked={browseLocked}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader subtitle={matchedSubtitle} />

      <JobsTopBar
        jobCount={jobCount}
        matchCount={data ? data.total : 0}
        hasCv={true}
        searching={helpSearching}
        onHelpFindJob={handleHelpFindJob}
        quotaRemaining={quotaRemaining}
      />

      {showColdStart ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          {embeddingPending
            ? "Matching your CV to live job listings… showing recent SA roles in the meantime."
            : "Showing recent SA roles while we refine your matches."}
        </div>
      ) : null}

      <SeekerJobFilters
        state={filters}
        onChange={setFilters}
        providers={providers}
        provinces={provinceOptions}
        cities={cityOptions}
        categories={categoryOptions}
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
              dismissReasons={dismissReasons}
              onMuteCompany={handleMuteCompany}
              onMuteCategory={handleMuteCategory}
              onReportDelisted={handleReportDelisted}
              isDismissing={
                dismissMutation.isPending && dismissMutation.variables?.matchId === match.matchId
              }
            />
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={pendingDismiss != null}
        variant="warning"
        title="This trains your job matches"
        message={
          "Marking a job as “not for me” helps Nix learn your preferences — jobs of this nature may no longer appear in your matches.\n\nYou can still browse every open job on the board at any time."
        }
        confirmLabel="Yes, not for me"
        cancelLabel="Keep it"
        checkboxLabel="Don't show this warning again"
        checkboxChecked={dismissDontShowAgain}
        onCheckboxChange={setDismissDontShowAgain}
        onConfirm={confirmPendingDismiss}
        onCancel={() => setPendingDismiss(null)}
      />
      {ConfirmDialog}
    </div>
  );
}

function JobsTopBar(props: {
  jobCount: number;
  matchCount: number;
  hasCv: boolean;
  searching: boolean;
  onHelpFindJob: () => void;
  quotaRemaining: number | null;
}) {
  const { jobCount, matchCount, hasCv, searching, onHelpFindJob, quotaRemaining } = props;
  const countLabel = jobCount > 0 ? jobCount.toLocaleString() : "—";
  const matchLabel = matchCount > 0 ? matchCount.toLocaleString() : "—";
  const outOfQuota = quotaRemaining !== null && quotaRemaining <= 0;
  const quotaNote = quotaRemaining !== null ? `${quotaRemaining} left this month` : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        className="rounded-xl border border-white/10 p-5 flex flex-col justify-center"
        style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
      >
        <p className="text-sm text-white/60">Jobs listed</p>
        <p className="text-3xl font-bold text-white mt-1">{countLabel}</p>
      </div>

      <div
        className="rounded-xl border border-white/10 p-5 flex flex-col justify-center"
        style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
      >
        <p className="text-sm text-white/60">Nix matches</p>
        <p className="text-3xl font-bold text-white mt-1">{matchLabel}</p>
      </div>

      {HELP_ME_FIND_A_JOB_ENABLED ? (
        hasCv ? (
          <button
            type="button"
            onClick={onHelpFindJob}
            disabled={searching || outOfQuota}
            className="rounded-xl p-5 text-left transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            <p className="text-lg font-bold text-white">
              {searching
                ? "Nix is searching…"
                : outOfQuota
                  ? "Out of matches this month"
                  : "Help me Find a Job"}
            </p>
            <p className="text-sm text-white/85 mt-1">
              {quotaNote ?? "Let Nix match these jobs to your CV and surface the best fits."}
            </p>
          </button>
        ) : (
          <Link
            href="/annix/orbit/seeker/profile"
            className="rounded-xl p-5 transition-opacity hover:opacity-90 flex flex-col justify-center"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            <p className="text-lg font-bold text-white">Help me Find a Job</p>
            <p className="text-sm text-white/85 mt-1">
              Upload your CV first and Nix will match jobs to you →
            </p>
          </Link>
        )
      ) : null}
    </div>
  );
}

function JobBoardLockedCard(props: { hasCv: boolean }) {
  const hasCv = props.hasCv;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
      >
        <svg
          className="h-7 w-7 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mt-4">Browse the full job board</h2>
      <p className="text-gray-600 mt-2 max-w-md mx-auto">
        Searching and browsing every open job is a premium feature. Your plan still gives you
        Nix-matched job finds tailored to your CV — upgrade to unlock the full browsable job board.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/annix/orbit/seeker/plans"
          className="inline-block px-5 py-2.5 text-sm font-semibold rounded-lg text-white hover:opacity-90"
          style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
        >
          View plans
        </Link>
        {hasCv ? null : (
          <Link
            href="/annix/orbit/seeker/profile"
            className="inline-block px-5 py-2.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Upload my CV
          </Link>
        )}
      </div>
    </div>
  );
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(isString(value) ? value : "Something went wrong");
}

interface BrowseAllJobsViewProps {
  jobs: PublicJob[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onApply: (job: PublicJob) => void;
  onReportDelisted: (externalJobId: number) => void;
  confirmDialog: React.ReactNode;
  variant: "no-cv" | "matches-pending";
  jobCount: number;
  matchCount: number;
  hasCv: boolean;
  searching: boolean;
  onHelpFindJob: () => void;
  quotaRemaining: number | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  browseLocked: boolean;
}

function BrowseAllJobsView(props: BrowseAllJobsViewProps) {
  const jobs = props.jobs;
  const variant = props.variant;
  const browseLocked = props.browseLocked;
  const matchesPending = variant === "matches-pending";
  const subtitle = browseLocked
    ? "Nix matches the best open jobs to your CV — your personalised job finds."
    : matchesPending
      ? "Your personalised matches are being prepared — browse all open jobs in the meantime."
      : "All open jobs — upload your CV to see your match scores.";

  if (browseLocked) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle={subtitle} />

        <JobsTopBar
          jobCount={props.jobCount}
          matchCount={props.matchCount}
          hasCv={props.hasCv}
          searching={props.searching}
          onHelpFindJob={props.onHelpFindJob}
          quotaRemaining={props.quotaRemaining}
        />

        <JobBoardLockedCard hasCv={props.hasCv} />
        {props.confirmDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader subtitle={subtitle} />

      <JobsTopBar
        jobCount={props.jobCount}
        matchCount={props.matchCount}
        hasCv={props.hasCv}
        searching={props.searching}
        onHelpFindJob={props.onHelpFindJob}
        quotaRemaining={props.quotaRemaining}
      />

      {matchesPending ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Nix is still preparing your personalised job matches. In the meantime, here are all open
          jobs — you can browse and apply to any of them now.
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-200 flex flex-wrap items-center justify-between gap-2">
          <span>
            Browsing all open jobs. Upload your CV and Nix will rank these by how well they match
            you.
          </span>
          <Link
            href="/annix/orbit/seeker/profile"
            className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)] whitespace-nowrap"
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
        <BrandedErrorScreen
          area="Browse Jobs"
          error={new Error("Failed to load open jobs")}
          reset={props.onRetry}
          backHref="/annix/orbit/seeker/dashboard"
          brandButtonClass="bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)]"
        />
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
            <SeekerBrowseJobCard
              key={`${job.kind}-${job.id}`}
              job={job}
              onApply={props.onApply}
              onReportDelisted={props.onReportDelisted}
            />
          ))}
        </div>
      )}

      {!props.loading && !props.error && jobs.length > 0 && props.hasMore ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={props.onLoadMore}
            disabled={props.loadingMore}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {props.loadingMore
              ? "Loading…"
              : `Load more jobs (${jobs.length} of ${props.jobCount.toLocaleString()})`}
          </button>
        </div>
      ) : null}
      {props.confirmDialog}
    </div>
  );
}

interface PageHeaderProps {
  subtitle: string;
}

function PageHeader(props: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Browse Jobs</h1>
      <p className="text-white/70 mt-2">{props.subtitle}</p>
    </div>
  );
}
