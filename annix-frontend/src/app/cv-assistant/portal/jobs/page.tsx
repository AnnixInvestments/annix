"use client";

import { useEffect, useState } from "react";
import { cvAssistantApiClient, JobPosting } from "@/app/lib/api/cvAssistantApi";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await cvAssistantApiClient.jobPostings();
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (job: JobPosting, action: "activate" | "pause" | "close") => {
    try {
      if (action === "activate") {
        await cvAssistantApiClient.activateJobPosting(job.id);
      } else if (action === "pause") {
        await cvAssistantApiClient.pauseJobPosting(job.id);
      } else {
        await cvAssistantApiClient.closeJobPosting(job.id);
      }
      fetchJobs();
    } catch (error) {
      console.error("Failed to update job status:", error);
    }
  };

  const handleDelete = async (job: JobPosting) => {
    if (!confirm(`Are you sure you want to delete "${job.title}"?`)) return;
    try {
      await cvAssistantApiClient.deleteJobPosting(job.id);
      fetchJobs();
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      closed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
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
          onSave={() => {
            setShowCreateModal(false);
            setEditingJob(null);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}

function JobFormModal({
  job,
  onClose,
  onSave,
}: {
  job: JobPosting | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(job?.title || "");
  const [description, setDescription] = useState(job?.description || "");
  const [skillsInput, setSkillsInput] = useState(job?.requiredSkills.join(", ") || "");
  const [minExperience, setMinExperience] = useState(job?.minExperienceYears?.toString() || "");
  const [education, setEducation] = useState(job?.requiredEducation || "");
  const [autoReject, setAutoReject] = useState(job?.autoRejectEnabled || false);
  const [rejectThreshold, setRejectThreshold] = useState(
    job?.autoRejectThreshold?.toString() || "30",
  );
  const [acceptThreshold, setAcceptThreshold] = useState(
    job?.autoAcceptThreshold?.toString() || "80",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data = {
      title,
      description: description || undefined,
      requiredSkills: skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      minExperienceYears: minExperience ? parseInt(minExperience, 10) : undefined,
      requiredEducation: education || undefined,
      autoRejectEnabled: autoReject,
      autoRejectThreshold: parseInt(rejectThreshold, 10),
      autoAcceptThreshold: parseInt(acceptThreshold, 10),
    };

    try {
      if (job) {
        await cvAssistantApiClient.updateJobPosting(job.id, data);
      } else {
        await cvAssistantApiClient.createJobPosting(data);
      }
      onSave();
    } catch (error) {
      console.error("Failed to save job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {job ? "Edit Job Posting" : "Create Job Posting"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Job description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Skills <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Python, JavaScript, AWS"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Experience (years)
              </label>
              <input
                type="number"
                value={minExperience}
                onChange={(e) => setMinExperience(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Education
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Bachelor's Degree"
              />
            </div>
          </div>

          <div className="border-t pt-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Automation Settings</h3>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="autoReject"
                checked={autoReject}
                onChange={(e) => setAutoReject(e.target.checked)}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
              <label htmlFor="autoReject" className="ml-2 text-sm text-gray-600">
                Enable auto-rejection for low scores
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reject below (%)
                </label>
                <input
                  type="number"
                  value={rejectThreshold}
                  onChange={(e) => setRejectThreshold(e.target.value)}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shortlist above (%)
                </label>
                <input
                  type="number"
                  value={acceptThreshold}
                  onChange={(e) => setAcceptThreshold(e.target.value)}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : job ? "Save Changes" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
