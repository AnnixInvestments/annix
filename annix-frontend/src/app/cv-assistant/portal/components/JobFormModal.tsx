"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { EmploymentType, JobPosting } from "@/app/lib/api/cvAssistantApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import { useCvCreateJobPosting, useCvUpdateJobPosting } from "@/app/lib/query/hooks";

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
  { value: "learnership", label: "Learnership" },
] as const;

export function JobFormModal({ job, onClose }: { job: JobPosting | null; onClose: () => void }) {
  const jobTitle = job?.title;
  const jobDescription = job?.description;
  const jobSkills = job?.requiredSkills;
  const jobMinExp = job?.minExperienceYears;
  const jobEducation = job?.requiredEducation;
  const jobCertifications = job?.requiredCertifications;
  const jobAutoReject = job?.autoRejectEnabled;
  const jobRejectThreshold = job?.autoRejectThreshold;
  const jobAcceptThreshold = job?.autoAcceptThreshold;
  const jobLocation = job?.location;
  const jobProvince = job?.province;
  const jobEmploymentType = job?.employmentType;
  const jobSalaryMin = job?.salaryMin;
  const jobSalaryMax = job?.salaryMax;
  const jobSalaryCurrency = job?.salaryCurrency;
  const jobResponseDays = job?.responseTimelineDays;

  const [title, setTitle] = useState(jobTitle || "");
  const [description, setDescription] = useState(jobDescription || "");
  const skillsJoined = jobSkills?.join(", ");
  const certsJoined = jobCertifications?.join(", ");
  const minExpStr = jobMinExp?.toString();
  const rejectStr = jobRejectThreshold?.toString();
  const acceptStr = jobAcceptThreshold?.toString();
  const salaryMinStr = jobSalaryMin?.toString();
  const salaryMaxStr = jobSalaryMax?.toString();
  const responseDaysStr = jobResponseDays?.toString();

  const [skillsInput, setSkillsInput] = useState(skillsJoined || "");
  const [certificationsInput, setCertificationsInput] = useState(certsJoined || "");
  const [minExperience, setMinExperience] = useState(minExpStr || "");
  const [education, setEducation] = useState(jobEducation || "");
  const [autoReject, setAutoReject] = useState(jobAutoReject || false);
  const [rejectThreshold, setRejectThreshold] = useState(rejectStr || "30");
  const [acceptThreshold, setAcceptThreshold] = useState(acceptStr || "80");
  const [location, setLocation] = useState(jobLocation || "");
  const [province, setProvince] = useState(jobProvince || "");
  const [employmentType, setEmploymentType] = useState<string>(jobEmploymentType || "full_time");
  const [salaryMin, setSalaryMin] = useState(salaryMinStr || "");
  const [salaryMax, setSalaryMax] = useState(salaryMaxStr || "");
  const [salaryCurrency, setSalaryCurrency] = useState(jobSalaryCurrency || "ZAR");
  const [responseDays, setResponseDays] = useState(responseDaysStr || "14");

  const createMutation = useCvCreateJobPosting();
  const updateMutation = useCvUpdateJobPosting();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isLoading = isCreating || isUpdating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      description: description || null,
      requiredSkills: skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      requiredCertifications: certificationsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      minExperienceYears: minExperience ? parseInt(minExperience, 10) : null,
      requiredEducation: education || null,
      autoRejectEnabled: autoReject,
      autoRejectThreshold: parseInt(rejectThreshold, 10),
      autoAcceptThreshold: parseInt(acceptThreshold, 10),
      location: location || null,
      province: province || null,
      employmentType: (employmentType || null) as EmploymentType | null,
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
      salaryCurrency: salaryCurrency || "ZAR",
      responseTimelineDays: responseDays ? parseInt(responseDays, 10) : 14,
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
          {job?.referenceNumber ? (
            <p className="text-xs text-gray-500 mt-1">
              Reference number{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                {job.referenceNumber}
              </code>
            </p>
          ) : null}
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
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Role, responsibilities, what success looks like..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">City / Town</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Johannesburg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
              >
                <option value="">—</option>
                {SOUTH_AFRICAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
              >
                {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response timeline (days)
              </label>
              <input
                type="number"
                value={responseDays}
                onChange={(e) => setResponseDays(e.target.value)}
                min="1"
                max="90"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary min (per month)
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary max (per month)
              </label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input
                type="text"
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="ZAR"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="rounded-lg bg-violet-50 border border-violet-100 p-3 text-sm text-violet-900">
            <p className="font-medium">Where applicants send their CVs</p>
            <p className="text-xs mt-1 text-violet-700">
              All CV Assistant applications come into{" "}
              <code className="font-mono bg-white px-1 py-0.5 rounded">jobs@annix.co.za</code> with
              the job's reference number in the subject line. Annix handles the inbox; you receive
              the matched, screened candidates here.
            </p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Certifications <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={certificationsInput}
              onChange={(e) => setCertificationsInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="ECSA Pr Eng, CompTIA Security+"
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
