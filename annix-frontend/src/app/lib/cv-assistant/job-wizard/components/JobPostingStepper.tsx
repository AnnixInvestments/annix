"use client";

import { WIZARD_STEPS, type WizardStepId } from "../constants/wizard-steps";

export interface JobPostingStepperProps {
  current: WizardStepId;
  onSelect: (id: WizardStepId) => void;
  highestVisited: number;
}

export function JobPostingStepper(props: JobPostingStepperProps) {
  const { current, onSelect, highestVisited } = props;

  return (
    <ol className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center">
      {WIZARD_STEPS.map((step, index) => {
        const isCurrent = step.id === current;
        const isPast = index < WIZARD_STEPS.findIndex((s) => s.id === current);
        const isReachable = index <= highestVisited;
        const isLast = index === WIZARD_STEPS.length - 1;

        const baseClass =
          "flex items-center gap-3 text-left transition-colors px-3 py-2 rounded-lg flex-1";
        const stateClass = isCurrent
          ? "bg-white text-[#1a1a40] shadow-md"
          : isPast
            ? "bg-white/10 text-white hover:bg-white/15"
            : isReachable
              ? "bg-white/5 text-white/70 hover:bg-white/10"
              : "bg-white/5 text-white/40 cursor-not-allowed";

        return (
          <li key={step.id} className="flex items-center w-full sm:w-auto sm:flex-1">
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onSelect(step.id)}
              className={`${baseClass} ${stateClass}`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isCurrent
                    ? "bg-[#FFA500] text-[#1a1a40]"
                    : isPast
                      ? "bg-[#FFA500]/80 text-[#1a1a40]"
                      : "bg-white/15 text-white"
                }`}
              >
                {isPast ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-xs uppercase tracking-wider opacity-70">
                  Step {step.number}
                </span>
                <span className="text-sm font-semibold">{step.label}</span>
              </span>
            </button>
            {!isLast && (
              <span className="hidden sm:block flex-shrink-0 w-4 h-px bg-white/30 mx-1" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
