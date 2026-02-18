import { useCallback, useEffect, useRef } from "react";
import {
  type FieldDefinition,
  fieldById,
  nextField,
  nextRequiredField,
  progressForStep,
} from "@/app/lib/config/rfq/fieldRegistry";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";

const DATA_NIX_TARGET = "data-nix-target";
const SCROLL_OPTIONS: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "center",
};

interface GuidedModeState {
  isActive: boolean;
  isPaused: boolean;
  currentFieldId: string | null;
  currentFieldDef: FieldDefinition | null;
  completedFields: string[];
  tooltipMessage: string | null;
  progress: number;
}

interface GuidedModeActions {
  startGuidedMode: () => void;
  endGuidedMode: () => void;
  pauseGuidedMode: () => void;
  resumeGuidedMode: () => void;
  focusField: (fieldId: string, tooltipMessage?: string) => void;
  markCurrentFieldComplete: () => void;
  skipCurrentField: () => void;
  advanceToNextField: (skipOptional?: boolean) => void;
  isFieldComplete: (fieldId: string) => boolean;
  fieldElement: (fieldId: string) => HTMLElement | null;
}

export type UseGuidedModeReturn = GuidedModeState & GuidedModeActions;

export function useGuidedMode(): UseGuidedModeReturn {
  const currentStep = useRfqWizardStore((s) => s.currentStep);
  const isActive = useRfqWizardStore((s) => s.nixGuidedModeActive);
  const isPaused = useRfqWizardStore((s) => s.nixGuidedModePaused);
  const currentFieldId = useRfqWizardStore((s) => s.nixGuidedModeCurrentField);
  const completedFields = useRfqWizardStore((s) => s.nixGuidedModeCompletedFields);
  const tooltipMessage = useRfqWizardStore((s) => s.nixGuidedModeTooltipMessage);

  const startGuidedModeAction = useRfqWizardStore((s) => s.nixStartGuidedMode);
  const endGuidedModeAction = useRfqWizardStore((s) => s.nixEndGuidedMode);
  const pauseGuidedModeAction = useRfqWizardStore((s) => s.nixPauseGuidedMode);
  const resumeGuidedModeAction = useRfqWizardStore((s) => s.nixResumeGuidedMode);
  const focusGuidedFieldAction = useRfqWizardStore((s) => s.nixFocusGuidedField);
  const markFieldCompleteAction = useRfqWizardStore((s) => s.nixMarkFieldComplete);
  const skipGuidedFieldAction = useRfqWizardStore((s) => s.nixSkipGuidedField);
  const advanceToNextFieldAction = useRfqWizardStore((s) => s.nixAdvanceToNextField);

  const lastFocusedFieldRef = useRef<string | null>(null);

  const currentFieldDef = currentFieldId ? fieldById(currentFieldId) : null;
  const progress = progressForStep(currentStep, completedFields);

  const fieldElement = useCallback((fieldId: string): HTMLElement | null => {
    return document.querySelector(`[${DATA_NIX_TARGET}="${fieldId}"]`);
  }, []);

  const focusFieldElement = useCallback(
    (fieldId: string) => {
      const element = fieldElement(fieldId);
      if (!element) return;

      element.scrollIntoView(SCROLL_OPTIONS);

      const focusable = element.querySelector<HTMLElement>(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable) {
        setTimeout(() => focusable.focus(), 300);
      } else if (element.tabIndex >= 0 || element.hasAttribute("tabindex")) {
        setTimeout(() => element.focus(), 300);
      }
    },
    [fieldElement],
  );

  const startGuidedMode = useCallback(() => {
    startGuidedModeAction();
  }, [startGuidedModeAction]);

  const endGuidedMode = useCallback(() => {
    endGuidedModeAction();
    lastFocusedFieldRef.current = null;
  }, [endGuidedModeAction]);

  const pauseGuidedMode = useCallback(() => {
    pauseGuidedModeAction();
  }, [pauseGuidedModeAction]);

  const resumeGuidedMode = useCallback(() => {
    resumeGuidedModeAction();
  }, [resumeGuidedModeAction]);

  const focusField = useCallback(
    (fieldId: string, message?: string) => {
      focusGuidedFieldAction(fieldId, message);
      focusFieldElement(fieldId);
      lastFocusedFieldRef.current = fieldId;
    },
    [focusGuidedFieldAction, focusFieldElement],
  );

  const markCurrentFieldComplete = useCallback(() => {
    if (currentFieldId) {
      markFieldCompleteAction(currentFieldId);
    }
  }, [currentFieldId, markFieldCompleteAction]);

  const skipCurrentField = useCallback(() => {
    skipGuidedFieldAction();
  }, [skipGuidedFieldAction]);

  const advanceToNextField = useCallback(
    (skipOptional = false) => {
      const nextFieldDef = skipOptional
        ? nextRequiredField(currentFieldId, completedFields, currentStep)
        : nextField(currentFieldId, completedFields, currentStep);

      advanceToNextFieldAction();

      if (nextFieldDef) {
        focusField(nextFieldDef.fieldId, nextFieldDef.helpText);
      }
    },
    [currentFieldId, completedFields, currentStep, advanceToNextFieldAction, focusField],
  );

  const isFieldComplete = useCallback(
    (fieldId: string) => completedFields.includes(fieldId),
    [completedFields],
  );

  useEffect(() => {
    if (!isActive || isPaused || !currentFieldId) return;

    if (lastFocusedFieldRef.current !== currentFieldId) {
      focusFieldElement(currentFieldId);
      lastFocusedFieldRef.current = currentFieldId;
    }
  }, [isActive, isPaused, currentFieldId, focusFieldElement]);

  return {
    isActive,
    isPaused,
    currentFieldId,
    currentFieldDef,
    completedFields,
    tooltipMessage,
    progress,
    startGuidedMode,
    endGuidedMode,
    pauseGuidedMode,
    resumeGuidedMode,
    focusField,
    markCurrentFieldComplete,
    skipCurrentField,
    advanceToNextField,
    isFieldComplete,
    fieldElement,
  };
}
