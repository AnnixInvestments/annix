"use client";

import Link from "next/link";
import { useCvAssistantAuth } from "@/app/context/CvAssistantAuthContext";
import { useCvMyProfileStatus } from "@/app/lib/query/hooks";

export default function SeekerDashboardPage() {
  const { user } = useCvAssistantAuth();
  const statusQuery = useCvMyProfileStatus();
  const userName = user?.name;
  const firstNameToken = userName ? userName.split(" ")[0] : null;
  const firstName = firstNameToken ? firstNameToken : "there";
  const status = statusQuery.data;
  const missingOptional =
    status?.hasCv && (status.qualificationsCount === 0 || status.certificatesCount === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {firstName}</h1>
        <p className="text-gray-600 mt-2">
          Your CV Assistant job seeker workspace. We will be adding more here soon.
        </p>
      </div>

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
