"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Candidate } from "@/app/lib/api/cvAssistantApi";

interface CandidateDetailPanelProps {
  candidateId: number | null;
  candidates: Array<Candidate & { rank: number }>;
  onClose: () => void;
  onViewCv: (candidate: Candidate) => void;
}

export function CandidateDetailPanel(props: CandidateDetailPanelProps) {
  const { candidateId, candidates, onClose, onViewCv } = props;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && candidateId !== null) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [candidateId, onClose]);

  if (candidateId === null) return null;

  const candidate = candidates.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const candidateName = candidate.name;
  const candidateEmail = candidate.email;
  const candidateScore = candidate.matchScore;
  const candidateStatus = candidate.status;
  const analysis = candidate.matchAnalysis;
  const extracted = candidate.extractedData;
  const jobPosting = candidate.jobPosting;
  const jobTitle = jobPosting ? jobPosting.title : null;
  const jobRef = jobPosting ? jobPosting.referenceNumber : null;

  const skillsMatched = analysis ? analysis.skillsMatched : [];
  const skillsMissing = analysis ? analysis.skillsMissing : [];
  const reasoning = analysis ? analysis.reasoning : null;
  const recommendation = analysis ? analysis.recommendation : null;
  const experienceMatch = analysis ? analysis.experienceMatch : null;
  const educationMatch = analysis ? analysis.educationMatch : null;

  const skills = extracted ? extracted.skills : [];
  const education = extracted ? extracted.education : [];
  const certifications = extracted ? extracted.certifications : [];
  const experienceYears = extracted ? extracted.experienceYears : null;
  const summary = extracted ? extracted.summary : null;
  const phone = extracted ? extracted.phone : null;
  const location = extracted ? extracted.location : null;
  const saQualifications = extracted ? extracted.saQualifications : [];
  const professionalRegistrations = extracted ? extracted.professionalRegistrations : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-detail-title"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-sm font-bold mr-3">
              #{candidate.rank}
            </span>
            <span id="candidate-detail-title" className="text-xl font-bold text-gray-900">
              {candidateName || "Unknown candidate"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
              <DetailField label="Email" value={candidateEmail} />
              <DetailField label="Phone" value={phone} />
              <DetailField label="Location" value={location} />
              <DetailField
                label="Experience"
                value={experienceYears !== null ? `${experienceYears} years` : null}
              />
              <DetailField label="Status" value={candidateStatus.replace(/_/g, " ")} />
              <DetailField
                label="Applied for"
                value={jobTitle ? `${jobRef ? `[${jobRef}] ` : ""}${jobTitle}` : null}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Match Score</div>
              <div
                className={`text-4xl font-bold ${
                  candidateScore !== null && candidateScore >= 80
                    ? "text-green-600"
                    : candidateScore !== null && candidateScore >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {candidateScore !== null ? `${candidateScore}%` : "-"}
              </div>
              {recommendation && (
                <div className="mt-1 text-xs font-medium text-gray-600 uppercase">
                  {recommendation}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onViewCv(candidate)}
            disabled={!candidate.cvFilePath}
            className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-300 transition-colors"
          >
            View CV
          </button>

          {summary && (
            <Section title="Summary">
              <p className="text-sm text-gray-700 whitespace-pre-line">{summary}</p>
            </Section>
          )}

          {reasoning && (
            <Section title="AI Match Analysis">
              <p className="text-sm text-gray-700 whitespace-pre-line">{reasoning}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <MatchPill label="Experience" matched={experienceMatch} />
                <MatchPill label="Education" matched={educationMatch} />
              </div>
            </Section>
          )}

          {skillsMatched.length > 0 && (
            <Section title={`Skills matched (${skillsMatched.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {skillsMatched.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {skillsMissing.length > 0 && (
            <Section title={`Skills missing (${skillsMissing.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {skillsMissing.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {skills.length > 0 && (
            <Section title="All extracted skills">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {education.length > 0 && (
            <Section title="Education">
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {education.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {certifications.length > 0 && (
            <Section title="Certifications">
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {certifications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {saQualifications.length > 0 && (
            <Section title="SA qualifications">
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {saQualifications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {professionalRegistrations.length > 0 && (
            <Section title="Professional registrations">
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {professionalRegistrations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  const { title, children } = props;
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function DetailField(props: { label: string; value: string | null }) {
  const { label, value } = props;
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-gray-900 mt-0.5">{value || "-"}</div>
    </div>
  );
}

function MatchPill(props: { label: string; matched: boolean | null }) {
  const { label, matched } = props;
  const colorClass =
    matched === true
      ? "bg-green-100 text-green-700"
      : matched === false
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-600";
  const text = matched === true ? "Match" : matched === false ? "Gap" : "Unknown";
  return (
    <span className={`inline-flex items-center justify-between px-2.5 py-1 rounded ${colorClass}`}>
      <span className="font-medium">{label}</span>
      <span>{text}</span>
    </span>
  );
}
