"use client";

import { useState } from "react";
import type { FeedbackClassification, FeedbackItem, FeedbackStatus } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useAdminFeedback,
  useAssignFeedback,
  useFeedbackAttachmentUrls,
  useUnassignFeedback,
} from "@/app/lib/query/hooks";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const CLASSIFICATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Types" },
  { value: "bug", label: "Bug" },
  { value: "ui-issue", label: "UI Issue" },
  { value: "feature-request", label: "Feature Request" },
  { value: "question", label: "Question" },
  { value: "data-issue", label: "Data Issue" },
];

const APP_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Apps" },
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Admin" },
  { value: "stock-control", label: "Stock Control" },
  { value: "au-rubber", label: "AU Rubber" },
  { value: "supplier", label: "Supplier" },
  { value: "cv-assistant", label: "CV Assistant" },
  { value: "annix-rep", label: "Annix Rep" },
];

function statusBadgeColor(status: FeedbackStatus): string {
  const colors: Record<FeedbackStatus, string> = {
    submitted: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    triaged: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  };
  return colors[status] || colors.submitted;
}

function classificationBadgeColor(classification: FeedbackClassification | null): string {
  if (!classification) return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  const colors: Record<FeedbackClassification, string> = {
    bug: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    "ui-issue": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    "feature-request": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    question: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    "data-issue": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  };
  return colors[classification] || colors.question;
}

function appBadgeColor(app: string | null): string {
  if (!app) return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  const colors: Record<string, string> = {
    customer: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    admin: "bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200",
    "stock-control": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    "au-rubber": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    supplier: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    "cv-assistant": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    "annix-rep": "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  };
  return colors[app] || "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
}

function FeedbackDetailPanel(props: { feedback: FeedbackItem; onClose: () => void }) {
  const { feedback, onClose } = props;
  const { data: attachmentUrls } = useFeedbackAttachmentUrls(feedback.id);
  const assignMutation = useAssignFeedback();
  const unassignMutation = useUnassignFeedback();

  const githubUrl = feedback.githubIssueNumber
    ? `https://github.com/AnnixInvestments/annix/issues/${feedback.githubIssueNumber}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Feedback #{feedback.id}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(feedback.status)}`}
            >
              {feedback.status}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classificationBadgeColor(feedback.aiClassification)}`}
            >
              {feedback.aiClassification || "unclassified"}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${appBadgeColor(feedback.appContext)}`}
            >
              {feedback.appContext || "unknown"}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Submitter</span>
              <span className="text-gray-900 dark:text-white">
                {feedback.submitterName || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-gray-900 dark:text-white">
                {feedback.submitterEmail || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Type</span>
              <span className="text-gray-900 dark:text-white">
                {feedback.submitterType || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Source</span>
              <span className="text-gray-900 dark:text-white">{feedback.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Date</span>
              <span className="text-gray-900 dark:text-white">
                {formatDateZA(feedback.createdAt)}
              </span>
            </div>
            {feedback.pageUrl && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Page</span>
                <span
                  className="max-w-[200px] truncate text-gray-900 dark:text-white"
                  title={feedback.pageUrl}
                >
                  {feedback.pageUrl}
                </span>
              </div>
            )}
            {feedback.assignedTo && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Assigned To</span>
                <span className="text-gray-900 dark:text-white">
                  {feedback.assignedTo.firstName} {feedback.assignedTo.lastName}
                </span>
              </div>
            )}
          </div>

          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Issue #{feedback.githubIssueNumber}
            </a>
          )}

          <div className="flex gap-2">
            {feedback.assignedToId ? (
              <button
                onClick={() => unassignMutation.mutate(feedback.id)}
                disabled={unassignMutation.isPending}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                Unassign
              </button>
            ) : (
              <button
                onClick={() => assignMutation.mutate(feedback.id)}
                disabled={assignMutation.isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Assign to me
              </button>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Content</h3>
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-800 dark:bg-slate-700/50 dark:text-gray-200">
              {feedback.content}
            </div>
          </div>

          {attachmentUrls && attachmentUrls.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Attachments ({attachmentUrls.length})
              </h3>
              <div className="space-y-2">
                {attachmentUrls.map((att) => (
                  <div key={att.id}>
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      {att.isAutoScreenshot ? "Auto-Screenshot" : att.filename}
                    </p>
                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={att.url}
                        alt={att.filename}
                        className="max-h-64 rounded-lg border border-gray-200 dark:border-slate-600"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackDashboardPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  const { data: feedbackList, isLoading } = useAdminFeedback();

  const filtered = (feedbackList || []).filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (classificationFilter && item.aiClassification !== classificationFilter) return false;
    if (appFilter && item.appContext !== appFilter) return false;
    return true;
  });

  const statusCounts = (feedbackList || []).reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const classificationCounts = (feedbackList || []).reduce(
    (acc, item) => {
      const key = item.aiClassification || "unclassified";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = feedbackList?.length || 0;
  const autoFixCount = (feedbackList || []).filter(
    (f) =>
      f.githubIssueNumber !== null &&
      (f.aiClassification === "bug" || f.aiClassification === "ui-issue"),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Feedback Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor user feedback, AI classification, and auto-fix pipeline
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(statusCounts.submitted || 0) +
              (statusCounts.triaged || 0) +
              (statusCounts.in_progress || 0)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {statusCounts.resolved || 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Auto-Fix Triggered</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{autoFixCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {["bug", "ui-issue", "feature-request", "question", "data-issue"].map((cls) => (
          <div key={cls} className="rounded-lg bg-white p-3 shadow dark:bg-slate-800">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classificationBadgeColor(cls as FeedbackClassification)}`}
            >
              {cls}
            </span>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {classificationCounts[cls] || 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow dark:bg-slate-800">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={classificationFilter}
          onChange={(e) => setClassificationFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          {CLASSIFICATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          {APP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="self-center text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {[
                  "#",
                  "Date",
                  "Submitter",
                  "App",
                  "Classification",
                  "Status",
                  "GitHub",
                  "Content",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No feedback found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30"
                    onClick={() => setSelectedFeedback(item)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                      {item.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatDateZA(item.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.submitterName || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${appBadgeColor(item.appContext)}`}
                      >
                        {item.appContext || "unknown"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classificationBadgeColor(item.aiClassification)}`}
                      >
                        {item.aiClassification || "pending"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {item.githubIssueNumber ? (
                        <a
                          href={`https://github.com/AnnixInvestments/annix/issues/${item.githubIssueNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{item.githubIssueNumber}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.content}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFeedback && (
        <FeedbackDetailPanel
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
        />
      )}
    </div>
  );
}
