"use client";

import {
  defaultMarketingContent,
  type MarketingProduct,
  type MarketingResource,
  type MarketingSiteContent,
  RESOURCE_CATEGORIES,
} from "@annix/product-data/marketing";
import { cloneDeep } from "es-toolkit/compat";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateLongZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { marketingAdminApi, mergeMarketingDefaults } from "@/app/lib/marketing/api";
import { MarketingSitePreview } from "@/app/lib/marketing/components/MarketingSitePreview";
import { SocialShareModal } from "@/app/lib/marketing/components/SocialShareModal";
import {
  useDiscardMarketingDraft,
  useMarketingDraft,
  useMarketingStatus,
  usePublishMarketing,
  useSaveMarketingDraft,
} from "@/app/lib/query/hooks";

type Mutator = (draft: MarketingSiteContent) => void;

function Text(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  const isTextarea = props.textarea === true;
  const rows = props.rows ? props.rows : 3;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {props.label}
      </span>
      {isTextarea ? (
        <textarea
          rows={rows}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
        />
      )}
    </label>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{props.title}</h2>
      <div className="space-y-4">{props.children}</div>
    </section>
  );
}

function clearEdgeBackground(imageData: ImageData): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  if (data.length < 4 || data[3] === 0) {
    return;
  }
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  const tolerance = 36;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const consider = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const pixel = y * width + x;
    if (visited[pixel] === 1) {
      return;
    }
    visited[pixel] = 1;
    const offset = pixel * 4;
    const withinTolerance =
      Math.abs(data[offset] - bgR) <= tolerance &&
      Math.abs(data[offset + 1] - bgG) <= tolerance &&
      Math.abs(data[offset + 2] - bgB) <= tolerance;
    if (withinTolerance) {
      data[offset + 3] = 0;
      stack.push(x, y);
    }
  };
  Array.from({ length: width }, (_, x) => x).forEach((x) => {
    consider(x, 0);
    consider(x, height - 1);
  });
  Array.from({ length: height }, (_, y) => y).forEach((y) => {
    consider(0, y);
    consider(width - 1, y);
  });
  // eslint-disable-next-line no-restricted-syntax -- BFS flood-fill needs a dynamic work stack; not expressible as a declarative array op
  while (stack.length > 0) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    consider(x - 1, y);
    consider(x + 1, y);
    consider(x, y - 1);
    consider(x, y + 1);
  }
}

async function stripImageBackground(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  clearEdgeBackground(imageData);
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) {
    throw new Error("Could not export image");
  }
  const baseName = file.name.replace(/\.[^./\\]+$/, "");
  const safeName = baseName ? baseName : "logo";
  return new File([blob], `${safeName}.png`, { type: "image/png" });
}

function ImageUploadButton(props: {
  label: string;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  removeBackground?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "removing" | "uploading">("idle");
  async function handle(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) return;
    let toUpload = file;
    try {
      if (props.removeBackground) {
        setPhase("removing");
        try {
          toUpload = await stripImageBackground(file);
        } catch {
          props.onError("Couldn't remove the background — uploading the original image instead.");
          toUpload = file;
        }
      }
      setPhase("uploading");
      const result = await marketingAdminApi.uploadImage(toUpload);
      props.onUploaded(result.url);
    } catch {
      props.onError("Could not upload the image. Please try again.");
    } finally {
      setPhase("idle");
      event.target.value = "";
    }
  }
  const busy = phase !== "idle";
  const label =
    phase === "removing"
      ? "Removing background…"
      : phase === "uploading"
        ? "Uploading…"
        : props.label;
  return (
    <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
      {label}
      <input type="file" accept="image/*" className="hidden" onChange={handle} disabled={busy} />
    </label>
  );
}

function ProductRow(props: {
  product: MarketingProduct;
  patch: (mutate: (product: MarketingProduct) => void) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const product = props.product;
  const portalCodeValue = product.portalCode === null ? "" : product.portalCode;
  const appKey = product.appKey;
  const imageUrl = product.imageUrl ? product.imageUrl : "";

  function useBrandArtwork() {
    if (!appKey) {
      props.onError("Set an App key (brand) first to pull its card artwork.");
      return;
    }
    props.patch((p) => {
      p.imageUrl = `/api/public/branding/${appKey}/asset/loginCard`;
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text
          label="Name"
          value={product.name}
          onChange={(v) =>
            props.patch((p) => {
              p.name = v;
            })
          }
        />
        <Text
          label="Category"
          value={product.category}
          onChange={(v) =>
            props.patch((p) => {
              p.category = v;
            })
          }
        />
      </div>
      <div className="mt-3">
        <Text
          label="Blurb"
          textarea
          value={product.blurb}
          onChange={(v) =>
            props.patch((p) => {
              p.blurb = v;
            })
          }
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text
          label="App key (brand)"
          value={appKey}
          onChange={(v) =>
            props.patch((p) => {
              p.appKey = v;
            })
          }
        />
        <Text
          label="Portal code"
          value={portalCodeValue}
          onChange={(v) =>
            props.patch((p) => {
              p.portalCode = v ? v : null;
            })
          }
        />
        <Text
          label="Icon (fallback)"
          value={product.iconSlot}
          onChange={(v) =>
            props.patch((p) => {
              p.iconSlot = v;
            })
          }
        />
        <Text
          label="Detail slug"
          value={product.detailSlug}
          onChange={(v) =>
            props.patch((p) => {
              p.detailSlug = v;
            })
          }
        />
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Card artwork
        </span>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
              No image
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ImageUploadButton
              label="Upload"
              onUploaded={(url) =>
                props.patch((p) => {
                  p.imageUrl = url;
                })
              }
              onError={props.onError}
            />
            <button
              type="button"
              onClick={useBrandArtwork}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Use branding card
            </button>
            {imageUrl ? (
              <button
                type="button"
                onClick={() =>
                  props.patch((p) => {
                    p.imageUrl = null;
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={product.comingSoon}
            onChange={(event) =>
              props.patch((p) => {
                p.comingSoon = event.target.checked;
              })
            }
          />
          Coming soon
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={props.onMoveUp}
            disabled={!props.canMoveUp}
            title="Move card earlier"
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↑ Up
          </button>
          <button
            type="button"
            onClick={props.onMoveDown}
            disabled={!props.canMoveDown}
            title="Move card later"
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓ Down
          </button>
          <button
            type="button"
            onClick={props.onRemove}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Remove product
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageSlot(props: {
  label: string;
  url: string | null;
  onUploaded: (url: string) => void;
  onClear: () => void;
  onError: (message: string) => void;
}) {
  const url = props.url ? props.url : "";
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {props.label}
      </span>
      <div className="flex items-center gap-3">
        {url ? (
          <img
            src={url}
            alt=""
            className="h-16 w-28 rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
            No image
          </div>
        )}
        <ImageUploadButton label="Upload" onUploaded={props.onUploaded} onError={props.onError} />
        {url ? (
          <button
            type="button"
            onClick={props.onClear}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ResourceRow(props: {
  resource: MarketingResource;
  patch: (mutate: (resource: MarketingResource) => void) => void;
  onRemove: () => void;
  onShare: () => void;
  onError: (message: string) => void;
}) {
  const resource = props.resource;
  const imageUrl = resource.imageUrl ? resource.imageUrl : "";
  const categoryKnown = (RESOURCE_CATEGORIES as readonly string[]).includes(resource.category);
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <Text
        label="Title"
        value={resource.title}
        onChange={(v) =>
          props.patch((r) => {
            r.title = v;
          })
        }
      />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Category
          </span>
          <select
            value={resource.category}
            onChange={(event) =>
              props.patch((r) => {
                r.category = event.target.value;
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
          >
            {categoryKnown ? null : <option value={resource.category}>{resource.category}</option>}
            {RESOURCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <Text
          label="Linked product slug (optional)"
          value={resource.productSlug}
          onChange={(v) =>
            props.patch((r) => {
              r.productSlug = v;
            })
          }
        />
      </div>
      <div className="mt-3">
        <Text
          label="Excerpt (shown on the card)"
          textarea
          value={resource.excerpt}
          onChange={(v) =>
            props.patch((r) => {
              r.excerpt = v;
            })
          }
        />
      </div>
      <div className="mt-3">
        <Text
          label="Body (full article — leave a blank line between paragraphs)"
          textarea
          rows={8}
          value={resource.body}
          onChange={(v) =>
            props.patch((r) => {
              r.body = v;
            })
          }
        />
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Cover image (optional)
        </span>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-16 w-28 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
              No image
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ImageUploadButton
              label="Upload"
              onUploaded={(url) =>
                props.patch((r) => {
                  r.imageUrl = url;
                })
              }
              onError={props.onError}
            />
            {imageUrl ? (
              <button
                type="button"
                onClick={() =>
                  props.patch((r) => {
                    r.imageUrl = null;
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Text
          label="Slug"
          value={resource.slug}
          onChange={(v) =>
            props.patch((r) => {
              r.slug = v;
            })
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={resource.published}
            onChange={(event) =>
              props.patch((r) => {
                r.published = event.target.checked;
              })
            }
          />
          Published (visible on the site)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={props.onShare}
            className="rounded-lg border border-[#323288] px-3 py-1.5 text-sm font-semibold text-[#323288] hover:bg-[#323288]/5"
          >
            Share to socials
          </button>
          <button
            type="button"
            onClick={props.onRemove}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Remove resource
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketingCmsPage() {
  const draftQuery = useMarketingDraft();
  const statusQuery = useMarketingStatus();
  const saveDraft = useSaveMarketingDraft();
  const publish = usePublishMarketing();
  const discard = useDiscardMarketingDraft();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [content, setContent] = useState<MarketingSiteContent | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [socialOpen, setSocialOpen] = useState(false);
  const [socialResource, setSocialResource] = useState<MarketingResource | null>(null);

  function openShare(resource: MarketingResource | null) {
    setSocialResource(resource);
    setSocialOpen(true);
  }

  useEffect(() => {
    if (draftQuery.data) {
      setContent(mergeMarketingDefaults(draftQuery.data));
    }
  }, [draftQuery.data]);

  function update(mutator: Mutator) {
    setContent((prev) => {
      if (!prev) return prev;
      const next = cloneDeep(prev);
      mutator(next);
      return next;
    });
  }

  async function handleSave() {
    if (!content) return;
    try {
      await saveDraft.mutateAsync(content);
      showToast("Draft saved", "success");
    } catch {
      showToast("Could not save the draft. Please try again.", "error");
    }
  }

  async function handlePublish() {
    const confirmed = await confirm({
      title: "Publish to the live site?",
      message: "This replaces the live annix.co.za content with the current draft.",
      confirmLabel: "Publish",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await saveDraft.mutateAsync(content as MarketingSiteContent);
      await publish.mutateAsync();
      showToast("Published to the live site", "success");
    } catch {
      showToast("Could not publish. Please try again.", "error");
    }
  }

  async function handleResetTemplate() {
    const confirmed = await confirm({
      title: "Reset to the latest template?",
      message:
        "This replaces the current draft with the latest Annix template content. Nothing goes live until you Publish.",
      confirmLabel: "Reset",
      variant: "warning",
    });
    if (!confirmed) return;
    setContent(defaultMarketingContent());
    showToast("Draft reset to the latest template — review, then Save and Publish.", "success");
  }

  async function handleDiscard() {
    const confirmed = await confirm({
      title: "Discard draft changes?",
      message: "This reverts the draft to the currently published content.",
      confirmLabel: "Discard",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const reverted = await discard.mutateAsync();
      setContent(mergeMarketingDefaults(reverted));
      showToast("Draft reverted to the live content", "success");
    } catch {
      showToast("Could not discard the draft. Please try again.", "error");
    }
  }

  const loading = draftQuery.isLoading;
  if (loading || !content) {
    return <div className="p-6 text-gray-500">Loading marketing content…</div>;
  }

  const status = statusQuery.data;
  const lastPublishedAt = status ? status.lastPublishedAt : null;
  const hasDraft = status ? status.hasDraft : false;
  const site = content.site;
  const hero = content.hero;
  const ecosystem = content.ecosystem;
  const industries = content.industries;
  const partners = content.partners;
  const globalPresence = content.globalPresence;
  const ctaBand = content.ctaBand;
  const about = content.about;
  const footer = content.footer;
  const resources = content.resources;
  const legal = content.legal;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marketing Site CMS</h1>
          <p className="text-xs text-gray-500">
            {lastPublishedAt
              ? `Last published ${formatDateLongZA(lastPublishedAt)}`
              : "Not yet published"}
            {hasDraft ? " · unpublished draft changes" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={
                mode === "edit"
                  ? "rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={
                mode === "preview"
                  ? "rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600"
              }
            >
              Preview
            </button>
          </div>
          <button
            type="button"
            onClick={handleResetTemplate}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Reset to template
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={discard.isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Discard draft
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDraft.isPending}
            className="rounded-lg bg-[#323288] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a3a9e] disabled:opacity-50"
          >
            {saveDraft.isPending ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publish.isPending}
            className="rounded-lg bg-[#FF8A00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e67c00] disabled:opacity-50"
          >
            {publish.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <MarketingSitePreview content={content} />
        </div>
      ) : (
        <>
          <Section title="Brand & colours">
            <Text
              label="Company wordmark text"
              value={site.wordmark}
              onChange={(v) =>
                update((d) => {
                  d.site.wordmark = v;
                })
              }
            />
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Accent colour (buttons, links, highlights)
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={site.accentColor}
                  onChange={(event) =>
                    update((d) => {
                      d.site.accentColor = event.target.value;
                    })
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={site.accentColor}
                  onChange={(event) =>
                    update((d) => {
                      d.site.accentColor = event.target.value;
                    })
                  }
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="#E0B44A"
                />
              </div>
            </div>
          </Section>

          <Section title="Hero">
            <Text
              label="Eyebrow"
              value={hero.eyebrow}
              onChange={(v) =>
                update((d) => {
                  d.hero.eyebrow = v;
                })
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Text
                label="Headline (lead)"
                value={hero.headlineLead}
                onChange={(v) =>
                  update((d) => {
                    d.hero.headlineLead = v;
                  })
                }
              />
              <Text
                label="Headline (emphasis)"
                value={hero.headlineEmphasis}
                onChange={(v) =>
                  update((d) => {
                    d.hero.headlineEmphasis = v;
                  })
                }
              />
            </div>
            <Text
              label="Subheading"
              textarea
              value={hero.subheading}
              onChange={(v) =>
                update((d) => {
                  d.hero.subheading = v;
                })
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Text
                label="Primary CTA label"
                value={hero.primaryCta.label}
                onChange={(v) =>
                  update((d) => {
                    d.hero.primaryCta.label = v;
                  })
                }
              />
              <Text
                label="Primary CTA link"
                value={hero.primaryCta.href}
                onChange={(v) =>
                  update((d) => {
                    d.hero.primaryCta.href = v;
                  })
                }
              />
              <Text
                label="Secondary CTA label"
                value={hero.secondaryCta.label}
                onChange={(v) =>
                  update((d) => {
                    d.hero.secondaryCta.label = v;
                  })
                }
              />
              <Text
                label="Secondary CTA link"
                value={hero.secondaryCta.href}
                onChange={(v) =>
                  update((d) => {
                    d.hero.secondaryCta.href = v;
                  })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Text
                label="Global reach title"
                value={hero.globalReachTitle}
                onChange={(v) =>
                  update((d) => {
                    d.hero.globalReachTitle = v;
                  })
                }
              />
            </div>
            <Text
              label="Global reach body"
              textarea
              value={hero.globalReachBody}
              onChange={(v) =>
                update((d) => {
                  d.hero.globalReachBody = v;
                })
              }
            />
            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Home page images
              </span>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Hero background / globe
                  </span>
                  {hero.imageUrl ? (
                    <img
                      src={hero.imageUrl}
                      alt=""
                      className="h-20 w-full rounded-lg border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ImageUploadButton
                      label="Upload"
                      onUploaded={(url) =>
                        update((d) => {
                          d.hero.imageUrl = url;
                        })
                      }
                      onError={(m) => showToast(m, "error")}
                    />
                    {hero.imageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          update((d) => {
                            d.hero.imageUrl = null;
                          })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Bottom section background
                  </span>
                  {ctaBand.backgroundImageUrl ? (
                    <img
                      src={ctaBand.backgroundImageUrl}
                      alt=""
                      className="h-20 w-full rounded-lg border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ImageUploadButton
                      label="Upload"
                      onUploaded={(url) =>
                        update((d) => {
                          d.ctaBand.backgroundImageUrl = url;
                        })
                      }
                      onError={(m) => showToast(m, "error")}
                    />
                    {ctaBand.backgroundImageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          update((d) => {
                            d.ctaBand.backgroundImageUrl = null;
                          })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Company logo (nav + footer)
                  </span>
                  {site.logoUrl ? (
                    <img
                      src={site.logoUrl}
                      alt=""
                      className="h-20 w-full rounded-lg border border-gray-200 bg-slate-900 object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      Using brand logo
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ImageUploadButton
                      label="Upload"
                      onUploaded={(url) =>
                        update((d) => {
                          d.site.logoUrl = url;
                        })
                      }
                      onError={(m) => showToast(m, "error")}
                    />
                    {site.logoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          update((d) => {
                            d.site.logoUrl = null;
                          })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Leave empty to use the Annix brand logo.
                  </p>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Wordmark image
                  </span>
                  {site.wordmarkImageUrl ? (
                    <img
                      src={site.wordmarkImageUrl}
                      alt=""
                      className="h-20 w-full rounded-lg border border-gray-200 bg-slate-900 object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      Using wordmark text
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ImageUploadButton
                      label="Upload"
                      removeBackground
                      onUploaded={(url) =>
                        update((d) => {
                          d.site.wordmarkImageUrl = url;
                        })
                      }
                      onError={(m) => showToast(m, "error")}
                    />
                    {site.wordmarkImageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          update((d) => {
                            d.site.wordmarkImageUrl = null;
                          })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Shown when no company logo is set. Falls back to the wordmark text.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Highlights
              </span>
              {hero.highlights.map((highlight, index) => (
                <div key={`highlight-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={highlight.iconSlot}
                    onChange={(e) =>
                      update((d) => {
                        d.hero.highlights[index].iconSlot = e.target.value;
                      })
                    }
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Icon"
                  />
                  <input
                    type="text"
                    value={highlight.title}
                    onChange={(e) =>
                      update((d) => {
                        d.hero.highlights[index].title = e.target.value;
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Title"
                  />
                  <input
                    type="text"
                    value={highlight.subtitle}
                    onChange={(e) =>
                      update((d) => {
                        d.hero.highlights[index].subtitle = e.target.value;
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Subtitle"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        d.hero.highlights = d.hero.highlights.filter((_, i) => i !== index);
                      })
                    }
                    className="rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.hero.highlights.push({ iconSlot: "Sparkles", title: "", subtitle: "" });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                + Add highlight
              </button>
            </div>
          </Section>

          <Section title="Ecosystem">
            <Text
              label="Eyebrow"
              value={ecosystem.eyebrow}
              onChange={(v) =>
                update((d) => {
                  d.ecosystem.eyebrow = v;
                })
              }
            />
            <Text
              label="Heading"
              value={ecosystem.heading}
              onChange={(v) =>
                update((d) => {
                  d.ecosystem.heading = v;
                })
              }
            />
            <Text
              label="Subheading"
              textarea
              value={ecosystem.subheading}
              onChange={(v) =>
                update((d) => {
                  d.ecosystem.subheading = v;
                })
              }
            />
            <div className="space-y-3">
              {ecosystem.products.map((product, index) => (
                <ProductRow
                  key={`product-${index}`}
                  product={product}
                  patch={(mutate) =>
                    update((d) => {
                      mutate(d.ecosystem.products[index]);
                    })
                  }
                  onRemove={() =>
                    update((d) => {
                      d.ecosystem.products = d.ecosystem.products.filter((_, i) => i !== index);
                    })
                  }
                  canMoveUp={index > 0}
                  canMoveDown={index < ecosystem.products.length - 1}
                  onMoveUp={() =>
                    update((d) => {
                      const items = [...d.ecosystem.products];
                      const moved = items[index];
                      items[index] = items[index - 1];
                      items[index - 1] = moved;
                      d.ecosystem.products = items;
                    })
                  }
                  onMoveDown={() =>
                    update((d) => {
                      const items = [...d.ecosystem.products];
                      const moved = items[index];
                      items[index] = items[index + 1];
                      items[index + 1] = moved;
                      d.ecosystem.products = items;
                    })
                  }
                  onError={(message) => showToast(message, "error")}
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.ecosystem.products.push({
                      appKey: "",
                      portalCode: null,
                      name: "",
                      category: "",
                      blurb: "",
                      iconSlot: "Sparkles",
                      imageUrl: null,
                      comingSoon: false,
                      detailSlug: "new-product",
                    });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                + Add product
              </button>
            </div>
          </Section>

          <Section title="Industries">
            <Text
              label="Eyebrow"
              value={industries.eyebrow}
              onChange={(v) =>
                update((d) => {
                  d.industries.eyebrow = v;
                })
              }
            />
            <Text
              label="Heading"
              value={industries.heading}
              onChange={(v) =>
                update((d) => {
                  d.industries.heading = v;
                })
              }
            />
            <Text
              label="View-all button label"
              value={industries.ctaLabel}
              onChange={(v) =>
                update((d) => {
                  d.industries.ctaLabel = v;
                })
              }
            />
            <div className="space-y-3">
              {industries.items.map((item, index) => {
                const itemImage = item.imageUrl ? item.imageUrl : "";
                return (
                  <div key={`industry-${index}`} className="rounded-lg border border-gray-200 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Text
                        label="Name"
                        value={item.name}
                        onChange={(v) =>
                          update((d) => {
                            d.industries.items[index].name = v;
                          })
                        }
                      />
                      <Text
                        label="Icon"
                        value={item.iconSlot}
                        onChange={(v) =>
                          update((d) => {
                            d.industries.items[index].iconSlot = v;
                          })
                        }
                      />
                      <Text
                        label="Slug"
                        value={item.slug}
                        onChange={(v) =>
                          update((d) => {
                            d.industries.items[index].slug = v;
                          })
                        }
                      />
                    </div>
                    <div className="mt-3">
                      <Text
                        label="Caption / text"
                        value={item.blurb}
                        onChange={(v) =>
                          update((d) => {
                            d.industries.items[index].blurb = v;
                          })
                        }
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt=""
                          className="h-12 w-16 rounded border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-16 items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400">
                          No image
                        </div>
                      )}
                      <ImageUploadButton
                        label="Upload image"
                        onUploaded={(url) =>
                          update((d) => {
                            d.industries.items[index].imageUrl = url;
                          })
                        }
                        onError={(m) => showToast(m, "error")}
                      />
                      {itemImage ? (
                        <button
                          type="button"
                          onClick={() =>
                            update((d) => {
                              d.industries.items[index].imageUrl = null;
                            })
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Clear
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          update((d) => {
                            d.industries.items = d.industries.items.filter((_, i) => i !== index);
                          })
                        }
                        className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.industries.items.push({
                      name: "",
                      blurb: "",
                      iconSlot: "Factory",
                      imageUrl: null,
                      slug: "new-industry",
                    });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                + Add industry
              </button>
            </div>
          </Section>

          <Section title="Trusted partners">
            <Text
              label="Heading"
              value={partners.heading}
              onChange={(v) =>
                update((d) => {
                  d.partners.heading = v;
                })
              }
            />
            <p className="text-xs text-gray-500">
              Logo backgrounds are removed automatically on upload (processed in your browser) and
              shown in full colour. Upload any logo — no need to pre-cut it.
            </p>
            <div className="space-y-3">
              {partners.partners.map((partner, index) => (
                <div
                  key={`partner-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                >
                  {partner.logoUrl ? (
                    <img
                      src={partner.logoUrl}
                      alt=""
                      className="h-10 w-20 rounded border border-gray-200 object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-20 items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No logo
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2">
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) =>
                        update((d) => {
                          d.partners.partners[index].name = e.target.value;
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Partner name"
                    />
                    <input
                      type="url"
                      value={partner.url ? partner.url : ""}
                      onChange={(e) =>
                        update((d) => {
                          d.partners.partners[index].url = e.target.value;
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Website URL (optional) — e.g. auind.co.za"
                    />
                  </div>
                  <ImageUploadButton
                    label="Upload logo"
                    removeBackground
                    onUploaded={(url) =>
                      update((d) => {
                        d.partners.partners[index].logoUrl = url;
                      })
                    }
                    onError={(m) => showToast(m, "error")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        d.partners.partners = d.partners.partners.filter((_, i) => i !== index);
                      })
                    }
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.partners.partners.push({ name: "", logoUrl: "", url: "" });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                + Add partner
              </button>
            </div>
          </Section>

          <Section title="Global presence">
            <Text
              label="Heading"
              value={globalPresence.heading}
              onChange={(v) =>
                update((d) => {
                  d.globalPresence.heading = v;
                })
              }
            />
            <div className="space-y-2">
              {globalPresence.items.map((item, index) => (
                <div key={`presence-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={item.flag}
                    onChange={(e) =>
                      update((d) => {
                        d.globalPresence.items[index].flag = e.target.value;
                      })
                    }
                    className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="ZA"
                    title="2-letter country code (e.g. ZA, GB, US, AU) — shown as a flag"
                  />
                  <input
                    type="text"
                    value={item.region}
                    onChange={(e) =>
                      update((d) => {
                        d.globalPresence.items[index].region = e.target.value;
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Region"
                  />
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) =>
                      update((d) => {
                        d.globalPresence.items[index].label = e.target.value;
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Label"
                  />
                  <input
                    type="text"
                    value={item.detail}
                    onChange={(e) =>
                      update((d) => {
                        d.globalPresence.items[index].detail = e.target.value;
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Detail"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        d.globalPresence.items = d.globalPresence.items.filter(
                          (_, i) => i !== index,
                        );
                      })
                    }
                    className="rounded-lg border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.globalPresence.items.push({ region: "", label: "", detail: "", flag: "" });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                + Add location
              </button>
            </div>
          </Section>

          <Section title="Call to action">
            <Text
              label="Headline"
              value={ctaBand.headline}
              onChange={(v) =>
                update((d) => {
                  d.ctaBand.headline = v;
                })
              }
            />
            <Text
              label="Subheading"
              textarea
              value={ctaBand.subheading}
              onChange={(v) =>
                update((d) => {
                  d.ctaBand.subheading = v;
                })
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Text
                label="Primary CTA label"
                value={ctaBand.primaryCta.label}
                onChange={(v) =>
                  update((d) => {
                    d.ctaBand.primaryCta.label = v;
                  })
                }
              />
              <Text
                label="Primary CTA link"
                value={ctaBand.primaryCta.href}
                onChange={(v) =>
                  update((d) => {
                    d.ctaBand.primaryCta.href = v;
                  })
                }
              />
              <Text
                label="Secondary CTA label"
                value={ctaBand.secondaryCta.label}
                onChange={(v) =>
                  update((d) => {
                    d.ctaBand.secondaryCta.label = v;
                  })
                }
              />
              <Text
                label="Secondary CTA link"
                value={ctaBand.secondaryCta.href}
                onChange={(v) =>
                  update((d) => {
                    d.ctaBand.secondaryCta.href = v;
                  })
                }
              />
            </div>
          </Section>

          <Section title="About">
            <Text
              label="Heading"
              value={about.heading}
              onChange={(v) =>
                update((d) => {
                  d.about.heading = v;
                })
              }
            />
            <Text
              label="Intro paragraph"
              textarea
              value={about.body}
              onChange={(v) =>
                update((d) => {
                  d.about.body = v;
                })
              }
            />
            <ImageSlot
              label="Lead image (wide banner under the intro)"
              url={about.leadImageUrl}
              onUploaded={(url) =>
                update((d) => {
                  d.about.leadImageUrl = url;
                })
              }
              onClear={() =>
                update((d) => {
                  d.about.leadImageUrl = null;
                })
              }
              onError={(m) => showToast(m, "error")}
            />

            <div className="rounded-lg border border-gray-200 p-3">
              <Text
                label="Story heading"
                value={about.storyHeading}
                onChange={(v) =>
                  update((d) => {
                    d.about.storyHeading = v;
                  })
                }
              />
              <div className="mt-3">
                <Text
                  label="Story (leave a blank line between paragraphs)"
                  textarea
                  rows={6}
                  value={about.storyBody}
                  onChange={(v) =>
                    update((d) => {
                      d.about.storyBody = v;
                    })
                  }
                />
              </div>
              <div className="mt-3">
                <ImageSlot
                  label="Story image (beside the story text)"
                  url={about.storyImageUrl}
                  onUploaded={(url) =>
                    update((d) => {
                      d.about.storyImageUrl = url;
                    })
                  }
                  onClear={() =>
                    update((d) => {
                      d.about.storyImageUrl = null;
                    })
                  }
                  onError={(m) => showToast(m, "error")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                What we believe
              </span>
              {about.values.map((value, index) => (
                <div key={`about-value-${index}`} className="rounded-lg border border-gray-200 p-3">
                  <Text
                    label="Title"
                    value={value.title}
                    onChange={(v) =>
                      update((d) => {
                        d.about.values[index].title = v;
                      })
                    }
                  />
                  <div className="mt-3">
                    <Text
                      label="Body"
                      value={value.body}
                      onChange={(v) =>
                        update((d) => {
                          d.about.values[index].body = v;
                        })
                      }
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        update((d) => {
                          d.about.values = d.about.values.filter((_, i) => i !== index);
                        })
                      }
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.about.values.push({ title: "", body: "" });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                + Add value
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <Text
                label="Mission statement"
                textarea
                value={about.mission}
                onChange={(v) =>
                  update((d) => {
                    d.about.mission = v;
                  })
                }
              />
              <div className="mt-3">
                <ImageSlot
                  label="Mission image (beside the mission statement)"
                  url={about.missionImageUrl}
                  onUploaded={(url) =>
                    update((d) => {
                      d.about.missionImageUrl = url;
                    })
                  }
                  onClear={() =>
                    update((d) => {
                      d.about.missionImageUrl = null;
                    })
                  }
                  onError={(m) => showToast(m, "error")}
                />
              </div>
            </div>
          </Section>

          <Section title="Resources">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Text
                label="Heading"
                value={resources.heading}
                onChange={(v) =>
                  update((d) => {
                    d.resources.heading = v;
                  })
                }
              />
            </div>
            <Text
              label="Subheading"
              textarea
              value={resources.subheading}
              onChange={(v) =>
                update((d) => {
                  d.resources.subheading = v;
                })
              }
            />
            <div className="space-y-3">
              {resources.items.map((item, index) => (
                <ResourceRow
                  key={`resource-${index}`}
                  resource={item}
                  patch={(mutate) =>
                    update((d) => {
                      mutate(d.resources.items[index]);
                    })
                  }
                  onRemove={() =>
                    update((d) => {
                      d.resources.items = d.resources.items.filter((_, i) => i !== index);
                    })
                  }
                  onShare={() => openShare(item)}
                  onError={(message) => showToast(message, "error")}
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  update((d) => {
                    d.resources.items.push({
                      slug: "new-resource",
                      category: "Guides & Playbooks",
                      title: "",
                      excerpt: "",
                      body: "",
                      imageUrl: null,
                      productSlug: "",
                      published: true,
                    });
                  })
                }
                className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                + Add resource
              </button>
            </div>
          </Section>

          <Section title="Footer">
            <Text
              label="Tagline"
              value={footer.tagline}
              onChange={(v) =>
                update((d) => {
                  d.footer.tagline = v;
                })
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Text
                label="Newsletter heading"
                value={footer.newsletterHeading}
                onChange={(v) =>
                  update((d) => {
                    d.footer.newsletterHeading = v;
                  })
                }
              />
              <Text
                label="Legal line"
                value={footer.legal}
                onChange={(v) =>
                  update((d) => {
                    d.footer.legal = v;
                  })
                }
              />
            </div>
            <Text
              label="Newsletter body"
              textarea
              value={footer.newsletterBody}
              onChange={(v) =>
                update((d) => {
                  d.footer.newsletterBody = v;
                })
              }
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Designed by — logo
                </span>
                <div className="flex items-center gap-3">
                  {footer.designedByLogoUrl ? (
                    <img
                      src={footer.designedByLogoUrl}
                      alt=""
                      className="h-12 w-24 rounded-lg border border-gray-200 object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No image
                    </div>
                  )}
                  <ImageUploadButton
                    label="Upload logo"
                    removeBackground
                    onUploaded={(url) =>
                      update((d) => {
                        d.footer.designedByLogoUrl = url;
                      })
                    }
                    onError={(m) => showToast(m, "error")}
                  />
                  {footer.designedByLogoUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        update((d) => {
                          d.footer.designedByLogoUrl = null;
                        })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={footer.designedByUrl ? footer.designedByUrl : ""}
                  onChange={(e) =>
                    update((d) => {
                      d.footer.designedByUrl = e.target.value;
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Website URL (optional) — e.g. designer.com"
                />
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Hosted by — logo
                </span>
                <div className="flex items-center gap-3">
                  {footer.hostedByLogoUrl ? (
                    <img
                      src={footer.hostedByLogoUrl}
                      alt=""
                      className="h-12 w-24 rounded-lg border border-gray-200 object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[10px] text-gray-400">
                      No image
                    </div>
                  )}
                  <ImageUploadButton
                    label="Upload logo"
                    removeBackground
                    onUploaded={(url) =>
                      update((d) => {
                        d.footer.hostedByLogoUrl = url;
                      })
                    }
                    onError={(m) => showToast(m, "error")}
                  />
                  {footer.hostedByLogoUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        update((d) => {
                          d.footer.hostedByLogoUrl = null;
                        })
                      }
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={footer.hostedByUrl ? footer.hostedByUrl : ""}
                  onChange={(e) =>
                    update((d) => {
                      d.footer.hostedByUrl = e.target.value;
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Website URL (optional) — e.g. host.com"
                />
              </div>
            </div>
          </Section>

          <Section title="Legal (Privacy, Terms & Cookies)">
            <p className="text-xs text-gray-500">
              These render at the footer's Privacy Policy, Terms of Use and Cookie Policy links. Use
              a blank line between paragraphs; start a line with "## " for a section heading and "-
              " for a bullet. Replace any [bracketed] placeholders with your verified company
              details.
            </p>
            <button
              type="button"
              onClick={() =>
                update((d) => {
                  const def = defaultMarketingContent();
                  d.legal = cloneDeep(def.legal);
                  const hasCookieLink = d.footer.legalLinks.some((entry) =>
                    entry.label.toLowerCase().includes("cookie"),
                  );
                  if (!hasCookieLink) {
                    d.footer.legalLinks = cloneDeep(def.footer.legalLinks);
                  }
                })
              }
              className="rounded-lg border border-[#323288] px-3 py-1.5 text-sm font-semibold text-[#323288] hover:bg-[#323288]/5"
            >
              Reset legal text to latest template
            </button>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Text
                  label="Privacy heading"
                  value={legal.privacy.heading}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.privacy.heading = v;
                    })
                  }
                />
                <Text
                  label="Privacy last updated"
                  value={legal.privacy.lastUpdated}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.privacy.lastUpdated = v;
                    })
                  }
                />
              </div>
              <div className="mt-3">
                <Text
                  label="Privacy Policy body"
                  textarea
                  rows={16}
                  value={legal.privacy.body}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.privacy.body = v;
                    })
                  }
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Text
                  label="Terms heading"
                  value={legal.terms.heading}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.terms.heading = v;
                    })
                  }
                />
                <Text
                  label="Terms last updated"
                  value={legal.terms.lastUpdated}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.terms.lastUpdated = v;
                    })
                  }
                />
              </div>
              <div className="mt-3">
                <Text
                  label="Terms of Use body"
                  textarea
                  rows={16}
                  value={legal.terms.body}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.terms.body = v;
                    })
                  }
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Text
                  label="Cookie heading"
                  value={legal.cookies.heading}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.cookies.heading = v;
                    })
                  }
                />
                <Text
                  label="Cookie last updated"
                  value={legal.cookies.lastUpdated}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.cookies.lastUpdated = v;
                    })
                  }
                />
              </div>
              <div className="mt-3">
                <Text
                  label="Cookie Policy body"
                  textarea
                  rows={16}
                  value={legal.cookies.body}
                  onChange={(v) =>
                    update((d) => {
                      d.legal.cookies.body = v;
                    })
                  }
                />
              </div>
            </div>
          </Section>
        </>
      )}

      {ConfirmDialog}
      <SocialShareModal
        isOpen={socialOpen}
        onClose={() => setSocialOpen(false)}
        content={content}
        initialResource={socialResource}
        onError={(message) => showToast(message, "error")}
      />
    </div>
  );
}
