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
import { auRubberApiClient, type BlogPostDto } from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAuRubberBlogPosts } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys/rubberKeys";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

const ITEMS_PER_PAGE = 25;

export default function BlogPostsListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const postsQuery = useAuRubberBlogPosts();
  const rawData = postsQuery.data;
  const posts = rawData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.blog.pageSize",
    ITEMS_PER_PAGE,
  );
  const [deleteTarget, setDeleteTarget] = useState<BlogPostDto | null>(null);

  const filtered = posts.filter((post) => {
    const q = searchQuery.toLowerCase();
    return post.title.toLowerCase().includes(q) || post.slug.toLowerCase().includes(q);
  });

  const paginated = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleTogglePublish = async (post: BlogPostDto) => {
    try {
      await auRubberApiClient.updateBlogPost(post.id, { isPublished: !post.isPublished });
      queryClient.invalidateQueries({ queryKey: rubberKeys.blogPosts.all });
      const action = post.isPublished ? "unpublished" : "published";
      showToast(`"${post.title}" ${action}`, "success");
    } catch {
      showToast("Failed to update post", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await auRubberApiClient.deleteBlogPost(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: rubberKeys.blogPosts.all });
      showToast(`"${deleteTarget.title}" deleted`, "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete post", "error");
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/website"]}>
      <Breadcrumb
        items={[
          { label: "Website Pages", href: "/au-rubber/portal/website" },
          { label: "Blog Posts" },
        ]}
      />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
            <p className="text-sm text-gray-500 mt-1">
              Write product launches, project completions, and industry insights for the AU
              Industries blog
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/au-industries/blog"
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
              View Live Blog
            </a>
            <Link
              href="/au-rubber/portal/website/blog/new"
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
              New Post
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
                      onDelete={() => setDeleteTarget(post)}
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

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Blog Post"
        message={deleteTarget ? `Delete "${deleteTarget.title}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
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
          href={`/au-rubber/portal/website/blog/${props.post.id}`}
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
          href={`/au-rubber/portal/website/blog/${props.post.id}`}
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
