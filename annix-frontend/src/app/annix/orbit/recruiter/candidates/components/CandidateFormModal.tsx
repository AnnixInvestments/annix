"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  useExtractionProgress,
  withExtractionProgress,
} from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import type { OrbitTalentCandidate, OrbitTalentCandidateInput } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import { nowISO } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import {
  useOrbitCandidateAudit,
  useOrbitCreateTalentCandidate,
  useOrbitExtractCandidateCv,
  useOrbitUpdateTalentCandidate,
} from "@/app/lib/query/hooks";
import { CandidatePassportPanel } from "./CandidatePassportPanel";

function auditActionLabel(action: string): string {
  if (action === "candidate_submitted") return "Submitted to client";
  if (action === "shortlist_sent") return "Shortlist sent";
  if (action === "consent_given") return "Consent captured";
  if (action === "consent_withdrawn") return "Consent withdrawn";
  return action;
}

const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "private", label: "Private to me" },
  { value: "agency", label: "My agency" },
  { value: "public", label: "Public (candidate-consented)" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "placed", label: "Placed" },
  { value: "do_not_contact", label: "Do not contact" },
  { value: "archived", label: "Archived" },
];

interface CandidateFormModalProps {
  candidate: OrbitTalentCandidate | null;
  onClose: () => void;
}

export function CandidateFormModal(props: CandidateFormModalProps) {
  const candidate = props.candidate;
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const createMutation = useOrbitCreateTalentCandidate();
  const updateMutation = useOrbitUpdateTalentCandidate();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const auditCandidateId = candidate ? candidate.id : 0;
  const { data: auditEvents = [] } = useOrbitCandidateAudit(auditCandidateId);
  const extractCvMutation = useOrbitExtractCandidateCv();
  const isExtracting = extractCvMutation.isPending;
  const extractionProgress = useExtractionProgress();
  const [cvExtractEstimateMs, setCvExtractEstimateMs] = useState(25_000);
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFilePath, setCvFilePath] = useState<string | null>(null);
  useEffect(() => {
    annixOrbitApiClient
      .recruiterExtractEstimates()
      .then((result) => {
        if (result.cvExtractMs > 0) setCvExtractEstimateMs(result.cvExtractMs);
      })
      .catch(() => {});
  }, []);

  const [fullName, setFullName] = useState(candidate ? candidate.fullName : "");
  const [visibility, setVisibility] = useState(candidate ? candidate.visibility : "agency");
  const [email, setEmail] = useState(candidate?.email ? candidate.email : "");
  const [phone, setPhone] = useState(candidate?.phone ? candidate.phone : "");
  const [currentRole, setCurrentRole] = useState(
    candidate?.currentRole ? candidate.currentRole : "",
  );
  const [province, setProvince] = useState(candidate?.province ? candidate.province : "");
  const [city, setCity] = useState(candidate?.city ? candidate.city : "");
  const [yearsExperience, setYearsExperience] = useState(
    candidate && candidate.yearsExperience !== null ? String(candidate.yearsExperience) : "",
  );
  const [skillsText, setSkillsText] = useState(
    candidate?.skills ? candidate.skills.join(", ") : "",
  );
  const [salaryExpectation, setSalaryExpectation] = useState(
    candidate && candidate.salaryExpectation !== null ? String(candidate.salaryExpectation) : "",
  );
  const [availability, setAvailability] = useState(
    candidate?.availability ? candidate.availability : "",
  );
  const [noticePeriod, setNoticePeriod] = useState(
    candidate?.noticePeriod ? candidate.noticePeriod : "",
  );
  const [willingToRelocate, setWillingToRelocate] = useState(
    candidate ? candidate.willingToRelocate : false,
  );
  const [status, setStatus] = useState(candidate ? candidate.status : "active");
  const [notes, setNotes] = useState(candidate?.notes ? candidate.notes : "");
  const [consentToShare, setConsentToShare] = useState(
    candidate ? candidate.consentToShare : false,
  );
  const [consentSource, setConsentSource] = useState(
    candidate?.consentSource ? candidate.consentSource : "",
  );

  const priorConsentAt = candidate?.consentGivenAt ? candidate.consentGivenAt : null;

  const parseOptionalNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isNaN(value) ? null : value;
  };

  const onCvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files ? files.item(0) : null;
    if (!file) return;
    try {
      // Branded progress popup with a learned time estimate - the extract is a
      // long-running AI call (issue #337).
      const data = await withExtractionProgress(
        extractionProgress,
        {
          brand: "annix-orbit",
          label: "Nix is reading the CV and pre-filling the form…",
          estimatedDurationMs: cvExtractEstimateMs,
        },
        () => extractCvMutation.mutateAsync(file),
      );
      setCvText(data.cvText);
      setCvFilePath(data.cvFilePath);
      if (data.fullName) setFullName(data.fullName);
      if (data.email) setEmail(data.email);
      if (data.phone) setPhone(data.phone);
      if (data.skills && data.skills.length > 0) setSkillsText(data.skills.join(", "));
      if (data.yearsExperience !== null) setYearsExperience(String(data.yearsExperience));
      if (data.city) setCity(data.city);
      if (data.summary) setNotes(data.summary);
      showToast("CV parsed — review the pre-filled fields before saving.", "success");
    } catch {
      showToast("Could not read that CV. Please fill the fields in manually.", "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      showToast("Candidate name is required.", "error");
      return;
    }

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const consentTimestamp = consentToShare ? priorConsentAt || nowISO() : null;

    const payload: OrbitTalentCandidateInput = {
      visibility,
      fullName: trimmedName,
      email: email.trim() || null,
      phone: phone.trim() || null,
      currentRole: currentRole.trim() || null,
      province: province || null,
      city: city.trim() || null,
      yearsExperience: parseOptionalNumber(yearsExperience),
      skills: skills.length > 0 ? skills : null,
      salaryExpectation: parseOptionalNumber(salaryExpectation),
      availability: availability.trim() || null,
      noticePeriod: noticePeriod.trim() || null,
      willingToRelocate,
      status,
      notes: notes.trim() || null,
      consentToShare,
      consentGivenAt: consentTimestamp,
      consentSource: consentToShare ? consentSource.trim() || null : null,
      cvText,
      cvFilePath,
    };

    try {
      if (candidate) {
        await updateMutation.mutateAsync({ id: candidate.id, data: payload });
        showToast("Candidate updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Candidate added.", "success");
      }
      props.onClose();
    } catch {
      alert({ message: "Could not save the candidate. Please try again.", variant: "error" });
    }
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {AlertDialog}
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#0A1B3D]">
              {candidate ? "Edit candidate" : "Add candidate"}
            </h2>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 rounded-xl border border-dashed border-[#c0c0eb] bg-[#f0f0fc]/40 p-4">
              <label htmlFor="cd-cv" className="block text-sm font-medium text-gray-700 mb-1">
                Upload a CV to auto-fill
              </label>
              <input
                id="cd-cv"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={onCvSelected}
                disabled={isExtracting}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#323288] file:px-3 file:py-2 file:text-white file:font-medium disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-400">
                {isExtracting
                  ? "Reading the CV with AI…"
                  : "PDF or Word. We'll extract name, contact, skills and experience for you to review."}
              </p>
            </div>

            <div>
              <label htmlFor="cd-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="cd-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClasses}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label
                htmlFor="cd-visibility"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Visibility
              </label>
              <select
                id="cd-visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cd-role" className="block text-sm font-medium text-gray-700 mb-1">
                Current role
              </label>
              <input
                id="cd-role"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                className={inputClasses}
                placeholder="Sales Representative"
              />
            </div>

            <div>
              <label htmlFor="cd-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="cd-status"
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
              <label htmlFor="cd-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="cd-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label htmlFor="cd-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="cd-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClasses}
                placeholder="+27 11 000 0000"
              />
            </div>

            <div>
              <label htmlFor="cd-province" className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <select
                id="cd-province"
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
              <label htmlFor="cd-city" className="block text-sm font-medium text-gray-700 mb-1">
                City / town
              </label>
              <input
                id="cd-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClasses}
                placeholder="Johannesburg"
              />
            </div>

            <div>
              <label htmlFor="cd-years" className="block text-sm font-medium text-gray-700 mb-1">
                Years experience
              </label>
              <input
                id="cd-years"
                inputMode="numeric"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className={inputClasses}
                placeholder="5"
              />
            </div>

            <div>
              <label htmlFor="cd-salary" className="block text-sm font-medium text-gray-700 mb-1">
                Salary expectation (R/year)
              </label>
              <input
                id="cd-salary"
                inputMode="decimal"
                value={salaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
                className={inputClasses}
                placeholder="480000"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cd-skills" className="block text-sm font-medium text-gray-700 mb-1">
                Skills (comma-separated)
              </label>
              <input
                id="cd-skills"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className={inputClasses}
                placeholder="B2B sales, CRM, account management"
              />
            </div>

            <div>
              <label
                htmlFor="cd-availability"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Availability
              </label>
              <input
                id="cd-availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className={inputClasses}
                placeholder="Immediate"
              />
            </div>

            <div>
              <label htmlFor="cd-notice" className="block text-sm font-medium text-gray-700 mb-1">
                Notice period
              </label>
              <input
                id="cd-notice"
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                className={inputClasses}
                placeholder="1 month"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="cd-relocate"
                type="checkbox"
                checked={willingToRelocate}
                onChange={(e) => setWillingToRelocate(e.target.checked)}
                className="h-4 w-4 text-[#323288] border-gray-300 rounded"
              />
              <label htmlFor="cd-relocate" className="text-sm text-gray-700">
                Willing to relocate
              </label>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-[#e0e0f5] bg-[#f0f0fc]/40 p-4">
              <div className="flex items-start gap-2">
                <input
                  id="cd-consent"
                  type="checkbox"
                  checked={consentToShare}
                  onChange={(e) => setConsentToShare(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[#323288] border-gray-300 rounded"
                />
                <label htmlFor="cd-consent" className="text-sm text-gray-700">
                  Candidate has consented (POPIA) to their CV being submitted to clients. Without
                  this, the candidate cannot be submitted to a vacancy.
                </label>
              </div>
              {consentToShare ? (
                <div className="mt-3">
                  <label
                    htmlFor="cd-consent-source"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    How was consent obtained?
                  </label>
                  <input
                    id="cd-consent-source"
                    value={consentSource}
                    onChange={(e) => setConsentSource(e.target.value)}
                    className={inputClasses}
                    placeholder="Signed consent form / email confirmation"
                  />
                </div>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cd-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="cd-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputClasses}
                placeholder="Strong B2B background; best suited to account management roles."
              />
            </div>

            {candidate ? (
              <div className="sm:col-span-2">
                <p className="block text-sm font-medium text-gray-700 mb-1">Activity (POPIA)</p>
                {auditEvents.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No shares or consent changes recorded yet.
                  </p>
                ) : (
                  <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {auditEvents.map((event) => {
                      const when = event.createdAt
                        ? event.createdAt.replace("T", " ").slice(0, 16)
                        : "";
                      const detail = event.detail ? event.detail : auditActionLabel(event.action);
                      return (
                        <li key={event.id} className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#323288]">
                              {auditActionLabel(event.action)}
                            </span>
                            <span className="text-xs text-gray-400">{when}</span>
                          </div>
                          <p className="text-sm text-gray-700">{detail}</p>
                          <p className="text-xs text-gray-400">by {event.actorName}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          {candidate ? (
            <div className="px-6 pb-2">
              <CandidatePassportPanel candidateId={candidate.id} />
            </div>
          ) : null}

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
              {isSaving ? "Saving..." : candidate ? "Save changes" : "Add candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
