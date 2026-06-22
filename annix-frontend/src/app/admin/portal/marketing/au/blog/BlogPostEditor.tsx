"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type { CreateBlogPostDto, UpdateBlogPostDto } from "@/app/lib/api/auRubberApi";
import { now } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAuCmsBlogPost } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface BlogPostEditorProps {
  postId: string;
  onCreated?: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export interface BlogPostEditorHandle {
  save: () => Promise<void>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayIso(): string {
  const isoDate = now().toISODate();
  return isoDate || "";
}

export const BlogPostEditor = forwardRef<BlogPostEditorHandle, BlogPostEditorProps>(
  function BlogPostEditor(props, ref) {
    const postId = props.postId;
    const onCreated = props.onCreated;
    const onDeleted = props.onDeleted;
    const isNew = postId === "new";
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirm();
    const queryClient = useQueryClient();

    const postQuery = useAuCmsBlogPost(isNew ? "" : postId);

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [heroImageUrl, setHeroImageUrl] = useState("");
    const [author, setAuthor] = useState("AU Industries");
    const [publishedAtDate, setPublishedAtDate] = useState(todayIso());
    const [isPublished, setIsPublished] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
      if (postQuery.data && !loaded) {
        const p = postQuery.data;
        const rawMetaTitle = p.metaTitle;
        const rawMetaDesc = p.metaDescription;
        const rawHero = p.heroImageUrl;
        const rawPublishedAt = p.publishedAt;
        setTitle(p.title);
        setSlug(p.slug);
        setSlugManuallyEdited(true);
        setMetaTitle(rawMetaTitle || "");
        setMetaDescription(rawMetaDesc || "");
        setExcerpt(p.excerpt);
        setContent(p.content);
        setHeroImageUrl(rawHero || "");
        setAuthor(p.author);
        setPublishedAtDate(rawPublishedAt ? rawPublishedAt.slice(0, 10) : todayIso());
        setIsPublished(p.isPublished);
        setLoaded(true);
        setDirty(false);
      }
    }, [postQuery.data, loaded]);

    const handleTitleChange = (value: string) => {
      setDirty(true);
      setTitle(value);
      if (!slugManuallyEdited) {
        setSlug(slugify(value));
      }
    };

    const handleSlugChange = (value: string) => {
      setDirty(true);
      setSlugManuallyEdited(true);
      setSlug(slugify(value));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      const file = fileList && fileList.length > 0 ? fileList[0] : null;
      if (!file) return;
      setUploading(true);
      try {
        const result = await auCmsAdminApi.uploadWebsiteImage(file);
        setDirty(true);
        setHeroImageUrl(result.url);
        showToast("Image uploaded", "success");
      } catch {
        showToast("Failed to upload image", "error");
      } finally {
        setUploading(false);
      }
    };

    const buildFields = () => {
      const trimmedTitle = title.trim();
      const trimmedSlug = slug.trim();
      const trimmedMetaTitle = metaTitle.trim();
      const trimmedMetaDesc = metaDescription.trim();
      const trimmedHero = heroImageUrl.trim();
      const trimmedAuthor = author.trim();
      const publishedAtIso = isPublished ? `${publishedAtDate}T00:00:00.000Z` : null;
      return {
        slug: trimmedSlug,
        title: trimmedTitle,
        metaTitle: trimmedMetaTitle.length > 0 ? trimmedMetaTitle : null,
        metaDescription: trimmedMetaDesc.length > 0 ? trimmedMetaDesc : null,
        excerpt: excerpt.trim(),
        content,
        heroImageUrl: trimmedHero.length > 0 ? trimmedHero : null,
        author: trimmedAuthor.length > 0 ? trimmedAuthor : "AU Industries",
        publishedAt: publishedAtIso,
        isPublished,
      };
    };

    const handleSave = async () => {
      if (title.trim().length === 0) {
        showToast("Title is required", "error");
        return;
      }
      if (slug.trim().length === 0) {
        showToast("Slug is required", "error");
        return;
      }
      setSaving(true);
      try {
        const fields = buildFields();
        if (isNew) {
          const created = await auCmsAdminApi.createBlogPost(fields as CreateBlogPostDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
          setDirty(false);
          showToast("Blog post created", "success");
          onCreated?.(created.id);
        } else {
          await auCmsAdminApi.updateBlogPost(postId, fields as UpdateBlogPostDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
          queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.detail(postId) });
          setDirty(false);
          showToast("Blog post saved", "success");
        }
      } catch {
        showToast("Failed to save blog post", "error");
      } finally {
        setSaving(false);
      }
    };

    const autoSave = async () => {
      const fields = buildFields();
      if (isNew) {
        if (title.trim().length === 0) {
          return;
        }
        await auCmsAdminApi.createBlogPost(fields as CreateBlogPostDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
        setDirty(false);
        return;
      }
      if (dirty) {
        await auCmsAdminApi.updateBlogPost(postId, fields as UpdateBlogPostDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.detail(postId) });
        setDirty(false);
      }
    };

    useImperativeHandle(ref, () => ({ save: autoSave }), [autoSave]);

    const handleTogglePublish = async () => {
      const next = !isPublished;
      setTogglingPublish(true);
      try {
        await auCmsAdminApi.updateBlogPost(postId, { isPublished: next });
        setIsPublished(next);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
        queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.detail(postId) });
        showToast(next ? "Post published" : "Post unpublished", "success");
      } catch {
        showToast("Failed to update publish state", "error");
      } finally {
        setTogglingPublish(false);
      }
    };

    const handleDelete = async () => {
      const confirmed = await confirm({
        title: "Delete Blog Post",
        message: `Delete "${title || "this post"}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) {
        return;
      }
      setDeleting(true);
      try {
        await auCmsAdminApi.deleteBlogPost(postId);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
        showToast("Blog post deleted", "success");
        onDeleted?.(postId);
      } catch {
        showToast("Failed to delete post", "error");
      } finally {
        setDeleting(false);
      }
    };

    if (!isNew && postQuery.isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {ConfirmDialog}
        <div className="sticky top-[105px] z-[4] -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-6 py-2 backdrop-blur">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? "New post" : title || "Untitled post"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isNew || togglingPublish}
              className={
                isPublished
                  ? "inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  : "inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              }
            >
              {isPublished ? "● Live" : "○ Draft"}
            </button>
            {!isNew ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Title" required>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. New AU Premium A38 Pink Compound Launch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Slug" required>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="auto-generated-from-title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Author">
              <input
                type="text"
                value={author}
                onChange={(e) => {
                  setDirty(true);
                  setAuthor(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Publish date">
              <DateInput
                value={publishedAtDate}
                onChange={(value) => {
                  setDirty(true);
                  setPublishedAtDate(value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
          </div>

          <Field label="Excerpt (preview text shown on the index)">
            <textarea
              value={excerpt}
              onChange={(e) => {
                setDirty(true);
                setExcerpt(e.target.value);
              }}
              rows={3}
              placeholder="One or two sentences summarising the post..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Meta title (SEO)">
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setDirty(true);
                  setMetaTitle(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Meta description (SEO)">
              <input
                type="text"
                value={metaDescription}
                onChange={(e) => {
                  setDirty(true);
                  setMetaDescription(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
          </div>

          <Field label="Hero image">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => {
                  setDirty(true);
                  setHeroImageUrl(e.target.value);
                }}
                placeholder="https://... or upload below"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <label className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer whitespace-nowrap">
                {uploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => {
                setDirty(true);
                setIsPublished(e.target.checked);
              }}
              className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-gray-700">Published (visible on /blog)</span>
          </label>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Body (markdown)</label>
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => {
                setDirty(true);
                setContent(val || "");
              }}
              height={500}
            />
          </div>
        </div>
      </div>
    );
  },
);

function Field(props: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {props.label}
        {props.required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      {props.children}
    </div>
  );
}
