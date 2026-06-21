"use client";

import {
  CMS_BLOCK_TYPES,
  type CmsBlock,
  type CmsBlockType,
  defaultBlock,
} from "@annix/product-data/cms";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import { BlockRenderer } from "@/app/lib/cms/render/BlockRenderer";
import { ImageField } from "./ImageField";

interface BlockEditorProps {
  pageId: string;
  initialBlocks: CmsBlock[];
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500";

const strValue = (value: string | null): string => value ?? "";
const orNull = (value: string): string | null => value || null;

export function BlockEditor(props: BlockEditorProps) {
  const { showToast } = useToast();
  const [blocks, setBlocks] = useState<CmsBlock[]>(props.initialBlocks);
  const [addType, setAddType] = useState<CmsBlockType>("richText");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const updateBlock = (index: number, next: CmsBlock) => {
    setBlocks((current) => current.map((block, idx) => (idx === index ? next : block)));
  };

  const addBlock = () => {
    setBlocks((current) => [...current, defaultBlock(addType)]);
  };

  const removeBlock = (index: number) => {
    setBlocks((current) => current.filter((_, idx) => idx !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const copy = current.slice();
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      await auCmsAdminApi.saveWebsiteDraftBlocks(props.pageId, blocks);
      showToast("Block draft saved", "success");
    } catch {
      showToast("Failed to save block draft", "error");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await auCmsAdminApi.saveWebsiteDraftBlocks(props.pageId, blocks);
      await auCmsAdminApi.publishWebsiteBlocks(props.pageId);
      showToast("Blocks published to the live page", "success");
    } catch {
      showToast("Failed to publish blocks", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Build the page from content blocks. Save Draft stores your changes; Publish pushes them to
          the live page (only when "Use blocks for the live page" is ticked above).
        </p>
        <div className="inline-flex shrink-0 rounded-lg border border-gray-300 p-0.5">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={
              mode === "edit"
                ? "rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
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
                : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            }
          >
            Preview
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <BlockRenderer blocks={blocks} />
        </div>
      ) : (
        <>
          {blocks.map((block, index) => (
            <div
              key={`block-${index}`}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  {blockLabel(block.type)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <BlockFields block={block} onChange={(next) => updateBlock(index, next)} />
            </div>
          ))}

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as CmsBlockType)}
              className={`${inputClass} max-w-xs`}
            >
              {CMS_BLOCK_TYPES.map((meta) => (
                <option key={meta.type} value={meta.type}>
                  {meta.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addBlock}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Add block
            </button>
          </div>
        </>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={saveDraft}
          disabled={busy}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={busy}
          className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 disabled:opacity-50"
        >
          Publish Blocks
        </button>
      </div>
    </div>
  );
}

function blockLabel(type: CmsBlockType): string {
  const match = CMS_BLOCK_TYPES.find((meta) => meta.type === type);
  return match ? match.label : type;
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{props.label}</label>
      {props.children}
    </div>
  );
}

function BlockFields(props: { block: CmsBlock; onChange: (next: CmsBlock) => void }) {
  const block = props.block;

  if (block.type === "richText") {
    return (
      <Field label="Markdown">
        <textarea
          value={block.markdown}
          onChange={(e) => props.onChange({ ...block, markdown: e.target.value })}
          rows={10}
          className={`${inputClass} font-mono`}
        />
      </Field>
    );
  }

  if (block.type === "hero") {
    return (
      <div>
        <Field label="Eyebrow">
          <input
            value={block.eyebrow}
            onChange={(e) => props.onChange({ ...block, eyebrow: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Headline">
          <input
            value={block.headline}
            onChange={(e) => props.onChange({ ...block, headline: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Subheading">
          <textarea
            value={block.subheading}
            onChange={(e) => props.onChange({ ...block, subheading: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
        <Field label="Image">
          <ImageField
            value={strValue(block.imageUrl)}
            onChange={(url) => props.onChange({ ...block, imageUrl: orNull(url) })}
          />
        </Field>
        <CtaFields
          label="Primary CTA"
          cta={block.primaryCta}
          onChange={(cta) => props.onChange({ ...block, primaryCta: cta })}
        />
        <CtaFields
          label="Secondary CTA"
          cta={block.secondaryCta}
          onChange={(cta) => props.onChange({ ...block, secondaryCta: cta })}
        />
      </div>
    );
  }

  if (block.type === "faq") {
    return (
      <div>
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => props.onChange({ ...block, heading: e.target.value })}
            className={inputClass}
          />
        </Field>
        {block.items.map((item, idx) => (
          <div key={`faq-${idx}`} className="border border-gray-200 rounded p-3 mb-2 bg-white">
            <Field label="Question">
              <input
                value={item.question}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, question: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Answer">
              <textarea
                value={item.answer}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, answer: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                rows={3}
                className={inputClass}
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                props.onChange({ ...block, items: block.items.filter((_, i) => i !== idx) })
              }
              className="text-xs text-red-600"
            >
              Remove item
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            props.onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })
          }
          className="px-3 py-1 text-xs border border-gray-300 rounded"
        >
          Add Q&amp;A
        </button>
      </div>
    );
  }

  if (block.type === "featureGrid") {
    return (
      <div>
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => props.onChange({ ...block, heading: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Subheading">
          <textarea
            value={block.subheading}
            onChange={(e) => props.onChange({ ...block, subheading: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
        {block.items.map((item, idx) => (
          <div key={`feat-${idx}`} className="border border-gray-200 rounded p-3 mb-2 bg-white">
            <Field label="Title">
              <input
                value={item.title}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, title: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Blurb">
              <textarea
                value={item.blurb}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, blurb: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                rows={2}
                className={inputClass}
              />
            </Field>
            <Field label="Link (optional)">
              <input
                value={strValue(item.href)}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, href: orNull(e.target.value) } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Image (optional)">
              <ImageField
                value={strValue(item.imageUrl)}
                onChange={(url) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, imageUrl: orNull(url) } : it,
                  );
                  props.onChange({ ...block, items });
                }}
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                props.onChange({ ...block, items: block.items.filter((_, i) => i !== idx) })
              }
              className="text-xs text-red-600"
            >
              Remove item
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            props.onChange({
              ...block,
              items: [...block.items, { title: "", blurb: "", href: null, imageUrl: null }],
            })
          }
          className="px-3 py-1 text-xs border border-gray-300 rounded"
        >
          Add feature
        </button>
      </div>
    );
  }

  if (block.type === "ctaBand") {
    return (
      <div>
        <Field label="Headline">
          <input
            value={block.headline}
            onChange={(e) => props.onChange({ ...block, headline: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Subheading">
          <textarea
            value={block.subheading}
            onChange={(e) => props.onChange({ ...block, subheading: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
        <CtaFields
          label="Primary CTA"
          cta={block.primaryCta}
          onChange={(cta) => props.onChange({ ...block, primaryCta: cta })}
        />
        <CtaFields
          label="Secondary CTA"
          cta={block.secondaryCta}
          onChange={(cta) => props.onChange({ ...block, secondaryCta: cta })}
        />
      </div>
    );
  }

  if (block.type === "relatedSolutions") {
    return (
      <div>
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => props.onChange({ ...block, heading: e.target.value })}
            className={inputClass}
          />
        </Field>
        {block.items.map((item, idx) => (
          <div key={`rel-${idx}`} className="border border-gray-200 rounded p-3 mb-2 bg-white">
            <Field label="Title">
              <input
                value={item.title}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, title: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={item.description}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, description: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                rows={2}
                className={inputClass}
              />
            </Field>
            <Field label="Link">
              <input
                value={item.href}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, href: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                props.onChange({ ...block, items: block.items.filter((_, i) => i !== idx) })
              }
              className="text-xs text-red-600"
            >
              Remove item
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            props.onChange({
              ...block,
              items: [...block.items, { title: "", description: "", href: "" }],
            })
          }
          className="px-3 py-1 text-xs border border-gray-300 rounded"
        >
          Add link
        </button>
      </div>
    );
  }

  if (block.type === "trustBadges") {
    return (
      <div>
        {block.items.map((item, idx) => (
          <div key={`badge-${idx}`} className="border border-gray-200 rounded p-3 mb-2 bg-white">
            <Field label="Title">
              <input
                value={item.title}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, title: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Subtitle">
              <input
                value={item.subtitle}
                onChange={(e) => {
                  const items = block.items.map((it, i) =>
                    i === idx ? { ...it, subtitle: e.target.value } : it,
                  );
                  props.onChange({ ...block, items });
                }}
                className={inputClass}
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                props.onChange({ ...block, items: block.items.filter((_, i) => i !== idx) })
              }
              className="text-xs text-red-600"
            >
              Remove badge
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            props.onChange({ ...block, items: [...block.items, { title: "", subtitle: "" }] })
          }
          className="px-3 py-1 text-xs border border-gray-300 rounded"
        >
          Add badge
        </button>
      </div>
    );
  }

  if (block.type === "gallery") {
    return (
      <div>
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => props.onChange({ ...block, heading: e.target.value })}
            className={inputClass}
          />
        </Field>
        {block.images.map((image, idx) => (
          <div key={`img-${idx}`} className="border border-gray-200 rounded p-3 mb-2 bg-white">
            <Field label="Image">
              <ImageField
                value={image.url}
                onChange={(url) => {
                  const images = block.images.map((im, i) => (i === idx ? { ...im, url } : im));
                  props.onChange({ ...block, images });
                }}
              />
            </Field>
            <Field label="Alt text">
              <input
                value={image.alt}
                onChange={(e) => {
                  const images = block.images.map((im, i) =>
                    i === idx ? { ...im, alt: e.target.value } : im,
                  );
                  props.onChange({ ...block, images });
                }}
                className={inputClass}
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                props.onChange({ ...block, images: block.images.filter((_, i) => i !== idx) })
              }
              className="text-xs text-red-600"
            >
              Remove image
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            props.onChange({ ...block, images: [...block.images, { url: "", alt: "" }] })
          }
          className="px-3 py-1 text-xs border border-gray-300 rounded"
        >
          Add image
        </button>
      </div>
    );
  }

  if (block.type === "twoColumn") {
    return (
      <div>
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => props.onChange({ ...block, heading: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Body (markdown)">
          <textarea
            value={block.body}
            onChange={(e) => props.onChange({ ...block, body: e.target.value })}
            rows={5}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="Image">
          <ImageField
            value={strValue(block.imageUrl)}
            onChange={(url) => props.onChange({ ...block, imageUrl: orNull(url) })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={block.imageRight}
            onChange={(e) => props.onChange({ ...block, imageRight: e.target.checked })}
          />
          Image on the right
        </label>
      </div>
    );
  }

  if (block.type === "caseStudyStrip") {
    return (
      <div>
        <Field label="Heading">
          <input
            value={block.heading}
            onChange={(e) => props.onChange({ ...block, heading: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Service slug (blank = this page's slug)">
          <input
            value={strValue(block.serviceSlug)}
            onChange={(e) => props.onChange({ ...block, serviceSlug: orNull(e.target.value) })}
            className={inputClass}
          />
        </Field>
        <Field label="Limit">
          <input
            type="number"
            value={block.limit}
            onChange={(e) => props.onChange({ ...block, limit: Number(e.target.value) || 3 })}
            className={inputClass}
          />
        </Field>
      </div>
    );
  }

  return null;
}

function CtaFields(props: {
  label: string;
  cta: { label: string; href: string } | null;
  onChange: (cta: { label: string; href: string } | null) => void;
}) {
  const cta = props.cta;
  const enabled = cta !== null;
  return (
    <div className="border border-gray-200 rounded p-3 mb-2 bg-white">
      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => props.onChange(e.target.checked ? { label: "", href: "" } : null)}
        />
        {props.label}
      </label>
      {cta && (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={cta.label}
            placeholder="Label"
            onChange={(e) => props.onChange({ ...cta, label: e.target.value })}
            className={inputClass}
          />
          <input
            value={cta.href}
            placeholder="/path"
            onChange={(e) => props.onChange({ ...cta, href: e.target.value })}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
