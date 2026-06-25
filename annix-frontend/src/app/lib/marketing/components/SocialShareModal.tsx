"use client";

import type { MarketingResource, MarketingSiteContent } from "@annix/product-data/marketing";
import { Check, Clock, Loader2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DateTime } from "@/app/lib/datetime";
import {
  marketingAdminApi,
  type ScheduledSocialPost,
  type SocialPlatform,
  type SocialPlatformStatus,
  type SocialShareResult,
} from "@/app/lib/marketing/api";

type ImageMode = "resource" | "custom";
type When = "now" | "schedule";

// All scheduling is expressed in South African wall-clock time, then converted
// to UTC before it leaves the browser, so "08:00" always means 08:00 in Joburg
// regardless of where the admin is sitting.
const SA_ZONE = "Africa/Johannesburg";

// Recommended posting windows for Annix Orbit's audience (professionals, job
// seekers, recruiters, students). weekday follows Luxon's 1=Mon … 7=Sun.
const RECOMMENDED_SLOTS: Record<
  SocialPlatform,
  { weekday: number; hour: number; label: string }[]
> = {
  linkedin: [
    { weekday: 2, hour: 8, label: "Tue 08:00" },
    { weekday: 4, hour: 8, label: "Thu 08:00" },
  ],
  facebook: [
    { weekday: 3, hour: 13, label: "Wed 13:00" },
    { weekday: 6, hour: 10, label: "Sat 10:00" },
  ],
  instagram: [
    { weekday: 1, hour: 19, label: "Mon 19:00" },
    { weekday: 3, hour: 19, label: "Wed 19:00" },
    { weekday: 5, hour: 19, label: "Fri 19:00" },
  ],
  x: [{ weekday: 2, hour: 8, label: "Tue 08:00" }],
};

const ALL_PLATFORMS: SocialPlatform[] = ["linkedin", "facebook", "instagram", "x"];

function captionForResource(title: string, body: string): string {
  return body ? `${title}\n\n${body}` : title;
}

// Next future occurrence of a weekday+hour in SA time, as a datetime-local value.
function nextSlot(weekday: number, hour: number): string {
  const nowSa = DateTime.now().setZone(SA_ZONE);
  // Luxon types weekday as a 1–7 literal; our slots are plain numbers.
  const isoWeekday = weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  let cand = nowSa.set({ weekday: isoWeekday, hour, minute: 0, second: 0, millisecond: 0 });
  if (cand <= nowSa) {
    cand = cand.plus({ weeks: 1 });
  }
  return cand.toFormat("yyyy-LL-dd'T'HH:mm");
}

function defaultSlotFor(platform: SocialPlatform): string {
  const slots = RECOMMENDED_SLOTS[platform];
  const first = slots && slots.length > 0 ? slots[0] : { weekday: 2, hour: 8 };
  return nextSlot(first.weekday, first.hour);
}

function formatSaDisplay(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const dt = DateTime.fromISO(iso).setZone(SA_ZONE);
  return dt.isValid ? `${dt.toFormat("EEE d LLL HH:mm")} SA` : "";
}

function statusTone(status: string): string {
  if (status === "posted") return "text-green-600";
  if (status === "failed") return "text-red-600";
  if (status === "cancelled") return "text-gray-400";
  return "text-[#323288]";
}

export function SocialShareModal(props: {
  isOpen: boolean;
  onClose: () => void;
  content: MarketingSiteContent;
  initialResource: MarketingResource | null;
  onError: (message: string) => void;
}) {
  const { onError } = props;
  const [statuses, setStatuses] = useState<SocialPlatformStatus[]>([]);
  const [selected, setSelected] = useState<SocialPlatform[]>([]);
  const [imageMode, setImageMode] = useState<ImageMode>("resource");
  const [resourceSlug, setResourceSlug] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [when, setWhen] = useState<When>("now");
  const [times, setTimes] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<SocialShareResult[] | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledSocialPost[]>([]);

  const isOpen = props.isOpen;
  const resourcesWithImages = props.content.resources.items.filter(
    (resource) => resource.imageUrl !== null && resource.imageUrl !== "",
  );

  const seedAllCaptions = useCallback((text: string) => {
    const seeded: Record<string, string> = {};
    for (const platform of ALL_PLATFORMS) {
      seeded[platform] = text;
    }
    setCaptions(seeded);
  }, []);

  const refreshScheduled = useCallback(() => {
    marketingAdminApi
      .listScheduledSocials()
      .then(setScheduled)
      .catch(() => {
        /* the list is supplementary; don't block the modal on it */
      });
  }, []);

  const initialResource = props.initialResource;
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setResults(null);
    setWhen("now");
    const defaultTimes: Record<string, string> = {};
    for (const platform of ALL_PLATFORMS) {
      defaultTimes[platform] = defaultSlotFor(platform);
    }
    setTimes(defaultTimes);

    if (initialResource) {
      const cover = initialResource.imageUrl ? initialResource.imageUrl : "";
      setImageMode(cover ? "resource" : "custom");
      setResourceSlug(initialResource.slug);
      setImageUrl(cover);
      const resourceBody = initialResource.body;
      seedAllCaptions(captionForResource(initialResource.title, resourceBody ?? ""));
    } else {
      setImageMode("resource");
      setResourceSlug("");
      setImageUrl("");
      seedAllCaptions("");
    }

    marketingAdminApi
      .socialStatus()
      .then((data) => {
        setStatuses(data);
        setSelected(data.filter((entry) => entry.configured).map((entry) => entry.platform));
      })
      .catch(() => onError("Could not load social connection status."));
    refreshScheduled();
  }, [isOpen, initialResource, onError, seedAllCaptions, refreshScheduled]);

  function applyResource(slug: string) {
    setResourceSlug(slug);
    const resource = resourcesWithImages.find((entry) => entry.slug === slug);
    if (resource) {
      const cover = resource.imageUrl ? resource.imageUrl : "";
      setImageUrl(cover);
      const resourceBody = resource.body;
      seedAllCaptions(captionForResource(resource.title, resourceBody ?? ""));
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const result = await marketingAdminApi.uploadImage(file);
      setImageUrl(result.url);
    } catch {
      onError("Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function togglePlatform(platform: SocialPlatform, configured: boolean) {
    if (!configured) {
      return;
    }
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((entry) => entry !== platform) : [...prev, platform],
    );
  }

  function labelFor(platform: SocialPlatform): string {
    const match = statuses.find((entry) => entry.platform === platform);
    return match ? match.label : platform;
  }

  function captionFor(platform: SocialPlatform): string {
    const value = captions[platform];
    return value ?? "";
  }

  function timeFor(platform: SocialPlatform): string {
    const value = times[platform];
    return value ?? "";
  }

  function setCaption(platform: SocialPlatform, value: string) {
    setCaptions((prev) => ({ ...prev, [platform]: value }));
  }

  function setTime(platform: SocialPlatform, value: string) {
    setTimes((prev) => ({ ...prev, [platform]: value }));
  }

  async function handleSubmit() {
    if (selected.length === 0 || !imageUrl || posting) {
      return;
    }
    const missingCaption = selected.find((platform) => !captionFor(platform).trim());
    if (missingCaption) {
      onError(`Add a caption for ${labelFor(missingCaption)}.`);
      return;
    }

    if (when === "now") {
      setPosting(true);
      setResults(null);
      try {
        const data = await marketingAdminApi.postSocialsNow({
          imageUrl,
          items: selected.map((platform) => ({ platform, caption: captionFor(platform) })),
        });
        setResults(data);
      } catch {
        onError("Could not reach the sharing service. Please try again.");
      } finally {
        setPosting(false);
      }
      return;
    }

    // Scheduled: every selected platform needs a valid future SA time. The
    // datetime-local value is SA wall-clock; convert it to UTC for the API.
    const items: { platform: SocialPlatform; caption: string; scheduledAt: string }[] = [];
    for (const platform of selected) {
      const dt = DateTime.fromISO(timeFor(platform), { zone: SA_ZONE });
      if (!dt.isValid) {
        onError(`Pick a valid time for ${labelFor(platform)}.`);
        return;
      }
      if (dt <= DateTime.now()) {
        onError(`The time for ${labelFor(platform)} is in the past — pick a future time.`);
        return;
      }
      const iso = dt.toUTC().toISO();
      if (!iso) {
        onError(`Pick a valid time for ${labelFor(platform)}.`);
        return;
      }
      items.push({ platform, caption: captionFor(platform), scheduledAt: iso });
    }

    setPosting(true);
    setResults(null);
    try {
      const created = await marketingAdminApi.scheduleSocials({ imageUrl, items });
      setResults(
        created.map((post) => ({
          platform: post.platform,
          ok: true,
          message: `Scheduled for ${formatSaDisplay(post.scheduledAt)}.`,
        })),
      );
      refreshScheduled();
    } catch {
      onError("Could not schedule the posts. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleCancelScheduled(id: string) {
    try {
      await marketingAdminApi.cancelScheduledSocial(id);
      refreshScheduled();
    } catch {
      onError("Could not cancel that scheduled post.");
    }
  }

  if (!isOpen) {
    return null;
  }

  const anyConfigured = statuses.some((entry) => entry.configured);
  const canSubmit = selected.length > 0 && imageUrl !== "" && !posting;
  const pendingScheduled = scheduled.filter((post) => post.status === "pending");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Share to socials</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {!anyConfigured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No social accounts are connected yet. Once the platform credentials are added, the
              toggles below will activate. You can still set up a post in the meantime.
            </div>
          ) : null}

          {/* Image source */}
          <div className="flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setImageMode("resource")}
              className={
                imageMode === "resource"
                  ? "flex-1 rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              From a resource
            </button>
            <button
              type="button"
              onClick={() => setImageMode("custom")}
              className={
                imageMode === "custom"
                  ? "flex-1 rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              Custom post
            </button>
          </div>

          {imageMode === "resource" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Resource (only those with a cover image)
              </span>
              <select
                value={resourceSlug}
                onChange={(event) => applyResource(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select a resource…</option>
                {resourcesWithImages.map((resource) => (
                  <option key={resource.slug} value={resource.slug}>
                    {resource.title}
                  </option>
                ))}
              </select>
              {resourcesWithImages.length === 0 ? (
                <span className="mt-1 block text-xs text-gray-400">
                  No resources have a cover image yet — upload one in the Resources section, or use
                  a custom post.
                </span>
              ) : null}
            </label>
          ) : (
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Image
              </span>
              <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="max-h-48 w-full rounded-lg border border-gray-200 object-contain"
            />
          ) : null}

          {/* Platform selection */}
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Post to
            </span>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((entry) => {
                const checked = selected.includes(entry.platform);
                return (
                  <button
                    key={entry.platform}
                    type="button"
                    onClick={() => togglePlatform(entry.platform, entry.configured)}
                    disabled={!entry.configured}
                    className={
                      checked
                        ? "flex items-center justify-between rounded-lg border border-[#323288] bg-[#323288]/5 px-3 py-2 text-sm font-medium text-gray-900"
                        : "flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    <span>{entry.label}</span>
                    {entry.configured ? (
                      checked ? (
                        <Check className="h-4 w-4 text-[#323288]" />
                      ) : null
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">
                        Not connected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timing */}
          <div className="flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setWhen("now")}
              className={
                when === "now"
                  ? "flex-1 rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              Post now
            </button>
            <button
              type="button"
              onClick={() => setWhen("schedule")}
              className={
                when === "schedule"
                  ? "flex-1 rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              Schedule
            </button>
          </div>

          {/* Per-platform caption + (when scheduling) time */}
          {selected.length === 0 ? (
            <p className="text-sm text-gray-400">Select at least one platform above.</p>
          ) : (
            <div className="space-y-4">
              {selected.map((platform) => (
                <div key={platform} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 text-sm font-semibold text-gray-900">
                    {labelFor(platform)}
                  </div>
                  <textarea
                    rows={3}
                    value={captionFor(platform)}
                    onChange={(event) => setCaption(platform, event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
                    placeholder={`Caption for ${labelFor(platform)}…`}
                  />
                  {when === "schedule" ? (
                    <div className="mt-2">
                      <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <input
                          type="datetime-local"
                          value={timeFor(platform)}
                          onChange={(event) => setTime(platform, event.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-gray-400">SA time</span>
                      </label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {RECOMMENDED_SLOTS[platform].map((slot) => (
                          <button
                            key={slot.label}
                            type="button"
                            onClick={() => setTime(platform, nextSlot(slot.weekday, slot.hour))}
                            className="rounded-full border border-[#323288]/30 bg-[#323288]/5 px-2.5 py-0.5 text-xs font-medium text-[#323288] hover:bg-[#323288]/10"
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {results ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              {results.map((result) => (
                <div key={result.platform} className="flex items-start gap-2 text-sm">
                  {result.ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span className={result.ok ? "text-gray-700" : "text-red-600"}>
                    {labelFor(result.platform)}: {result.message}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Upcoming scheduled posts */}
          {pendingScheduled.length > 0 ? (
            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Upcoming scheduled posts
              </span>
              <div className="space-y-1.5">
                {pendingScheduled.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{labelFor(post.platform)}</span>
                      <span className="ml-2 text-gray-500">
                        {formatSaDisplay(post.scheduledAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelScheduled(post.id)}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3">
          <span className={`text-xs ${statusTone("pending")}`}>
            {when === "schedule"
              ? "Each platform posts at its own time."
              : "Posts to all selected platforms immediately."}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-lg bg-[#FF8A00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e67c00] disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {posting
                ? when === "schedule"
                  ? "Scheduling…"
                  : "Posting…"
                : when === "schedule"
                  ? "Schedule all"
                  : "Post now"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
