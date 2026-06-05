"use client";

import { useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import type {
  NixGeneratedCv,
  NixGeneratedCvExperience,
  NixGeneratedCvReference,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdoptNixCv,
  useGenerateNixCv,
  useNixGeneratedCv,
  useUpdateNixGeneratedCv,
} from "@/app/lib/query/hooks";

const NIX_BUILD_ESTIMATED_MS = 18000;

export interface NixCvBuilderProps {
  hasCv: boolean;
  onStartSearch?: () => void;
}

export function NixCvBuilder(props: NixCvBuilderProps) {
  const hasCv = props.hasCv;
  const onStartSearch = props.onStartSearch;
  const generateMutation = useGenerateNixCv();
  const generatedQuery = useNixGeneratedCv();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const pdfPreview = usePdfPreview();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [buildEstimateMs, setBuildEstimateMs] = useState(NIX_BUILD_ESTIMATED_MS);

  const updateMutation = useUpdateNixGeneratedCv();
  const persistCv = updateMutation.mutate;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editedCv, setEditedCv] = useState<NixGeneratedCv | null>(null);

  const scheduleSave = (next: NixGeneratedCv) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      persistCv(next, {
        onError: () => showToast("Couldn't save your CV edits — please try again.", "error"),
      });
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const isBuilding = generateMutation.isPending;
  const generate = generateMutation.mutate;

  useEffect(() => {
    metricsApi
      .extractionStats("annix-orbit-nix-seeker", "cv-generation")
      .then((stats) => {
        if (stats.averageMs) setBuildEstimateMs(stats.averageMs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isBuilding) {
      showExtraction({
        brand: "annix-orbit",
        label: "Nix is building your improved CV…",
        estimatedDurationMs: buildEstimateMs,
      });
    } else {
      hideExtraction();
    }
    return () => {
      hideExtraction();
    };
  }, [isBuilding, buildEstimateMs, showExtraction, hideExtraction]);

  const mutationCv = generateMutation.data;
  const queryCv = generatedQuery.data ? generatedQuery.data.cv : null;
  const sourceCv: NixGeneratedCv | null = mutationCv ? mutationCv : queryCv;
  const cv: NixGeneratedCv | null = editedCv ? editedCv : sourceCv;
  const buildHighlight = hasCv && !cv;
  const buildPalette = buildHighlight
    ? "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] hover:bg-[var(--brand-accent-light,#FF9C33)]"
    : "bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]";

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
    scheduleSave(next);
  };

  const handleRemoveKeySkill = (value: string) => {
    if (!cv) return;
    const next: NixGeneratedCv = {
      ...cv,
      keySkills: cv.keySkills.filter((entry) => entry !== value),
    };
    setEditedCv(next);
    scheduleSave(next);
  };

  const handleAddCoreCompetency = (value: string) => {
    if (!cv) return;
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const exists = cv.coreCompetencies.some(
      (entry) => entry.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    const next: NixGeneratedCv = {
      ...cv,
      coreCompetencies: [...cv.coreCompetencies, trimmed],
    };
    setEditedCv(next);
    scheduleSave(next);
  };

  const handleAddKeySkill = (value: string) => {
    if (!cv) return;
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const exists = cv.keySkills.some((entry) => entry.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    const next: NixGeneratedCv = {
      ...cv,
      keySkills: [...cv.keySkills, trimmed],
    };
    setEditedCv(next);
    scheduleSave(next);
  };

  const handleRemoveReference = (reference: NixGeneratedCvReference) => {
    if (!cv) return;
    const rawRefs = cv.references;
    const references = rawRefs || [];
    const next: NixGeneratedCv = {
      ...cv,
      references: references.filter((entry) => entry !== reference),
    };
    setEditedCv(next);
    scheduleSave(next);
  };

  const handleAddReference = (reference: NixGeneratedCvReference) => {
    if (!cv) return;
    const rawRefs = cv.references;
    const references = rawRefs || [];
    const next: NixGeneratedCv = {
      ...cv,
      references: [...references, reference],
    };
    setEditedCv(next);
    scheduleSave(next);
  };

  const mutationError = generateMutation.error;
  const serverMessage =
    mutationError instanceof Error && mutationError.message.trim().length > 0
      ? mutationError.message
      : null;
  const buildErrorMessage = mutationError
    ? (serverMessage ?? "Nix could not build your CV right now. Please try again.")
    : null;

  const handleBuild = () => {
    setCopied(false);
    setAdopted(false);
    generate();
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await annixOrbitApiClient.nixWizardGeneratedCvPdf();
      pdfPreview.open(blob, "Nix-CV.pdf");
    } catch {
      showToast("We couldn't open your PDF right now. Please try again.", "error");
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
        showToast("Couldn't copy to clipboard — please select and copy manually.", "error");
      });
  };

  const adoptMutation = useAdoptNixCv();
  const [adopting, setAdopting] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [adoptMessage, setAdoptMessage] = useState<string | null>(null);

  const handleUseThisCv = async () => {
    setAdopting(true);
    setAdoptMessage(null);
    const stats = await metricsApi.extractionStats("orbit-cv-adopt", "nix-cv").catch(() => null);
    const learnedMs = stats ? stats.averageMs : null;
    showExtraction({
      brand: "annix-orbit",
      label: "Saving your CV and matching you to jobs…",
      estimatedDurationMs: learnedMs || 30000,
    });
    try {
      await adoptMutation.mutateAsync();
      hideExtraction();
      setAdopted(true);
      setAdoptMessage("Saved — Nix is now using this CV. Your job matches will refresh shortly.");
      void confirm({
        title: "CV saved",
        message: "Nix is now using this CV — your job matches will refresh shortly.",
        confirmLabel: "Great",
        hideCancel: true,
        variant: "info",
      });
    } catch {
      hideExtraction();
      const message = "Couldn't save your CV right now. Please try again.";
      setAdoptMessage(message);
      void confirm({
        title: "Couldn't save your CV",
        message: "Something went wrong while saving your CV. Please try again in a moment.",
        confirmLabel: "OK",
        hideCancel: true,
        variant: "warning",
      });
    } finally {
      setAdopting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-2 py-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-xl">
          <h3 className="text-base font-semibold text-gray-800">Get Nix to build my CV</h3>
          <p className="text-sm text-gray-600 mt-1">
            Nix takes the genuinely strong parts of your CV, applies the Wizard's suggestions, and
            writes a complete, recruiter-ready CV you can download as a PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBuild}
          disabled={!hasCv || isBuilding}
          className={`${buildPalette} px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap`}
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
            <div className="bg-white rounded-lg border border-gray-200 px-2 py-4">
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">
                What Nix changed
              </h4>
              <ul className="space-y-1.5">
                {cv.improvementsApplied.map((change) => (
                  <li key={change} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-gray-500 flex-shrink-0">•</span>
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
            onAddCoreCompetency={handleAddCoreCompetency}
            onAddKeySkill={handleAddKeySkill}
            onRemoveReference={handleRemoveReference}
            onAddReference={handleAddReference}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleUseThisCv}
              disabled={adopting}
              className={`${
                adopted
                  ? "bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
                  : "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] hover:bg-[var(--brand-accent-light,#FF9C33)]"
              } px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60`}
              title="Save this as your CV and have Nix match it to jobs"
            >
              {adopting ? "Saving & matching…" : "Use this CV"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="bg-[var(--brand-navbar,#323288)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
            {onStartSearch && (
              <button
                type="button"
                onClick={onStartSearch}
                className={`${
                  adopted
                    ? "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40] hover:bg-[var(--brand-accent-light,#FF9C33)]"
                    : "bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
                } px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors`}
              >
                Start job search
              </button>
            )}
          </div>

          {adoptMessage && (
            <p className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              {adoptMessage}
            </p>
          )}
        </div>
      )}
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
      {ConfirmDialog}
    </div>
  );
}

function NixCvDocument(props: {
  cv: NixGeneratedCv;
  onRemoveCoreCompetency: (value: string) => void;
  onRemoveKeySkill: (value: string) => void;
  onAddCoreCompetency: (value: string) => void;
  onAddKeySkill: (value: string) => void;
  onRemoveReference: (reference: NixGeneratedCvReference) => void;
  onAddReference: (reference: NixGeneratedCvReference) => void;
}) {
  const cv = props.cv;
  const onRemoveCoreCompetency = props.onRemoveCoreCompetency;
  const onRemoveKeySkill = props.onRemoveKeySkill;
  const onAddCoreCompetency = props.onAddCoreCompetency;
  const onAddKeySkill = props.onAddKeySkill;
  const onRemoveReference = props.onRemoveReference;
  const onAddReference = props.onAddReference;
  const rawFullName = cv.fullName;
  const fullName = rawFullName || "Curriculum Vitae";
  const contactParts = [cv.contact.email, cv.contact.phone, cv.contact.linkedin].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  const contactLine = contactParts.join("  •  ");

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-2 py-4 sm:p-8 space-y-5">
      <div className="border-b-2 border-[var(--brand-navbar,#323288)] pb-3">
        <h2 className="text-2xl font-bold text-gray-800">{fullName}</h2>
        {cv.headlineTitle && (
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-1">
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

      <CvSection title="Core Competencies">
        <CvSkillList
          values={cv.coreCompetencies}
          onRemove={onRemoveCoreCompetency}
          onAdd={onAddCoreCompetency}
        />
      </CvSection>

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

      <CvSection title="Key Skills">
        <CvSkillList values={cv.keySkills} onRemove={onRemoveKeySkill} onAdd={onAddKeySkill} />
      </CvSection>

      <CvSection title="References">
        <CvReferenceList
          references={cv.references}
          onRemove={onRemoveReference}
          onAdd={onAddReference}
        />
      </CvSection>

      {cv.closingNote && <p className="text-xs text-gray-500 italic">{cv.closingNote}</p>}
    </div>
  );
}

function CvSection(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-1">
        {props.title}
      </h3>
      {props.children}
    </div>
  );
}

function CvSkillList(props: {
  values: string[];
  onRemove: (value: string) => void;
  onAdd: (value: string) => void;
}) {
  const values = props.values;
  const onRemove = props.onRemove;
  const onAdd = props.onAdd;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed.length > 0) {
      onAdd(trimmed);
    }
    setDraft("");
    setAdding(false);
  };

  const cancel = () => {
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
      {adding ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") {
                cancel();
              }
            }}
            placeholder="New entry"
            autoFocus
            className="text-sm border border-gray-200 rounded px-2 py-0.5 w-40 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
          />
          <button
            type="button"
            onClick={commit}
            className="text-xs font-medium text-gray-700 hover:text-gray-900"
          >
            Add
          </button>
          <button
            type="button"
            onClick={cancel}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-medium text-gray-700 hover:text-gray-900"
        >
          + Add
        </button>
      )}
    </div>
  );
}

function CvList(props: { values: string[] }) {
  return (
    <ul className="space-y-1">
      {props.values.map((value) => (
        <li key={value} className="text-sm text-gray-800 flex gap-2">
          <span className="text-gray-500 flex-shrink-0">•</span>
          <span>{value}</span>
        </li>
      ))}
    </ul>
  );
}

function CvReferenceList(props: {
  references: NixGeneratedCvReference[];
  onRemove: (reference: NixGeneratedCvReference) => void;
  onAdd: (reference: NixGeneratedCvReference) => void;
}) {
  const rawReferences = props.references;
  const references = rawReferences || [];
  const onRemove = props.onRemove;
  const onAdd = props.onAdd;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setPosition("");
    setCompany("");
    setPhone("");
    setEmail("");
    setEmailError(null);
  };

  const commit = () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return;
    const trimmedEmail = email.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!emailValid) {
      setEmailError("A valid email address is required — employers use it for reference checks.");
      return;
    }
    setEmailError(null);
    const trimmedPosition = position.trim();
    const trimmedCompany = company.trim();
    const trimmedPhone = phone.trim();
    onAdd({
      name: trimmedName,
      position: trimmedPosition.length > 0 ? trimmedPosition : null,
      company: trimmedCompany.length > 0 ? trimmedCompany : null,
      phone: trimmedPhone.length > 0 ? trimmedPhone : null,
      email: trimmedEmail,
    });
    resetForm();
    setAdding(false);
  };

  const cancel = () => {
    resetForm();
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      {references.length === 0 && !adding && (
        <p className="text-sm text-gray-500">
          Add your references — employers need these for background checks once you're shortlisted.
        </p>
      )}
      {references.map((reference, index) => {
        const roleParts = [reference.position, reference.company].filter((part): part is string =>
          Boolean(part && part.trim().length > 0),
        );
        const roleLine = roleParts.join(", ");
        const contactParts = [reference.phone, reference.email].filter((part): part is string =>
          Boolean(part && part.trim().length > 0),
        );
        const contactLine = contactParts.join("  •  ");
        return (
          <div
            key={`${reference.name}-${index}`}
            className="flex items-start justify-between gap-3"
          >
            <div>
              <p className="text-sm font-bold text-gray-900">{reference.name}</p>
              {roleLine && <p className="text-sm text-gray-700">{roleLine}</p>}
              {contactLine && <p className="text-xs text-gray-500">{contactLine}</p>}
            </div>
            <button
              type="button"
              onClick={() => onRemove(reference)}
              aria-label={`Remove ${reference.name}`}
              title={`Remove ${reference.name}`}
              className="text-gray-400 hover:text-gray-700 transition-colors text-xs leading-none"
            >
              ×
            </button>
          </div>
        );
      })}
      {adding ? (
        <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name (required)"
            autoFocus
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
          />
          <input
            type="text"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            placeholder="Position"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
          />
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Company"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
          />
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email (required)"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)]"
          />
          {emailError && <p className="text-xs text-red-600">{emailError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={commit}
              className="text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              Add reference
            </button>
            <button
              type="button"
              onClick={cancel}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-medium text-gray-700 hover:text-gray-900"
        >
          + Add reference
        </button>
      )}
    </div>
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
          <p className="text-sm font-semibold text-gray-700">{employerLine}</p>
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
  const rawReferences = cv.references;
  const references = rawReferences || [];
  if (references.length > 0) {
    lines.push("", "REFERENCES");
    references.forEach((reference) => {
      const roleParts = [reference.position, reference.company].filter((part): part is string =>
        Boolean(part && part.trim().length > 0),
      );
      const roleLine = roleParts.join(", ");
      const contactParts = [reference.phone, reference.email].filter((part): part is string =>
        Boolean(part && part.trim().length > 0),
      );
      const contactLine = contactParts.join("  |  ");
      lines.push(reference.name);
      if (roleLine.length > 0) lines.push(`  ${roleLine}`);
      if (contactLine.length > 0) lines.push(`  ${contactLine}`);
    });
  }
  if (cv.closingNote) {
    lines.push("", cv.closingNote);
  }
  return lines.join("\n");
}
