"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type {
  CreateTestimonialDto,
  TestimonialSource,
  UpdateTestimonialDto,
} from "@/app/lib/api/auRubberApi";
import { now } from "@/app/lib/datetime";
import { useAuCmsTestimonial } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";
import { AuCmsHeader } from "../../AuCmsHeader";

const SOURCE_OPTIONS: { value: TestimonialSource; label: string }[] = [
  { value: "google", label: "Google review" },
  { value: "manual", label: "Manual / direct" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

function todayIso(): string {
  return now().toISODate() ?? "";
}

export default function AuMarketingTestimonialEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const isNew = id === "new";

  const testimonialQuery = useAuCmsTestimonial(isNew ? "" : id);

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (testimonialQuery.data && !loaded) {
      const data = testimonialQuery.data;
      setAuthorName(data.authorName);
      const role = data.authorRole;
      setAuthorRole(role || "");
      const company = data.authorCompany;
      setAuthorCompany(company || "");
      setRating(data.rating);
      setBody(data.body);
      setDatePublished(data.datePublished);
      setSource(data.source);
      setHighlight(data.highlight);
      setIsPublished(data.isPublished);
      setSortOrder(data.sortOrder);
      setLoaded(true);
    }
  }, [testimonialQuery.data, loaded]);

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
      if (isNew) {
        const dto: CreateTestimonialDto = {
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
        };
        const created = await auCmsAdminApi.createTestimonial(dto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
        showToast("Testimonial created", "success");
        router.push(`/admin/portal/marketing/au/testimonials/${created.id}`);
      } else {
        const dto: UpdateTestimonialDto = {
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
        };
        await auCmsAdminApi.updateTestimonial(id, dto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.testimonials.all });
        showToast("Testimonial saved", "success");
      }
    } catch {
      showToast("Failed to save testimonial", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <AuCmsHeader
        title={isNew ? "New Testimonial" : "Edit Testimonial"}
        subtitle="Quotes added here appear on auind.co.za/testimonials and emit Review JSON-LD for Google."
        actions={
          <>
            <Link
              href="/admin/portal/marketing/au/testimonials"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ← Back to testimonials
            </Link>
            <button
              type="button"
              onClick={() => router.push("/admin/portal/marketing/au/testimonials")}
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : isNew ? "Create testimonial" : "Save changes"}
            </button>
          </>
        }
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Author name" required>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </Field>
          <Field label="Rating" required>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
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
              onChange={(e) => setAuthorRole(e.target.value)}
              placeholder="e.g. Procurement Manager"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </Field>
          <Field label="Company">
            <input
              type="text"
              value={authorCompany}
              onChange={(e) => setAuthorCompany(e.target.value)}
              placeholder="e.g. Acme Mining"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </Field>
          <Field label="Date published" required>
            <DateInput
              value={datePublished}
              onChange={(value) => setDatePublished(value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </Field>
          <Field label="Source">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as TestimonialSource)}
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
            onChange={(e) => setBody(e.target.value)}
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
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first.</p>
          </Field>
          <div className="space-y-3 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-gray-700">Published (visible on the live site)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={highlight}
                onChange={(e) => setHighlight(e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-gray-700">Featured (eligible for home page)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
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
