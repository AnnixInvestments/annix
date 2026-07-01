"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JobPosting, UpdateJobWizardPayload } from "@/app/lib/api/annixOrbitApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useOrbitCreateJobDraft, useOrbitJobWizardDraft } from "@/app/lib/query/hooks";
import { annixOrbitKeys } from "@/app/lib/query/keys";
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
  const { alert: showAlert, AlertDialog } = useAlert();
  const queryClient = useQueryClient();
  const createDraft = useOrbitCreateJobDraft();
  const draftQuery = useOrbitJobWizardDraft(jobId);
  const [resolvedId, setResolvedId] = useState<number | null>(jobId);
  const createTriggeredRef = useRef(false);
  const step = useWizardStep();
  const autoSave = useWizardAutoSave(resolvedId);
  const [highestVisited, setHighestVisited] = useState(step.index);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [titlePreview, setTitlePreview] = useState<{
    samplePreview: string;
    sampleResponsibilities: string[];
    normalizedTitle: string;
  } | null>(null);

  useEffect(() => {
    setHighestVisited((prev) => Math.max(prev, step.index));
  }, [step.index]);

  const bootstrapDraft = useCallback(() => {
    createTriggeredRef.current = true;
    createDraft
      .mutateAsync()
      .then((draft: JobPosting) => {
        setResolvedId(draft.id);
        router.replace(`/annix/orbit/portal/jobs/${draft.id}/edit?step=basics`, {
          scroll: false,
        });
      })
      .catch(() => {
        // The error surfaces inline below via createDraft.isError — the company
        // can retry from there. No blocking alert needed.
      });
  }, [createDraft, router]);

  // Bootstrap a draft if no id was passed
  useEffect(() => {
    if (jobId != null) {
      setResolvedId(jobId);
      return;
    }
    if (createTriggeredRef.current) return;
    bootstrapDraft();
  }, [jobId, bootstrapDraft]);

  const handleRetryBootstrap = () => {
    createDraft.reset();
    bootstrapDraft();
  };

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
          annixOrbitKeys.jobPostings.wizard(resolvedId),
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

  const handleSaveListing = async () => {
    setIsSavingListing(true);
    const saved = await autoSave.flush();
    if (saved) {
      await queryClient.invalidateQueries({ queryKey: annixOrbitKeys.jobPostings.all });
      router.push("/annix/orbit/portal/dashboard");
      return;
    }
    setIsSavingListing(false);
    showAlert({
      message: "Couldn't save this job listing. Please try again before leaving the page.",
      variant: "error",
    });
  };

  const handleBack = () => {
    step.back();
  };

  const handlePublished = (published: JobPosting) => {
    const refNumber = published.referenceNumber;
    const ref = refNumber || "";
    router.push(`/annix/orbit/portal/jobs?published=${ref}`);
  };

  const bootstrapFailed = jobId == null && resolvedId == null && createDraft.isError;
  const isRetrying = createDraft.isPending;
  if (bootstrapFailed) {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/15 bg-white/5 p-8 text-center">
          <h1 className="text-lg font-bold text-white">We couldn't start your job draft</h1>
          <p className="mt-2 text-sm text-white/70">
            Something went wrong while setting up a new posting. Your work isn't lost — give it
            another try.
          </p>
          <button
            type="button"
            onClick={handleRetryBootstrap}
            disabled={isRetrying}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#FF8A00] px-5 py-2.5 text-sm font-semibold text-[#1a1a40] shadow-md transition-colors hover:bg-[#FF9C33] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRetrying ? "Trying again…" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  const isLoading = draftQuery.isLoading;
  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-24">
        {AlertDialog}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  const currentStepDef = WIZARD_STEPS[step.index];
  const stepDescription = currentStepDef?.description;

  return (
    <div className="space-y-8">
      {AlertDialog}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Post a New Job</h1>
            <p className="text-white/70 mt-1">{stepDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveListing}
              disabled={isSavingListing}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#252560] shadow-md transition-all hover:bg-[#f0f0fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSavingListing ? "Saving..." : "Save job listing"}
            </button>
            <span className="text-xs text-white/60 uppercase tracking-widest">
              Step {step.index + 1} of {WIZARD_STEPS.length}
            </span>
          </div>
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
                className="px-5 py-2 text-sm font-semibold bg-[#FF8A00] text-[#1a1a40] hover:bg-[#FF9C33] rounded-lg shadow-md"
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
