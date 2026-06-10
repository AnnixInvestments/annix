"use client";

import {
  BASEPLATE_OPTIONS,
  CERTIFICATION_OPTIONS,
  CONNECTION_OPTIONS,
  CONSTRUCTION_SPECS,
  COUPLING_OPTIONS,
  FLUID_SPECS,
  INSTRUMENTATION_OPTIONS,
  MATERIAL_OPTIONS,
  MOTOR_SPECS,
  PUMP_SIZE_OPTIONS,
  PUMP_SPARE_PARTS,
  SPARE_PARTS_KITS,
} from "@annix/product-data/pumps";
import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import type { PumpFormLogic } from "./usePumpFormLogic";

const PUMP_CATEGORY_OPTIONS = [
  { value: "centrifugal", label: "Centrifugal Pumps" },
  { value: "positive_displacement", label: "Positive Displacement" },
  { value: "specialty", label: "Specialty Pumps" },
];

const PumpServiceTypeFieldsInner = ({ logic }: { logic: PumpFormLogic }) => {
  const {
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
    hazardousArea,
    impellerMaterial,
    isAbrasive,
    isCorrosive,
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
    removeSparePart,
    rentalDurationDays,
    sealPlan,
    sealType,
    selectedSparePartCategory,
    serviceType,
    setSelectedSparePartCategory,
    setShowMaterialChecker,
    setShowSelectionWizard,
    shaftMaterial,
    solidsContent,
    solidsSize,
    spareParts,
    specificGravity,
    suctionHead,
    suctionSize,
    temperatureInstruments,
    toggleCertification,
    totalHead,
    updateSparePartQuantity,
    updateSpec,
    vibrationInstruments,
    viscosity,
    voltage,
    setShowApi610Wizard,
  } = logic;
  if (serviceType === "new_pump") {
    const rawOptions = FLUID_SPECS.find((f) => f.name === "fluidType")?.options;
    const rawOptions2 = CONSTRUCTION_SPECS.find((s) => s.name === "sealPlan")?.options;
    const rawOptions3 = MOTOR_SPECS.find((s) => s.name === "motorType")?.options;
    const rawOptions4 = MOTOR_SPECS.find((s) => s.name === "voltage")?.options;
    const rawOptions5 = MOTOR_SPECS.find((s) => s.name === "frequency")?.options;
    const rawOptions6 = MOTOR_SPECS.find((s) => s.name === "motorEfficiency")?.options;
    const rawOptions7 = MOTOR_SPECS.find((s) => s.name === "enclosure")?.options;
    const rawOptions8 = MOTOR_SPECS.find((s) => s.name === "hazardousArea")?.options;
    return (
      <>
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Pump Selection</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSelectionWizard(true)}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Selection Wizard
              </button>
              <button
                type="button"
                onClick={() => setShowApi610Wizard(true)}
                className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                API 610 Wizard
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pump Category</label>
              <Select
                value={pumpCategory}
                onChange={(value) => {
                  updateSpec("pumpCategory", value);
                  updateSpec("pumpType", "");
                }}
                options={PUMP_CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pump Type</label>
              <Select
                value={pumpType}
                onChange={(value) => updateSpec("pumpType", value)}
                options={[
                  { value: "", label: "Select pump type..." },
                  ...filteredPumpTypes.map((p) => ({ value: p.value, label: p.label })),
                ]}
              />
            </div>
          </div>
          {pumpType && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredPumpTypes.find((p) => p.value === pumpType)?.description}
            </p>
          )}
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Performance Requirements</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flow Rate (m³/h) *
              </label>
              <input
                type="number"
                value={flowRate || ""}
                onChange={(e) => updateSpec("flowRate", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Head (m) *
              </label>
              <input
                type="number"
                value={totalHead || ""}
                onChange={(e) => updateSpec("totalHead", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NPSHa (m)</label>
              <input
                type="number"
                value={npshAvailable || ""}
                onChange={(e) => updateSpec("npshAvailable", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operating Temp (°C)
              </label>
              <input
                type="number"
                value={operatingTemp || ""}
                onChange={(e) => updateSpec("operatingTemp", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suction Head (m)
              </label>
              <input
                type="number"
                value={suctionHead || ""}
                onChange={(e) => updateSpec("suctionHead", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+ve flooded, -ve lift"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discharge Pressure (bar)
              </label>
              <input
                type="number"
                value={dischargePressure || ""}
                onChange={(e) =>
                  updateSpec("dischargePressure", parseFloat(e.target.value) || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Fluid Properties</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fluid Type *</label>
              <Select
                value={fluidType}
                onChange={(value) => updateSpec("fluidType", value)}
                options={rawOptions || []}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Gravity
              </label>
              <input
                type="number"
                step="0.01"
                value={specificGravity}
                onChange={(e) => updateSpec("specificGravity", parseFloat(e.target.value) || 1.0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Viscosity (cP)</label>
              <input
                type="number"
                value={viscosity || ""}
                onChange={(e) => updateSpec("viscosity", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solids Content (%)
              </label>
              <input
                type="number"
                value={solidsContent || ""}
                onChange={(e) => updateSpec("solidsContent", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Solids Size (mm)
              </label>
              <input
                type="number"
                value={solidsSize || ""}
                onChange={(e) => updateSpec("solidsSize", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">pH Level</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={ph || ""}
                onChange={(e) => updateSpec("ph", parseFloat(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-6 mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAbrasive}
                onChange={(e) => updateSpec("isAbrasive", e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Abrasive</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isCorrosive}
                onChange={(e) => updateSpec("isCorrosive", e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Corrosive</span>
            </label>
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Construction Materials</h4>
            <button
              type="button"
              onClick={() => setShowMaterialChecker(true)}
              className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Check Compatibility
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Casing Material *
              </label>
              <Select
                value={casingMaterial}
                onChange={(value) => updateSpec("casingMaterial", value)}
                options={MATERIAL_OPTIONS.casing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Impeller Material *
              </label>
              <Select
                value={impellerMaterial}
                onChange={(value) => updateSpec("impellerMaterial", value)}
                options={MATERIAL_OPTIONS.impeller}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shaft Material</label>
              <Select
                value={shaftMaterial}
                onChange={(value) => updateSpec("shaftMaterial", value)}
                options={MATERIAL_OPTIONS.shaft}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seal Type</label>
              <Select
                value={sealType}
                onChange={(value) => updateSpec("sealType", value)}
                options={MATERIAL_OPTIONS.seal}
              />
            </div>
          </div>
          {(sealType === "mechanical_single" ||
            sealType === "mechanical_double" ||
            sealType === "cartridge") && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seal Flush Plan
              </label>
              <Select
                value={sealPlan || ""}
                onChange={(value) => updateSpec("sealPlan", value)}
                options={[{ value: "", label: "Select plan..." }, ...(rawOptions2 || [])]}
              />
            </div>
          )}
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Connections</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suction Size</label>
              <Select
                value={suctionSize || ""}
                onChange={(value) => updateSpec("suctionSize", value)}
                options={[{ value: "", label: "Select..." }, ...PUMP_SIZE_OPTIONS]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Size</label>
              <Select
                value={dischargeSize || ""}
                onChange={(value) => updateSpec("dischargeSize", value)}
                options={[{ value: "", label: "Select..." }, ...PUMP_SIZE_OPTIONS]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection Type
              </label>
              <Select
                value={connectionType}
                onChange={(value) => updateSpec("connectionType", value)}
                options={CONNECTION_OPTIONS}
              />
            </div>
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Motor Specifications</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motor Type</label>
              <Select
                value={motorType}
                onChange={(value) => updateSpec("motorType", value)}
                options={rawOptions3 || []}
              />
            </div>
            {motorType !== "none" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motor Power (kW)
                  </label>
                  <input
                    type="number"
                    value={motorPower || ""}
                    onChange={(e) => updateSpec("motorPower", parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      calculationResults?.recommendedMotorKw
                        ? `Recommended: ${calculationResults.recommendedMotorKw}`
                        : ""
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voltage</label>
                  <Select
                    value={voltage}
                    onChange={(value) => updateSpec("voltage", value)}
                    options={rawOptions4 || []}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <Select
                    value={frequency}
                    onChange={(value) => updateSpec("frequency", value)}
                    options={rawOptions5 || []}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Efficiency Class
                  </label>
                  <Select
                    value={motorEfficiency}
                    onChange={(value) => updateSpec("motorEfficiency", value)}
                    options={rawOptions6 || []}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enclosure</label>
                  <Select
                    value={enclosure}
                    onChange={(value) => updateSpec("enclosure", value)}
                    options={rawOptions7 || []}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hazardous Area
                  </label>
                  <Select
                    value={hazardousArea}
                    onChange={(value) => updateSpec("hazardousArea", value)}
                    options={rawOptions8 || []}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frame Standard
                  </label>
                  <Select
                    value={frameStandard}
                    onChange={(value) => {
                      updateSpec("frameStandard", value);
                      updateSpec("frameSize", "");
                    }}
                    options={[
                      { value: "iec", label: "IEC (International)" },
                      { value: "nema", label: "NEMA (North America)" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frame Size</label>
                  <Select
                    value={frameSize}
                    onChange={(value) => updateSpec("frameSize", value)}
                    options={[{ value: "", label: "Select frame size..." }, ...filteredFrameSizes]}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Coupling & Drive</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupling Type</label>
              <Select
                value={couplingType}
                onChange={(value) => updateSpec("couplingType", value)}
                options={COUPLING_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupling Guard</label>
              <Select
                value={couplingGuard}
                onChange={(value) => updateSpec("couplingGuard", value)}
                options={[
                  { value: "none", label: "None" },
                  { value: "standard", label: "Standard Guard" },
                  { value: "full_enclosure", label: "Full Enclosure" },
                  { value: "mesh", label: "Mesh Guard" },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Baseplate & Mounting</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baseplate Type</label>
              <Select
                value={baseplateType}
                onChange={(value) => updateSpec("baseplateType", value)}
                options={BASEPLATE_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drain Connection
              </label>
              <Select
                value={drainConnection}
                onChange={(value) => updateSpec("drainConnection", value)}
                options={[
                  { value: "none", label: "No Drain" },
                  { value: "open_drain", label: "Open Drain" },
                  { value: "plugged_drain", label: "Plugged Drain Connection" },
                  { value: "piped_drain", label: "Piped to Collection" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grouting</label>
              <Select
                value={groutType}
                onChange={(value) => updateSpec("groutType", value)}
                options={[
                  { value: "none", label: "No Grout" },
                  { value: "cement", label: "Cement Grout" },
                  { value: "epoxy", label: "Epoxy Grout" },
                  { value: "non_shrink", label: "Non-Shrink Grout" },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Instrumentation</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pressure Instruments
              </label>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENTATION_OPTIONS.pressure.map((inst) => (
                  <button
                    key={inst.value}
                    type="button"
                    onClick={() => {
                      const newInsts = pressureInstruments.includes(inst.value)
                        ? pressureInstruments.filter((i: string) => i !== inst.value)
                        : [...pressureInstruments, inst.value];
                      updateSpec("pressureInstruments", newInsts);
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      pressureInstruments.includes(inst.value)
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    } border`}
                  >
                    {inst.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flow Instruments
              </label>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENTATION_OPTIONS.flow.map((inst) => (
                  <button
                    key={inst.value}
                    type="button"
                    onClick={() => {
                      const newInsts = flowInstruments.includes(inst.value)
                        ? flowInstruments.filter((i: string) => i !== inst.value)
                        : [...flowInstruments, inst.value];
                      updateSpec("flowInstruments", newInsts);
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      flowInstruments.includes(inst.value)
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    } border`}
                  >
                    {inst.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature Instruments
              </label>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENTATION_OPTIONS.temperature.map((inst) => (
                  <button
                    key={inst.value}
                    type="button"
                    onClick={() => {
                      const newInsts = temperatureInstruments.includes(inst.value)
                        ? temperatureInstruments.filter((i: string) => i !== inst.value)
                        : [...temperatureInstruments, inst.value];
                      updateSpec("temperatureInstruments", newInsts);
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      temperatureInstruments.includes(inst.value)
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    } border`}
                  >
                    {inst.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vibration Monitoring
              </label>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENTATION_OPTIONS.vibration.map((inst) => (
                  <button
                    key={inst.value}
                    type="button"
                    onClick={() => {
                      const newInsts = vibrationInstruments.includes(inst.value)
                        ? vibrationInstruments.filter((i: string) => i !== inst.value)
                        : [...vibrationInstruments, inst.value];
                      updateSpec("vibrationInstruments", newInsts);
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      vibrationInstruments.includes(inst.value)
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    } border`}
                  >
                    {inst.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Certifications</h4>
          <div className="flex flex-wrap gap-2">
            {CERTIFICATION_OPTIONS.map((cert) => (
              <button
                key={cert.value}
                type="button"
                onClick={() => toggleCertification(cert.value)}
                className={`px-3 py-1 rounded-full text-sm ${
                  certifications.includes(cert.value)
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-gray-100 text-gray-600 border-gray-300"
                } border`}
              >
                {cert.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (serviceType === "spare_parts") {
    return (
      <>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Existing Pump Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pump Make/Model
              </label>
              <input
                type="text"
                value={existingPumpModel}
                onChange={(e) => updateSpec("existingPumpModel", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. KSB Etanorm 100-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={existingPumpSerial}
                onChange={(e) => updateSpec("existingPumpSerial", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Spare Parts Selection</h4>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quick Add: Spare Parts Kit
            </label>
            <div className="flex gap-2">
              {SPARE_PARTS_KITS.map((kit) => (
                <button
                  key={kit.value}
                  type="button"
                  onClick={() => addSparePartsKit(kit.value)}
                  className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
                >
                  + {kit.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Category</label>
              <Select
                value={selectedSparePartCategory || ""}
                onChange={(value) => setSelectedSparePartCategory(value || null)}
                options={[
                  { value: "", label: "Select category..." },
                  ...PUMP_SPARE_PARTS.map((cat) => ({ value: cat.value, label: cat.label })),
                ]}
              />
            </div>
            {selectedSparePartCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part</label>
                <Select
                  value=""
                  onChange={(value) => {
                    const category = PUMP_SPARE_PARTS.find(
                      (c) => c.value === selectedSparePartCategory,
                    );
                    const part = category?.parts.find((p) => p.value === value);
                    if (part) {
                      addSparePart(part.value, part.label);
                    }
                  }}
                  options={[
                    { value: "", label: "Select part to add..." },
                    ...(PUMP_SPARE_PARTS.find(
                      (c) => c.value === selectedSparePartCategory,
                    )?.parts.map((p) => ({
                      value: p.value,
                      label: p.label,
                    })) || []),
                  ]}
                />
              </div>
            )}
          </div>

          {spareParts.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Part</th>
                    <th className="px-3 py-2 text-center w-24">Qty</th>
                    <th className="px-3 py-2 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {spareParts.map((part: any, index: number) => (
                    <tr key={index}>
                      <td className="px-3 py-2">{part.label}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) =>
                            updateSparePartQuantity(index, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-full px-2 py-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeSparePart(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  if (serviceType === "repair_service") {
    return (
      <>
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Pump Details for Repair</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pump Make/Model *
              </label>
              <input
                type="text"
                value={existingPumpModel}
                onChange={(e) => updateSpec("existingPumpModel", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. KSB Etanorm 100-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={existingPumpSerial}
                onChange={(e) => updateSpec("existingPumpSerial", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Repair Scope</h4>
          <p className="text-sm text-gray-500 mb-3">
            Describe the issues or required repairs in the notes section below. Attach photos or
            inspection reports using the datasheet upload.
          </p>
        </div>
      </>
    );
  }

  if (serviceType === "rental") {
    return (
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium text-gray-900 mb-3">Rental Requirements</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pump Category</label>
            <Select
              value={pumpCategory}
              onChange={(value) => updateSpec("pumpCategory", value)}
              options={PUMP_CATEGORY_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pump Type</label>
            <Select
              value={pumpType}
              onChange={(value) => updateSpec("pumpType", value)}
              options={[
                { value: "", label: "Select pump type..." },
                ...filteredPumpTypes.map((p) => ({ value: p.value, label: p.label })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rental Duration (days) *
            </label>
            <input
              type="number"
              min="1"
              value={rentalDurationDays}
              onChange={(e) => updateSpec("rentalDurationDays", parseInt(e.target.value, 10) || 7)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Flow Rate (m³/h)
            </label>
            <input
              type="number"
              value={flowRate || ""}
              onChange={(e) => updateSpec("flowRate", parseFloat(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Head (m)
            </label>
            <input
              type="number"
              value={totalHead || ""}
              onChange={(e) => updateSpec("totalHead", parseFloat(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export const PumpServiceTypeFields = memo(PumpServiceTypeFieldsInner);
