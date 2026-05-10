"use client";

import Link from "next/link";
import { useCvAssistantAuth } from "@/app/context/CvAssistantAuthContext";
import { formatDateLongZA } from "@/app/lib/datetime";
import {
  useCvMyInterviewInvites,
  useCvMyProfileStatus,
  useCvSeekerJobStats,
} from "@/app/lib/query/hooks";

export default function SeekerDashboardPage() {
  const { user } = useCvAssistantAuth();
  const statusQuery = useCvMyProfileStatus();
  const invitesQuery = useCvMyInterviewInvites();
  const jobStatsQuery = useCvSeekerJobStats();
  const userName = user?.name;
  const firstNameToken = userName ? userName.split(" ")[0] : null;
  const firstName = firstNameToken ? firstNameToken : "there";
  const status = statusQuery.data;
  const hasCv = status ? status.hasCv : false;
  const missingOptional =
    hasCv && status && (status.qualificationsCount === 0 || status.certificatesCount === 0);

  const invitesData = invitesQuery.data;
  const invites = invitesData ? invitesData : [];
  const openInvites = invites.filter((invite) => invite.usedAt === null);

  const jobStats = jobStatsQuery.data;
  const showJobStats = jobStats ? jobStats.hasCandidate : false;
  const matchesLast7Days = jobStats ? jobStats.matchesLast7Days : 0;
  const totalMatches = jobStats ? jobStats.totalMatches : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome, {firstName}</h1>
        <p className="text-white/70 mt-2">
          Your CV Assistant job seeker workspace. We will be adding more here soon.
        </p>
      </div>

      {showJobStats ? (
        <Link
          href="/cv-assistant/seeker/jobs"
          className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Matched jobs</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {matchesLast7Days}
                <span className="ml-2 text-sm font-normal text-gray-500">new this week</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {totalMatches} active match{totalMatches === 1 ? "" : "es"} in total
              </p>
            </div>
            <span className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100">
              Browse jobs →
            </span>
          </div>
        </Link>
      ) : null}

      {openInvites.length > 0 ? (
        <div className="bg-gradient-to-br from-[#FFA500] to-[#FFB733] rounded-xl shadow-lg p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
              ✉
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[#1a1a40]">
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
                        <p className="text-sm font-semibold text-[#1a1a40] truncate">
                          {jobTitle}
                          {jobLocation ? (
                            <span className="text-gray-600 font-normal">
                              {" — "}
                              {jobLocation}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-gray-500">
                          Reply by {formatDateLongZA(invite.expiresAt)}
                        </p>
                      </div>
                      <Link
                        href={`/cv-assistant/interview-booking/${invite.token}`}
                        className="text-xs font-semibold px-3 py-1.5 bg-[#252560] text-white rounded-lg hover:bg-[#1a1a40] whitespace-nowrap"
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

      {!hasCv && (
        <div className="rounded-xl bg-gradient-to-br from-[#FFA500] to-[#FFB733] shadow-lg p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a40]">
              Ready to find your next role?
            </h2>
            <p className="text-[#1a1a40]/80">
              Upload your CV and let CV Assistant match you to suitable jobs.
            </p>
          </div>
          <Link
            href="/cv-assistant/seeker/profile"
            className="inline-flex items-center px-6 py-3 text-base bg-[#252560] text-white hover:bg-[#1a1a40] font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload CV
          </Link>
        </div>
      )}

      {missingOptional && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900">
              Add qualifications and certificates to improve your matches
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Your CV is uploaded — matches will work, but more documents make them more accurate.
            </p>
          </div>
          <Link
            href="/cv-assistant/seeker/profile"
            className="text-sm font-medium text-amber-900 hover:text-amber-950 underline whitespace-nowrap"
          >
            Add documents
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardTile
          title="My CV"
          description="Upload, edit, and improve your CV with AI suggestions."
          href="/cv-assistant/seeker/profile"
          cta="Open my CV"
        />
        <DashboardTile
          title="Browse Jobs"
          description="See opportunities matched to your skills and experience."
          href="/cv-assistant/seeker/jobs"
          cta="See jobs"
        />
        <DashboardTile
          title="Applications"
          description="Track jobs you have applied to and their status."
          href="/cv-assistant/seeker/applications"
          cta="View applications"
        />
      </div>
    </div>
  );
}

function DashboardTile(props: { title: string; description: string; href: string; cta: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e0e0f5] p-6 flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
      <p className="text-sm text-gray-600 mt-2 flex-1">{props.description}</p>
      <Link
        href={props.href}
        className="mt-4 inline-flex items-center justify-center bg-[#323288] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#252560] transition-colors"
      >
        {props.cta}
      </Link>
    </div>
  );
}
