"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type { CreateWebsitePageDto, UpdateWebsitePageDto } from "@/app/lib/api/auRubberApi";
import { BlockEditor, type BlockEditorHandle } from "@/app/lib/cms/components/BlockEditor";
import { HeroImagePicker } from "@/app/lib/cms/components/HeroImagePicker";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAuCmsWebsitePage } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface AuPageEditorProps {
  pageId: string;
  onCreated?: (id: string) => void;
  onDeleted?: (id: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export interface AuPageEditorHandle {
  save: () => Promise<void>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const AuPageEditor = forwardRef<AuPageEditorHandle, AuPageEditorProps>(
  function AuPageEditor(props, ref) {
    const pageId = props.pageId;
    const onCreated = props.onCreated;
    const onDeleted = props.onDeleted;
    const onMoveLeft = props.onMoveLeft;
    const onMoveRight = props.onMoveRight;
    const canMoveLeft = props.canMoveLeft;
    const canMoveRight = props.canMoveRight;
    const isNew = pageId === "new";
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirm();
    const queryClient = useQueryClient();
    const blockRef = useRef<BlockEditorHandle>(null);

    const pageQuery = useAuCmsWebsitePage(isNew ? "" : pageId);

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [content, setContent] = useState("");
    const [heroImageUrl, setHeroImageUrl] = useState("");
    const [sortOrder, setSortOrder] = useState(0);
    const [isPublished, setIsPublished] = useState(false);
    const [isHomePage, setIsHomePage] = useState(false);
    const [showInNav, setShowInNav] = useState(true);
    const [useBlocks, setUseBlocks] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
      if (pageQuery.data && !loaded) {
        const p = pageQuery.data;
        const rawMetaTitle = p.metaTitle;
        const metaTitleValue = rawMetaTitle || "";
        const rawMetaDesc = p.metaDescription;
        const metaDescValue = rawMetaDesc || "";
        const rawHeroImage = p.heroImageUrl;
        const heroImageValue = rawHeroImage || "";
        setTitle(p.title);
        setSlug(p.slug);
        setSlugManuallyEdited(true);
        setMetaTitle(metaTitleValue);
        setMetaDescription(metaDescValue);
        setContent(p.content);
        setHeroImageUrl(heroImageValue);
        setSortOrder(p.sortOrder);
        setIsPublished(p.isPublished);
        setIsHomePage(p.isHomePage);
        setShowInNav(p.showInNav !== false);
        setUseBlocks(p.useBlocks === true);
        setLoaded(true);
        setDirty(false);
      }
    }, [pageQuery.data, loaded]);

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

    const handleSave = async () => {
      if (!title.trim()) {
        showToast("Title is required", "error");
        return;
      }
      if (!slug.trim()) {
        showToast("Slug is required", "error");
        return;
      }

      setSaving(true);
      try {
        const fields = {
          title: title.trim(),
          slug: slug.trim(),
          metaTitle: metaTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          content,
          heroImageUrl: heroImageUrl.trim() || null,
          sortOrder,
          isPublished,
          isHomePage,
          showInNav,
          useBlocks,
        };

        if (isNew) {
          const created = await auCmsAdminApi.createWebsitePage(fields as CreateWebsitePageDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
          setDirty(false);
          showToast(`"${created.title}" created`, "success");
          onCreated?.(created.id);
        } else {
          await auCmsAdminApi.updateWebsitePage(pageId, fields as UpdateWebsitePageDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
          queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.detail(pageId) });
          setDirty(false);
          showToast("Page saved", "success");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save page";
        showToast(message, "error");
      } finally {
        setSaving(false);
      }
    };

    const autoSave = async () => {
      const fields = {
        title: title.trim(),
        slug: slug.trim(),
        metaTitle: metaTitle.trim() || null,
        metaDescription: metaDescription.trim() || null,
        content,
        heroImageUrl: heroImageUrl.trim() || null,
        sortOrder,
        isPublished,
        isHomePage,
        showInNav,
        useBlocks,
      };

      if (isNew) {
        if (!title.trim()) {
          return;
        }
        await auCmsAdminApi.createWebsitePage(fields as CreateWebsitePageDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
        setDirty(false);
        return;
      }

      if (dirty) {
        await auCmsAdminApi.updateWebsitePage(pageId, fields as UpdateWebsitePageDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.detail(pageId) });
        setDirty(false);
      }
      const block = blockRef.current;
      if (block) {
        await block.saveDraft();
      }
    };

    useImperativeHandle(ref, () => ({ save: autoSave }), [autoSave]);

    const handleTogglePublish = async () => {
      const next = !isPublished;
      setTogglingPublish(true);
      try {
        await auCmsAdminApi.updateWebsitePage(pageId, { isPublished: next });
        setIsPublished(next);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
        queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.detail(pageId) });
        showToast(next ? "Page published" : "Page unpublished", "success");
      } catch {
        showToast("Failed to update publish state", "error");
      } finally {
        setTogglingPublish(false);
      }
    };

    const handleDelete = async () => {
      const confirmed = await confirm({
        title: "Delete page",
        message: `Delete "${title || "this page"}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) {
        return;
      }
      setDeleting(true);
      try {
        await auCmsAdminApi.deleteWebsitePage(pageId);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
        showToast("Page deleted", "success");
        onDeleted?.(pageId);
      } catch {
        showToast("Failed to delete page", "error");
      } finally {
        setDeleting(false);
      }
    };

    const loadedPage = pageQuery.data;
    const loadedDraftBlocks = loadedPage ? loadedPage.draftBlocks : null;
    const loadedPublishedBlocks = loadedPage ? loadedPage.publishedBlocks : null;
    const initialBlocks = loadedDraftBlocks ?? loadedPublishedBlocks ?? [];

    if (!isNew && pageQuery.isLoading) {
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
            {isNew ? "New page" : title || "Untitled page"}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && onMoveLeft ? (
              <button
                type="button"
                onClick={onMoveLeft}
                disabled={!canMoveLeft}
                title="Move earlier"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ◀
              </button>
            ) : null}
            {!isNew && onMoveRight ? (
              <button
                type="button"
                onClick={onMoveRight}
                disabled={!canMoveRight}
                title="Move later"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ▶
              </button>
            ) : null}
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Page Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Page title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-400 mr-1">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="page-slug"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => {
                  setDirty(true);
                  setSortOrder(Number(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div className="flex items-end space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHomePage}
                  onChange={(e) => {
                    setDirty(true);
                    setIsHomePage(e.target.checked);
                  }}
                  className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="text-sm font-medium text-gray-700">Home Page</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInNav}
                  onChange={(e) => {
                    setDirty(true);
                    setShowInNav(e.target.checked);
                  }}
                  className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="text-sm font-medium text-gray-700">Show in Nav</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Title
                <span className="text-gray-400 font-normal ml-1">(defaults to page title)</span>
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setDirty(true);
                  setMetaTitle(e.target.value);
                }}
                placeholder="Override page title for search engines"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => {
                  setDirty(true);
                  setMetaDescription(e.target.value);
                }}
                placeholder="Brief description for search engine results"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hero Image</h2>
          <div className="space-y-3">
            {heroImageUrl && (
              <div className="relative">
                <img
                  src={heroImageUrl}
                  alt="Hero preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setDirty(true);
                    setHeroImageUrl("");
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <HeroImagePicker
                currentImage={heroImageUrl}
                onSelect={(url) => {
                  setDirty(true);
                  setHeroImageUrl(url);
                }}
              />
              <label className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {uploading ? "Uploading..." : "Upload New"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content (markdown)</h2>
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => {
                setDirty(true);
                setContent(val || "");
              }}
              height={500}
              preview="live"
            />
          </div>
        </div>

        {!isNew && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Page Blocks</h2>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useBlocks}
                  onChange={(e) => {
                    setDirty(true);
                    setUseBlocks(e.target.checked);
                  }}
                  className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Use blocks for the live page
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              When ticked (and after the blocks are published), the live page renders these blocks
              instead of the markdown content above. Remember to press Save at the top to store the
              "Use blocks" setting.
            </p>
            <BlockEditor ref={blockRef} pageId={pageId} initialBlocks={initialBlocks} />
          </div>
        )}
      </div>
    );
  },
);
