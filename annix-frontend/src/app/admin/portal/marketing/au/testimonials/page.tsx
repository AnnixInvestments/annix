"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import { useAuCmsTestimonials } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";
import { AuCmsHeader } from "../AuCmsHeader";
import { TestimonialEditor, type TestimonialEditorHandle } from "./TestimonialEditor";

export default function AuMarketingTestimonialsListPage() {
  const testimonialsQuery = useAuCmsTestimonials();
  const rawData = testimonialsQuery.data;
  const testimonials = rawData || [];
  const sorted = [...testimonials].sort((a, b) => {
    const orderDiff = a.sortOrder - b.sortOrder;
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return b.datePublished.localeCompare(a.datePublished);
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const editorRef = useRef<TestimonialEditorHandle>(null);
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

  const switchToTestimonial = async (id: string) => {
    await autoSaveCurrent();
    setSelectedId(id);
  };

  useEffect(() => {
    if (defaultApplied || testimonialsQuery.isLoading) return;
    const first = sorted.length > 0 ? sorted[0] : null;
    const firstId = first ? first.id : "new";
    setSelectedId(firstId);
    setDefaultApplied(true);
  }, [defaultApplied, testimonialsQuery.isLoading, sorted]);

  const activeId = selectedId;
  const activeIndex = activeId ? sorted.findIndex((t) => t.id === activeId) : -1;
  const canMoveLeft = activeIndex > 0;
  const canMoveRight = activeIndex >= 0 && activeIndex < sorted.length - 1;

  const swapSortOrder = async (index: number, targetIndex: number) => {
    const entry = sorted[index];
    const target = sorted[targetIndex];
    if (!entry || !target) {
      return;
    }
    await auCmsAdminApi.updateTestimonial(entry.id, { sortOrder: target.sortOrder });
    await auCmsAdminApi.updateTestimonial(target.id, { sortOrder: entry.sortOrder });
    queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
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
        title="Testimonials"
        subtitle="Quotes added here appear on auind.co.za/testimonials and emit Review JSON-LD for Google."
        actions={
          <>
            <Link
              href="/admin/portal/marketing/au"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ← Back to pages
            </Link>
            <a
              href="/au-industries/testimonials"
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
              View Live Page
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
              New Testimonial
            </button>
          </>
        }
      />

      <div className="sticky top-[57px] z-[5] -mx-6 overflow-x-auto border-b border-gray-200 bg-gray-50 px-6 py-2">
        <div className="flex gap-1">
          {sorted.map((entry) => {
            const company = entry.authorCompany;
            const label = company ? `${entry.authorName} · ${company}` : entry.authorName;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => switchToTestimonial(entry.id)}
                className={
                  activeId === entry.id
                    ? "whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
                    : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
                }
              >
                {label}
              </button>
            );
          })}
          {activeId === "new" ? (
            <button
              type="button"
              onClick={() => switchToTestimonial("new")}
              className="whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              New testimonial
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {activeId ? (
          <TestimonialEditor
            ref={editorRef}
            key={activeId}
            testimonialId={activeId}
            onCreated={(id) => setSelectedId(id)}
            onDeleted={(deletedId) => {
              const remaining = sorted.find((t) => t.id !== deletedId);
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
