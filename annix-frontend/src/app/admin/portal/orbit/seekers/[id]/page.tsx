"use client";

import { isArray } from "es-toolkit/compat";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OrbitSeekerActivityDay } from "@/app/lib/api/adminApi";
import { DateTime, formatDateZA } from "@/app/lib/datetime";
import { useAdminOrbitSeekerDetail } from "@/app/lib/query/hooks";

type ActivityGrain = "day" | "week" | "month";

function tierClass(tier: string): string {
  if (tier === "hard") {
    return "bg-green-100 text-green-700";
  }
  if (tier === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
}

function statusClass(status: string): string {
  if (status === "active" || status === "accepted") {
    return "bg-green-100 text-green-700";
  }
  if (status === "new" || status === "screening") {
    return "bg-blue-100 text-blue-700";
  }
  if (status === "shortlisted" || status === "reference_check") {
    return "bg-violet-100 text-violet-700";
  }
  if (status === "suspended" || status === "rejected" || status === "deactivated") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-600";
}

function bucketKey(day: string, grain: ActivityGrain): string {
  const dt = DateTime.fromISO(day);
  if (!dt.isValid) {
    return day;
  }
  if (grain === "week") {
    const start = dt.startOf("week");
    return start.toFormat("yyyy-LL-dd");
  }
  if (grain === "month") {
    return dt.toFormat("yyyy-LL");
  }
  return dt.toFormat("yyyy-LL-dd");
}

function bucketLabel(key: string, grain: ActivityGrain): string {
  if (grain === "month") {
    const dt = DateTime.fromFormat(key, "yyyy-LL");
    return dt.isValid ? dt.toFormat("LLL yyyy") : key;
  }
  const dt = DateTime.fromISO(key);
  if (!dt.isValid) {
    return key;
  }
  if (grain === "week") {
    return `w/c ${dt.toFormat("d LLL")}`;
  }
  return dt.toFormat("d LLL");
}

function bucketStart(dt: DateTime, grain: ActivityGrain): DateTime {
  if (grain === "week") {
    return dt.startOf("week");
  }
  if (grain === "month") {
    return dt.startOf("month");
  }
  return dt.startOf("day");
}

function stepBucket(dt: DateTime, grain: ActivityGrain): DateTime {
  if (grain === "week") {
    return dt.plus({ weeks: 1 });
  }
  if (grain === "month") {
    return dt.plus({ months: 1 });
  }
  return dt.plus({ days: 1 });
}

const MAX_BUCKETS = 366;

function aggregateActivity(
  activity: OrbitSeekerActivityDay[],
  grain: ActivityGrain,
  joinedIso: string | null,
): Array<{ key: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  activity.forEach((row) => {
    const key = bucketKey(row.day, grain);
    const existing = counts.get(key) ?? 0;
    counts.set(key, existing + row.count);
  });

  const joined = joinedIso ? DateTime.fromISO(joinedIso) : null;
  const activityStarts = activity
    .map((row) => DateTime.fromISO(row.day))
    .filter((dt) => dt.isValid);
  const earliestActivity =
    activityStarts.length > 0
      ? activityStarts.reduce((min, dt) => (dt < min ? dt : min), activityStarts[0])
      : null;

  const startCandidate = joined?.isValid ? joined : (earliestActivity ?? DateTime.now());
  const start = bucketStart(startCandidate, grain);
  const end = bucketStart(DateTime.now(), grain);

  const unit = grain === "month" ? "months" : grain === "week" ? "weeks" : "days";
  const spanRaw = Math.floor(end.diff(start, unit).as(unit));
  const span = Math.max(0, Math.min(spanRaw, MAX_BUCKETS - 1));

  return Array.from({ length: span + 1 }, (_unused, index) => {
    const cursor = start.plus({ [unit]: index });
    const key = grain === "month" ? cursor.toFormat("yyyy-LL") : cursor.toFormat("yyyy-LL-dd");
    return { key, label: bucketLabel(key, grain), count: counts.get(key) ?? 0 };
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function OrbitSeekerDetailPage() {
  const params = useParams();
  const rawId = params.id;
  const idString = isArray(rawId) ? rawId[0] : rawId;
  const seekerId = Number(idString);
  const detailQuery = useAdminOrbitSeekerDetail(seekerId);
  const [grain, setGrain] = useState<ActivityGrain>("day");

  const detail = detailQuery.data;
  const activity = detail ? detail.activity : [];
  const joinedIso = detail ? detail.createdAt : null;
  const chartData = useMemo(
    () => aggregateActivity(activity, grain, joinedIso),
    [activity, grain, joinedIso],
  );
  const activeDays = activity.length;
  const totalVisits = activity.reduce((sum, row) => sum + row.count, 0);

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  const isErrorState = detailQuery.isError;
  if (isErrorState || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/portal/orbit/seekers"
          className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1"
        >
          ← Seekers
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-sm">
          Could not load this seeker. They may have been removed.
        </div>
      </div>
    );
  }

  const detailName = detail.name;
  const detailEmail = detail.email;
  const name = detailName || "—";
  const email = detailEmail || "—";
  const tierBadge = tierClass(detail.matchTier);
  const statusBadge = statusClass(detail.status);
  const lastActive = detail.lastActiveAt ? formatDateZA(detail.lastActiveAt) : "Never";
  const joined = detail.createdAt ? formatDateZA(detail.createdAt) : "—";
  const consentLabel = detail.popiaConsent
    ? `Granted${detail.popiaConsentedAt ? ` ${formatDateZA(detail.popiaConsentedAt)}` : ""}`
    : "Not granted";
  const dismissWarningAcknowledgedAt = detail.dismissWarningAcknowledgedAt;
  const dismissWarningLabel = dismissWarningAcknowledgedAt
    ? `Accepted ${formatDateZA(dismissWarningAcknowledgedAt)}`
    : "Not yet shown / accepted";
  const cv = detail.cv;
  const cvLocationRaw = cv.location;
  const cvLocation = cvLocationRaw || "—";
  const matchAnalysis = detail.matchAnalysis;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/portal/orbit/seekers"
            className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
          >
            ← Seekers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-gray-600 mt-1 text-sm">{email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>
              {detail.status}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge}`}>
              tier: {detail.matchTier}
            </span>
            {detail.matchScore !== null ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                score: {detail.matchScore}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/admin/portal/orbit/seeker-tiers"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 whitespace-nowrap"
        >
          Change tier →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Last active" value={lastActive} />
        <StatCard label="Joined" value={joined} />
        <StatCard label="Total matches" value={String(detail.stats.totalMatches)} />
        <StatCard label="Matches (7 days)" value={String(detail.stats.matchesLast7Days)} />
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Activity history</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeDays} active day{activeDays === 1 ? "" : "s"} · {totalVisits} session
              {totalVisits === 1 ? "" : "s"} tracked
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {(["day", "week", "month"] as ActivityGrain[]).map((g) => {
              const isActive = grain === g;
              const cls = isActive
                ? "bg-violet-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50";
              const labelText = g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly";
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrain(g)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${cls}`}
                >
                  {labelText}
                </button>
              );
            })}
          </div>
        </div>

        {totalVisits === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No activity recorded yet. Visits appear here once the seeker uses the platform.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Sessions"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#7c3aed" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">CV summary</h2>
          {cv.summary ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{cv.summary}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No CV summary extracted.</p>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Detail
              label="Experience"
              value={cv.experienceYears !== null ? `${cv.experienceYears} yrs` : "—"}
            />
            <Detail label="Location" value={cvLocation} />
            <Detail label="Has CV" value={detail.hasCv ? "Yes" : "No"} />
            <Detail label="POPIA consent" value={consentLabel} />
            <Detail label="Dismiss warning" value={dismissWarningLabel} />
          </div>
          {cv.skills.length > 0 ? <ChipList title="Skills" items={cv.skills} /> : null}
          {cv.certifications.length > 0 ? (
            <ChipList title="Certifications" items={cv.certifications} />
          ) : null}
          {cv.education.length > 0 ? <ChipList title="Education" items={cv.education} /> : null}
          {cv.professionalRegistrations.length > 0 ? (
            <ChipList title="Professional registrations" items={cv.professionalRegistrations} />
          ) : null}
          {cv.saQualifications.length > 0 ? (
            <ChipList title="SA qualifications" items={cv.saQualifications} />
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            {detail.documents.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {detail.documents.map((doc) => {
                  const uploaded = doc.uploadedAt ? formatDateZA(doc.uploadedAt) : "—";
                  return (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.originalFilename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.kind} · {formatBytes(doc.sizeBytes)} · {uploaded}
                        </p>
                      </div>
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-violet-600 hover:text-violet-800 whitespace-nowrap"
                      >
                        Download
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">References</h2>
            {detail.references.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No references.</p>
            ) : (
              <ul className="space-y-2">
                {detail.references.map((ref) => {
                  const submitted = ref.submittedAt ? formatDateZA(ref.submittedAt) : null;
                  const ratingText = ref.rating !== null ? `${ref.rating}/5` : null;
                  return (
                    <li
                      key={ref.id}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{ref.name}</span>
                        <span className="text-xs text-gray-500">{ref.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ref.email}
                        {ref.relationship ? ` · ${ref.relationship}` : ""}
                        {ratingText ? ` · ${ratingText}` : ""}
                        {submitted ? ` · ${submitted}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {matchAnalysis ? (
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Match analysis</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              score: {matchAnalysis.overallScore}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {matchAnalysis.recommendation}
            </span>
          </div>
          {matchAnalysis.reasoning ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{matchAnalysis.reasoning}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{props.label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{props.value}</p>
    </div>
  );
}

function Detail(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{props.label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{props.value}</p>
    </div>
  );
}

function dedupeKeyed(items: string[]): Array<{ key: string; value: string }> {
  const seen = new Map<string, number>();
  return items.map((value) => {
    const occurrence = seen.get(value) ?? 0;
    seen.set(value, occurrence + 1);
    return { key: occurrence === 0 ? value : `${value}#${occurrence}`, value };
  });
}

function ChipList(props: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{props.title}</p>
      <div className="flex flex-wrap gap-1.5">
        {dedupeKeyed(props.items).map((entry) => (
          <span
            key={entry.key}
            className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
          >
            {entry.value}
          </span>
        ))}
      </div>
    </div>
  );
}
