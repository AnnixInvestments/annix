"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import { useAuCmsWebsitePages } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";
import { AuCmsHeader } from "./AuCmsHeader";
import { AuPageEditor, type AuPageEditorHandle } from "./AuPageEditor";

export default function AuMarketingPagesListPage() {
  const pagesQuery = useAuCmsWebsitePages();
  const rawPagesQueryData = pagesQuery.data;
  const pages = rawPagesQueryData || [];
  const sorted = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const editorRef = useRef<AuPageEditorHandle>(null);
  const queryClient = useQueryClient();

  const autoSaveCurrent = async () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    try {
      await editor.save();
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  const switchToPage = async (id: string) => {
    await autoSaveCurrent();
    setSelectedId(id);
  };

  useEffect(() => {
    if (defaultApplied || pagesQuery.isLoading) return;
    const home = sorted.find((p) => p.isHomePage);
    const first = sorted.length > 0 ? sorted[0] : null;
    const fallback = first ? first.id : "new";
    const homeId = home ? home.id : fallback;
    setSelectedId(homeId);
    setDefaultApplied(true);
  }, [defaultApplied, pagesQuery.isLoading, sorted]);

  const activeId = selectedId;
  const activeIndex = activeId ? sorted.findIndex((p) => p.id === activeId) : -1;
  const canMoveLeft = activeIndex > 0;
  const canMoveRight = activeIndex >= 0 && activeIndex < sorted.length - 1;

  const swapSortOrder = async (index: number, targetIndex: number) => {
    const page = sorted[index];
    const target = sorted[targetIndex];
    if (!page || !target) {
      return;
    }
    await auCmsAdminApi.reorderWebsitePage(page.id, target.sortOrder);
    await auCmsAdminApi.reorderWebsitePage(target.id, page.sortOrder);
    queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
  };

  const handleMoveLeft = async () => {
    if (activeIndex <= 0) {
      return;
    }
    await swapSortOrder(activeIndex, activeIndex - 1);
  };

  const handleMoveRight = async () => {
    if (activeIndex < 0 || activeIndex >= sorted.length - 1) {
      return;
    }
    await swapSortOrder(activeIndex, activeIndex + 1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <AuCmsHeader
        title="AU Industries Website Pages"
        subtitle="Manage content pages for the AU Industries website"
        actions={
          <>
            <a
              href="/au-industries"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              View Site
            </a>
            <Link
              href="/admin/portal/marketing/au/testimonials"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Testimonials
            </Link>
            <Link
              href="/admin/portal/marketing/au/blog"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Blog
            </Link>
            <Link
              href="/admin/portal/marketing/au/data-sheets"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Data Sheets
            </Link>
            <button
              type="button"
              onClick={async () => {
                await autoSaveCurrent();
                setSelectedId("new");
                setDefaultApplied(true);
              }}
              className="inline-flex items-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Page
            </button>
          </>
        }
      />

      <div className="sticky top-[57px] z-[5] -mx-6 overflow-x-auto border-b border-gray-200 bg-gray-50 px-6 py-2">
        <div className="flex gap-1">
          {sorted.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => switchToPage(page.id)}
              className={
                activeId === page.id
                  ? "whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
                  : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
              }
            >
              {page.title}
            </button>
          ))}
          {activeId === "new" ? (
            <button
              type="button"
              onClick={() => switchToPage("new")}
              className="whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              New page
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {activeId ? (
          <AuPageEditor
            ref={editorRef}
            key={activeId}
            pageId={activeId}
            onCreated={(id) => setSelectedId(id)}
            onDeleted={(deletedId) => {
              const remaining = sorted.find((p) => p.id !== deletedId);
              setSelectedId(remaining ? remaining.id : "new");
            }}
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            canMoveLeft={canMoveLeft}
            canMoveRight={canMoveRight}
          />
        ) : null}
      </div>
    </div>
  );
}
