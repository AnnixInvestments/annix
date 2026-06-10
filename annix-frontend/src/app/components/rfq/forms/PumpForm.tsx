"use client";

import { PUMPS_MODULE } from "@annix/product-data/pumps";
import {
  Api610SelectionWizard,
  MaterialCompatibilityChecker,
  PumpSelectionWizard,
} from "@/app/components/pumps";
import {
  formatNotesForDisplay,
  SmartNotesDropdown,
} from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { Select } from "@/app/components/ui/Select";
import { PumpServiceTypeFields } from "./pump/PumpServiceTypeFields";
import { usePumpFormLogic } from "./pump/usePumpFormLogic";

export interface PumpFormProps {
  entry: any;
  index: number;
  entriesCount: number;
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  requiredProducts?: string[];
}

const SERVICE_TYPE_OPTIONS = PUMPS_MODULE.categories.map((c) => ({
  value: c.value,
  label: c.label,
}));

const PUMP_CATEGORY_OPTIONS = [
  { value: "centrifugal", label: "Centrifugal Pumps" },
  { value: "positive_displacement", label: "Positive Displacement" },
  { value: "specialty", label: "Specialty Pumps" },
];

export default function PumpForm(props: PumpFormProps) {
  const {
    entry,
    index: _index,
    entriesCount: _entriesCount,
    globalSpecs: _globalSpecs,
    masterData: _masterData,
    onUpdateEntry,
    onRemoveEntry,
    generateItemDescription,
    requiredProducts: _requiredProducts = [],
  } = props;
  const logic = usePumpFormLogic(props);
  const {
    showApi610Wizard,
    setShowApi610Wizard,
    addSparePart,
    addSparePartsKit,
    baseplateType,
    calculationResults,
    casingMaterial,
    certifications,
    connectionType,
    couplingGuard,
    couplingType,
    dischargePressure,
    dischargeSize,
    drainConnection,
    enclosure,
    existingPumpModel,
    existingPumpSerial,
    filteredFrameSizes,
    filteredPumpTypes,
    flowInstruments,
    flowRate,
    fluidType,
    frameSize,
    frameStandard,
    frequency,
    groutType,
    handleApi610Complete,
    handleSelectPumpType,
    handleWizardComplete,
    hazardousArea,
    impellerMaterial,
    isAbrasive,
    isCorrosive,
    markupPercentage,
    motorEfficiency,
    motorPower,
    motorType,
    npshAvailable,
    operatingTemp,
    ph,
    pressureInstruments,
    pumpCategory,
    pumpType,
    quantity,
    rawBaseplateType,
    rawCasingMaterial,
    rawCertifications,
    rawConnectionType,
    rawCouplingGuard,
    rawCouplingType,
    rawDrainConnection,
    rawEnclosure,
    rawExistingPumpModel,
    rawExistingPumpSerial,
    rawFlowInstruments,
    rawFluidType2,
    rawFrameSize,
    rawFrameStandard,
    rawFrequency,
    rawGroutType,
    rawHazardousArea,
    rawImpellerMaterial,
    rawIsAbrasive,
    rawIsCorrosive,
    rawMarkupPercentage,
    rawMotorEfficiency,
    rawMotorType,
    rawPressureInstruments,
    rawPumpCategory,
    rawPumpType,
    rawQuantityValue,
    rawRentalDurationDays,
    rawSealType,
    rawServiceType,
    rawShaftMaterial,
    rawSpareParts,
    rawSpecificGravity,
    rawSupplierReference,
    rawTemperatureInstruments,
    rawVibrationInstruments,
    rawVoltage,
    removeSparePart,
    rentalDurationDays,
    sealPlan,
    sealType,
    selectedSparePartCategory,
    serviceType,
    setCalculationResults,
    setSelectedSparePartCategory,
    setShowMaterialChecker,
    setShowSelectionWizard,
    setValidationResult,
    shaftMaterial,
    showMaterialChecker,
    showSelectionWizard,
    solidsContent,
    solidsSize,
    spareParts,
    specificGravity,
    suctionHead,
    suctionSize,
    supplierReference,
    temperatureInstruments,
    toggleCertification,
    totalHead,
    unitCostFromSupplier,
    updateSparePartQuantity,
    updateSpec,
    validationResult,
    vibrationInstruments,
    viscosity,
    voltage,
  } = logic;

  const renderValidationFeedback = () => {
    if (!validationResult) return null;
    if (validationResult.errors.length === 0 && validationResult.warnings.length === 0) return null;

    return (
      <div className="space-y-2">
        {validationResult.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Missing Required Fields</p>
                <ul className="mt-1 text-sm text-red-700 space-y-0.5">
                  {validationResult.errors.map((error, idx) => (
                    <li key={idx}>• {error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        {validationResult.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
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
              <div>
                <p className="text-sm font-medium text-amber-800">Warnings</p>
                <ul className="mt-1 text-sm text-amber-700 space-y-0.5">
                  {validationResult.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCalculationResults = () => {
    if (!calculationResults) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Calculation Results</h4>
        {serviceType === "new_pump" && (
          <div className="space-y-2 text-sm">
            {calculationResults.hydraulicPowerKw && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hydraulic Power:</span>
                <span className="font-medium">{calculationResults.hydraulicPowerKw} kW</span>
              </div>
            )}
            {calculationResults.estimatedShaftPowerKw && (
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Shaft Power:</span>
                <span className="font-medium">{calculationResults.estimatedShaftPowerKw} kW</span>
              </div>
            )}
            {calculationResults.recommendedMotorKw && (
              <div className="flex justify-between">
                <span className="text-gray-600">Recommended Motor:</span>
                <span className="font-medium text-blue-700">
                  {calculationResults.recommendedMotorKw} kW
                </span>
              </div>
            )}
            {calculationResults.flowRangeRecommendation && (
              <p className="text-xs text-gray-500 mt-2">
                {calculationResults.flowRangeRecommendation}
              </p>
            )}
            {calculationResults.totalPrice && (
              <>
                <hr className="my-2 border-blue-200" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">
                    R {calculationResults.unitPrice?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Discount ({calculationResults.discountPercent}%):
                  </span>
                  <span className="font-medium text-green-600">
                    - R {calculationResults.discountAmount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span className="text-blue-700">
                    R {calculationResults.totalPrice?.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
        {serviceType === "rental" && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rental ({rentalDurationDays} days):</span>
              <span className="font-medium">
                R {calculationResults.rentalCost?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery (est.):</span>
              <span className="font-medium">
                R {calculationResults.deliveryCost?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total:</span>
              <span className="text-blue-700">
                R {calculationResults.totalCost?.toLocaleString()}
              </span>
            </div>
          </div>
        )}
        {(serviceType === "spare_parts" || serviceType === "repair_service") &&
          calculationResults.totalCost && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Unit Cost:</span>
                <span className="font-medium">
                  R {calculationResults.unitCost?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Markup:</span>
                <span className="font-medium">
                  R {calculationResults.markupAmount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total:</span>
                <span className="text-blue-700">
                  R {calculationResults.totalCost?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
      </div>
    );
  };

  const rawSelectedNotes = entry.selectedNotes;

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="pump"
        showSplitToggle={true}
        formContent={
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">Pump / Pump Parts Request</h3>
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type *
                </label>
                <Select
                  value={serviceType}
                  onChange={(value) => updateSpec("serviceType", value)}
                  options={SERVICE_TYPE_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => updateSpec("quantityValue", parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <PumpServiceTypeFields logic={logic} />

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Pricing</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Reference
                  </label>
                  <input
                    type="text"
                    value={supplierReference}
                    onChange={(e) => updateSpec("supplierReference", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {serviceType === "rental" ? "Daily Rate (R)" : "Cost from Supplier (R)"}
                  </label>
                  <input
                    type="number"
                    value={unitCostFromSupplier || ""}
                    onChange={(e) =>
                      updateSpec("unitCostFromSupplier", parseFloat(e.target.value) || null)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
                  <input
                    type="number"
                    value={markupPercentage}
                    onChange={(e) =>
                      updateSpec("markupPercentage", parseFloat(e.target.value) || 15)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <SmartNotesDropdown
                selectedNotes={rawSelectedNotes || []}
                onNotesChange={(notes: string[]) =>
                  onUpdateEntry(entry.id, {
                    selectedNotes: notes,
                    notes: formatNotesForDisplay(notes),
                  })
                }
                placeholder="Select quality/inspection requirements..."
              />
            </div>

            {renderValidationFeedback()}
          </div>
        }
        previewContent={
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Item Preview</h4>
            <p className="text-sm text-gray-700">{generateItemDescription(entry)}</p>
          </div>
        }
        calcResultsContent={renderCalculationResults()}
      />
      {showSelectionWizard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => setShowSelectionWizard(false)}
            />
            <div className="relative bg-white rounded-lg max-w-3xl w-full shadow-xl">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setShowSelectionWizard(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <PumpSelectionWizard
                onComplete={handleWizardComplete}
                onSelectPumpType={handleSelectPumpType}
              />
            </div>
          </div>
        </div>
      )}
      {showApi610Wizard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => setShowApi610Wizard(false)}
            />
            <div className="relative bg-white rounded-lg max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => setShowApi610Wizard(false)}
                  className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <Api610SelectionWizard
                onComplete={handleApi610Complete}
                initialCriteria={{
                  flowRateM3h: flowRate || 100,
                  headM: totalHead || 50,
                  temperatureC: operatingTemp || 25,
                  pressureBar: dischargePressure || 10,
                }}
              />
            </div>
          </div>
        </div>
      )}
      {showMaterialChecker && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => setShowMaterialChecker(false)}
            />
            <div className="relative bg-white rounded-lg max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => setShowMaterialChecker(false)}
                  className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <MaterialCompatibilityChecker
                onCompatibilityResult={(result) => {
                  if (result.recommendedMaterial) {
                    const materialMap: Record<string, string> = {
                      "Carbon Steel": "cast_iron",
                      "304 Stainless Steel": "ss_304",
                      "316 Stainless Steel": "ss_316",
                      "316L Stainless Steel": "ss_316l",
                      "Duplex 2205": "duplex_2205",
                      "Super Duplex 2507": "super_duplex",
                      "Alloy 20": "alloy_20",
                      "Hastelloy C-276": "hastelloy_c",
                      "Monel 400": "monel",
                      Titanium: "titanium",
                    };
                    const rawRecommendedMaterial = materialMap[result.recommendedMaterial];
                    const materialValue = rawRecommendedMaterial || "ss_316";
                    updateSpec("casingMaterial", materialValue);
                    updateSpec("impellerMaterial", materialValue);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
