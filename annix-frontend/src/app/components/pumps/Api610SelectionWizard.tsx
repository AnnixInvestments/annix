"use client";

import { useMemo, useState } from "react";
import {
  Api610PumpCategory,
  Api610SelectionCriteria,
  Api610SelectionResult,
  api610CategoryDescription,
  selectApi610PumpType,
} from "@/app/lib/config/pumps/api610Classification";

interface Api610SelectionWizardProps {
  onComplete?: (result: Api610SelectionResult, criteria: Api610SelectionCriteria) => void;
  initialCriteria?: Partial<Api610SelectionCriteria>;
}

type WizardStep = "operating-conditions" | "installation" | "preferences" | "results";

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  {
    id: "operating-conditions",
    title: "Operating Conditions",
    description: "Flow, head, temperature, and pressure",
  },
  { id: "installation", title: "Installation", description: "Layout and space requirements" },
  { id: "preferences", title: "Preferences", description: "Fluid type and maintenance access" },
  { id: "results", title: "Results", description: "Recommended pump types" },
];

const FLUID_TYPES: {
  value: Api610SelectionCriteria["fluidType"];
  label: string;
  description: string;
}[] = [
  { value: "hydrocarbon", label: "Hydrocarbon", description: "Oil, gas, refined products" },
  { value: "water", label: "Water", description: "Cooling water, process water, boiler feed" },
  { value: "chemical", label: "Chemical", description: "Acids, caustics, solvents" },
  { value: "slurry", label: "Slurry", description: "Solids-laden fluids" },
];

const INSTALLATION_TYPES: {
  value: Api610SelectionCriteria["installationType"];
  label: string;
  description: string;
}[] = [
  { value: "horizontal", label: "Horizontal", description: "Standard floor-mounted installation" },
  { value: "vertical", label: "Vertical", description: "Pit or can-mounted vertical pumps" },
  { value: "inline", label: "Inline", description: "Pipe-mounted, space-saving design" },
];

const MAINTENANCE_ACCESS: {
  value: Api610SelectionCriteria["maintenanceAccess"];
  label: string;
  description: string;
}[] = [
  { value: "easy", label: "Easy Access", description: "Full crane access, open area" },
  { value: "moderate", label: "Moderate Access", description: "Limited overhead access" },
  { value: "difficult", label: "Difficult Access", description: "Tight space, minimal access" },
];

export function Api610SelectionWizard({ onComplete, initialCriteria }: Api610SelectionWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("operating-conditions");
  const [criteria, setCriteria] = useState<Api610SelectionCriteria>({
    flowRateM3h: initialCriteria?.flowRateM3h ?? 100,
    headM: initialCriteria?.headM ?? 50,
    temperatureC: initialCriteria?.temperatureC ?? 20,
    pressureBar: initialCriteria?.pressureBar ?? 10,
    powerKw: initialCriteria?.powerKw ?? 50,
    category: initialCriteria?.category,
    fluidType: initialCriteria?.fluidType,
    installationType: initialCriteria?.installationType ?? "horizontal",
    spaceConstrained: initialCriteria?.spaceConstrained ?? false,
    maintenanceAccess: initialCriteria?.maintenanceAccess ?? "moderate",
  });

  const [expandedType, setExpandedType] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const result = useMemo(() => {
    return selectApi610PumpType(criteria);
  }, [criteria]);

  const handleCriteriaChange = <K extends keyof Api610SelectionCriteria>(
    key: K,
    value: Api610SelectionCriteria[K],
  ) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
    if (currentStep === "preferences" && onComplete) {
      onComplete(result, criteria);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleStepClick = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const scoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBgColor = (score: number): string => {
    if (score >= 80) return "bg-green-100 border-green-200";
    if (score >= 60) return "bg-yellow-100 border-yellow-200";
    return "bg-red-100 border-red-200";
  };

  const categoryColor = (category: Api610PumpCategory): string => {
    const colors: Record<Api610PumpCategory, string> = {
      OH: "bg-blue-100 text-blue-800",
      BB: "bg-purple-100 text-purple-800",
      VS: "bg-emerald-100 text-emerald-800",
    };
    return colors[category];
  };

  const renderOperatingConditions = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Flow Rate (m³/h)</label>
          <input
            type="number"
            value={criteria.flowRateM3h}
            onChange={(e) => handleCriteriaChange("flowRateM3h", parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            min={0}
            step={10}
          />
          <p className="text-xs text-gray-500 mt-1">Required volumetric flow rate</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Head (m)</label>
          <input
            type="number"
            value={criteria.headM}
            onChange={(e) => handleCriteriaChange("headM", parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            min={0}
            step={5}
          />
          <p className="text-xs text-gray-500 mt-1">Total dynamic head required</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operating Temperature (°C)
          </label>
          <input
            type="number"
            value={criteria.temperatureC}
            onChange={(e) => handleCriteriaChange("temperatureC", parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            min={-50}
            max={500}
            step={10}
          />
          <p className="text-xs text-gray-500 mt-1">Pumping temperature of fluid</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discharge Pressure (bar)
          </label>
          <input
            type="number"
            value={criteria.pressureBar}
            onChange={(e) => handleCriteriaChange("pressureBar", parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            min={0}
            step={5}
          />
          <p className="text-xs text-gray-500 mt-1">Maximum casing pressure</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Power (kW)
          </label>
          <input
            type="number"
            value={criteria.powerKw}
            onChange={(e) => handleCriteriaChange("powerKw", parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            min={0}
            step={10}
          />
          <p className="text-xs text-gray-500 mt-1">Approximate shaft power required</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Category (Optional)
          </label>
          <select
            value={criteria.category ?? ""}
            onChange={(e) =>
              handleCriteriaChange(
                "category",
                (e.target.value || undefined) as Api610PumpCategory | undefined,
              )
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any Category</option>
            <option value="OH">OH - Overhung</option>
            <option value="BB">BB - Between Bearings</option>
            <option value="VS">VS - Vertically Suspended</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Leave blank for automatic selection</p>
        </div>
      </div>
    </div>
  );

  const renderInstallation = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Installation Type</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INSTALLATION_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleCriteriaChange("installationType", type.value)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                criteria.installationType === type.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-sm text-gray-500 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={criteria.spaceConstrained ?? false}
            onChange={(e) => handleCriteriaChange("spaceConstrained", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
          />
          <div>
            <span className="font-medium text-gray-900">Space Constrained Installation</span>
            <p className="text-sm text-gray-500">Limited footprint or headroom available</p>
          </div>
        </label>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-2">Installation Guide</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>
            <strong>Horizontal:</strong> Most common, use OH or BB types
          </li>
          <li>
            <strong>Vertical:</strong> For pit/sump applications, use VS types
          </li>
          <li>
            <strong>Inline:</strong> For pipe-mounted installations, OH3/OH4 preferred
          </li>
        </ul>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Fluid Type</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FLUID_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleCriteriaChange("fluidType", type.value)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                criteria.fluidType === type.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-sm text-gray-500 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Maintenance Access</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MAINTENANCE_ACCESS.map((access) => (
            <button
              key={access.value}
              type="button"
              onClick={() => handleCriteriaChange("maintenanceAccess", access.value)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                criteria.maintenanceAccess === access.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">{access.label}</div>
              <div className="text-sm text-gray-500 mt-1">{access.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColor(result.categoryRecommendation)}`}
          >
            {result.categoryRecommendation}
          </div>
          <div>
            <h4 className="font-medium text-blue-900">Recommended Category</h4>
            <p className="text-sm text-blue-700">
              {api610CategoryDescription(result.categoryRecommendation)}
            </p>
          </div>
        </div>
      </div>

      {result.designNotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 mb-2">Design Notes</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            {result.designNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Suitable Pump Types</h4>
        <div className="space-y-3">
          {result.suitableTypes.map((item, idx) => (
            <div
              key={item.type.code}
              className={`border rounded-lg overflow-hidden ${scoreBgColor(item.score)}`}
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedType(expandedType === item.type.code ? null : item.type.code)
                }
                className="w-full p-4 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor(item.type.category)}`}
                      >
                        {item.type.category}
                      </span>
                      <span className="font-medium text-gray-900">{item.type.code}</span>
                      <span className="text-gray-600">- {item.type.name}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.type.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${scoreColor(item.score)}`}>
                    {item.score}%
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedType === item.type.code ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {expandedType === item.type.code && (
                <div className="border-t border-gray-200 p-4 bg-white space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Configuration</h5>
                      <p className="text-sm text-gray-600">{item.type.configuration}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Bearing Arrangement
                      </h5>
                      <p className="text-sm text-gray-600">{item.type.bearingArrangement}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Seal Chamber</h5>
                      <p className="text-sm text-gray-600">{item.type.sealChamber}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Impeller Type</h5>
                      <p className="text-sm text-gray-600">{item.type.impellerType}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-xs text-gray-500">Max Temp</div>
                      <div className="font-medium">
                        {item.type.operatingLimits.maxTemperatureC}°C
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-xs text-gray-500">Max Pressure</div>
                      <div className="font-medium">
                        {item.type.operatingLimits.maxPressureBar} bar
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-xs text-gray-500">Max Power</div>
                      <div className="font-medium">{item.type.operatingLimits.maxPowerKw} kW</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-xs text-gray-500">Max Speed</div>
                      <div className="font-medium">{item.type.operatingLimits.maxSpeedRpm} RPM</div>
                    </div>
                  </div>

                  {item.reasons.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-green-700 mb-2">
                        Advantages for This Application
                      </h5>
                      <ul className="text-sm text-green-600 space-y-1">
                        {item.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.warnings.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-amber-700 mb-2">Warnings</h5>
                      <ul className="text-sm text-amber-600 space-y-1">
                        {item.warnings.map((warning, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Typical Applications</h5>
                    <div className="flex flex-wrap gap-2">
                      {item.type.typicalApplications.map((app, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">General Advantages</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {item.type.advantages.slice(0, 3).map((adv, i) => (
                          <li key={i}>• {adv}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Limitations</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {item.type.limitations.slice(0, 3).map((lim, i) => (
                          <li key={i}>• {lim}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-3">Selection Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Flow Rate:</span>
            <span className="ml-2 font-medium">{criteria.flowRateM3h} m³/h</span>
          </div>
          <div>
            <span className="text-gray-500">Head:</span>
            <span className="ml-2 font-medium">{criteria.headM} m</span>
          </div>
          <div>
            <span className="text-gray-500">Temperature:</span>
            <span className="ml-2 font-medium">{criteria.temperatureC}°C</span>
          </div>
          <div>
            <span className="text-gray-500">Pressure:</span>
            <span className="ml-2 font-medium">{criteria.pressureBar} bar</span>
          </div>
          <div>
            <span className="text-gray-500">Power:</span>
            <span className="ml-2 font-medium">{criteria.powerKw} kW</span>
          </div>
          <div>
            <span className="text-gray-500">Installation:</span>
            <span className="ml-2 font-medium capitalize">
              {criteria.installationType ?? "Not specified"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case "operating-conditions":
        return renderOperatingConditions();
      case "installation":
        return renderInstallation();
      case "preferences":
        return renderPreferences();
      case "results":
        return renderResults();
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900">API 610 Pump Type Selection</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select the appropriate API 610 pump configuration based on your application requirements
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex">
          {STEPS.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
                currentStep === step.id
                  ? "border-blue-500 text-blue-600"
                  : idx < currentStepIndex
                    ? "border-transparent text-gray-900 hover:text-blue-600"
                    : "border-transparent text-gray-400"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                    currentStep === step.id
                      ? "bg-blue-500 text-white"
                      : idx < currentStepIndex
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {idx < currentStepIndex ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </span>
                <span className="hidden md:inline text-sm font-medium">{step.title}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">{renderStep()}</div>

      <div className="border-t border-gray-200 p-4 flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            currentStepIndex === 0
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Back
        </button>

        {currentStep !== "results" && (
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            {currentStep === "preferences" ? "View Results" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}

export default Api610SelectionWizard;
