"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { JobPosting, UpdateJobWizardPayload } from "@/app/lib/api/cvAssistantApi";
import { useCvCreateJobDraft, useCvJobWizardDraft } from "@/app/lib/query/hooks";
import { cvAssistantKeys } from "@/app/lib/query/keys";
import { WIZARD_STEPS, type WizardStepId } from "../constants/wizard-steps";
import { useWizardAutoSave } from "../hooks/useWizardAutoSave";
import { useWizardStep } from "../hooks/useWizardStep";
import { JobPostingStepper } from "./JobPostingStepper";
import { JobPreviewCard } from "./JobPreviewCard";
import { NixAssistantPanel } from "./NixAssistantPanel";
import { JobBasicsStep } from "./steps/JobBasicsStep";
import { ReviewPublishStep } from "./steps/ReviewPublishStep";
import { RoleOutcomesStep } from "./steps/RoleOutcomesStep";
import { SalaryBenefitsStep } from "./steps/SalaryBenefitsStep";
import { ScreeningQuestionsStep } from "./steps/ScreeningQuestionsStep";
import { SkillsRequirementsStep } from "./steps/SkillsRequirementsStep";

export interface JobWizardProps {
  /**
   * If null/undefined, the wizard creates a draft on mount and replaces
   * the URL with /jobs/<id>/edit. If provided, hydrates that draft.
   */
  jobId: number | null;
}

export function JobWizard({ jobId }: JobWizardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const createDraft = useCvCreateJobDraft();
  const draftQuery = useCvJobWizardDraft(jobId);
  const [resolvedId, setResolvedId] = useState<number | null>(jobId);
  const createTriggeredRef = useRef(false);
  const step = useWizardStep();
  const autoSave = useWizardAutoSave(resolvedId);
  const [highestVisited, setHighestVisited] = useState(step.index);
  const [titlePreview, setTitlePreview] = useState<{
    samplePreview: string;
    sampleResponsibilities: string[];
    normalizedTitle: string;
  } | null>(null);

  useEffect(() => {
    setHighestVisited((prev) => Math.max(prev, step.index));
  }, [step.index]);

  // Bootstrap a draft if no id was passed
  useEffect(() => {
    if (jobId != null) {
      setResolvedId(jobId);
      return;
    }
    if (createTriggeredRef.current) return;
    createTriggeredRef.current = true;
    createDraft
      .mutateAsync()
      .then((draft: JobPosting) => {
        setResolvedId(draft.id);
        router.replace(`/cv-assistant/portal/jobs/${draft.id}/edit?step=basics`, {
          scroll: false,
        });
      })
      .catch(() => {
        showToast("Couldn't start a new job draft. Please try again.", "error");
      });
  }, [jobId, createDraft, router, showToast]);

  const draftData = draftQuery.data;
  const draft = draftData || null;

  // Optimistic patch — immediately update the query cache so the UI reflects
  // the change instantly, then debounce the persisted save in the background.
  // Without this, removing a question / unchecking a benefit waits ~1s for the
  // network round-trip before disappearing.
  const handleChange = useMemo(
    () => (patch: UpdateJobWizardPayload) => {
      if (resolvedId != null) {
        queryClient.setQueryData<JobPosting | undefined>(
          cvAssistantKeys.jobPostings.wizard(resolvedId),
          (prev) => (prev ? { ...prev, ...patch } : prev),
        );
      }
      autoSave.schedule(patch);
    },
    [autoSave, queryClient, resolvedId],
  );

  const handleNext = async () => {
    await autoSave.flush();
    step.next();
  };

  const handleBack = () => {
    step.back();
  };

  const handlePublished = (published: JobPosting) => {
    const refNumber = published.referenceNumber;
    const ref = refNumber || "";
    router.push(`/cv-assistant/portal/jobs?published=${ref}`);
  };

  const isLoading = draftQuery.isLoading;
  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  const currentStepDef = WIZARD_STEPS[step.index];
  const stepDescription = currentStepDef?.description;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Post a New Job</h1>
            <p className="text-white/70 mt-1">{stepDescription}</p>
          </div>
          <span className="text-xs text-white/60 uppercase tracking-widest">
            Step {step.index + 1} of {WIZARD_STEPS.length}
          </span>
        </div>
        <JobPostingStepper
          current={step.current}
          onSelect={(id: WizardStepId) => step.go(id)}
          highestVisited={highestVisited}
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {step.current === "basics" && (
            <JobBasicsStep draft={draft} onChange={handleChange} onTitlePreview={setTitlePreview} />
          )}
          {step.current === "outcomes" && (
            <RoleOutcomesStep draft={draft} onChange={handleChange} />
          )}
          {step.current === "skills" && (
            <SkillsRequirementsStep draft={draft} onChange={handleChange} />
          )}
          {step.current === "salary" && (
            <SalaryBenefitsStep draft={draft} onChange={handleChange} />
          )}
          {step.current === "screening" && (
            <ScreeningQuestionsStep draft={draft} onChange={handleChange} />
          )}
          {step.current === "review" && (
            <ReviewPublishStep
              draft={draft}
              onPublished={handlePublished}
              onFlush={autoSave.flush}
            />
          )}

          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step.isFirst}
              className="px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            {!step.isLast ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 text-sm font-semibold bg-[#FFA500] text-[#1a1a40] hover:bg-[#FFB733] rounded-lg shadow-md"
              >
                Save & continue →
              </button>
            ) : (
              <span className="text-sm text-white/70">
                Use the Publish button on the left when you&apos;re ready.
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <NixAssistantPanel draft={draft} saveStatus={autoSave.status} />
          {step.current !== "review" && (
            <JobPreviewCard draft={draft} titlePreview={titlePreview} />
          )}
        </div>
      </div>
    </div>
  );
}
