"use client";

import { useMemo, useState } from "react";
import {
  APPLICATION_PROFILES,
  SelectionCriteria,
  SelectionResult,
  selectPumpType,
} from "@product-data/pumps/pumpSelectionGuide";

interface PumpSelectionWizardProps {
  onComplete?: (result: SelectionResult, criteria: SelectionCriteria) => void;
  onSelectPumpType?: (pumpTypeValue: string) => void;
}

type WizardStep = "application" | "operating" | "fluid" | "priorities" | "results";

const FLUID_TYPES = [
  { value: "water", label: "Water" },
  { value: "chemical", label: "Chemical" },
  { value: "slurry", label: "Slurry" },
  { value: "oil", label: "Oil" },
  { value: "food", label: "Food & Beverage" },
  { value: "viscous", label: "Viscous Fluid" },
];

const OPERATING_MODES = [
  { value: "continuous", label: "Continuous (24/7)" },
  { value: "intermittent", label: "Intermittent" },
  { value: "variable", label: "Variable Flow" },
];

const PRIORITY_OPTIONS = [
  { value: "efficiency", label: "Energy Efficiency", description: "Minimize operating costs" },
  { value: "cost", label: "Low Capital Cost", description: "Minimize upfront investment" },
  { value: "reliability", label: "Reliability", description: "Maximize uptime" },
  { value: "maintenance", label: "Low Maintenance", description: "Minimize maintenance needs" },
  { value: "footprint", label: "Compact Size", description: "Space-constrained installation" },
];

export function PumpSelectionWizard({ onComplete, onSelectPumpType }: PumpSelectionWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("application");
  const [criteria, setCriteria] = useState<SelectionCriteria>({
    flowRateM3h: 50,
    headM: 30,
    viscosityCp: 1,
    temperatureC: 25,
    solidsPercent: 0,
    priorities: [],
  });

  const result = useMemo<SelectionResult | null>(() => {
    if (currentStep !== "results") return null;
    return selectPumpType(criteria);
  }, [currentStep, criteria]);

  const updateCriteria = <K extends keyof SelectionCriteria>(
    key: K,
    value: SelectionCriteria[K],
  ) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  const togglePriority = (
    priority: "efficiency" | "cost" | "reliability" | "maintenance" | "footprint",
  ) => {
    setCriteria((prev) => {
      const current = prev.priorities ?? [];
      const hasIt = current.includes(priority);
      return {
        ...prev,
        priorities: hasIt ? current.filter((p) => p !== priority) : [...current, priority],
      };
    });
  };

  const stepIndex = ["application", "operating", "fluid", "priorities", "results"].indexOf(
    currentStep,
  );

  const canProceed = () => {
    if (currentStep === "operating") {
      return criteria.flowRateM3h > 0 && criteria.headM > 0;
    }
    return true;
  };

  const nextStep = () => {
    const steps: WizardStep[] = ["application", "operating", "fluid", "priorities", "results"];
    const nextIdx = steps.indexOf(currentStep) + 1;
    if (nextIdx < steps.length) {
      setCurrentStep(steps[nextIdx]);
    }
  };

  const prevStep = () => {
    const steps: WizardStep[] = ["application", "operating", "fluid", "priorities", "results"];
    const prevIdx = steps.indexOf(currentStep) - 1;
    if (prevIdx >= 0) {
      setCurrentStep(steps[prevIdx]);
    }
  };

  const handleComplete = () => {
    if (result && onComplete) {
      onComplete(result, criteria);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pump Selection Wizard</h2>
          <div className="flex items-center gap-2">
            {["application", "operating", "fluid", "priorities", "results"].map((step, idx) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  idx < stepIndex
                    ? "bg-green-500"
                    : idx === stepIndex
                      ? "bg-blue-500"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Step {stepIndex + 1} of 5: {currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}
        </p>
      </div>

      <div className="p-6">
        {currentStep === "application" && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900">Select Application Type</h3>
            <p className="text-sm text-gray-600">
              Choose the application that best matches your use case
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {APPLICATION_PROFILES.map((app) => (
                <button
                  key={app.value}
                  onClick={() => updateCriteria("application", app.value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    criteria.application === app.value
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-900">{app.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{app.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === "operating" && (
          <div className="space-y-6">
            <h3 className="text-base font-medium text-gray-900">Operating Parameters</h3>
            <p className="text-sm text-gray-600">Enter the required flow rate and head</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flow Rate (m³/h) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={criteria.flowRateM3h}
                  onChange={(e) => updateCriteria("flowRateM3h", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={0.1}
                />
                <p className="text-xs text-gray-500 mt-1">Required volumetric flow rate</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Head (m) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={criteria.headM}
                  onChange={(e) => updateCriteria("headM", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  step={0.1}
                />
                <p className="text-xs text-gray-500 mt-1">Total dynamic head required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating Mode
                </label>
                <select
                  value={criteria.operatingMode ?? ""}
                  onChange={(e) =>
                    updateCriteria(
                      "operatingMode",
                      e.target.value as SelectionCriteria["operatingMode"],
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select mode...</option>
                  {OPERATING_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === "fluid" && (
          <div className="space-y-6">
            <h3 className="text-base font-medium text-gray-900">Fluid Properties</h3>
            <p className="text-sm text-gray-600">Describe the fluid being pumped</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fluid Type</label>
                <select
                  value={criteria.fluidType ?? ""}
                  onChange={(e) =>
                    updateCriteria("fluidType", e.target.value as SelectionCriteria["fluidType"])
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  {FLUID_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={criteria.temperatureC ?? 25}
                  onChange={(e) => updateCriteria("temperatureC", parseFloat(e.target.value) || 25)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Viscosity (cP)
                </label>
                <input
                  type="number"
                  value={criteria.viscosityCp ?? 1}
                  onChange={(e) => updateCriteria("viscosityCp", parseFloat(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">Water = 1 cP, Honey = 2000+ cP</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solids Content (%)
                </label>
                <input
                  type="number"
                  value={criteria.solidsPercent ?? 0}
                  onChange={(e) => updateCriteria("solidsPercent", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                  max={100}
                />
              </div>

              {(criteria.solidsPercent ?? 0) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Particle Size (mm)
                  </label>
                  <input
                    type="number"
                    value={criteria.particleSizeMm ?? 0}
                    onChange={(e) =>
                      updateCriteria("particleSizeMm", parseFloat(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    min={0}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === "priorities" && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-900">Selection Priorities</h3>
            <p className="text-sm text-gray-600">
              Select what matters most for your application (optional)
            </p>

            <div className="space-y-3">
              {PRIORITY_OPTIONS.map((priority) => {
                const priorityValue = priority.value as
                  | "efficiency"
                  | "cost"
                  | "reliability"
                  | "maintenance"
                  | "footprint";
                const isSelected = criteria.priorities?.includes(priorityValue);
                return (
                  <button
                    key={priority.value}
                    onClick={() => togglePriority(priorityValue)}
                    className={`w-full p-4 rounded-lg border text-left transition-all flex items-center ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                        isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
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
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{priority.label}</div>
                      <div className="text-sm text-gray-500">{priority.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === "results" && result && (
          <div className="space-y-6">
            <h3 className="text-base font-medium text-gray-900">Recommended Pump Types</h3>

            {result.applicationNotes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Application Notes</h4>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  {result.applicationNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {result.recommendedTypes.map((rec, idx) => (
                <div
                  key={rec.type.value}
                  className={`border rounded-lg p-4 ${
                    idx === 0 ? "border-green-500 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-semibold ${idx === 0 ? "text-green-700" : "text-gray-900"}`}
                        >
                          {rec.type.label}
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Best Match
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            rec.type.category === "centrifugal"
                              ? "bg-blue-100 text-blue-700"
                              : rec.type.category === "positive_displacement"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {rec.type.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.type.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{rec.score}</div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>
                  </div>

                  {rec.reasons.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {rec.reasons.map((reason, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs rounded bg-green-100 text-green-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rec.warnings.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {rec.warnings.map((warning, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700"
                          >
                            {warning}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Efficiency:</span>
                      <span className="ml-1 font-medium">
                        {rec.type.efficiencyRange.min}-{rec.type.efficiencyRange.max}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Maintenance:</span>
                      <span className="ml-1 font-medium">{rec.type.maintenanceLevel}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Capital Cost:</span>
                      <span className="ml-1 font-medium">{rec.type.capitalCost}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Operating Cost:</span>
                      <span className="ml-1 font-medium">{rec.type.operatingCost}</span>
                    </div>
                  </div>

                  {onSelectPumpType && (
                    <button
                      onClick={() => onSelectPumpType(rec.type.value)}
                      className="mt-3 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Select This Pump Type
                    </button>
                  )}
                </div>
              ))}
            </div>

            {result.considerations.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Additional Considerations
                </h4>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  {result.considerations.map((con, idx) => (
                    <li key={idx}>{con}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={stepIndex === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentStep === "results" ? (
          <button
            onClick={handleComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Complete
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

export default PumpSelectionWizard;
