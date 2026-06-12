"use client";

import { useState } from "react";
import type { OrbitTalentCandidate } from "@/app/lib/api/annixOrbitApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import {
  useOrbitRecruiterJobMatches,
  useOrbitRecruiterJobs,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";

interface MatchResult {
  candidate: OrbitTalentCandidate;
  score: number;
  matched: string[];
  missing: string[];
  concerns: string[];
}

function scoreCandidate(
  candidate: OrbitTalentCandidate,
  requiredSkills: string[],
  minYears: number | null,
  province: string,
): MatchResult {
  const rawSkills = candidate.skills;
  const candidateSkills = (rawSkills ? rawSkills : []).map((s) => s.toLowerCase());
  const matched = requiredSkills.filter((req) => candidateSkills.includes(req));
  const missing = requiredSkills.filter((req) => !candidateSkills.includes(req));
  const skillsScore = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0;

  const years = candidate.yearsExperience;
  let experienceScore = 1;
  if (minYears !== null) {
    if (years === null) {
      experienceScore = 0;
    } else if (years >= minYears) {
      experienceScore = 1;
    } else {
      experienceScore = years / minYears;
    }
  }

  const locationScore = province ? (candidate.province === province ? 1 : 0) : 1;

  const overall = Math.round(
    (skillsScore * 0.7 + experienceScore * 0.2 + locationScore * 0.1) * 100,
  );

  const concerns: string[] = [];
  if (!candidate.consentToShare) {
    concerns.push("No consent — cannot be submitted yet");
  }
  if (minYears !== null && years !== null && years < minYears) {
    concerns.push(`Below ${minYears} yrs experience`);
  }
  if (province && candidate.province !== province) {
    concerns.push("Different province");
  }

  return { candidate, score: overall, matched, missing, concerns };
}

export default function RecruiterMatchesPage() {
  const { data: candidates = [], isLoading } = useOrbitTalentCandidates();
  const { data: jobs = [] } = useOrbitRecruiterJobs();

  // "job" mode runs the server-side embedding match against a saved Job
  // (issue #337); "brief" keeps the manual quick-match as a fallback.
  const [mode, setMode] = useState<"job" | "brief">("job");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const jobMatchesQuery = useOrbitRecruiterJobMatches(mode === "job" ? selectedJobId : null);
  const jobMatchesData = jobMatchesQuery.data;
  const jobMatches = jobMatchesData ? jobMatchesData : null;
  const jobMatchesLoading = jobMatchesQuery.isFetching;

  const [skillsText, setSkillsText] = useState("");
  const [minYearsText, setMinYearsText] = useState("");
  const [province, setProvince] = useState("");
  const [results, setResults] = useState<MatchResult[] | null>(null);

  const runMatch = () => {
    const requiredSkills = skillsText
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (requiredSkills.length === 0) {
      setResults([]);
      return;
    }
    const trimmedYears = minYearsText.trim();
    const parsedYears = trimmedYears ? Number(trimmedYears) : null;
    const minYears = parsedYears !== null && !Number.isNaN(parsedYears) ? parsedYears : null;

    const scored = candidates
      .map((candidate) => scoreCandidate(candidate, requiredSkills, minYears, province))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
    setResults(scored);
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Matches</h1>
        <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
          Enter a brief and rank your talent database by fit — with the reasons behind every match.
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("job")}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "job"
              ? "bg-[#323288] text-white"
              : "bg-white dark:bg-white/5 text-gray-600 dark:text-[#c0c0eb]"
          }`}
        >
          Match a job
        </button>
        <button
          type="button"
          onClick={() => setMode("brief")}
          className={`px-4 py-2 text-sm font-medium ${
            mode === "brief"
              ? "bg-[#323288] text-white"
              : "bg-white dark:bg-white/5 text-gray-600 dark:text-[#c0c0eb]"
          }`}
        >
          Manual brief
        </button>
      </div>

      {mode === "job" ? (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <label htmlFor="mt-job" className="block text-sm font-medium text-gray-700 mb-1">
            Match candidates against one of your jobs
          </label>
          <select
            id="mt-job"
            value={selectedJobId == null ? "" : String(selectedJobId)}
            onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : null)}
            className={`${inputClasses} bg-white`}
          >
            <option value="">Select a job…</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
                {job.province ? ` — ${job.province}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-gray-400">
            Semantic match between the full job spec and each candidate's profile + CV (55%
            similarity · 35% required skills · 10% location), with the reasons behind every score.
          </p>

          <div className="mt-6">
            {jobMatchesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
              </div>
            ) : selectedJobId == null ? (
              <p className="text-gray-500 dark:text-[#c0c0eb] text-center py-8">
                Pick a job above to rank your talent database against it.
              </p>
            ) : jobMatches && jobMatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-8 text-center">
                <p className="text-gray-600 dark:text-[#c0c0eb]">
                  No candidates matched this job yet. Add skills or CVs to your candidates.
                </p>
              </div>
            ) : jobMatches ? (
              <div className="space-y-3">
                {jobMatches.map((match) => (
                  <div
                    key={match.candidateId}
                    className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#252560] dark:text-white">
                          {match.fullName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {match.currentRole ? match.currentRole : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#323288] dark:text-white">
                          {match.score}%
                        </p>
                        <p className="text-xs text-gray-400">match</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-[#c0c0eb]">
                      {match.explanation}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.matchedSkills.map((skill) => (
                        <span
                          key={`m-${skill}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {match.missingSkills.map((skill) => (
                        <span
                          key={`x-${skill}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                        >
                          ✗ {skill}
                        </span>
                      ))}
                    </div>
                    {match.concerns.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {match.concerns.map((concern) => (
                          <span
                            key={concern}
                            className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                          >
                            {concern}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label htmlFor="mt-skills" className="block text-sm font-medium text-gray-700 mb-1">
                Required skills (comma-separated)
              </label>
              <input
                id="mt-skills"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className={inputClasses}
                placeholder="B2B sales, CRM, account management"
              />
            </div>
            <div>
              <label htmlFor="mt-years" className="block text-sm font-medium text-gray-700 mb-1">
                Min. years experience
              </label>
              <input
                id="mt-years"
                inputMode="numeric"
                value={minYearsText}
                onChange={(e) => setMinYearsText(e.target.value)}
                className={inputClasses}
                placeholder="5"
              />
            </div>
            <div>
              <label htmlFor="mt-province" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred province
              </label>
              <select
                id="mt-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                <option value="">Any province</option>
                {SOUTH_AFRICAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={runMatch}
                className="w-full px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
              >
                Find matches
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Transparent skills-and-experience match over your talent database (70% skills · 20%
            experience · 10% location). For semantic matching, use "Match a job".
          </p>

          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
              </div>
            ) : results === null ? (
              <p className="text-gray-500 dark:text-[#c0c0eb] text-center py-8">
                Enter a brief above and select <span className="font-medium">Find matches</span>.
              </p>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-8 text-center">
                <p className="text-gray-600 dark:text-[#c0c0eb]">
                  No candidates matched. Add skills to your candidates, or broaden the brief.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => {
                  const candidate = result.candidate;
                  const role = candidate.currentRole ? candidate.currentRole : "—";
                  return (
                    <div
                      key={candidate.id}
                      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#252560] dark:text-white">
                            {candidate.fullName}
                          </p>
                          <p className="text-sm text-gray-500">{role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#323288] dark:text-white">
                            {result.score}%
                          </p>
                          <p className="text-xs text-gray-400">match</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.matched.map((skill) => (
                          <span
                            key={`m-${skill}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                          >
                            ✓ {skill}
                          </span>
                        ))}
                        {result.missing.map((skill) => (
                          <span
                            key={`x-${skill}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                          >
                            ✗ {skill}
                          </span>
                        ))}
                      </div>

                      {result.concerns.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.concerns.map((concern) => (
                            <span
                              key={concern}
                              className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                            >
                              {concern}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
