"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { WIZARD_STEPS, type WizardStepId } from "../constants/wizard-steps";

const DEFAULT_STEP: WizardStepId = "basics";

export interface UseWizardStepResult {
  current: WizardStepId;
  index: number;
  go: (id: WizardStepId) => void;
  next: () => void;
  back: () => void;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Wizard step state synced to the URL hash. Lets users deep-link to a
 * particular step and keeps browser back/forward working.
 */
export function useWizardStep(): UseWizardStepResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stepParam = searchParams.get("step");
  const isValidStep = WIZARD_STEPS.some((s) => s.id === stepParam);
  const current: WizardStepId = isValidStep ? (stepParam as WizardStepId) : DEFAULT_STEP;
  const index = WIZARD_STEPS.findIndex((s) => s.id === current);

  const go = useCallback(
    (id: WizardStepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const next = useCallback(() => {
    const nextStep = WIZARD_STEPS[index + 1];
    if (nextStep) go(nextStep.id);
  }, [index, go]);

  const back = useCallback(() => {
    const prevStep = WIZARD_STEPS[index - 1];
    if (prevStep) go(prevStep.id);
  }, [index, go]);

  return {
    current,
    index,
    go,
    next,
    back,
    isFirst: index <= 0,
    isLast: index >= WIZARD_STEPS.length - 1,
  };
}
