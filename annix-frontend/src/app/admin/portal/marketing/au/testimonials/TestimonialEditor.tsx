"use client";

import { useQueryClient } from "@tanstack/react-query";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type {
  CreateTestimonialDto,
  TestimonialSource,
  UpdateTestimonialDto,
} from "@/app/lib/api/auRubberApi";
import { now } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAuCmsTestimonial } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";

const SOURCE_OPTIONS: { value: TestimonialSource; label: string }[] = [
  { value: "google", label: "Google review" },
  { value: "manual", label: "Manual / direct" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

function todayIso(): string {
  const date = now().toISODate();
  return date || "";
}

interface TestimonialEditorProps {
  testimonialId: string;
  onCreated?: (id: string) => void;
  onDeleted?: (id: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export interface TestimonialEditorHandle {
  save: () => Promise<void>;
}

export const TestimonialEditor = forwardRef<TestimonialEditorHandle, TestimonialEditorProps>(
  function TestimonialEditor(props, ref) {
    const testimonialId = props.testimonialId;
    const onCreated = props.onCreated;
    const onDeleted = props.onDeleted;
    const onMoveLeft = props.onMoveLeft;
    const onMoveRight = props.onMoveRight;
    const canMoveLeft = props.canMoveLeft;
    const canMoveRight = props.canMoveRight;
    const isNew = testimonialId === "new";
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirm();
    const queryClient = useQueryClient();

    const testimonialQuery = useAuCmsTestimonial(isNew ? "" : testimonialId);

    const [authorName, setAuthorName] = useState("");
    const [authorRole, setAuthorRole] = useState("");
    const [authorCompany, setAuthorCompany] = useState("");
    const [rating, setRating] = useState(5);
    const [body, setBody] = useState("");
    const [datePublished, setDatePublished] = useState(todayIso());
    const [source, setSource] = useState<TestimonialSource>("google");
    const [highlight, setHighlight] = useState(false);
    const [isPublished, setIsPublished] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
      if (testimonialQuery.data && !loaded) {
        const data = testimonialQuery.data;
        const role = data.authorRole;
        const company = data.authorCompany;
        setAuthorName(data.authorName);
        setAuthorRole(role || "");
        setAuthorCompany(company || "");
        setRating(data.rating);
        setBody(data.body);
        setDatePublished(data.datePublished);
        setSource(data.source);
        setHighlight(data.highlight);
        setIsPublished(data.isPublished);
        setSortOrder(data.sortOrder);
        setLoaded(true);
        setDirty(false);
      }
    }, [testimonialQuery.data, loaded]);

    const buildFields = () => ({
      authorName: authorName.trim(),
      authorRole: authorRole.trim().length > 0 ? authorRole.trim() : null,
      authorCompany: authorCompany.trim().length > 0 ? authorCompany.trim() : null,
      rating,
      body: body.trim(),
      datePublished,
      source,
      highlight,
      isPublished,
      sortOrder,
    });

    const handleSave = async () => {
      if (authorName.trim().length === 0) {
        showToast("Author name is required", "error");
        return;
      }
      if (body.trim().length === 0) {
        showToast("Testimonial body is required", "error");
        return;
      }
      if (rating < 1 || rating > 5) {
        showToast("Rating must be between 1 and 5", "error");
        return;
      }

      setSaving(true);
      try {
        const fields = buildFields();
        if (isNew) {
          const created = await auCmsAdminApi.createTestimonial(fields as CreateTestimonialDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
          setDirty(false);
          showToast("Testimonial created", "success");
          onCreated?.(created.id);
        } else {
          await auCmsAdminApi.updateTestimonial(testimonialId, fields as UpdateTestimonialDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
          queryClient.invalidateQueries({
            queryKey: auCmsKeys.testimonials.detail(testimonialId),
          });
          setDirty(false);
          showToast("Testimonial saved", "success");
        }
      } catch {
        showToast("Failed to save testimonial", "error");
      } finally {
        setSaving(false);
      }
    };

    const autoSave = async () => {
      const fields = buildFields();
      if (isNew) {
        if (authorName.trim().length === 0 || body.trim().length === 0) {
          return;
        }
        await auCmsAdminApi.createTestimonial(fields as CreateTestimonialDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
        setDirty(false);
        return;
      }

      if (dirty) {
        await auCmsAdminApi.updateTestimonial(testimonialId, fields as UpdateTestimonialDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
        queryClient.invalidateQueries({
          queryKey: auCmsKeys.testimonials.detail(testimonialId),
        });
        setDirty(false);
      }
    };

    useImperativeHandle(ref, () => ({ save: autoSave }), [autoSave]);

    const handleTogglePublish = async () => {
      const next = !isPublished;
      setTogglingPublish(true);
      try {
        await auCmsAdminApi.updateTestimonial(testimonialId, { isPublished: next });
        setIsPublished(next);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
        queryClient.invalidateQueries({
          queryKey: auCmsKeys.testimonials.detail(testimonialId),
        });
        showToast(next ? "Testimonial published" : "Testimonial unpublished", "success");
      } catch {
        showToast("Failed to update publish state", "error");
      } finally {
        setTogglingPublish(false);
      }
    };

    const handleDelete = async () => {
      const confirmed = await confirm({
        title: "Delete Testimonial",
        message: `Delete the testimonial from "${authorName || "this author"}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) {
        return;
      }
      setDeleting(true);
      try {
        await auCmsAdminApi.deleteTestimonial(testimonialId);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
        showToast("Testimonial deleted", "success");
        onDeleted?.(testimonialId);
      } catch {
        showToast("Failed to delete testimonial", "error");
      } finally {
        setDeleting(false);
      }
    };

    if (!isNew && testimonialQuery.isLoading) {
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
            {isNew ? "New testimonial" : authorName || "Untitled testimonial"}
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Author name" required>
              <input
                type="text"
                value={authorName}
                onChange={(e) => {
                  setDirty(true);
                  setAuthorName(e.target.value);
                }}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Rating" required>
              <select
                value={rating}
                onChange={(e) => {
                  setDirty(true);
                  setRating(Number(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value={5}>5 stars</option>
                <option value={4}>4 stars</option>
                <option value={3}>3 stars</option>
                <option value={2}>2 stars</option>
                <option value={1}>1 star</option>
              </select>
            </Field>
            <Field label="Role / title">
              <input
                type="text"
                value={authorRole}
                onChange={(e) => {
                  setDirty(true);
                  setAuthorRole(e.target.value);
                }}
                placeholder="e.g. Procurement Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                value={authorCompany}
                onChange={(e) => {
                  setDirty(true);
                  setAuthorCompany(e.target.value);
                }}
                placeholder="e.g. Acme Mining"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Date published" required>
              <DateInput
                value={datePublished}
                onChange={(value) => {
                  setDirty(true);
                  setDatePublished(value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </Field>
            <Field label="Source">
              <select
                value={source}
                onChange={(e) => {
                  setDirty(true);
                  setSource(e.target.value as TestimonialSource);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Testimonial body" required>
            <textarea
              value={body}
              onChange={(e) => {
                setDirty(true);
                setBody(e.target.value);
              }}
              rows={6}
              placeholder="Paste the customer's quote here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Sort order">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => {
                  setDirty(true);
                  setSortOrder(Number(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first.</p>
            </Field>
            <div className="space-y-3 pt-6">
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
                <span className="text-gray-700">Published (visible on the live site)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={highlight}
                  onChange={(e) => {
                    setDirty(true);
                    setHighlight(e.target.checked);
                  }}
                  className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                />
                <span className="text-gray-700">Featured (eligible for home page)</span>
              </label>
            </div>
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
