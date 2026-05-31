"use client";

import Link from "next/link";
import { formatDateZA } from "@/app/lib/datetime";
import { useOrbitSeekerApplications } from "@/app/lib/query/hooks";

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const isRand = currency != null && currency.toUpperCase() === "ZAR";
  const prefix = isRand ? "R" : currency ? `${currency} ` : "";
  const fmt = (value: number) => `${prefix}${Math.round(value).toLocaleString()}`;
  if (min != null && max != null) {
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }
  const single = min != null ? min : max;
  return single != null ? fmt(single) : null;
}

export default function SeekerApplicationsPage() {
  const query = useOrbitSeekerApplications();
  const data = query.data;
  const applications = data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Applications</h1>
        <p className="text-white/70 mt-2">Track jobs you have applied to.</p>
      </div>

      {query.isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading your applications…
        </div>
      ) : query.isError ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your applications right now. Try refreshing the page.
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No applications yet</h2>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            When you open a job with “View &amp; apply” on Browse Jobs, it’ll show up here so you
            can keep track of where you’ve applied.
          </p>
          <Link
            href="/annix/orbit/seeker/jobs"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const company = app.company;
            const location = app.location;
            const sourceUrl = app.sourceUrl;
            const appliedAt = app.appliedAt;
            const companyLabel = company || "Company not listed";
            const salaryLabel = formatSalary(app.salaryMin, app.salaryMax, app.salaryCurrency);
            return (
              <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">{app.title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {companyLabel}
                      {location ? ` · ${location}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Applied {appliedAt ? formatDateZA(appliedAt) : "recently"}
                      {salaryLabel ? ` · ${salaryLabel}` : ""}
                    </p>
                  </div>
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      View listing
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
