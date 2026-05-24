"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  OrbitEducationCurriculum,
  SeekerEducationApplicationStatus,
} from "@/app/lib/api/annixOrbitApi";
import {
  useOrbitAddSeekerEducationResult,
  useOrbitAskSeekerEducationMentor,
  useOrbitCreateSeekerEducationApplication,
  useOrbitDeleteSeekerEducationApplication,
  useOrbitDeleteSeekerEducationResult,
  useOrbitInviteSeekerEducationGuardian,
  useOrbitRecordSeekerEducationConsent,
  useOrbitSeekerEducation,
  useOrbitSeekerEducationApplications,
  useOrbitSeekerEducationCareerFit,
  useOrbitSeekerEducationCompareOptions,
  useOrbitSeekerEducationRecommendations,
  useOrbitSeekerEducationScholarships,
  useOrbitUpdateSeekerEducationApplicationStatus,
  useOrbitUpsertSeekerEducation,
} from "@/app/lib/query/hooks";
import { ORBIT_EDUCATION_VERSION } from "../../config/futurepath-version";
import FuturePathAlternativePathways from "./FuturePathAlternativePathways";
import FuturePathCostCalculator from "./FuturePathCostCalculator";

const APPLICATION_STATUSES: SeekerEducationApplicationStatus[] = [
  "interested",
  "applied",
  "interview",
  "accepted",
  "rejected",
  "waitlisted",
];

const CURRICULA: OrbitEducationCurriculum[] = [
  "NSC",
  "IEB",
  "Cambridge",
  "IB",
  "GCSE",
  "A-Level",
  "US-GPA",
  "Other",
];

const BAND_LABEL: Record<string, string> = {
  safe: "Safe",
  match: "Match",
  reach: "Reach",
  below: "Below",
  unknown: "Unknown",
};

const BAND_CLASS: Record<string, string> = {
  safe: "bg-green-100 text-green-800",
  match: "bg-blue-100 text-blue-800",
  reach: "bg-amber-100 text-amber-800",
  below: "bg-gray-100 text-gray-600",
  unknown: "bg-gray-100 text-gray-600",
};

export default function FuturePathPage() {
  const { showToast } = useToast();
  const educationQuery = useOrbitSeekerEducation();
  const upsertProfile = useOrbitUpsertSeekerEducation();
  const addResult = useOrbitAddSeekerEducationResult();
  const deleteResult = useOrbitDeleteSeekerEducationResult();
  const recordConsent = useOrbitRecordSeekerEducationConsent();
  const inviteGuardian = useOrbitInviteSeekerEducationGuardian();
  const askMentor = useOrbitAskSeekerEducationMentor();

  const data = educationQuery.data;
  const profile = data ? data.profile : null;
  const results = data ? data.results : [];
  const consentRequired = data ? data.consentRequired : false;
  const isMinor = data ? data.isMinor : null;

  const recommendationsQuery = useOrbitSeekerEducationRecommendations(
    undefined,
    profile != null && !consentRequired,
  );
  const recommendationsData = recommendationsQuery.data;
  const recommendations = recommendationsData ? recommendationsData.recommendations : [];

  const compareQuery = useOrbitSeekerEducationCompareOptions(
    undefined,
    profile != null && !consentRequired,
  );
  const compareData = compareQuery.data;
  const compareOptions = compareData ? compareData.options : [];

  const applicationsQuery = useOrbitSeekerEducationApplications(
    profile != null && !consentRequired,
  );
  const applicationsData = applicationsQuery.data;
  const applications = applicationsData ? applicationsData.applications : [];

  const scholarshipsQuery = useOrbitSeekerEducationScholarships();
  const scholarshipsData = scholarshipsQuery.data;
  const scholarships = scholarshipsData ? scholarshipsData.scholarships : [];

  const careerFitQuery = useOrbitSeekerEducationCareerFit(profile != null && !consentRequired);
  const careerFitData = careerFitQuery.data;
  const careerFit = careerFitData ? careerFitData.careerFit : [];

  const targetClusters = profile && profile.targetCategories ? profile.targetCategories : [];
  const createApplication = useOrbitCreateSeekerEducationApplication();
  const updateApplicationStatus = useOrbitUpdateSeekerEducationApplicationStatus();
  const deleteApplication = useOrbitDeleteSeekerEducationApplication();

  const [curriculum, setCurriculum] = useState<OrbitEducationCurriculum>("NSC");
  const [country, setCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [school, setSchool] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [languages, setLanguages] = useState("");

  const [subject, setSubject] = useState("");
  const [mark, setMark] = useState("");
  const [predictedMark, setPredictedMark] = useState("");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");

  const [guardianEmail, setGuardianEmail] = useState("");

  const [appInstitution, setAppInstitution] = useState("");
  const [appProgramme, setAppProgramme] = useState("");

  const [question, setQuestion] = useState("");
  const [mentorAnswer, setMentorAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const profileCountry = profile.country;
    const profileNationality = profile.nationality;
    const profileSchool = profile.school;
    const profileDateOfBirth = profile.dateOfBirth;
    const profileLanguages = profile.languages;
    setCurriculum(profile.curriculum);
    setCountry(profileCountry || "");
    setNationality(profileNationality || "");
    setSchool(profileSchool || "");
    setDateOfBirth(profileDateOfBirth || "");
    setLanguages((profileLanguages || []).join(", "));
  }, [profile]);

  const handleSaveProfile = async () => {
    const parsedLanguages = languages
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    try {
      await upsertProfile.mutateAsync({
        curriculum,
        country: country || null,
        nationality: nationality || null,
        school: school || null,
        dateOfBirth: dateOfBirth || null,
        languages: parsedLanguages,
      });
      showToast("Profile saved", "success");
    } catch {
      showToast("Could not save your profile — please try again.", "error");
    }
  };

  const handleAddResult = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      showToast("Enter a subject first", "info");
      return;
    }
    const parsedMark = mark ? Number(mark) : null;
    const parsedPredictedMark = predictedMark ? Number(predictedMark) : null;
    const parsedYear = year ? Number(year) : null;
    try {
      await addResult.mutateAsync({
        subject: trimmedSubject,
        mark: parsedMark,
        predictedMark: parsedPredictedMark,
        year: parsedYear,
        term: term.trim() || null,
      });
      setSubject("");
      setMark("");
      setPredictedMark("");
      setYear("");
      setTerm("");
      showToast("Result added", "success");
    } catch {
      showToast("Could not add the result — please try again.", "error");
    }
  };

  const handleDeleteResult = async (id: string) => {
    try {
      await deleteResult.mutateAsync(id);
    } catch {
      showToast("Could not remove the result — please try again.", "error");
    }
  };

  const handleRecordConsent = async () => {
    try {
      await recordConsent.mutateAsync();
      showToast("Consent recorded", "success");
    } catch {
      showToast("Could not record consent — a guardian may need to do this.", "error");
    }
  };

  const handleInviteGuardian = async () => {
    const trimmedEmail = guardianEmail.trim();
    if (!trimmedEmail) {
      showToast("Enter a guardian email first", "info");
      return;
    }
    try {
      await inviteGuardian.mutateAsync(trimmedEmail);
      setGuardianEmail("");
      showToast("Guardian invited", "success");
    } catch {
      showToast("Could not send the invite — please try again.", "error");
    }
  };

  const handleAskMentor = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      showToast("Ask the mentor a question first", "info");
      return;
    }
    try {
      const result = await askMentor.mutateAsync(trimmedQuestion);
      setMentorAnswer(result.answer);
    } catch {
      showToast("The mentor is unavailable right now — please try again.", "error");
    }
  };

  const handleAddApplication = async () => {
    const trimmedInstitution = appInstitution.trim();
    const trimmedProgramme = appProgramme.trim();
    if (!trimmedInstitution || !trimmedProgramme) {
      showToast("Enter an institution and programme first", "info");
      return;
    }
    try {
      await createApplication.mutateAsync({
        institutionName: trimmedInstitution,
        programmeName: trimmedProgramme,
      });
      setAppInstitution("");
      setAppProgramme("");
      showToast("Application added", "success");
    } catch {
      showToast("Could not add the application — please try again.", "error");
    }
  };

  const handleUpdateApplicationStatus = async (
    id: string,
    status: SeekerEducationApplicationStatus,
  ) => {
    try {
      await updateApplicationStatus.mutateAsync({ id, status });
    } catch {
      showToast("Could not update the status — please try again.", "error");
    }
  };

  const handleDeleteApplication = async (id: string) => {
    try {
      await deleteApplication.mutateAsync(id);
    } catch {
      showToast("Could not remove the application — please try again.", "error");
    }
  };

  if (educationQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading your FuturePath profile…</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--brand-navbar)" }}>
          FuturePath
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Your education-to-funding journey. Tell us about your studies and the FuturePath mentor
          can give you grounded guidance on study choices, universities and funding.
        </p>
      </header>

      {consentRequired ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-900">Guardian consent needed</h2>
          <p className="text-sm text-amber-800 mt-1">
            Because you are under the consent age for your region, a parent or guardian must approve
            processing your profile before the mentor and matching can run.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="guardian@example.com"
              className="rounded border border-amber-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleInviteGuardian}
              disabled={inviteGuardian.isPending}
              className="rounded px-3 py-1.5 text-sm text-white"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              Invite guardian
            </button>
            <button
              type="button"
              onClick={handleRecordConsent}
              disabled={recordConsent.isPending}
              className="rounded border border-amber-400 px-3 py-1.5 text-sm text-amber-900"
            >
              I am the guardian — record consent
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-medium text-gray-900 mb-4">Education profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Curriculum</span>
            <select
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value as OrbitEducationCurriculum)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              {CURRICULA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Country (2-letter)</span>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="ZA"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Nationality</span>
            <input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">School</span>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Date of birth</span>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
            {isMinor === true ? (
              <span className="text-xs text-amber-700">Under consent age for your region.</span>
            ) : null}
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="block text-gray-600 mb-1">Languages (comma-separated)</span>
            <input
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="English, Afrikaans, isiZulu"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={upsertProfile.isPending}
          className="mt-4 rounded px-4 py-2 text-sm text-white"
          style={{ backgroundColor: "var(--brand-navbar)" }}
        >
          {upsertProfile.isPending ? "Saving…" : "Save profile"}
        </button>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-medium text-gray-900 mb-4">Academic results</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={mark}
            onChange={(e) => setMark(e.target.value)}
            placeholder="Mark %"
            inputMode="numeric"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={predictedMark}
            onChange={(e) => setPredictedMark(e.target.value)}
            placeholder="Predicted %"
            inputMode="numeric"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            inputMode="numeric"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Term"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddResult}
            disabled={addResult.isPending}
            className="rounded px-3 py-2 text-sm text-white"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            Add
          </button>
        </div>
        {results.length === 0 ? (
          <p className="text-sm text-gray-500">No results captured yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((r) => {
              const markLabel = r.mark ? `${r.mark}%` : "—";
              const yearLabel = r.year ? r.year : "";
              return (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{r.subject}</span>{" "}
                    <span className="text-gray-500">
                      {markLabel} {yearLabel}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteResult(r.id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-medium text-gray-900 mb-1">Ask the FuturePath mentor</h2>
        <p className="text-xs text-gray-500 mb-3">
          Grounded in your profile above. Not a substitute for a school counsellor.
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. Which degrees fit my marks, and what funding could I apply for?"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAskMentor}
          disabled={askMentor.isPending}
          className="mt-3 rounded px-4 py-2 text-sm text-white"
          style={{ backgroundColor: "var(--brand-navbar)" }}
        >
          {askMentor.isPending ? "Thinking…" : "Ask mentor"}
        </button>
        {mentorAnswer ? (
          <div className="mt-4 rounded bg-gray-50 border border-gray-200 p-3 text-sm whitespace-pre-wrap">
            {mentorAnswer}
          </div>
        ) : null}
      </section>

      {careerFit.length > 0 ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-medium text-gray-900 mb-1">Career fit</h2>
          <p className="text-xs text-gray-500 mb-3">
            How well your subjects line up with each field. This is a guide based on your marks and
            interests — not a prediction of admission or employment.
          </p>
          <ul className="space-y-2">
            {careerFit.map((c) => {
              const fitValue = c.fit;
              const fitWidth = fitValue == null ? 0 : fitValue;
              return (
                <li key={c.cluster} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {c.label}
                      {c.interested ? (
                        <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                          Interest
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-gray-500">
                      {fitValue == null ? "Add subjects" : `${fitValue}% fit`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-gray-100">
                    <div
                      className="h-1.5 rounded"
                      style={{ width: `${fitWidth}%`, backgroundColor: "var(--brand-accent)" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-medium text-gray-900 mb-1">Your programme matches</h2>
        <p className="text-xs text-gray-500 mb-3">
          Programmes you could qualify for, with a Reach / Match / Safe band and the reasons behind
          it. Bands are guidance, not guarantees — always confirm with the institution.
        </p>
        {recommendationsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Working out your matches…</p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-gray-500">
            No programme matches yet. The curated institution catalogue is still being built — check
            back soon, or ask the mentor what to aim for in the meantime.
          </p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((rec) => {
              const bandLabelRaw = BAND_LABEL[rec.band];
              const bandClassRaw = BAND_CLASS[rec.band];
              const bandLabel = bandLabelRaw || "Unknown";
              const bandClass = bandClassRaw || BAND_CLASS.unknown;
              const reasons = rec.result.explanation;
              return (
                <li key={rec.programmeId} className="rounded border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{rec.programmeName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bandClass}`}>
                      {bandLabel}
                    </span>
                  </div>
                  {reasons.length > 0 ? (
                    <ul className="mt-2 list-disc list-inside text-xs text-gray-600 space-y-0.5">
                      {reasons.map((reason, i) => (
                        <li key={`${rec.programmeId}-${i}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {compareOptions.length > 0 ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-medium text-gray-900 mb-1">Compare your options</h2>
          <p className="text-xs text-gray-500 mb-3">
            Among the programmes you qualify for, ranked by fit to your interests and curated
            graduate-outcome signals. This never affects whether you qualify — only how we suggest
            ordering your choices. Signals show their source and date; confirm with the institution.
          </p>
          <ul className="space-y-3">
            {compareOptions.map((opt) => {
              const reasons = opt.reasons;
              return (
                <li key={opt.programmeId} className="rounded border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{opt.programmeName}</span>
                    {opt.clusterMatch ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                        Interest match
                      </span>
                    ) : null}
                  </div>
                  {reasons.length > 0 ? (
                    <ul className="mt-2 list-disc list-inside text-xs text-gray-600 space-y-0.5">
                      {reasons.map((reason, i) => (
                        <li key={`${opt.programmeId}-cmp-${i}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-medium text-gray-900 mb-1">Your applications</h2>
        <p className="text-xs text-gray-500 mb-3">
          Track where you've applied and how each is going.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={appInstitution}
            onChange={(e) => setAppInstitution(e.target.value)}
            placeholder="Institution"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={appProgramme}
            onChange={(e) => setAppProgramme(e.target.value)}
            placeholder="Programme"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddApplication}
            disabled={createApplication.isPending}
            className="rounded px-3 py-2 text-sm text-white"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            Add
          </button>
        </div>
        {applications.length === 0 ? (
          <p className="text-sm text-gray-500">No applications tracked yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {applications.map((app) => {
              const status = app.status;
              return (
                <li
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{app.programmeName}</span>{" "}
                    <span className="text-gray-500">— {app.institutionName}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <select
                      value={status}
                      onChange={(e) =>
                        handleUpdateApplicationStatus(
                          app.id,
                          e.target.value as SeekerEducationApplicationStatus,
                        )
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteApplication(app.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {scholarships.length > 0 ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-medium text-gray-900 mb-1">Scholarships &amp; bursaries</h2>
          <p className="text-xs text-gray-500 mb-3">
            A curated set relevant to you. Always confirm details and deadlines on the provider's
            site — funding terms change.
          </p>
          <ul className="space-y-3">
            {scholarships.map((s) => {
              const amount = s.amountDisplay;
              const verified = s.lastVerifiedAt;
              return (
                <li key={s.id} className="rounded border border-gray-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.name}</span>
                    {amount ? <span className="text-gray-500 text-xs">{amount}</span> : null}
                  </div>
                  <p className="text-xs text-gray-500">{s.provider}</p>
                  {s.criteria ? <p className="mt-1 text-xs text-gray-600">{s.criteria}</p> : null}
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit
                      </a>
                    ) : null}
                    {verified ? <span className="text-gray-400">Verified {verified}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <FuturePathAlternativePathways clusters={targetClusters} />

      <FuturePathCostCalculator />

      <p className="text-right text-xs text-gray-400">FuturePath v{ORBIT_EDUCATION_VERSION}</p>
    </div>
  );
}
