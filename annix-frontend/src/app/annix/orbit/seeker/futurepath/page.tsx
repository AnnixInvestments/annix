"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitEducationCurriculum } from "@/app/lib/api/annixOrbitApi";
import {
  useOrbitAddSeekerEducationResult,
  useOrbitAskSeekerEducationMentor,
  useOrbitDeleteSeekerEducationResult,
  useOrbitInviteSeekerEducationGuardian,
  useOrbitRecordSeekerEducationConsent,
  useOrbitSeekerEducation,
  useOrbitSeekerEducationRecommendations,
  useOrbitUpsertSeekerEducation,
} from "@/app/lib/query/hooks";
import { ORBIT_EDUCATION_VERSION } from "../../config/futurepath-version";

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

  const [curriculum, setCurriculum] = useState<OrbitEducationCurriculum>("NSC");
  const [country, setCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [school, setSchool] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [subject, setSubject] = useState("");
  const [mark, setMark] = useState("");
  const [year, setYear] = useState("");

  const [guardianEmail, setGuardianEmail] = useState("");

  const [question, setQuestion] = useState("");
  const [mentorAnswer, setMentorAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const profileCountry = profile.country;
    const profileNationality = profile.nationality;
    const profileSchool = profile.school;
    const profileDateOfBirth = profile.dateOfBirth;
    setCurriculum(profile.curriculum);
    setCountry(profileCountry || "");
    setNationality(profileNationality || "");
    setSchool(profileSchool || "");
    setDateOfBirth(profileDateOfBirth || "");
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      await upsertProfile.mutateAsync({
        curriculum,
        country: country || null,
        nationality: nationality || null,
        school: school || null,
        dateOfBirth: dateOfBirth || null,
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
    const parsedYear = year ? Number(year) : null;
    try {
      await addResult.mutateAsync({
        subject: trimmedSubject,
        mark: parsedMark,
        year: parsedYear,
      });
      setSubject("");
      setMark("");
      setYear("");
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
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            inputMode="numeric"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
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

      <p className="text-right text-xs text-gray-400">FuturePath v{ORBIT_EDUCATION_VERSION}</p>
    </div>
  );
}
