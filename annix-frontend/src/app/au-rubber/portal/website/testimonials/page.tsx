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
import { auRubberApiClient, type TestimonialDto } from "@/app/lib/api/auRubberApi";
import { useAuRubberTestimonials } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys/rubberKeys";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

const ITEMS_PER_PAGE = 25;

export default function TestimonialsListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const testimonialsQuery = useAuRubberTestimonials();
  const rawData = testimonialsQuery.data;
  const testimonials = rawData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.testimonials.pageSize",
    ITEMS_PER_PAGE,
  );
  const [deleteTarget, setDeleteTarget] = useState<TestimonialDto | null>(null);

  const filtered = testimonials.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = entry.authorName.toLowerCase().includes(q);
    const company = entry.authorCompany;
    const companyMatch = company !== null ? company.toLowerCase().includes(q) : false;
    const bodyMatch = entry.body.toLowerCase().includes(q);
    return nameMatch || companyMatch || bodyMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const orderDiff = a.sortOrder - b.sortOrder;
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return b.datePublished.localeCompare(a.datePublished);
  });
  const paginated = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleTogglePublish = async (entry: TestimonialDto) => {
    try {
      await auRubberApiClient.updateTestimonial(entry.id, { isPublished: !entry.isPublished });
      queryClient.invalidateQueries({ queryKey: rubberKeys.testimonials.all });
      const action = entry.isPublished ? "unpublished" : "published";
      showToast(`Testimonial from ${entry.authorName} ${action}`, "success");
    } catch {
      showToast("Failed to update testimonial", "error");
    }
  };

  const handleToggleHighlight = async (entry: TestimonialDto) => {
    try {
      await auRubberApiClient.updateTestimonial(entry.id, { highlight: !entry.highlight });
      queryClient.invalidateQueries({ queryKey: rubberKeys.testimonials.all });
    } catch {
      showToast("Failed to update testimonial", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await auRubberApiClient.deleteTestimonial(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: rubberKeys.testimonials.all });
      showToast(`Testimonial from ${deleteTarget.authorName} deleted`, "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete testimonial", "error");
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/website"]}>
      <Breadcrumb
        items={[
          { label: "Website Pages", href: "/au-rubber/portal/website" },
          { label: "Testimonials" },
        ]}
      />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage customer testimonials shown on the AU Industries website
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/au-industries/testimonials"
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
              View Live Page
            </a>
            <Link
              href="/au-rubber/portal/website/testimonials/new"
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
              New Testimonial
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by name, company, or content..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {testimonialsQuery.isLoading ? (
            <TableLoadingState message="Loading testimonials..." />
          ) : paginated.length === 0 ? (
            <TableEmptyState
              icon={<TableIcons.document />}
              title={searchQuery ? "No testimonials match your search" : "No testimonials yet"}
              subtitle={
                searchQuery
                  ? "Try a different search term"
                  : "Add your first testimonial to populate the live page"
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Highlight
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.map((entry) => (
                    <TestimonialRow
                      key={entry.id}
                      entry={entry}
                      onTogglePublish={() => handleTogglePublish(entry)}
                      onToggleHighlight={() => handleToggleHighlight(entry)}
                      onDelete={() => setDeleteTarget(entry)}
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
          itemName="testimonials"
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(0);
          }}
        />
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Testimonial"
        message={
          deleteTarget
            ? `Delete the testimonial from "${deleteTarget.authorName}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
  );
}

function TestimonialRow(props: {
  entry: TestimonialDto;
  onTogglePublish: () => void;
  onToggleHighlight: () => void;
  onDelete: () => void;
}) {
  const company = props.entry.authorCompany;
  const role = props.entry.authorRole;
  const subtitle = [role, company].filter((part) => part !== null).join(" · ");

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <Link
          href={`/au-rubber/portal/website/testimonials/${props.entry.id}`}
          className="text-sm font-medium text-gray-900 hover:text-yellow-600"
        >
          {props.entry.authorName}
        </Link>
        {subtitle.length > 0 && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-900">{props.entry.rating} / 5</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {props.entry.datePublished}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
          {props.entry.source}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={props.onTogglePublish}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            props.entry.isPublished
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {props.entry.isPublished ? "Published" : "Draft"}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={props.onToggleHighlight}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            props.entry.highlight
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {props.entry.highlight ? "Featured" : "Standard"}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <Link
          href={`/au-rubber/portal/website/testimonials/${props.entry.id}`}
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
