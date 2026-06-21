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
import type { BlogPostDto } from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAuCmsBlogPosts } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";
import { AuCmsHeader } from "../AuCmsHeader";

const ITEMS_PER_PAGE = 25;

export default function AuMarketingBlogListPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const postsQuery = useAuCmsBlogPosts();
  const rawData = postsQuery.data;
  const posts = rawData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>("auCms.blog.pageSize", ITEMS_PER_PAGE);

  const filtered = posts.filter((post) => {
    const q = searchQuery.toLowerCase();
    return post.title.toLowerCase().includes(q) || post.slug.toLowerCase().includes(q);
  });

  const paginated = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleTogglePublish = async (post: BlogPostDto) => {
    try {
      await auCmsAdminApi.updateBlogPost(post.id, { isPublished: !post.isPublished });
      queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
      const action = post.isPublished ? "unpublished" : "published";
      showToast(`"${post.title}" ${action}`, "success");
    } catch {
      showToast("Failed to update post", "error");
    }
  };

  const handleDelete = async (post: BlogPostDto) => {
    const confirmed = await confirm({
      title: "Delete Blog Post",
      message: `Delete "${post.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await auCmsAdminApi.deleteBlogPost(post.id);
      queryClient.invalidateQueries({ queryKey: auCmsKeys.blogPosts.all });
      showToast(`"${post.title}" deleted`, "success");
    } catch {
      showToast("Failed to delete post", "error");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {ConfirmDialog}
      <AuCmsHeader
        title="Blog Posts"
        subtitle="Write product launches, project completions, and industry insights for the AU Industries blog"
        actions={
          <>
            <Link
              href="/admin/portal/marketing/au"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ← Back to pages
            </Link>
            <a
              href="/au-industries/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              View Live Blog
            </a>
            <Link
              href="/admin/portal/marketing/au/blog/new"
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
              New Post
            </Link>
          </>
        }
      />

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

        {postsQuery.isLoading ? (
          <TableLoadingState message="Loading posts..." />
        ) : paginated.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title={searchQuery ? "No posts match your search" : "No blog posts yet"}
            subtitle={
              searchQuery
                ? "Try a different search term"
                : "Write your first post to launch the blog"
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
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((post) => (
                  <BlogPostRow
                    key={post.id}
                    post={post}
                    onTogglePublish={() => handleTogglePublish(post)}
                    onDelete={() => handleDelete(post)}
                  />
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
        itemName="posts"
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(0);
        }}
      />
    </div>
  );
}

function BlogPostRow(props: {
  post: BlogPostDto;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const publishedAt = props.post.publishedAt;
  const publishedDisplay = publishedAt ? formatDateZA(publishedAt) : "—";

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <Link
          href={`/admin/portal/marketing/au/blog/${props.post.id}`}
          className="text-sm font-medium text-gray-900 hover:text-yellow-600"
        >
          {props.post.title}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-500 font-mono">/blog/{props.post.slug}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{props.post.author}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{publishedDisplay}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={props.onTogglePublish}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            props.post.isPublished
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {props.post.isPublished ? "Published" : "Draft"}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <Link
          href={`/admin/portal/marketing/au/blog/${props.post.id}`}
          className="text-yellow-600 hover:text-yellow-900 mr-4"
        >
          Edit
        </Link>
        <button onClick={props.onDelete} className="text-red-600 hover:text-red-900">
          Delete
        </button>
      </td>
    </tr>
  );
}
