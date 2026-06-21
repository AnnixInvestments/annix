"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  Pagination,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type { WebsitePageDto } from "@/app/lib/api/auRubberApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAuCmsWebsitePages } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";
import { MarketingBrandSwitcher } from "../MarketingBrandSwitcher";

const ITEMS_PER_PAGE = 25;

export default function AuMarketingPagesListPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const pagesQuery = useAuCmsWebsitePages();
  const rawPagesQueryData = pagesQuery.data;
  const pages = rawPagesQueryData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auCms.website.pageSize",
    ITEMS_PER_PAGE,
  );

  const filtered = pages.filter((page) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = page.title.toLowerCase().includes(q);
    const slugMatch = page.slug.toLowerCase().includes(q);
    return titleMatch || slugMatch;
  });

  const sorted = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  const paginated = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleTogglePublish = async (page: WebsitePageDto) => {
    try {
      await auCmsAdminApi.updateWebsitePage(page.id, {
        isPublished: !page.isPublished,
      });
      queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
      const action = page.isPublished ? "unpublished" : "published";
      showToast(`"${page.title}" ${action}`, "success");
    } catch {
      showToast("Failed to update page", "error");
    }
  };

  const handleDelete = async (page: WebsitePageDto) => {
    const confirmed = await confirm({
      title: "Delete Page",
      message: `Are you sure you want to delete "${page.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await auCmsAdminApi.deleteWebsitePage(page.id);
      queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
      showToast(`"${page.title}" deleted`, "success");
    } catch {
      showToast("Failed to delete page", "error");
    }
  };

  const handleMoveUp = async (page: WebsitePageDto) => {
    const idx = sorted.findIndex((p) => p.id === page.id);
    if (idx <= 0) return;
    const target = sorted[idx - 1];
    try {
      await auCmsAdminApi.reorderWebsitePage(page.id, target.sortOrder);
      await auCmsAdminApi.reorderWebsitePage(target.id, page.sortOrder);
      queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
    } catch {
      showToast("Failed to reorder page", "error");
    }
  };

  const handleMoveDown = async (page: WebsitePageDto) => {
    const idx = sorted.findIndex((p) => p.id === page.id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const target = sorted[idx + 1];
    try {
      await auCmsAdminApi.reorderWebsitePage(page.id, target.sortOrder);
      await auCmsAdminApi.reorderWebsitePage(target.id, page.sortOrder);
      queryClient.invalidateQueries({ queryKey: auCmsKeys.websitePages.all });
    } catch {
      showToast("Failed to reorder page", "error");
    }
  };

  return (
    <div className="px-6 py-4">
      {ConfirmDialog}
      <div className="mb-4">
        <MarketingBrandSwitcher active="au" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AU Industries Website Pages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage content pages for the AU Industries website
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/au-industries"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
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
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Testimonials
          </Link>
          <Link
            href="/admin/portal/marketing/au/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Blog
          </Link>
          <Link
            href="/admin/portal/marketing/au/data-sheets"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Data Sheets
          </Link>
          <Link
            href="/admin/portal/marketing/au/pages/new"
            className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
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
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>

        {pagesQuery.isLoading ? (
          <TableLoadingState message="Loading pages..." />
        ) : paginated.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title={searchQuery ? "No pages match your search" : "No website pages yet"}
            subtitle={
              searchQuery ? "Try a different search term" : "Create your first page to get started"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Home
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/portal/marketing/au/pages/${page.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-yellow-600"
                      >
                        {page.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 font-mono">/{page.slug}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span className="w-6 text-center">{page.sortOrder}</span>
                        <button
                          onClick={() => handleMoveUp(page)}
                          className="p-1 text-gray-400 hover:text-yellow-600 disabled:opacity-30"
                          disabled={sorted.findIndex((p) => p.id === page.id) === 0}
                          title="Move up"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveDown(page)}
                          className="p-1 text-gray-400 hover:text-yellow-600 disabled:opacity-30"
                          disabled={sorted.findIndex((p) => p.id === page.id) === sorted.length - 1}
                          title="Move down"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(page)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          page.isPublished
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        {page.isPublished ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {page.isHomePage ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Home
                        </span>
                      ) : null}
                      {page.showInNav === false ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-1">
                          Hidden
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/portal/marketing/au/pages/${page.id}`}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(page)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={pageSize}
        itemName="pages"
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(0);
        }}
      />
    </div>
  );
}
