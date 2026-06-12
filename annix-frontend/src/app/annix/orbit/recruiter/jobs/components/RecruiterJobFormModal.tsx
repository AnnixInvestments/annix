"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type { OrbitClient, OrbitJob } from "@/app/lib/api/annixOrbitApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import { useOrbitCreateRecruiterJob, useOrbitUpdateRecruiterJob } from "@/app/lib/query/hooks";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "sourcing", label: "Sourcing" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "filled", label: "Filled" },
  { value: "on_hold", label: "On hold" },
  { value: "closed", label: "Closed" },
];

const EMPLOYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
  { value: "learnership", label: "Learnership" },
];

interface RecruiterJobFormModalProps {
  job: OrbitJob | null;
  clients: OrbitClient[];
  onClose: () => void;
}

export function RecruiterJobFormModal(props: RecruiterJobFormModalProps) {
  const job = props.job;
  const { showToast } = useToast();
  const createMutation = useOrbitCreateRecruiterJob();
  const updateMutation = useOrbitUpdateRecruiterJob();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const [title, setTitle] = useState(job ? job.title : "");
  const [clientId, setClientId] = useState(
    job && job.clientId !== null ? String(job.clientId) : "",
  );
  const [description, setDescription] = useState(job?.description ? job.description : "");
  const [province, setProvince] = useState(job?.province ? job.province : "");
  const [city, setCity] = useState(job?.city ? job.city : "");
  const [employmentType, setEmploymentType] = useState(
    job?.employmentType ? job.employmentType : "",
  );
  const [salaryMin, setSalaryMin] = useState(
    job && job.salaryMin !== null ? String(job.salaryMin) : "",
  );
  const [salaryMax, setSalaryMax] = useState(
    job && job.salaryMax !== null ? String(job.salaryMax) : "",
  );
  const [skillsText, setSkillsText] = useState(
    job?.requiredSkills ? job.requiredSkills.join(", ") : "",
  );
  const [openings, setOpenings] = useState(job ? String(job.openings) : "1");
  const [status, setStatus] = useState(job ? job.status : "open");
  const [closingDate, setClosingDate] = useState(job?.closingDate ? job.closingDate : "");
  const [notes, setNotes] = useState(job?.notes ? job.notes : "");

  const parseOptionalNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isNaN(value) ? null : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast("Job title is required.", "error");
      return;
    }
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedOpenings = parseOptionalNumber(openings);
    const payload = {
      clientId: clientId ? Number(clientId) : null,
      title: trimmedTitle,
      description: description.trim() || null,
      province: province || null,
      city: city.trim() || null,
      employmentType: employmentType || null,
      salaryMin: parseOptionalNumber(salaryMin),
      salaryMax: parseOptionalNumber(salaryMax),
      requiredSkills: skills.length > 0 ? skills : [],
      openings: parsedOpenings === null ? 1 : parsedOpenings,
      status,
      closingDate: closingDate || null,
      notes: notes.trim() || null,
    };
    try {
      if (job) {
        await updateMutation.mutateAsync({ id: job.id, data: payload });
        showToast("Job updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Job created.", "success");
      }
      props.onClose();
    } catch {
      showToast("Could not save the job. Please try again.", "error");
    }
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#0A1B3D]">{job ? "Edit job" : "Add job"}</h2>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="jb-title" className="block text-sm font-medium text-gray-700 mb-1">
                Job title
              </label>
              <input
                id="jb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={inputClasses}
                placeholder="Sales Manager"
              />
            </div>

            <div>
              <label htmlFor="jb-client" className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                id="jb-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                <option value="">No client linked</option>
                {props.clients.map((client) => (
                  <option key={client.id} value={String(client.id)}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jb-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="jb-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jb-province" className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <select
                id="jb-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                <option value="">Select province</option>
                {SOUTH_AFRICAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jb-city" className="block text-sm font-medium text-gray-700 mb-1">
                City / town
              </label>
              <input
                id="jb-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClasses}
                placeholder="Johannesburg"
              />
            </div>

            <div>
              <label htmlFor="jb-emp" className="block text-sm font-medium text-gray-700 mb-1">
                Employment type
              </label>
              <select
                id="jb-emp"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jb-openings" className="block text-sm font-medium text-gray-700 mb-1">
                Openings
              </label>
              <input
                id="jb-openings"
                inputMode="numeric"
                value={openings}
                onChange={(e) => setOpenings(e.target.value)}
                className={inputClasses}
                placeholder="1"
              />
            </div>

            <div>
              <label htmlFor="jb-smin" className="block text-sm font-medium text-gray-700 mb-1">
                Salary min (R/year)
              </label>
              <input
                id="jb-smin"
                inputMode="decimal"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className={inputClasses}
                placeholder="420000"
              />
            </div>

            <div>
              <label htmlFor="jb-smax" className="block text-sm font-medium text-gray-700 mb-1">
                Salary max (R/year)
              </label>
              <input
                id="jb-smax"
                inputMode="decimal"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className={inputClasses}
                placeholder="650000"
              />
            </div>

            <div>
              <label htmlFor="jb-closing" className="block text-sm font-medium text-gray-700 mb-1">
                Closing date
              </label>
              <input
                id="jb-closing"
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="jb-skills" className="block text-sm font-medium text-gray-700 mb-1">
                Required skills (comma-separated)
              </label>
              <input
                id="jb-skills"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className={inputClasses}
                placeholder="B2B sales, CRM, team leadership"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="jb-desc" className="block text-sm font-medium text-gray-700 mb-1">
                Description / notes
              </label>
              <textarea
                id="jb-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClasses}
                placeholder="Role summary and requirements."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#323288] text-white rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : job ? "Save changes" : "Add job"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
