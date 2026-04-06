"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { JobPosting } from "@/app/lib/api/cvAssistantApi";
import { useCvCreateJobPosting, useCvUpdateJobPosting } from "@/app/lib/query/hooks";

export function JobFormModal({ job, onClose }: { job: JobPosting | null; onClose: () => void }) {
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

  const createMutation = useCvCreateJobPosting();
  const updateMutation = useCvUpdateJobPosting();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      description: description || null,
      requiredSkills: skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      minExperienceYears: minExperience ? parseInt(minExperience, 10) : null,
      requiredEducation: education || null,
      autoRejectEnabled: autoReject,
      autoRejectThreshold: parseInt(rejectThreshold, 10),
      autoAcceptThreshold: parseInt(acceptThreshold, 10),
    };

    if (job) {
      updateMutation.mutate({ id: job.id, data }, { onSuccess: onClose });
    } else {
      createMutation.mutate(data, { onSuccess: onClose });
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
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
    </div>,
    document.body,
  );
}
