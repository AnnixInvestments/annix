"use client";

import Link from "next/link";
import AmixLogo from "./AmixLogo";

export interface StepConfig {
  id: string;
  label: string;
}

export interface RegistrationToolbarProps {
  steps: StepConfig[];
  currentStep: string;
  onStepChange: (step: string) => void;
  canNavigateToStep: (step: string) => boolean;
  title: string;
  homeHref?: string;
}

export function RegistrationTopToolbar({
  title,
  homeHref = "/",
}: {
  title: string;
  homeHref?: string;
}) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 shadow-lg"
      style={{ backgroundColor: "#323288" }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link
              href={homeHref}
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <AmixLogo size="sm" showText useSignatureFont />
            </Link>
            <div className="h-6 w-px bg-white/30" />
            <span className="text-white font-medium text-sm">{title}</span>
          </div>

          <Link
            href={homeHref}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-[#4a4da3]"
            style={{ color: "#FFA500" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function RegistrationBottomToolbar({
  steps,
  currentStep,
  onStepChange,
  canNavigateToStep,
}: {
  steps: StepConfig[];
  currentStep: string;
  onStepChange: (step: string) => void;
  canNavigateToStep: (step: string) => boolean;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;
  const isComplete = currentStep === "complete";

  if (isComplete) return null;

  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
      style={{ backgroundColor: "#323288" }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => previousStep && onStepChange(previousStep.id)}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isFirstStep ? "opacity-40 cursor-not-allowed" : "hover:bg-[#4a4da3] cursor-pointer"
            }`}
            style={{ color: "#FFA500" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">{previousStep?.label || "Back"}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isPast = index < currentIndex;
              const canNavigate = canNavigateToStep(step.id);

              return (
                <button
                  key={step.id}
                  onClick={() => canNavigate && onStepChange(step.id)}
                  disabled={!canNavigate}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#FFA500] text-[#323288]"
                      : isPast
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 cursor-pointer"
                        : canNavigate
                          ? "text-white/60 hover:bg-[#4a4da3] hover:text-white cursor-pointer"
                          : "text-white/30 cursor-not-allowed"
                  }`}
                  title={step.label}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold border-2 border-current">
                    {isPast ? (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => nextStep && canNavigateToStep(nextStep.id) && onStepChange(nextStep.id)}
            disabled={isLastStep || !nextStep || !canNavigateToStep(nextStep.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isLastStep || !nextStep || !canNavigateToStep(nextStep.id)
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-[#4a4da3] cursor-pointer"
            }`}
            style={{ color: "#FFA500" }}
          >
            <span className="hidden sm:inline">{nextStep?.label || "Next"}</span>
            <span className="sm:hidden">Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function RegistrationToolbar({
  steps,
  currentStep,
  onStepChange,
  canNavigateToStep,
  title,
  homeHref = "/",
}: RegistrationToolbarProps) {
  return (
    <>
      <RegistrationTopToolbar title={title} homeHref={homeHref} />
      <RegistrationBottomToolbar
        steps={steps}
        currentStep={currentStep}
        onStepChange={onStepChange}
        canNavigateToStep={canNavigateToStep}
      />
    </>
  );
}
