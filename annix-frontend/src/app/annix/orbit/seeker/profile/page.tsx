"use client";

import { isArray, isNumber } from "es-toolkit/compat";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import {
  type IndividualDocument,
  type IndividualDocumentKind,
  SEEKER_AGE_GROUP_OPTIONS,
} from "@/app/lib/api/annixOrbitApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitDeleteMyDocument,
  useOrbitMyDocuments,
  useOrbitMyProfileStatus,
  useOrbitSeekerWorkProfile,
  useOrbitUpdateSeekerPreferences,
} from "@/app/lib/query/hooks";
import { useFeatureFlagEnabled } from "@/app/lib/query/hooks/useFeatureFlagEnabled";
import { CredentialFieldsEditor } from "../components/CredentialFieldsEditor";
import { CredentialPhotoCapture } from "../components/CredentialPhotoCapture";
import { IndividualDocumentUploader } from "../components/IndividualDocumentUploader";
import { MissingDocsWarningModal } from "../components/MissingDocsWarningModal";
import { NixWizardPanel } from "../components/NixWizardPanel";
import { ProfilePhotoAvatar } from "../components/ProfilePhotoAvatar";

export default function SeekerProfilePage() {
  const router = useRouter();
  const { user } = useAnnixOrbitAuth();
  const statusQuery = useOrbitMyProfileStatus(true, { pollWhileCvProcessing: true });
  const documentsQuery = useOrbitMyDocuments();
  const workProfileQuery = useOrbitSeekerWorkProfile();
  const deleteMutation = useOrbitDeleteMyDocument();
  const { confirm, ConfirmDialog } = useConfirm();
  const { alert, AlertDialog } = useAlert();
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [nixAutoRunKey, setNixAutoRunKey] = useState(0);
  const [cvBuilt, setCvBuilt] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [focusedStep, setFocusedStep] = useState<number | null>(null);

  // Skipped steps survive navigation: restore per-user from localStorage.
  const skipStorageKey = user ? `orbit-seeker-skipped-steps:${user.email}` : null;
  useEffect(() => {
    if (!skipStorageKey) return;
    try {
      const raw = window.localStorage.getItem(skipStorageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isArray(parsed)) {
          setSkippedSteps(new Set(parsed.filter((v): v is number => isNumber(v))));
        }
      }
    } catch {
      // Corrupt/blocked storage just means no restored skips.
    }
  }, [skipStorageKey]);

  const skipStep = (step: number) => {
    setSkippedSteps((prev) => {
      const next = new Set([...prev, step]);
      if (skipStorageKey) {
        try {
          window.localStorage.setItem(skipStorageKey, JSON.stringify([...next]));
        } catch {
          // Storage unavailable - the skip still applies for this session.
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const statusLoading = statusQuery.isLoading;
    const documentsLoading = documentsQuery.isLoading;
    const workProfileLoading = workProfileQuery.isLoading;
    if (statusLoading || documentsLoading || workProfileLoading) return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [statusQuery.isLoading, documentsQuery.isLoading, workProfileQuery.isLoading]);

  const status = statusQuery.data;
  const documentsData = documentsQuery.data;
  const workProfileData = workProfileQuery.data;
  const documents = documentsData ? documentsData : [];
  const workProfile = workProfileData ? workProfileData.profile : null;
  const workShared = workProfile ? workProfile.shared : null;
  const cvDocFound = documents.find((d) => d.kind === "cv");
  const cvDoc = cvDocFound ? cvDocFound : null;
  const qualifications = documents.filter((d) => d.kind === "qualification");
  const certificates = documents.filter((d) => d.kind === "certificate");
  const hasCv = status ? status.hasCv : false;
  const qualificationsCount = status ? status.qualificationsCount : 0;
  const certificatesCount = status ? status.certificatesCount : 0;
  const cvUploadedAt = status ? status.cvUploadedAt : null;
  const cvExtractionStatus = status ? status.cvExtractionStatus : null;
  const nixAssessedAt = status ? status.careerScoreGeneratedAt : null;
  const nixCvGeneratedAt = status ? status.nixCvGeneratedAt : null;
  const photoAllowed = status ? status.photoCredentialCapture : false;

  const docsSignature = `${qualificationsCount}:${certificatesCount}`;
  const docsSignatureRef = useRef(docsSignature);
  docsSignatureRef.current = docsSignature;
  const [nixRanSignature, setNixRanSignature] = useState<string | null>(null);
  const handleNixRan = useCallback(() => {
    setNixRanSignature(docsSignatureRef.current);
  }, []);
  // CV text extraction now finishes in the background after upload - only kick
  // the Nix auto-run once it lands, otherwise it would assess an empty CV.
  const prevExtractionStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevExtractionStatusRef.current;
    prevExtractionStatusRef.current = cvExtractionStatus;
    if (prev === "processing" && cvExtractionStatus === "completed") {
      setNixAutoRunKey((k) => k + 1);
    }
  }, [cvExtractionStatus]);
  const userName = user ? user.name : null;
  const firstName = userName ? userName.split(" ")[0] : "";
  const qualsHighlight = hasCv && qualificationsCount === 0;
  const certsHighlight = hasCv && certificatesCount === 0;
  const nixHighlight =
    hasCv &&
    (nixAssessedAt == null || (nixRanSignature != null && nixRanSignature !== docsSignature));
  const cvBuilderFlag = useFeatureFlagEnabled("ANNIX_ORBIT_NIX_CV_BUILDER");
  const cvBuilderEnabled = !cvBuilderFlag.isLoading && cvBuilderFlag.enabled;

  const step1Done = hasCv;
  // Persisted server signals (assessment ran / improved CV built) keep these
  // green across navigation; the in-session signature still tracks fresh runs.
  const step2Done = nixRanSignature === docsSignature || nixAssessedAt != null;
  const step3Done = cvBuilt || nixCvGeneratedAt != null || skippedSteps.has(3);
  const step4Done = qualificationsCount > 0 || skippedSteps.has(4);
  const step5Done = certificatesCount > 0 || skippedSteps.has(5);
  const step6Done = !!(workShared?.fields?.length && workShared.primaryRole);
  const allOptionalDone = step3Done && step4Done && step5Done && step6Done;
  const activeStep = !step1Done
    ? 1
    : !step2Done
      ? 2
      : !step3Done
        ? 3
        : !step4Done
          ? 4
          : !step5Done
            ? 5
            : !step6Done
              ? 6
              : 7;

  const handleStartSearch = useCallback(() => {
    if (!status) return;
    if (!allOptionalDone) {
      setWarningOpen(true);
      return;
    }
    router.push("/annix/orbit/seeker/jobs");
  }, [allOptionalDone, router, status]);

  const scrollToStep = useCallback(
    (step: number) => {
      if (step === 7) {
        handleStartSearch();
        return;
      }
      const targetIdByStep: Record<number, string> = {
        1: "cv-section",
        2: "nix-section",
        3: "nix-section",
        4: "qualifications",
        5: "certificates",
        6: "work-profile-section",
      };
      const targetId = targetIdByStep[step];
      if (!targetId) return;
      setFocusedStep(step);
      window.history.replaceState(null, "", `#${targetId}`);
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      window.setTimeout(
        () => setFocusedStep((current) => (current === step ? null : current)),
        1800,
      );
    },
    [handleStartSearch],
  );

  const handleConfirmContinue = () => {
    setWarningOpen(false);
    router.push("/annix/orbit/seeker/jobs");
  };

  const handleDelete = async (doc: IndividualDocument) => {
    const isCv = doc.kind === "cv";
    const confirmed = await confirm({
      title: isCv ? "Delete your CV?" : "Delete this document?",
      message: isCv
        ? "Your CV will be permanently removed and job matching will stop until you upload a new one. This cannot be undone."
        : "It will be permanently removed from your profile. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setPendingDeleteId(doc.id);
    deleteMutation.mutate(doc.id, {
      onSuccess: () => setPendingDeleteId(null),
      onError: () => {
        setPendingDeleteId(null);
        alert({ message: "Couldn't delete the document — please try again.", variant: "error" });
      },
    });
  };

  const isStatusLoading = statusQuery.isLoading;
  const isDocumentsLoading = documentsQuery.isLoading;
  const isWorkProfileLoading = workProfileQuery.isLoading;
  const isStatusError = statusQuery.isError;
  const isDocumentsError = documentsQuery.isError;
  const isWorkProfileError = workProfileQuery.isError;
  if (isStatusLoading || isDocumentsLoading || isWorkProfileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-navbar,#323288)]" />
      </div>
    );
  }

  if (isStatusError || isDocumentsError || isWorkProfileError) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your profile right now. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/annix/orbit/seeker/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3a3a8a] hover:text-[#1a1a4e]"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-white">My CV &amp; Documents</h1>
        <p className="text-white/70 mt-2">
          {hasCv
            ? "Keep your CV current and add qualifications or certificates so we can match you to better jobs."
            : "Upload your CV to get started — we will use it to find jobs you are qualified for."}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-2 py-4 sm:p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Your checklist
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          <StepPill
            num={1}
            label="Upload CV"
            done={step1Done}
            active={activeStep === 1 || focusedStep === 1}
            onClick={() => scrollToStep(1)}
          />
          <StepPill
            num={2}
            label="Nix Wizard"
            done={step2Done}
            active={activeStep === 2 || focusedStep === 2}
            onClick={() => scrollToStep(2)}
          />
          <StepPill
            num={3}
            label="Improve CV"
            done={step3Done}
            active={activeStep === 3 || focusedStep === 3}
            onClick={() => scrollToStep(3)}
          />
          <StepPill
            num={4}
            label="Qualifications"
            done={step4Done}
            active={activeStep === 4 || focusedStep === 4}
            onClick={() => scrollToStep(4)}
          />
          <StepPill
            num={5}
            label="Certificates"
            done={step5Done}
            active={activeStep === 5 || focusedStep === 5}
            onClick={() => scrollToStep(5)}
          />
          <StepPill
            num={6}
            label="Work Profile"
            done={step6Done}
            active={activeStep === 6 || focusedStep === 6}
            onClick={() => scrollToStep(6)}
          />
          <StepPill
            num={7}
            label="Browse Jobs"
            done={false}
            active={activeStep === 7 || focusedStep === 7}
            onClick={() => scrollToStep(7)}
          />
        </div>
      </div>

      <ProfilePhotoAvatar />

      <AgeGroupCard ageGroup={status ? status.ageGroup : null} loaded={status != null} />

      {hasCv ? (
        <SectionCard
          id="cv-section"
          active={activeStep === 1 || focusedStep === 1}
          title={
            <>
              <StepVisited num={1} done={step1Done} /> Your CV
            </>
          }
          description="Required. We extract your skills, experience, and education from this file."
        >
          {cvExtractionStatus === "processing" ? (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-blue-600" />
              <span>
                Nix is reading your CV — your skills and experience will be extracted shortly. You
                can keep working in the meantime.
              </span>
            </div>
          ) : null}
          {cvExtractionStatus === "unreadable" || cvExtractionStatus === "failed" ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              We couldn't read any text from your CV, even after trying automatic conversion and
              OCR. It may be password-protected, corrupted, or contain only images we couldn't read.
              Please re-upload a text-based PDF or Word document, or a clearer scan.
            </div>
          ) : null}
          {cvDoc ? (
            <CurrentCvCard
              doc={cvDoc}
              cvUploadedAt={cvUploadedAt}
              onDelete={handleDelete}
              isDeleting={pendingDeleteId === cvDoc.id}
            />
          ) : null}
          <IndividualDocumentUploader
            kind="cv"
            ctaLabel="Replace CV"
            helperText="PDF works best. Word, Excel, or PowerPoint also accepted (10 MB max). Replacing your CV will overwrite the old version."
          />
        </SectionCard>
      ) : (
        <div
          id="cv-section"
          className="rounded-2xl shadow-lg p-6 sm:p-8 scroll-mt-24"
          style={{
            backgroundImage:
              "linear-gradient(to bottom right, var(--brand-accent,#FF8A00), var(--brand-accent-light,#FF9C33))",
          }}
        >
          <StepVisited num={1} done={false} />
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[var(--brand-grad-from,#1a1a40)]">
            Start refining your CV here{firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--brand-grad-from,#1a1a40)]/80">
            Upload your CV and let Annix Orbit polish it with AI, then match you to suitable jobs.
            It only takes a couple of minutes and everything else unlocks from here.
          </p>
          <div className="mt-5">
            <IndividualDocumentUploader
              kind="cv"
              ctaLabel="Upload CV"
              helperText="PDF works best. Word, Excel, or PowerPoint also accepted (10 MB max)."
            />
          </div>
        </div>
      )}

      <div
        id="nix-section"
        className={`space-y-3 scroll-mt-24 rounded-xl ${
          focusedStep === 2 || focusedStep === 3
            ? "ring-2 ring-[var(--brand-accent,#FF8A00)] ring-offset-2 ring-offset-transparent"
            : ""
        }`}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <StepVisited num={2} done={step2Done} />
          <StepVisited num={3} done={step3Done} />
          {!step3Done && activeStep >= 3 && !cvBuilderEnabled && (
            <button
              type="button"
              onClick={() => skipStep(3)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 underline"
            >
              Skip improving my CV
            </button>
          )}
        </div>
        <NixWizardPanel
          hasCv={hasCv}
          autoRunKey={nixAutoRunKey}
          highlight={nixHighlight}
          onRan={handleNixRan}
          onStartSearch={handleStartSearch}
          onBuilt={() => setCvBuilt(true)}
        />
      </div>

      <SectionCard
        id="qualifications"
        title={
          <>
            <StepVisited num={4} done={step4Done} /> Qualifications
          </>
        }
        description="Optional but strongly recommended. Degrees, diplomas, transcripts — one file per qualification."
        badge={qualifications.length > 0 ? `${qualifications.length} uploaded` : "Optional"}
        done={step4Done}
        active={activeStep === 4 || focusedStep === 4}
        onSkip={step4Done ? undefined : () => skipStep(4)}
      >
        <DocumentList
          documents={qualifications}
          emptyMessage="No qualifications uploaded yet."
          onDelete={handleDelete}
          pendingDeleteId={pendingDeleteId}
        />
        <IndividualDocumentUploader
          kind="qualification"
          ctaLabel={
            qualifications.length > 0 ? "Add another qualification" : "Upload qualification"
          }
          highlight={qualsHighlight}
        />
        <CredentialPhotoCapture kind="qualification" allowed={photoAllowed} />
      </SectionCard>

      <SectionCard
        id="certificates"
        title={
          <>
            <StepVisited num={5} done={step5Done} /> Certificates
          </>
        }
        description="Optional but strongly recommended. Professional certifications, licenses, training certificates."
        badge={certificates.length > 0 ? `${certificates.length} uploaded` : "Optional"}
        done={step5Done}
        active={activeStep === 5 || focusedStep === 5}
        onSkip={step5Done ? undefined : () => skipStep(5)}
      >
        <DocumentList
          documents={certificates}
          emptyMessage="No certificates uploaded yet."
          onDelete={handleDelete}
          pendingDeleteId={pendingDeleteId}
        />
        <IndividualDocumentUploader
          kind="certificate"
          ctaLabel={certificates.length > 0 ? "Add another certificate" : "Upload certificate"}
          highlight={certsHighlight}
        />
        <CredentialPhotoCapture kind="certificate" allowed={photoAllowed} />
      </SectionCard>

      <SectionCard
        id="work-profile-section"
        title={
          <>
            <StepVisited num={6} done={step6Done} /> Work Profile
          </>
        }
        description="Required before job search. Tell Nix what roles, work fields, salary floor, and travel radius fit you."
        badge={step6Done ? "Complete" : "Required"}
        done={step6Done}
        active={activeStep === 6 || focusedStep === 6}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-600 max-w-2xl">
            This helps Nix filter out poor matches before it starts ranking jobs against your CV.
          </p>
          <Link
            href="/annix/orbit/seeker/profile/work"
            className="bg-[#1a1a40] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--brand-navbar-active,#252560)] transition-colors whitespace-nowrap"
          >
            {step6Done ? "Review work profile" : "Complete work profile"}
          </Link>
        </div>
      </SectionCard>

      {activeStep >= 7 && (
        <div
          id="browse-jobs-section"
          className="bg-[var(--brand-accent,#FF8A00)] rounded-xl border border-[var(--brand-accent-light,#FF9C33)] px-2 py-4 sm:p-6 space-y-3 scroll-mt-24"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <StepVisited num={7} done={false} />
              <h2 className="text-lg font-semibold text-[#1a1a40] mt-2">Browse Jobs</h2>
              <p className="text-sm text-[#1a1a40]/80 mt-1">
                Your profile is ready. Start browsing jobs that match your CV and documents.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartSearch}
              className="bg-[#1a1a40] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--brand-navbar-active,#252560)] transition-colors whitespace-nowrap"
            >
              Browse jobs
            </button>
          </div>
        </div>
      )}

      <MissingDocsWarningModal
        isOpen={warningOpen}
        missingCvImprovement={!step3Done}
        missingQualifications={!step4Done}
        missingCertificates={!step5Done}
        missingWorkProfile={!step6Done}
        onCancel={() => setWarningOpen(false)}
        onConfirm={handleConfirmContinue}
      />
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}

function AgeGroupCard(props: { ageGroup: string | null; loaded: boolean }) {
  const updatePreferences = useOrbitUpdateSeekerPreferences();
  const { alert, AlertDialog } = useAlert();
  const [savedFlash, setSavedFlash] = useState(false);
  const ageGroup = props.ageGroup;
  const currentValue = ageGroup ?? "";

  const handleChange = (value: string) => {
    if (!value || value === currentValue) return;
    updatePreferences.mutate(
      { ageGroup: value },
      {
        onSuccess: () => {
          setSavedFlash(true);
          window.setTimeout(() => setSavedFlash(false), 2500);
        },
        onError: () =>
          alert({ message: "Couldn't save your age group — please try again.", variant: "error" }),
      },
    );
  };

  if (!props.loaded) return null;

  return (
    <div
      className={`bg-white rounded-xl border px-4 py-4 sm:px-6 ${
        currentValue ? "border-[var(--brand-navbar-100,#e0e0f5)]" : "border-amber-300"
      }`}
    >
      {AlertDialog}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Your age group</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Helps us match you with age-appropriate opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedFlash ? <span className="text-xs font-medium text-emerald-600">Saved</span> : null}
          <select
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            disabled={updatePreferences.isPending}
            aria-label="Your age group"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-transparent disabled:opacity-50"
          >
            <option value="" disabled>
              Select your age group
            </option>
            {SEEKER_AGE_GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SectionCard(props: {
  id?: string;
  title: React.ReactNode;
  description: string;
  badge?: string;
  done?: boolean;
  active?: boolean;
  onSkip?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={props.id}
      className={`bg-white rounded-xl border px-2 py-4 sm:p-6 space-y-4 scroll-mt-24 ${
        props.active
          ? "border-[var(--brand-navbar,#323288)] ring-1 ring-[var(--brand-navbar,#323288)]"
          : props.done
            ? "border-[var(--brand-navbar-100,#e0e0f5)] opacity-70"
            : "border-[var(--brand-navbar-100,#e0e0f5)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{props.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {props.badge && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
              {props.badge}
            </span>
          )}
          {props.onSkip && (
            <button
              type="button"
              onClick={props.onSkip}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
            >
              Skip
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">{props.children}</div>
    </div>
  );
}

function CurrentCvCard(props: {
  doc: IndividualDocument;
  cvUploadedAt: string | null;
  onDelete: (doc: IndividualDocument) => void;
  isDeleting: boolean;
}) {
  const propsCvUploadedAt = props.cvUploadedAt;
  const docUploadedAt = props.doc.uploadedAt;
  const uploadedAt = propsCvUploadedAt ? propsCvUploadedAt : docUploadedAt;
  const sizeKb = Math.round(props.doc.sizeBytes / 1024);
  return (
    <div className="bg-gray-50 border border-[var(--brand-navbar-100,#e0e0f5)] rounded-lg px-2.5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <FileBadge kind="cv" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{props.doc.originalFilename}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {sizeKb} KB · uploaded {formatDate(uploadedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap pl-[52px] sm:pl-0">
        <a
          href={props.doc.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] dark:text-[#9ea0e8] dark:hover:text-[#c0c0eb] font-medium whitespace-nowrap"
        >
          View
        </a>
        <button
          type="button"
          onClick={() => props.onDelete(props.doc)}
          disabled={props.isDeleting}
          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {props.isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

function DocumentList(props: {
  documents: IndividualDocument[];
  emptyMessage: string;
  onDelete: (doc: IndividualDocument) => void;
  pendingDeleteId: number | null;
}) {
  const [editingDoc, setEditingDoc] = useState<IndividualDocument | null>(null);

  if (props.documents.length === 0) {
    return <p className="text-sm text-gray-500 italic">{props.emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {props.documents.map((doc) => {
        const isDeleting = props.pendingDeleteId === doc.id;
        const sizeKb = Math.round(doc.sizeBytes / 1024);
        const pendingScan = doc.isPhotoCapture && doc.needsClearScan;
        return (
          <li
            key={doc.id}
            className="bg-gray-50 border border-[var(--brand-navbar-100,#e0e0f5)] rounded-lg px-2.5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileBadge kind={doc.kind} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.label ? doc.label : doc.originalFilename}
                  </p>
                  {pendingScan && (
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Phone photo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sizeKb} KB · uploaded {formatDate(doc.uploadedAt)}
                </p>
                {pendingScan && (
                  <p className="text-xs text-amber-700 mt-1">
                    Not shown to employers yet — upload a clear scan above to share it.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap pl-[52px] sm:pl-0">
              {doc.isPhotoCapture && (
                <button
                  type="button"
                  onClick={() => setEditingDoc(doc)}
                  className="text-sm text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] dark:text-[#9ea0e8] dark:hover:text-[#c0c0eb] font-medium whitespace-nowrap"
                >
                  Edit details
                </button>
              )}
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] dark:text-[#9ea0e8] dark:hover:text-[#c0c0eb] font-medium"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => props.onDelete(doc)}
                disabled={isDeleting}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </li>
        );
      })}
      {editingDoc && (
        <CredentialFieldsEditor
          doc={editingDoc}
          isOpen={editingDoc !== null}
          onClose={() => setEditingDoc(null)}
        />
      )}
    </ul>
  );
}

function FileBadge(props: { kind: IndividualDocumentKind }) {
  const palette =
    props.kind === "cv"
      ? "bg-[var(--brand-navbar-100,#e0e0f5)] text-[var(--brand-navbar-active,#252560)]"
      : props.kind === "qualification"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${palette}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
  );
}

function StepVisited(props: { num: number; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${props.done ? "text-emerald-600" : "text-gray-400"}`}
    >
      {props.done ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Step {props.num}
        </>
      ) : (
        <>Step {props.num}</>
      )}
    </span>
  );
}

function StepPill(props: {
  num: number;
  label: string;
  done: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-accent,#FF8A00)] ${
        props.done
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          : props.active
            ? "bg-[var(--brand-navbar-50,#f0f0fc)] text-[var(--brand-navbar,#323288)] border border-[var(--brand-navbar,#323288)] hover:bg-white"
            : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-white hover:text-[var(--brand-navbar,#323288)] hover:border-[var(--brand-navbar,#323288)]"
      }`}
    >
      <span
        className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
          props.done
            ? "bg-emerald-500 text-white"
            : props.active
              ? "bg-[var(--brand-navbar,#323288)] text-white"
              : "bg-gray-200 text-gray-500"
        }`}
      >
        {props.done ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          props.num
        )}
      </span>
      <span>{props.label}</span>
    </button>
  );
}

function formatDate(value: string): string {
  return formatDateZA(value);
}
