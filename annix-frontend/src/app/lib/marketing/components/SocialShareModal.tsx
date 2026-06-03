"use client";

import type { MarketingResource, MarketingSiteContent } from "@annix/product-data/marketing";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  marketingAdminApi,
  type SocialPlatform,
  type SocialPlatformStatus,
  type SocialShareResult,
} from "@/app/lib/marketing/api";

type Mode = "resource" | "custom";

function captionForResource(title: string, excerpt: string): string {
  return excerpt ? `${title}\n\n${excerpt}` : title;
}

export function SocialShareModal(props: {
  isOpen: boolean;
  onClose: () => void;
  content: MarketingSiteContent;
  initialResource: MarketingResource | null;
  onError: (message: string) => void;
}) {
  const [statuses, setStatuses] = useState<SocialPlatformStatus[]>([]);
  const [selected, setSelected] = useState<SocialPlatform[]>([]);
  const [mode, setMode] = useState<Mode>("resource");
  const [resourceSlug, setResourceSlug] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState<SocialShareResult[] | null>(null);

  const isOpen = props.isOpen;
  const resourcesWithImages = props.content.resources.items.filter(
    (resource) => resource.imageUrl !== null && resource.imageUrl !== "",
  );

  const initialResource = props.initialResource;
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setResults(null);
    if (initialResource) {
      const cover = initialResource.imageUrl ? initialResource.imageUrl : "";
      setMode(cover ? "resource" : "custom");
      setResourceSlug(initialResource.slug);
      setImageUrl(cover);
      setCaption(captionForResource(initialResource.title, initialResource.excerpt));
    } else {
      setMode("resource");
      setResourceSlug("");
      setImageUrl("");
      setCaption("");
    }
    marketingAdminApi
      .socialStatus()
      .then((data) => {
        setStatuses(data);
        setSelected(data.filter((entry) => entry.configured).map((entry) => entry.platform));
      })
      .catch(() => props.onError("Could not load social connection status."));
  }, [isOpen, initialResource, props.onError]);

  function applyResource(slug: string) {
    setResourceSlug(slug);
    const resource = resourcesWithImages.find((entry) => entry.slug === slug);
    if (resource) {
      const cover = resource.imageUrl ? resource.imageUrl : "";
      setImageUrl(cover);
      setCaption(captionForResource(resource.title, resource.excerpt));
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
      props.onError("Could not upload the image. Please try again.");
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

  async function handleShare() {
    if (selected.length === 0 || !imageUrl || posting) {
      return;
    }
    setPosting(true);
    setResults(null);
    try {
      const data = await marketingAdminApi.shareToSocials({
        platforms: selected,
        caption,
        imageUrl,
      });
      setResults(data);
    } catch {
      props.onError("Could not reach the sharing service. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const anyConfigured = statuses.some((entry) => entry.configured);
  const canShare = selected.length > 0 && imageUrl !== "" && !posting;

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

          <div className="flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setMode("resource")}
              className={
                mode === "resource"
                  ? "flex-1 rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              From a resource
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={
                mode === "custom"
                  ? "flex-1 rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              Custom post
            </button>
          </div>

          {mode === "resource" ? (
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

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Caption
            </span>
            <textarea
              rows={4}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
              placeholder="Write the post caption…"
            />
          </label>

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
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!canShare}
            className="flex items-center gap-2 rounded-lg bg-[#FF8A00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e67c00] disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {posting ? "Posting…" : "Post now"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
