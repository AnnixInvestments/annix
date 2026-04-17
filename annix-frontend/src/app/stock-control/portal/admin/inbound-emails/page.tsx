"use client";

import { useCallback, useState } from "react";
import type { InboundEmail, InboundEmailAttachment } from "@/app/lib/api/stockControlApi";
import {
  useInboundEmailStats,
  useInboundEmails,
  useReclassifyAttachment,
} from "@/app/lib/query/hooks";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  partial: { label: "Partial", className: "bg-orange-100 text-orange-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  unclassified: { label: "Unclassified", className: "bg-gray-100 text-gray-800" },
};

const DOCUMENT_TYPES = [
  { value: "supplier_invoice", label: "Supplier Invoice" },
  { value: "delivery_note", label: "Delivery Note" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "supplier_certificate", label: "Certificate" },
  { value: "job_card_drawing", label: "Drawing" },
  { value: "supporting_document", label: "Supporting Document" },
  { value: "unknown", label: "Unknown" },
];

function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find((dt) => dt.value === type)?.label || type;
}

function confidenceDisplay(confidence: number | null): string {
  if (confidence === null) return "-";
  return `${Math.round(confidence * 100)}%`;
}

export default function InboundEmailsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);

  const { data: stats } = useInboundEmailStats();
  const { data: emailsData, isLoading } = useInboundEmails({
    status: statusFilter || undefined,
    page,
    limit: 25,
  });
  const reclassify = useReclassifyAttachment();

  const toggleExpand = useCallback((id: number) => {
    setExpandedEmailId((prev) => (prev === id ? null : id));
  }, []);

  const handleReclassify = useCallback(
    (attachmentId: number, newType: string) => {
      reclassify.mutate({ attachmentId, documentType: newType });
    },
    [reclassify],
  );

  const items = emailsData?.items;
  const emails = items || [];
  const rawTotal = emailsData?.total;
  const total = rawTotal || 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbound Emails</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor and manage documents received via email
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Received" value={stats.total} />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Failed" value={stats.failed} color="red" />
          <StatCard label="Unclassified" value={stats.unclassified} color="gray" />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
            <option value="unclassified">Unclassified</option>
          </select>
          <span className="text-sm text-gray-500">
            {total} email{total !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : emails.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No inbound emails found. Configure email monitoring in Settings to start receiving
            documents.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {emails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                expanded={expandedEmailId === email.id}
                onToggle={() => toggleExpand(email.id)}
                onReclassify={handleReclassify}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
    gray: "text-gray-700",
  };
  const colorKey = color ?? "";
  const rawValue = colorClasses[colorKey];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${rawValue || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function EmailRow({
  email,
  expanded,
  onToggle,
  onReclassify,
}: {
  email: InboundEmail;
  expanded: boolean;
  onToggle: () => void;
  onReclassify: (attachmentId: number, newType: string) => void;
}) {
  const STATUS_BADGESProcessingStatus = STATUS_BADGES[email.processingStatus];
  const badge = STATUS_BADGESProcessingStatus || STATUS_BADGES.pending;
  const date = email.receivedAt
    ? new Date(email.receivedAt).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {email.fromName ?? email.fromEmail}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{email.subject || "(no subject)"}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {email.attachmentCount} attachment{email.attachmentCount !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-gray-400 w-32 text-right">{date}</span>
        </div>
      </button>

      {expanded && email.attachments && email.attachments.length > 0 && (
        <div className="px-4 pb-4 pl-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">Filename</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">
                  Confidence
                </th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">Source</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">Linked</th>
                <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500">
                  Extraction
                </th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {email.attachments.map((att) => (
                <AttachmentRow key={att.id} attachment={att} onReclassify={onReclassify} />
              ))}
            </tbody>
          </table>
          {email.errorMessage && (
            <p className="mt-2 text-xs text-red-600">Error: {email.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentRow({
  attachment,
  onReclassify,
}: {
  attachment: InboundEmailAttachment;
  onReclassify: (attachmentId: number, newType: string) => void;
}) {
  const extractionBadge: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "text-yellow-600" },
    processing: { label: "Processing", className: "text-blue-600" },
    completed: { label: "Done", className: "text-green-600" },
    failed: { label: "Failed", className: "text-red-600" },
    skipped: { label: "Skipped", className: "text-gray-500" },
  };

  const extractionBadgeExtractionStatus = extractionBadge[attachment.extractionStatus];
  const ext = extractionBadgeExtractionStatus || extractionBadge.pending;

  return (
    <tr>
      <td className="py-2 pr-3 text-gray-700 truncate max-w-[200px]">
        {attachment.originalFilename}
      </td>
      <td className="py-2 pr-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          {documentTypeLabel(attachment.documentType)}
        </span>
      </td>
      <td className="py-2 pr-3 text-gray-600">
        {confidenceDisplay(attachment.classificationConfidence)}
      </td>
      <td className="py-2 pr-3 text-gray-500 text-xs">{attachment.classificationSource ?? "-"}</td>
      <td className="py-2 pr-3 text-gray-600 text-xs">
        {attachment.linkedEntityType
          ? `${attachment.linkedEntityType} #${attachment.linkedEntityId}`
          : "-"}
      </td>
      <td className="py-2 pr-3">
        <span className={`text-xs font-medium ${ext.className}`}>{ext.label}</span>
      </td>
      <td className="py-2 text-right">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onReclassify(attachment.id, e.target.value);
            }
          }}
          className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">Reclassify...</option>
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}
