"use client";

import { useEffect, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import type { NixGeneratedCv, NixGeneratedCvExperience } from "@/app/lib/api/cvAssistantApi";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import {
  useGenerateNixCv,
  useNixGeneratedCv,
  useUpdateNixGeneratedCv,
} from "@/app/lib/query/hooks";

const NIX_BUILD_ESTIMATED_MS = 18000;

export interface NixCvBuilderProps {
  hasCv: boolean;
}

export function NixCvBuilder(props: NixCvBuilderProps) {
  const hasCv = props.hasCv;
  const generateMutation = useGenerateNixCv();
  const generatedQuery = useNixGeneratedCv();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const updateMutation = useUpdateNixGeneratedCv();
  const persistCv = updateMutation.mutate;
  const [editedCv, setEditedCv] = useState<NixGeneratedCv | null>(null);

  const isBuilding = generateMutation.isPending;
  const generate = generateMutation.mutate;

  useEffect(() => {
    if (isBuilding) {
      showExtraction({
        brand: "cv-assistant",
        label: "Nix is building your improved CV…",
        estimatedDurationMs: NIX_BUILD_ESTIMATED_MS,
      });
    } else {
      hideExtraction();
    }
    return () => {
      hideExtraction();
    };
  }, [isBuilding, showExtraction, hideExtraction]);

  const mutationCv = generateMutation.data;
  const queryCv = generatedQuery.data ? generatedQuery.data.cv : null;
  const sourceCv: NixGeneratedCv | null = mutationCv ? mutationCv : queryCv;
  const cv: NixGeneratedCv | null = editedCv ? editedCv : sourceCv;

  useEffect(() => {
    setEditedCv(sourceCv);
  }, [sourceCv]);

  const handleRemoveCoreCompetency = (value: string) => {
    if (!cv) return;
    const next: NixGeneratedCv = {
      ...cv,
      coreCompetencies: cv.coreCompetencies.filter((entry) => entry !== value),
    };
    setEditedCv(next);
    persistCv(next);
  };

  const handleRemoveKeySkill = (value: string) => {
    if (!cv) return;
    const next: NixGeneratedCv = {
      ...cv,
      keySkills: cv.keySkills.filter((entry) => entry !== value),
    };
    setEditedCv(next);
    persistCv(next);
  };

  const mutationError = generateMutation.error;
  const buildErrorMessage = mutationError
    ? mutationError instanceof Error
      ? mutationError.message
      : "Nix could not build your CV right now. Please try again."
    : null;

  const handleBuild = () => {
    setCopied(false);
    setDownloadError(null);
    generate();
  };

  const handleDownload = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      const blob = await cvAssistantApiClient.nixWizardGeneratedCvPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Nix-CV.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("We couldn't download your PDF right now. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = () => {
    if (!cv) return;
    const text = renderPlainText(cv);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  return (
    <div className="bg-gradient-to-br from-[#f0f0fc] to-white rounded-xl border border-[#c0c0eb] p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-xl">
          <h3 className="text-base font-semibold text-[#252560]">Get Nix to build my CV</h3>
          <p className="text-sm text-gray-600 mt-1">
            Nix takes the genuinely strong parts of your CV, applies the Wizard's suggestions, and
            writes a complete, recruiter-ready CV you can download as a PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBuild}
          disabled={!hasCv || isBuilding}
          className="bg-[#323288] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#252560] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          title={hasCv ? undefined : "Upload your CV first to use the Nix CV builder"}
        >
          {isBuilding ? "Nix is building…" : cv ? "Rebuild my CV" : "Get Nix to build my CV"}
        </button>
      </div>

      {!hasCv && (
        <p className="text-xs text-gray-500 italic">
          Upload your CV above first — Nix needs it before it can build an improved version.
        </p>
      )}

      {buildErrorMessage && !isBuilding && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {buildErrorMessage}
        </div>
      )}

      {cv && !isBuilding && (
        <div className="space-y-4">
          {cv.improvementsApplied.length > 0 && (
            <div className="bg-white rounded-lg border border-[#e0e0f5] p-4">
              <h4 className="text-sm font-semibold text-[#252560] uppercase tracking-wide mb-2">
                What Nix changed
              </h4>
              <ul className="space-y-1.5">
                {cv.improvementsApplied.map((change) => (
                  <li key={change} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-[#7373c2] flex-shrink-0">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <NixCvDocument
            cv={cv}
            onRemoveCoreCompetency={handleRemoveCoreCompetency}
            onRemoveKeySkill={handleRemoveKeySkill}
          />

          {downloadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {downloadError}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="bg-[#323288] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#252560] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="border border-[#c0c0eb] text-[#323288] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#f0f0fc] transition-colors"
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NixCvDocument(props: {
  cv: NixGeneratedCv;
  onRemoveCoreCompetency: (value: string) => void;
  onRemoveKeySkill: (value: string) => void;
}) {
  const cv = props.cv;
  const onRemoveCoreCompetency = props.onRemoveCoreCompetency;
  const onRemoveKeySkill = props.onRemoveKeySkill;
  const rawFullName = cv.fullName;
  const fullName = rawFullName || "Curriculum Vitae";
  const contactParts = [cv.contact.email, cv.contact.phone, cv.contact.linkedin].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  const contactLine = contactParts.join("  •  ");

  return (
    <div className="bg-white rounded-lg border border-[#e0e0f5] shadow-sm p-8 space-y-5">
      <div className="border-b-2 border-[#323288] pb-3">
        <h2 className="text-2xl font-bold text-[#252560]">{fullName}</h2>
        {cv.headlineTitle && (
          <p className="text-sm font-semibold text-[#323288] uppercase tracking-wide mt-1">
            {cv.headlineTitle}
          </p>
        )}
        {cv.location && <p className="text-sm text-gray-500 mt-1">{cv.location}</p>}
        {contactLine && <p className="text-xs text-gray-500 mt-1">{contactLine}</p>}
      </div>

      {cv.professionalSummary && (
        <CvSection title="Professional Summary">
          <p className="text-sm text-gray-800 leading-relaxed">{cv.professionalSummary}</p>
        </CvSection>
      )}

      {cv.coreCompetencies.length > 0 && (
        <CvSection title="Core Competencies">
          <CvSkillList values={cv.coreCompetencies} onRemove={onRemoveCoreCompetency} />
        </CvSection>
      )}

      {cv.experience.length > 0 && (
        <CvSection title="Experience">
          <div className="space-y-4">
            {cv.experience.map((exp, index) => (
              <CvExperienceItem key={`${exp.employer}-${exp.role}-${index}`} experience={exp} />
            ))}
          </div>
        </CvSection>
      )}

      {cv.education.length > 0 && (
        <CvSection title="Education">
          <CvList values={cv.education} />
        </CvSection>
      )}

      {cv.certifications.length > 0 && (
        <CvSection title="Certifications">
          <CvList values={cv.certifications} />
        </CvSection>
      )}

      {cv.professionalRegistrations.length > 0 && (
        <CvSection title="Professional Registrations">
          <CvList values={cv.professionalRegistrations} />
        </CvSection>
      )}

      {cv.keySkills.length > 0 && (
        <CvSection title="Key Skills">
          <CvSkillList values={cv.keySkills} onRemove={onRemoveKeySkill} />
        </CvSection>
      )}

      {cv.closingNote && <p className="text-xs text-gray-500 italic">{cv.closingNote}</p>}
    </div>
  );
}

function CvSection(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[#252560] uppercase tracking-wide border-b border-[#e0e0f5] pb-1">
        {props.title}
      </h3>
      {props.children}
    </div>
  );
}

function CvSkillList(props: { values: string[]; onRemove: (value: string) => void }) {
  const values = props.values;
  const onRemove = props.onRemove;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {values.map((value) => (
        <span key={value} className="inline-flex items-center gap-1.5 text-sm text-gray-800">
          <span>{value}</span>
          <button
            type="button"
            onClick={() => onRemove(value)}
            aria-label={`Remove ${value}`}
            title={`Remove ${value}`}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xs leading-none"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function CvList(props: { values: string[] }) {
  return (
    <ul className="space-y-1">
      {props.values.map((value) => (
        <li key={value} className="text-sm text-gray-800 flex gap-2">
          <span className="text-[#7373c2] flex-shrink-0">•</span>
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}

function CvExperienceItem(props: { experience: NixGeneratedCvExperience }) {
  const exp = props.experience;
  const employerLine = exp.location ? `${exp.employer} · ${exp.location}` : exp.employer;
  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-gray-900">{exp.role}</p>
          <p className="text-sm font-semibold text-[#323288]">{employerLine}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">{exp.period}</span>
      </div>
      {exp.bullets.length > 0 && (
        <ul className="mt-1.5 space-y-1 pl-4 list-disc">
          {exp.bullets.map((bullet) => (
            <li key={bullet} className="text-sm text-gray-800">
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderPlainText(cv: NixGeneratedCv): string {
  const lines: string[] = [];
  const rawFullName = cv.fullName;
  const fullName = rawFullName || "Curriculum Vitae";
  lines.push(fullName);
  if (cv.headlineTitle) lines.push(cv.headlineTitle);
  if (cv.location) lines.push(cv.location);
  const contactParts = [cv.contact.email, cv.contact.phone, cv.contact.linkedin].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  if (contactParts.length > 0) lines.push(contactParts.join("  |  "));

  if (cv.professionalSummary) {
    lines.push("", "PROFESSIONAL SUMMARY", cv.professionalSummary);
  }
  if (cv.coreCompetencies.length > 0) {
    lines.push("", "CORE COMPETENCIES", cv.coreCompetencies.join(", "));
  }
  if (cv.experience.length > 0) {
    lines.push("", "EXPERIENCE");
    cv.experience.forEach((exp) => {
      const employerLine = exp.location ? `${exp.employer} · ${exp.location}` : exp.employer;
      lines.push(`${exp.role} — ${employerLine} (${exp.period})`);
      exp.bullets.forEach((bullet) => lines.push(`  - ${bullet}`));
    });
  }
  if (cv.education.length > 0) {
    lines.push("", "EDUCATION");
    cv.education.forEach((item) => lines.push(`  - ${item}`));
  }
  if (cv.certifications.length > 0) {
    lines.push("", "CERTIFICATIONS");
    cv.certifications.forEach((item) => lines.push(`  - ${item}`));
  }
  if (cv.professionalRegistrations.length > 0) {
    lines.push("", "PROFESSIONAL REGISTRATIONS");
    cv.professionalRegistrations.forEach((item) => lines.push(`  - ${item}`));
  }
  if (cv.keySkills.length > 0) {
    lines.push("", "KEY SKILLS", cv.keySkills.join(", "));
  }
  if (cv.closingNote) {
    lines.push("", cv.closingNote);
  }
  return lines.join("\n");
}
