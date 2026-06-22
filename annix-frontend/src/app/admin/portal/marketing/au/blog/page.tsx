"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuCmsBlogPosts } from "@/app/lib/query/hooks";
import { AuCmsHeader } from "../AuCmsHeader";
import { BlogPostEditor, type BlogPostEditorHandle } from "./BlogPostEditor";

export default function AuMarketingBlogListPage() {
  const postsQuery = useAuCmsBlogPosts();
  const rawData = postsQuery.data;
  const posts = rawData || [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const editorRef = useRef<BlogPostEditorHandle>(null);

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

  const switchToPost = async (id: string) => {
    await autoSaveCurrent();
    setSelectedId(id);
  };

  useEffect(() => {
    if (defaultApplied || postsQuery.isLoading) return;
    const first = posts.length > 0 ? posts[0] : null;
    const firstId = first ? first.id : "new";
    setSelectedId(firstId);
    setDefaultApplied(true);
  }, [defaultApplied, postsQuery.isLoading, posts]);

  const activeId = selectedId;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
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
              New Post
            </button>
          </>
        }
      />

      <div className="sticky top-[57px] z-[5] -mx-6 overflow-x-auto border-b border-gray-200 bg-gray-50 px-6 py-2">
        <div className="flex gap-1">
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => switchToPost(post.id)}
              className={
                activeId === post.id
                  ? "whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
                  : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
              }
            >
              {post.title}
            </button>
          ))}
          {activeId === "new" ? (
            <button
              type="button"
              onClick={() => switchToPost("new")}
              className="whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              New post
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {activeId ? (
          <BlogPostEditor
            ref={editorRef}
            key={activeId}
            postId={activeId}
            onCreated={(id) => setSelectedId(id)}
            onDeleted={(deletedId) => {
              const remaining = posts.find((p) => p.id !== deletedId);
              setSelectedId(remaining ? remaining.id : "new");
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
