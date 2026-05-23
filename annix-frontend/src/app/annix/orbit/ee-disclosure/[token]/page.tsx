"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { API_BASE_URL } from "@/lib/api-config";

type PopulationGroup = "african_black" | "coloured" | "indian" | "white" | "prefer_not_to_say";
type Gender = "female" | "male" | "other" | "prefer_not_to_say";
type DisabilityStatus = "yes" | "no" | "prefer_not_to_say";
type NationalityStatus =
  | "sa_citizen"
  | "sa_permanent_resident"
  | "foreign_national"
  | "prefer_not_to_say";
type Purpose = "ee_reporting" | "fairness_monitoring";

interface DisclosureLookupResponse {
  candidate: { name: string | null; email: string | null };
  job: { id: number; title: string; referenceNumber: string | null };
  consentText: { id: number; versionLabel: string; body: string };
  expiresAt: string;
  alreadySubmitted: boolean;
}

const POPULATION_GROUP_OPTIONS: Array<{ value: PopulationGroup; label: string }> = [
  { value: "african_black", label: "African / Black" },
  { value: "coloured", label: "Coloured" },
  { value: "indian", label: "Indian / Asian" },
  { value: "white", label: "White" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const DISABILITY_OPTIONS: Array<{ value: DisabilityStatus; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const NATIONALITY_OPTIONS: Array<{ value: NationalityStatus; label: string }> = [
  { value: "sa_citizen", label: "South African citizen" },
  { value: "sa_permanent_resident", label: "South African permanent resident" },
  { value: "foreign_national", label: "Foreign national" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function EeDisclosurePage() {
  const params = useParams<{ token: string }>();
  const rawToken = params ? params.token : "";
  const token = rawToken ?? "";
  const { showToast } = useToast();

  const [data, setData] = useState<DisclosureLookupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [populationGroup, setPopulationGroup] = useState<PopulationGroup>("prefer_not_to_say");
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [disabilityStatus, setDisabilityStatus] = useState<DisabilityStatus>("prefer_not_to_say");
  const [requiresAccommodation, setRequiresAccommodation] = useState(false);
  const [accommodationNotes, setAccommodationNotes] = useState("");
  const [nationalityStatus, setNationalityStatus] =
    useState<NationalityStatus>("prefer_not_to_say");
  const [eeReportingPurpose, setEeReportingPurpose] = useState(true);
  const [fairnessMonitoringPurpose, setFairnessMonitoringPurpose] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/public/annix/orbit/ee-disclosure/${token}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = body ? body.message : null;
        throw new Error(message || "Couldn't load this disclosure form.");
      }
      const json = (await res.json()) as DisclosureLookupResponse;
      setData(json);
      setSubmitted(json.alreadySubmitted);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load this disclosure form.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const purposes: Purpose[] = [];
    if (eeReportingPurpose) purposes.push("ee_reporting");
    if (fairnessMonitoringPurpose) purposes.push("fairness_monitoring");
    if (purposes.length === 0) {
      showToast(
        "Please tick at least one purpose, or close this page to decline disclosure.",
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/annix/orbit/ee-disclosure/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          populationGroup,
          gender,
          disabilityStatus,
          requiresAccommodation,
          accommodationNotes: accommodationNotes.trim() || null,
          nationalityStatus,
          purposes,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = body ? body.message : null;
        throw new Error(message || "Couldn't submit this disclosure.");
      }
      setSubmitted(true);
      showToast("Disclosure submitted. Thank you.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't submit this disclosure.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error ?? "Couldn't load this disclosure form.";
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link unavailable</h1>
          <p className="text-gray-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Disclosure recorded</h1>
          <p className="text-gray-600">
            Thank you. Your information will be used only for the purposes you selected, kept
            separate from our AI screening, and you may correct or withdraw it at any time from your
            candidate account.
          </p>
        </div>
      </div>
    );
  }

  const rawCandidateName = data.candidate.name;
  const candidateName = rawCandidateName || "Candidate";
  const jobTitle = data.job.title;
  const jobRef = data.job.referenceNumber;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Employment Equity disclosure</h1>
        <p className="text-gray-600 mb-1">
          For <span className="font-semibold">{candidateName}</span> · {jobTitle}
          {jobRef ? ` · Ref ${jobRef}` : ""}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Voluntary. Used only for Employment Equity Act reporting and AI fairness monitoring.
        </p>

        <details className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <summary className="font-semibold cursor-pointer text-gray-900">
            Read the consent text ({data.consentText.versionLabel})
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700 font-sans">
            {data.consentText.body}
          </pre>
        </details>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset>
            <legend className="font-semibold text-gray-900 mb-2">Population group</legend>
            <div className="space-y-1">
              {POPULATION_GROUP_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="population_group"
                    value={option.value}
                    checked={populationGroup === option.value}
                    onChange={() => setPopulationGroup(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-gray-900 mb-2">Gender</legend>
            <div className="space-y-1">
              {GENDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={gender === option.value}
                    onChange={() => setGender(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-gray-900 mb-2">Disability</legend>
            <div className="space-y-1">
              {DISABILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="disability_status"
                    value={option.value}
                    checked={disabilityStatus === option.value}
                    onChange={() => setDisabilityStatus(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Reasonable accommodation can be requested below regardless of how you answer this.
            </p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="font-semibold text-gray-900">Reasonable accommodation</legend>
            <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresAccommodation}
                onChange={(event) => setRequiresAccommodation(event.target.checked)}
              />
              I would like to discuss reasonable accommodation if shortlisted.
            </label>
            {requiresAccommodation ? (
              <textarea
                value={accommodationNotes}
                onChange={(event) => setAccommodationNotes(event.target.value)}
                placeholder="Optional notes (kept private to HR)"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                rows={3}
              />
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-gray-900 mb-2">Nationality status</legend>
            <div className="space-y-1">
              {NATIONALITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="nationality_status"
                    value={option.value}
                    checked={nationalityStatus === option.value}
                    onChange={() => setNationalityStatus(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="font-semibold text-gray-900">Purposes of use</legend>
            <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={eeReportingPurpose}
                onChange={(event) => setEeReportingPurpose(event.target.checked)}
              />
              Employment Equity Act statutory reporting (EEA2 / EEA4)
            </label>
            <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={fairnessMonitoringPurpose}
                onChange={(event) => setFairnessMonitoringPurpose(event.target.checked)}
              />
              AI screening fairness monitoring (POPIA s71)
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1a1a40] text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit disclosure"}
          </button>
        </form>
      </div>
    </div>
  );
}
