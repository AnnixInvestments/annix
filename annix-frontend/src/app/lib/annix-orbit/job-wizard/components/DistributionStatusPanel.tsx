"use client";

import { useState } from "react";
import type { AssistedPostingPackEntry, JobDistributionEntry } from "@/app/lib/api/annixOrbitApi";
import {
  useOrbitAssistedPostingPack,
  useOrbitJobDistribution,
  useOrbitMarkChannelSubmitted,
} from "@/app/lib/query/hooks";

const STATUS_META: Record<string, { label: string; className: string }> = {
  in_feed: { label: "In feed", className: "bg-emerald-100 text-emerald-800" },
  posted: { label: "Posted", className: "bg-emerald-100 text-emerald-800" },
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-800" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  skipped: { label: "Skipped", className: "bg-amber-100 text-amber-800" },
  unposted: { label: "Removed", className: "bg-gray-100 text-gray-500" },
  abandoned: { label: "Abandoned", className: "bg-red-100 text-red-700" },
};

const MODE_LABEL: Record<string, string> = {
  feed: "Feed / indexed",
  api: "Automated",
  assisted: "Manual",
};

function StatusBadge({ status }: { status: string }) {
  const found = STATUS_META[status];
  const meta = found ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.className}`}>
      {meta.label}
    </span>
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function AssistedActions({
  jobPostingId,
  entry,
  pack,
}: {
  jobPostingId: number;
  entry: JobDistributionEntry;
  pack: AssistedPostingPackEntry | undefined;
}) {
  const markSubmitted = useOrbitMarkChannelSubmitted();
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (field: string, value: string) => {
    if (await copyText(value)) {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  const currentStatus = entry.status;
  const alreadyDone = currentStatus === "submitted" || currentStatus === "posted";
  const isSaving = markSubmitted.isPending;

  return (
    <div className="mt-2 rounded-lg border border-[#e0e0f5] bg-[#f8f8fe] p-3 space-y-2 text-xs">
      {pack ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={pack.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded bg-[#252560] px-2.5 py-1 font-semibold text-white hover:bg-[#1a1a40]"
            >
              Open {entry.displayName} ↗
            </a>
            <button
              type="button"
              onClick={() => handleCopy("title", pack.copyTitle)}
              className="rounded border border-gray-300 px-2 py-1 hover:bg-white"
            >
              {copied === "title" ? "Copied" : "Copy title"}
            </button>
            <button
              type="button"
              onClick={() => handleCopy("body", pack.copyBody)}
              className="rounded border border-gray-300 px-2 py-1 hover:bg-white"
            >
              {copied === "body" ? "Copied" : "Copy advert"}
            </button>
          </div>
          {pack.notes ? <p className="text-gray-500">{pack.notes}</p> : null}
        </>
      ) : (
        <p className="text-gray-500">Open the board and paste this job's details.</p>
      )}
      <button
        type="button"
        disabled={isSaving || alreadyDone}
        onClick={() => markSubmitted.mutate({ id: jobPostingId, portalCode: entry.portalCode })}
        className="rounded bg-[#FF8A00] px-3 py-1 font-semibold text-[#1a1a40] hover:bg-[#FF9C33] disabled:opacity-50"
      >
        {alreadyDone ? "Marked as submitted" : isSaving ? "Saving…" : "Mark as submitted"}
      </button>
    </div>
  );
}

export function DistributionStatusPanel({ jobPostingId }: { jobPostingId: number }) {
  const { data: entries, isLoading, isError } = useOrbitJobDistribution(jobPostingId);
  const hasAssisted = (entries ?? []).some((entry) => entry.postingMode === "assisted");
  const { data: packs } = useOrbitAssistedPostingPack(hasAssisted ? jobPostingId : null);
  const packByCode = new Map((packs ?? []).map((pack) => [pack.portalCode, pack]));

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading distribution status…</p>;
  }
  if (isError || !entries) {
    return <p className="text-sm text-red-600">Couldn't load distribution status.</p>;
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No channels yet — publish the job to distribute it to your careers page, Google for Jobs and
        the Orbit jobs feed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#1a1a40]">Distribution status</p>
        <p className="text-xs text-gray-500">
          Where this job has actually reached. Feed channels index automatically; manual channels
          need you to post and mark them done.
        </p>
      </div>
      <ul className="space-y-2">
        {entries.map((entry) => {
          const modeLookup = MODE_LABEL[entry.postingMode];
          const modeLabel = modeLookup ?? entry.postingMode;
          const skipReason = entry.skipReason;
          const url = entry.portalUrl;
          return (
            <li
              key={entry.portalCode}
              className="rounded-lg border border-[#252560]/15 bg-white px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium text-[#1a1a40]">{entry.displayName}</span>
                  <span className="ml-2 text-xs text-gray-400">{modeLabel}</span>
                </div>
                <StatusBadge status={entry.status} />
              </div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#323288] underline break-all"
                >
                  {url}
                </a>
              ) : null}
              {entry.lastError ? (
                <p className="text-xs text-red-600 mt-0.5">{entry.lastError}</p>
              ) : null}
              {skipReason ? (
                <p className="text-xs text-amber-700 mt-0.5">
                  Skipped:{" "}
                  {skipReason === "unknown_channel"
                    ? "this channel isn't available."
                    : "monthly budget reached."}
                </p>
              ) : null}
              {entry.postingMode === "assisted" ? (
                <AssistedActions
                  jobPostingId={jobPostingId}
                  entry={entry}
                  pack={packByCode.get(entry.portalCode)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
