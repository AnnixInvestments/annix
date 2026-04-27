"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CreateBlogPostDto,
  type UpdateBlogPostDto,
} from "@/app/lib/api/auRubberApi";
import { now } from "@/app/lib/datetime";
import { useAuRubberBlogPost } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys/rubberKeys";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayIso(): string {
  return now().toISODate() ?? "";
}

export default function BlogPostEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const isNew = id === "new";

  const postQuery = useAuRubberBlogPost(isNew ? "" : id);

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
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
    }
  }, [postQuery.data, loaded]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await auRubberApiClient.uploadWebsiteImage(file);
      setHeroImageUrl(result.url);
      showToast("Image uploaded", "success");
    } catch {
      showToast("Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
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
      const publishedAtIso = isPublished ? `${publishedAtDate}T00:00:00.000Z` : null;
      if (isNew) {
        const dto: CreateBlogPostDto = {
          slug: slug.trim(),
          title: title.trim(),
          metaTitle: metaTitle.trim().length > 0 ? metaTitle.trim() : null,
          metaDescription: metaDescription.trim().length > 0 ? metaDescription.trim() : null,
          excerpt: excerpt.trim(),
          content,
          heroImageUrl: heroImageUrl.trim().length > 0 ? heroImageUrl.trim() : null,
          author: author.trim().length > 0 ? author.trim() : "AU Industries",
          publishedAt: publishedAtIso,
          isPublished,
        };
        const created = await auRubberApiClient.createBlogPost(dto);
        queryClient.invalidateQueries({ queryKey: rubberKeys.blogPosts.all });
        showToast("Blog post created", "success");
        router.push(`/au-rubber/portal/website/blog/${created.id}`);
      } else {
        const dto: UpdateBlogPostDto = {
          slug: slug.trim(),
          title: title.trim(),
          metaTitle: metaTitle.trim().length > 0 ? metaTitle.trim() : null,
          metaDescription: metaDescription.trim().length > 0 ? metaDescription.trim() : null,
          excerpt: excerpt.trim(),
          content,
          heroImageUrl: heroImageUrl.trim().length > 0 ? heroImageUrl.trim() : null,
          author: author.trim().length > 0 ? author.trim() : "AU Industries",
          publishedAt: publishedAtIso,
          isPublished,
        };
        await auRubberApiClient.updateBlogPost(id, dto);
        queryClient.invalidateQueries({ queryKey: rubberKeys.blogPosts.all });
        showToast("Blog post saved", "success");
      }
    } catch {
      showToast("Failed to save blog post", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/website"]}>
      <Breadcrumb
        items={[
          { label: "Website Pages", href: "/au-rubber/portal/website" },
          { label: "Blog Posts", href: "/au-rubber/portal/website/blog" },
          { label: isNew ? "New" : title || "Edit" },
        ]}
      />

      <div className="px-6 py-4 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {isNew ? "New Blog Post" : "Edit Blog Post"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Markdown content with embedded images. Live URL is /blog/{slug || "your-slug"}.
        </p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5 mb-6">
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
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Publish date">
              <input
                type="date"
                value={publishedAtDate}
                onChange={(e) => setPublishedAtDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
          </div>

          <Field label="Excerpt (preview text shown on the index)">
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
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
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Meta description (SEO)">
              <input
                type="text"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
          </div>

          <Field label="Hero image">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://... or upload below"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <label className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer whitespace-nowrap">
                {uploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-gray-700">Published (visible on /blog)</span>
          </label>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Body (markdown)</label>
          <div data-color-mode="light">
            <MDEditor value={content} onChange={(val) => setContent(val || "")} height={500} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/au-rubber/portal/website/blog")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {saving ? "Saving..." : isNew ? "Create post" : "Save changes"}
          </button>
        </div>
      </div>
    </RequirePermission>
  );
}

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
