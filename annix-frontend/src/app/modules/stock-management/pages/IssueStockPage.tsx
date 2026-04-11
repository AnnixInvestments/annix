"use client";

import { useState } from "react";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";

type StepKey = "issuer" | "recipient" | "target" | "items" | "confirm";

const STEPS: ReadonlyArray<{ key: StepKey; label: string }> = [
  { key: "issuer", label: "Issuer" },
  { key: "recipient", label: "Recipient" },
  { key: "target", label: "Job Card or CPO" },
  { key: "items", label: "Items" },
  { key: "confirm", label: "Confirm" },
];

export function IssueStockPage() {
  const config = useStockManagementConfig();
  const isBasicEnabled = useStockManagementFeature("BASIC_ISSUING");
  const [currentStep, setCurrentStep] = useState<StepKey>("issuer");

  if (!isBasicEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">{config.label("issueStock.title")}</h1>
        <p className="text-sm text-gray-600">{config.label("feature.upgradePrompt.body")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{config.label("issueStock.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{config.label("issueStock.subtitle")}</p>
      </header>

      <nav aria-label="Progress" className="flex items-center gap-3">
        {STEPS.map((step, index) => {
          const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
          const isActive = step.key === currentStep;
          const isComplete = index < stepIndex;
          const tone = isActive
            ? "bg-teal-600 text-white"
            : isComplete
              ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-500";
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setCurrentStep(step.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${tone}`}
            >
              {index + 1}. {config.label(`issueStock.step.${step.key}`, step.label)}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          The unified Issue Stock page is built progressively across phases 5, 6, 7, 9, and 10 of
          issue #192. This skeleton renders the new stepper structure and reads the runtime feature
          flags from the StockManagementProvider. The full picker, photo capture, per-line-item
          editors, and confirm flow land in subsequent commits.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          Current step: <span className="font-mono">{currentStep}</span>
        </p>
      </div>
    </div>
  );
}

export default IssueStockPage;
