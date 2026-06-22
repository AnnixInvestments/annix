"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import { requestSeekerTour } from "@/app/lib/annix-orbit/seekerTourSignal";
import type {
  SeekerApplication,
  SeekerApplicationStatus,
  SeekerRecommendedJob,
} from "@/app/lib/api/annixOrbitApi";
import { formatDateLongZA, formatDateZA, now } from "@/app/lib/datetime";
import {
  useOrbitMyInterviewInvites,
  useOrbitMyProfileStatus,
  useOrbitSeekerApplications,
  useOrbitSeekerColdStartJobs,
  useOrbitSeekerCredentials,
  useOrbitSeekerJobStats,
  useOrbitSeekerRecommendedJobs,
  useOrbitSeekerWorkProfile,
  useOrbitUpdateSeekerPreferences,
} from "@/app/lib/query/hooks";
import { AppDownloadGuidePopup, OnboardingImagePopup } from "../components/OnboardingPopups";

const ICON_JOBS =
  "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
const ICON_APPLICATIONS =
  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
const ICON_INTERVIEWS =
  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";
const ICON_PROFILE =
  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z";

const STATUS_LABEL: Record<SeekerApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer",
  accepted: "Accepted",
};

const STATUS_CLASS: Record<SeekerApplicationStatus, string> = {
  saved: "bg-slate-50 text-slate-700 border-slate-200 dark:text-slate-300",
  applied: "bg-blue-50 text-blue-700 border-blue-200 dark:text-blue-300",
  interviewing: "bg-amber-50 text-amber-800 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:text-red-300",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  accepted: "bg-violet-50 text-violet-700 border-violet-200",
};

export default function SeekerDashboardPage() {
  const { user } = useAnnixOrbitAuth();
  const statusQuery = useOrbitMyProfileStatus();
  const invitesQuery = useOrbitMyInterviewInvites();
  const jobStatsQuery = useOrbitSeekerJobStats();
  const applicationsQuery = useOrbitSeekerApplications();
  const workQuery = useOrbitSeekerWorkProfile();
  const credentialsQuery = useOrbitSeekerCredentials();

  const userName = user?.name;
  const firstNameToken = userName ? userName.split(" ")[0] : null;
  const firstName = firstNameToken ? firstNameToken : "there";

  const hour = now().hour;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const status = statusQuery.data;
  const hasCv = status ? status.hasCv : false;
  const qualificationsCount = status ? status.qualificationsCount : 0;
  const certificatesCount = status ? status.certificatesCount : 0;
  const phoneType = status ? status.phoneType : null;

  const updatePreferences = useOrbitUpdateSeekerPreferences();
  const [tourStep, setTourStep] = useState<0 | 1 | 2>(0);
  const tourStartedRef = useRef(false);

  useEffect(() => {
    if (!status) return;
    if (status.appGuideSeen) return;
    if (tourStartedRef.current) return;
    tourStartedRef.current = true;
    setTourStep(1);
  }, [status]);

  const advanceToFeedbackGuide = () => setTourStep(2);
  const finishOnboardingTour = () => {
    setTourStep(0);
    updatePreferences.mutate({ appGuideSeen: true });
    requestSeekerTour("first-run");
  };

  const invitesData = invitesQuery.data;
  const invites = invitesData ? invitesData : [];
  const openInvites = invites.filter((invite) => invite.usedAt === null);

  const jobStats = jobStatsQuery.data;
  const hasCandidate = jobStats ? jobStats.hasCandidate : false;
  const matchesLast7Days = jobStats ? jobStats.matchesLast7Days : 0;
  const totalMatches = jobStats ? jobStats.totalMatches : 0;

  const applicationsData = applicationsQuery.data;
  const applications = applicationsData ? applicationsData : [];
  const applicationsCount = applications.length;
  const interviewingCount = applications.filter((a) => a.status === "interviewing").length;
  const offerCount = applications.filter((a) => a.status === "offer").length;
  const recentApplications = applications.slice(0, 4);

  const workData = workQuery.data;
  const workProfile = workData ? workData.profile : null;
  const workShared = workProfile ? workProfile.shared : null;
  const workFields = workShared ? workShared.fields : [];
  const hasWorkProfile = workFields.length > 0;

  const credentialsData = credentialsQuery.data;
  const credentials = credentialsData ? credentialsData.credentials : [];
  const hasCredentials = credentials.length > 0;

  const recommendedQuery = useOrbitSeekerRecommendedJobs(hasCandidate);
  const recommendedData = recommendedQuery.data;
  const recommendedMatches = recommendedData ? recommendedData.matches : [];
  const coldStartEnabled = hasCandidate && recommendedMatches.length === 0;
  const coldStartQuery = useOrbitSeekerColdStartJobs(coldStartEnabled);
  const coldStartData = coldStartQuery.data;
  const coldStartMatches = coldStartData ? coldStartData.jobs : [];
  const embeddingPending = coldStartData ? coldStartData.embeddingPending : false;
  const previewMatches =
    recommendedMatches.length > 0 ? recommendedMatches.slice(0, 3) : coldStartMatches.slice(0, 3);

  const checklist = [
    { label: "Upload your CV", done: hasCv, href: "/annix/orbit/seeker/profile" },
    {
      label: "Add qualifications",
      done: qualificationsCount > 0,
      href: "/annix/orbit/seeker/profile#qualifications",
    },
    {
      label: "Add certificates",
      done: certificatesCount > 0,
      href: "/annix/orbit/seeker/profile#certificates",
    },
    {
      label: "Complete your work profile",
      done: hasWorkProfile,
      href: "/annix/orbit/seeker/profile/work",
    },
    {
      label: "Add credentials",
      done: hasCredentials,
      href: "/annix/orbit/seeker/profile/credentials",
    },
  ];
  const completedSteps = checklist.filter((item) => item.done).length;
  const totalSteps = checklist.length;
  const strengthPercent = Math.round((completedSteps / totalSteps) * 100);
  const profileComplete = completedSteps === totalSteps;

  const applicationsSub =
    offerCount > 0
      ? `${offerCount} offer${offerCount === 1 ? "" : "s"}`
      : interviewingCount > 0
        ? `${interviewingCount} interviewing`
        : "Track your applications";
  const interviewsSub = openInvites.length > 0 ? "Awaiting your reply" : "No pending invites";
  const matchesSub = `${totalMatches} active match${totalMatches === 1 ? "" : "es"}`;

  if (statusQuery.isLoading) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          greeting={greeting}
          firstName={firstName}
          subtitle="Loading your workspace…"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse"
            />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  if (statusQuery.isError) {
    return (
      <div className="space-y-6">
        <DashboardHeader greeting={greeting} firstName={firstName} subtitle="" />
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your workspace right now. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tourStep === 1 && (
        <AppDownloadGuidePopup phoneType={phoneType} onClose={advanceToFeedbackGuide} />
      )}
      {tourStep === 2 && (
        <OnboardingImagePopup
          title="Using the Feedback Widget"
          imageUrl="/orbit/onboarding/feedback-widget-guide.png"
          imageAlt="How to use the Annix Orbit Feedback Widget"
          onClose={finishOnboardingTour}
        />
      )}
      <DashboardHeader
        greeting={greeting}
        firstName={firstName}
        subtitle={
          hasCv
            ? "Here's what's happening with your job search today."
            : "Let's get your profile ready so we can match you to jobs."
        }
      />

      {hasCv ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            tone="brand"
            iconPath={ICON_JOBS}
            label="Matched jobs"
            value={`${matchesLast7Days} new`}
            sub={matchesSub}
            href="/annix/orbit/seeker/jobs"
          />
          <StatCard
            tone="blue"
            iconPath={ICON_APPLICATIONS}
            label="Applications"
            value={`${applicationsCount}`}
            sub={applicationsSub}
            href="/annix/orbit/seeker/applications"
          />
          <StatCard
            tone="accent"
            iconPath={ICON_INTERVIEWS}
            label="Interview invites"
            value={`${openInvites.length}`}
            sub={interviewsSub}
            href="/annix/orbit/seeker/calendar"
          />
          <StatCard
            tone="emerald"
            iconPath={ICON_PROFILE}
            label="Profile strength"
            value={`${strengthPercent}%`}
            sub={`${completedSteps} of ${totalSteps} complete`}
            href="/annix/orbit/seeker/profile"
          />
        </div>
      ) : (
        <StartCvHero firstName={firstName} />
      )}

      {openInvites.length > 0 ? (
        <div
          className="rounded-xl shadow-lg p-5"
          style={{
            backgroundImage:
              "linear-gradient(to bottom right, var(--brand-accent,#FF8A00), var(--brand-accent-light,#FF9C33))",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
              ✉
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[var(--brand-grad-from,#1a1a40)]">
                {openInvites.length === 1
                  ? "You have an interview invitation"
                  : `${openInvites.length} interview invitations`}
              </h2>
              <ul className="mt-2 space-y-2">
                {openInvites.map((invite) => {
                  const job = invite.jobPosting;
                  const jobTitle = job ? job.title : "An employer";
                  const jobLocation = job ? job.location : null;
                  return (
                    <li
                      key={invite.id}
                      className="bg-white/95 rounded-lg px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--brand-grad-from,#1a1a40)] truncate">
                          {jobTitle}
                          {jobLocation ? (
                            <span className="text-gray-600 font-normal">
                              {" — "}
                              {jobLocation}
                            </span>
                          ) : null}
                        </p>
                        {invite.expiresAt ? (
                          <p className="text-xs text-gray-500">
                            Reply by {formatDateLongZA(invite.expiresAt)}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={`/annix/orbit/interview-booking/${invite.token}`}
                        className="text-xs font-semibold px-3 py-1.5 bg-[var(--brand-navbar-active,#252560)] text-white rounded-lg hover:bg-[var(--brand-grad-from,#1a1a40)] whitespace-nowrap"
                      >
                        Pick a time
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {!profileComplete ? (
        <ProfileStrengthCard
          completedSteps={completedSteps}
          totalSteps={totalSteps}
          strengthPercent={strengthPercent}
          checklist={checklist}
          hasCv={hasCv}
        />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Your profile is complete</p>
            <p className="text-xs text-emerald-700">
              Great work — you'll get the most accurate job matches.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Top job matches"
            actionHref="/annix/orbit/seeker/jobs"
            actionLabel="Browse all jobs"
          >
            {!hasCv ? (
              <EmptyState
                title="Upload your CV to see matches"
                body="Annix Orbit matches you to suitable roles automatically once your CV is in."
                ctaLabel="Upload CV"
                ctaHref="/annix/orbit/seeker/profile"
              />
            ) : previewMatches.length > 0 ? (
              <div className="space-y-3">
                {previewMatches.map((match) => (
                  <MatchRow key={match.matchId} match={match} />
                ))}
              </div>
            ) : embeddingPending ? (
              <EmptyState
                title="We're finding your matches"
                body="Your CV is being analysed. New matches will appear here shortly."
              />
            ) : (
              <EmptyState
                title="No matches just yet"
                body="Check back soon, or browse the latest jobs and apply directly."
                ctaLabel="Browse jobs"
                ctaHref="/annix/orbit/seeker/jobs"
              />
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard
            title="Recent applications"
            actionHref="/annix/orbit/seeker/applications"
            actionLabel="View all"
          >
            {recentApplications.length > 0 ? (
              <ul className="space-y-2">
                {recentApplications.map((app) => (
                  <ApplicationRow key={app.id} application={app} />
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No applications yet"
                body="Jobs you apply to will show up here so you can track their status."
                ctaLabel="Find jobs"
                ctaHref="/annix/orbit/seeker/jobs"
              />
            )}
          </SectionCard>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction label="My CV" href="/annix/orbit/seeker/profile" iconPath={ICON_PROFILE} />
          <QuickAction
            label="Work profile"
            href="/annix/orbit/seeker/profile/work"
            iconPath={ICON_PROFILE}
          />
          <QuickAction label="Browse jobs" href="/annix/orbit/seeker/jobs" iconPath={ICON_JOBS} />
          <QuickAction
            label="Interviews"
            href="/annix/orbit/seeker/calendar"
            iconPath={ICON_INTERVIEWS}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardHeader(props: { greeting: string; firstName: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">
        {props.greeting}, {props.firstName}
      </h1>
      {props.subtitle ? <p className="text-white/70 mt-2">{props.subtitle}</p> : null}
    </div>
  );
}

function StartCvHero(props: { firstName: string }) {
  const firstName = props.firstName;
  return (
    <div
      className="rounded-2xl shadow-lg p-6 sm:p-10"
      style={{
        backgroundImage:
          "linear-gradient(to bottom right, var(--brand-accent,#FF8A00), var(--brand-accent-light,#FF9C33))",
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-grad-from,#1a1a40)]">
            Step 1 of getting hired
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-grad-from,#1a1a40)]">
            Start refining your CV here, {firstName}
          </h2>
          <p className="text-base text-[var(--brand-grad-from,#1a1a40)]/80">
            Upload your CV and let Annix Orbit polish it with AI, then match you to suitable jobs.
            It only takes a couple of minutes and everything else unlocks from here.
          </p>
        </div>
        <Link
          href="/annix/orbit/seeker/profile"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--brand-navbar-active,#252560)] px-7 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-[var(--brand-grad-from,#1a1a40)] hover:shadow-lg"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Refine my CV
        </Link>
      </div>
    </div>
  );
}

function StatCard(props: {
  tone: "brand" | "blue" | "accent" | "emerald";
  iconPath: string;
  label: string;
  value: string;
  sub: string;
  href: string;
}) {
  const tone = props.tone;
  const wrapStyle =
    tone === "brand"
      ? { backgroundColor: "var(--brand-navbar-50,#f0f0fc)" }
      : tone === "accent"
        ? { backgroundColor: "rgba(255,138,0,0.12)" }
        : undefined;
  const iconStyle =
    tone === "brand"
      ? { color: "var(--brand-navbar,#323288)" }
      : tone === "accent"
        ? { color: "var(--brand-accent,#FF8A00)" }
        : undefined;
  const wrapClass = tone === "blue" ? "bg-blue-50" : tone === "emerald" ? "bg-emerald-50" : "";
  const iconClass =
    tone === "blue"
      ? "text-blue-600 dark:text-blue-300"
      : tone === "emerald"
        ? "text-emerald-600"
        : "";

  return (
    <Link
      href={props.href}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-4"
    >
      <span
        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${wrapClass}`}
        style={wrapStyle}
      >
        <svg
          aria-hidden="true"
          className={`w-6 h-6 ${iconClass}`}
          style={iconStyle}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={props.iconPath} />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{props.label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-gray-900 leading-tight">{props.value}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{props.sub}</p>
      </div>
    </Link>
  );
}

function ProfileStrengthCard(props: {
  completedSteps: number;
  totalSteps: number;
  strengthPercent: number;
  checklist: { label: string; done: boolean; href: string }[];
  hasCv: boolean;
}) {
  const widthStyle = { width: `${props.strengthPercent}%` };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Complete your profile</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            A complete profile gets you more accurate matches and faster interview invites.
          </p>
        </div>
        <span className="text-sm font-semibold text-[var(--brand-navbar,#323288)] dark:text-[#9ea0e8]">
          {props.completedSteps} of {props.totalSteps} done
        </span>
      </div>

      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            ...widthStyle,
            backgroundImage:
              "linear-gradient(to right, var(--brand-navbar,#323288), var(--brand-accent,#FF8A00))",
          }}
        />
      </div>

      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {props.checklist.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="flex items-center gap-3 group">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.done
                    ? "bg-emerald-100 text-emerald-700"
                    : "border-2 border-gray-300 text-transparent group-hover:border-[var(--brand-navbar,#323288)]"
                }`}
              >
                <svg
                  aria-hidden="true"
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span
                className={`text-sm ${
                  item.done
                    ? "text-gray-400 line-through"
                    : "text-gray-700 group-hover:text-[var(--brand-navbar,#323288)]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionCard(props: {
  title: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
        <Link
          href={props.actionHref}
          className="text-sm font-medium text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] dark:text-[#9ea0e8] dark:hover:text-[#c0c0eb]"
        >
          {props.actionLabel} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="flex-1">{props.children}</div>
    </div>
  );
}

function MatchRow(props: { match: SeekerRecommendedJob }) {
  const match = props.match;
  const job = match.job;
  const overall = Math.round(match.overallScore * 100);
  const company = job.company;
  const location = job.locationRaw ? job.locationRaw : job.locationArea;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const widthStyle = { width: `${Math.min(100, Math.max(0, overall))}%` };
  return (
    <Link
      href="/annix/orbit/seeker/jobs"
      className="block rounded-lg border border-gray-100 p-3 hover:border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{job.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {company ? company : "Employer"}
            {location ? ` · ${location}` : ""}
          </p>
        </div>
        {salary ? (
          <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">{salary}</span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span className="font-medium">Match {overall}%</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--brand-navbar,#323288)] rounded-full"
            style={widthStyle}
          />
        </div>
      </div>
    </Link>
  );
}

function ApplicationRow(props: { application: SeekerApplication }) {
  const app = props.application;
  const status = app.status;
  const statusLabel = STATUS_LABEL[status];
  const statusClass = STATUS_CLASS[status];
  const company = app.company;
  return (
    <li className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{app.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {company ? company : "—"} · {formatDateZA(app.appliedAt)}
          </p>
        </div>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

function EmptyState(props: { title: string; body: string; ctaLabel?: string; ctaHref?: string }) {
  const ctaLabel = props.ctaLabel;
  const ctaHref = props.ctaHref;
  const showCta = Boolean(ctaLabel) && Boolean(ctaHref);
  return (
    <div className="text-center py-8 px-4">
      <p className="text-sm font-medium text-gray-700">{props.title}</p>
      <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{props.body}</p>
      {showCta && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center justify-center bg-[var(--brand-navbar,#323288)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] transition-colors"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function QuickAction(props: { label: string; href: string; iconPath: string }) {
  return (
    <Link
      href={props.href}
      className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center gap-2 text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <span className="w-9 h-9 rounded-lg bg-[var(--brand-navbar-50,#f0f0fc)] flex items-center justify-center">
        <svg
          aria-hidden="true"
          className="w-5 h-5 text-[var(--brand-navbar,#323288)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={props.iconPath} />
        </svg>
      </span>
      <span className="text-sm font-medium text-gray-800">{props.label}</span>
    </Link>
  );
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const symbol = currency === "ZAR" ? "R" : currency ? `${currency} ` : "";
  if (min != null && max != null) {
    return `${symbol}${formatThousands(min)} - ${symbol}${formatThousands(max)}`;
  }
  if (min != null) return `From ${symbol}${formatThousands(min)}`;
  if (max != null) return `Up to ${symbol}${formatThousands(max)}`;
  return null;
}

function formatThousands(n: number): string {
  return Math.round(n).toLocaleString("en-ZA");
}
