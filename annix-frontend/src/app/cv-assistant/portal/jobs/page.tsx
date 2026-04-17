"use client";

import { useState } from "react";
import type { JobPosting } from "@/app/lib/api/cvAssistantApi";
import {
  useCvDeleteJobPosting,
  useCvJobPostingStatusChange,
  useCvJobPostings,
} from "@/app/lib/query/hooks";
import { JobFormModal } from "../components/JobFormModal";

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useCvJobPostings();
  const statusChangeMutation = useCvJobPostingStatusChange();
  const deleteMutation = useCvDeleteJobPosting();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);

  const handleStatusChange = (job: JobPosting, action: "activate" | "pause" | "close") => {
    statusChangeMutation.mutate({ id: job.id, action });
  };

  const handleDelete = (job: JobPosting) => {
    // eslint-disable-next-line no-restricted-globals -- legacy sync confirm pending modal migration (issue #175)
    if (!confirm(`Are you sure you want to delete "${job.title}"?`)) return;
    deleteMutation.mutate(job.id);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      closed: "bg-red-100 text-red-800",
    };
    const color = colors[status];
    return color || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-gray-600 mt-1">Manage your job positions and requirements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Job
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experience
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
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No job postings yet. Create your first job to start receiving candidates.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{job.title}</div>
                      {job.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {job.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{job.requiredSkills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {job.minExperienceYears ? `${job.minExperienceYears}+ years` : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end space-x-2">
                        {job.status === "draft" && (
                          <button
                            onClick={() => handleStatusChange(job, "activate")}
                            className="text-green-600 hover:text-green-700"
                          >
                            Activate
                          </button>
                        )}
                        {job.status === "active" && (
                          <button
                            onClick={() => handleStatusChange(job, "pause")}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            Pause
                          </button>
                        )}
                        {job.status === "paused" && (
                          <button
                            onClick={() => handleStatusChange(job, "activate")}
                            className="text-green-600 hover:text-green-700"
                          >
                            Resume
                          </button>
                        )}
                        {job.status !== "closed" && (
                          <button
                            onClick={() => handleStatusChange(job, "close")}
                            className="text-red-600 hover:text-red-700"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => setEditingJob(job)}
                          className="text-violet-600 hover:text-violet-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(job)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(showCreateModal || editingJob) && (
        <JobFormModal
          job={editingJob}
          onClose={() => {
            setShowCreateModal(false);
            setEditingJob(null);
          }}
        />
      )}
    </div>
  );
}
