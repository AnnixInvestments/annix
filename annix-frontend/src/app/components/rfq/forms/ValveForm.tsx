"use client";

import { useEffect, useMemo, useState } from "react";
import { SmartNotesDropdown } from "@/app/components/rfq/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/SplitPaneLayout";
import { Select } from "@/app/components/ui/Select";
import {
  ACTUATOR_TYPE_OPTIONS,
  BODY_MATERIAL_OPTIONS,
  CONNECTION_OPTIONS,
  CRYOGENIC_SERVICE_OPTIONS,
  calculateRequiredActuatorTorque,
  EXTENDED_BONNET_OPTIONS,
  FIRE_SAFE_STANDARDS,
  FUGITIVE_EMISSIONS_OPTIONS,
  findValveTorque,
  PRESSURE_CLASS_OPTIONS,
  SEAT_LEAKAGE_CLASS_OPTIONS,
  SEAT_MATERIAL_OPTIONS,
  TRIM_MATERIAL_OPTIONS,
  VALVE_CERTIFICATIONS,
  VALVE_SIZE_OPTIONS,
} from "@/app/lib/config/valves-instruments/valveSpecifications";
import {
  getValveByValue,
  VALVE_TYPES,
  ValveCategory,
} from "@/app/lib/config/valves-instruments/valveTypes";

export interface ValveFormProps {
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

const VALVE_CATEGORIES: { value: ValveCategory | "all"; label: string }[] = [
  { value: "all", label: "All Valves" },
  { value: "isolation", label: "Isolation Valves" },
  { value: "control", label: "Control Valves" },
  { value: "check", label: "Check Valves" },
  { value: "safety", label: "Safety Valves" },
  { value: "specialty", label: "Specialty Valves" },
];

const PORT_TYPE_OPTIONS = [
  { value: "full_port", label: "Full Port/Full Bore" },
  { value: "reduced_port", label: "Reduced Port/Standard Bore" },
  { value: "v_port", label: "V-Port (Control)" },
];

const VOLTAGE_OPTIONS = [
  { value: "24vdc", label: "24V DC" },
  { value: "110vac", label: "110V AC" },
  { value: "220vac", label: "220V AC" },
  { value: "380vac", label: "380V AC" },
];

const FAIL_POSITION_OPTIONS = [
  { value: "fail_open", label: "Fail Open" },
  { value: "fail_close", label: "Fail Close" },
  { value: "fail_last", label: "Fail Last Position" },
];

const POSITIONER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "pneumatic", label: "Pneumatic (3-15 psi)" },
  { value: "electro_pneumatic", label: "Electro-Pneumatic (4-20mA)" },
  { value: "smart", label: "Smart Positioner (HART)" },
  { value: "foundation", label: "Foundation Fieldbus" },
];

const HAZARDOUS_AREA_OPTIONS = [
  { value: "none", label: "Non-Hazardous" },
  { value: "zone_1", label: "Zone 1 (Gas)" },
  { value: "zone_2", label: "Zone 2 (Gas)" },
  { value: "zone_21", label: "Zone 21 (Dust)" },
  { value: "zone_22", label: "Zone 22 (Dust)" },
];

export default function ValveForm({
  entry,
  index: _index,
  entriesCount: _entriesCount,
  globalSpecs,
  masterData: _masterData,
  onUpdateEntry,
  onRemoveEntry,
  generateItemDescription,
  requiredProducts: _requiredProducts = [],
}: ValveFormProps) {
  const [categoryFilter, setCategoryFilter] = useState<ValveCategory | "all">("all");
  const [calculationResults, setCalculationResults] = useState<any>(null);

  const valveType = entry.specs?.valveType || "";
  const size = entry.specs?.size || "";
  const pressureClass = entry.specs?.pressureClass || "";
  const connectionType = entry.specs?.connectionType || "";
  const bodyMaterial = entry.specs?.bodyMaterial || "";
  const trimMaterial = entry.specs?.trimMaterial || "";
  const seatMaterial = entry.specs?.seatMaterial || "";
  const portType = entry.specs?.portType || "full_port";
  const actuatorType = entry.specs?.actuatorType || "manual_lever";
  const airSupply = entry.specs?.airSupply || null;
  const voltage = entry.specs?.voltage || "";
  const failPosition = entry.specs?.failPosition || "";
  const positioner = entry.specs?.positioner || "none";
  const limitSwitches = entry.specs?.limitSwitches || false;
  const solenoidValve = entry.specs?.solenoidValve || false;
  const media = entry.specs?.media || "";
  const operatingPressure = entry.specs?.operatingPressure || null;
  const operatingTemp = entry.specs?.operatingTemp || null;
  const hazardousArea = entry.specs?.hazardousArea || "none";
  const cv = entry.specs?.cv || null;
  const flowRate = entry.specs?.flowRate || null;
  const quantity = entry.specs?.quantityValue || 1;
  const seatLeakageClass = entry.specs?.seatLeakageClass || "";
  const fireSafeStandard = entry.specs?.fireSafeStandard || "";
  const cryogenicService = entry.specs?.cryogenicService || "standard";
  const fugitiveEmissions = entry.specs?.fugitiveEmissions || "none";
  const extendedBonnet = entry.specs?.extendedBonnet || "standard";
  const certifications = entry.specs?.certifications || [];
  const supplierReference = entry.specs?.supplierReference || "";
  const unitCostFromSupplier = entry.specs?.unitCostFromSupplier || null;
  const markupPercentage = entry.specs?.markupPercentage || 15;

  const selectedValve = useMemo(() => getValveByValue(valveType), [valveType]);

  const filteredValveTypes = useMemo(() => {
    if (categoryFilter === "all") {
      return VALVE_TYPES;
    }
    return VALVE_TYPES.filter((v) => v.category === categoryFilter);
  }, [categoryFilter]);

  const isActuated = useMemo(() => {
    return actuatorType && !actuatorType.startsWith("manual") && actuatorType !== "self_actuated";
  }, [actuatorType]);

  const isPneumatic = useMemo(() => {
    return actuatorType?.startsWith("pneumatic");
  }, [actuatorType]);

  const isElectric = useMemo(() => {
    return actuatorType?.startsWith("electric") || actuatorType === "solenoid";
  }, [actuatorType]);

  const isControlValve = useMemo(() => {
    return selectedValve?.category === "control";
  }, [selectedValve]);

  useEffect(() => {
    if (!size || !pressureClass || !valveType) {
      setCalculationResults(null);
      return;
    }

    const sizeDN = parseInt(size, 10);
    const torqueData = findValveTorque(valveType, sizeDN, pressureClass);

    const results: any = {
      sizeDN,
      pressureClass,
      valveType: selectedValve?.label || valveType,
    };

    if (torqueData) {
      results.torqueData = torqueData;
      results.requiredActuatorTorque = calculateRequiredActuatorTorque(torqueData);
    }

    if (unitCostFromSupplier) {
      const unitPrice = unitCostFromSupplier * (1 + markupPercentage / 100);
      const totalPrice = unitPrice * quantity;
      results.pricing = {
        unitCost: Math.round(unitPrice * 100) / 100,
        totalCost: Math.round(totalPrice * 100) / 100,
        markupAmount: Math.round((unitPrice - unitCostFromSupplier) * 100) / 100,
      };
    }

    setCalculationResults(results);
    onUpdateEntry(entry.id, { calculation: results });
  }, [valveType, size, pressureClass, unitCostFromSupplier, markupPercentage, quantity]);

  const updateSpec = (field: string, value: any) => {
    onUpdateEntry(entry.id, {
      specs: { ...entry.specs, [field]: value },
    });
  };

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="valve"
        showSplitToggle={true}
        formContent={
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1 dark:text-gray-100">
                Item Description *
              </label>
              <textarea
                value={entry.description || generateItemDescription(entry)}
                onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows={2}
                placeholder="e.g., 100NB Ball Valve, Class 150, SS316 Body, PTFE Seat"
                required
              />
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3 dark:bg-teal-900/20 dark:border-teal-700">
              <h4 className="text-sm font-bold text-teal-900 border-b border-teal-400 pb-1.5 mb-3 dark:text-teal-100 dark:border-teal-600">
                Valve Type Selection
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1 dark:text-teal-100">
                    Category Filter
                  </label>
                  <Select
                    id={`valve-category-${entry.id}`}
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value as ValveCategory | "all")}
                    options={VALVE_CATEGORIES}
                    placeholder="Filter by category"
                    className="bg-teal-50 border-teal-300 dark:bg-teal-900/30 dark:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-teal-900 mb-1 dark:text-teal-100">
                    Valve Type *
                  </label>
                  <Select
                    id={`valve-type-${entry.id}`}
                    value={valveType}
                    onChange={(value) => updateSpec("valveType", value)}
                    options={filteredValveTypes.map((v) => ({
                      value: v.value,
                      label: `${v.icon} ${v.label}`,
                      description: v.description,
                    }))}
                    placeholder="Select valve type"
                    className="bg-teal-50 border-teal-300 dark:bg-teal-900/30 dark:border-teal-600"
                  />
                </div>
              </div>
              {selectedValve && (
                <div className="mt-2 text-xs text-teal-700 dark:text-teal-300">
                  <span className="font-semibold">Motion:</span>{" "}
                  {selectedValve.motion.replace("_", " ")} |{" "}
                  <span className="font-semibold">Standard:</span>{" "}
                  {selectedValve.apiStandard || "N/A"} |{" "}
                  <span className="font-semibold">Applications:</span>{" "}
                  {selectedValve.typicalApplications.join(", ")}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 dark:bg-blue-900/20 dark:border-blue-700">
              <h4 className="text-sm font-bold text-blue-900 border-b border-blue-400 pb-1.5 mb-3 dark:text-blue-100 dark:border-blue-600">
                Sizing & Pressure
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Valve Size *
                  </label>
                  <Select
                    id={`valve-size-${entry.id}`}
                    value={size}
                    onChange={(value) => updateSpec("size", value)}
                    options={VALVE_SIZE_OPTIONS}
                    placeholder="Select size"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Pressure Class *
                  </label>
                  <Select
                    id={`pressure-class-${entry.id}`}
                    value={pressureClass}
                    onChange={(value) => updateSpec("pressureClass", value)}
                    options={PRESSURE_CLASS_OPTIONS}
                    placeholder="Select class"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    End Connection *
                  </label>
                  <Select
                    id={`connection-${entry.id}`}
                    value={connectionType}
                    onChange={(value) => updateSpec("connectionType", value)}
                    options={CONNECTION_OPTIONS}
                    placeholder="Select connection"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>
              </div>
              {isControlValve && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                      Required Cv
                    </label>
                    <input
                      type="number"
                      value={cv || ""}
                      onChange={(e) => updateSpec("cv", parseFloat(e.target.value) || null)}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                      placeholder="Flow coefficient"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                      Flow Rate (m³/h)
                    </label>
                    <input
                      type="number"
                      value={flowRate || ""}
                      onChange={(e) => updateSpec("flowRate", parseFloat(e.target.value) || null)}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                      placeholder="Design flow rate"
                      step="0.1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3 dark:bg-purple-900/20 dark:border-purple-700">
              <h4 className="text-sm font-bold text-purple-900 border-b border-purple-400 pb-1.5 mb-3 dark:text-purple-100 dark:border-purple-600">
                Construction Materials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Body Material *
                  </label>
                  <Select
                    id={`body-material-${entry.id}`}
                    value={bodyMaterial}
                    onChange={(value) => updateSpec("bodyMaterial", value)}
                    options={BODY_MATERIAL_OPTIONS}
                    placeholder="Select material"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Trim Material
                  </label>
                  <Select
                    id={`trim-material-${entry.id}`}
                    value={trimMaterial}
                    onChange={(value) => updateSpec("trimMaterial", value)}
                    options={TRIM_MATERIAL_OPTIONS}
                    placeholder="Select trim"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Seat/Seal Material *
                  </label>
                  <Select
                    id={`seat-material-${entry.id}`}
                    value={seatMaterial}
                    onChange={(value) => updateSpec("seatMaterial", value)}
                    options={SEAT_MATERIAL_OPTIONS}
                    placeholder="Select seat"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Port Type
                  </label>
                  <Select
                    id={`port-type-${entry.id}`}
                    value={portType}
                    onChange={(value) => updateSpec("portType", value)}
                    options={PORT_TYPE_OPTIONS}
                    placeholder="Select port type"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 dark:bg-green-900/20 dark:border-green-700">
              <h4 className="text-sm font-bold text-green-900 border-b border-green-400 pb-1.5 mb-3 dark:text-green-100 dark:border-green-600">
                Actuation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Actuator Type *
                  </label>
                  <Select
                    id={`actuator-type-${entry.id}`}
                    value={actuatorType}
                    onChange={(value) => updateSpec("actuatorType", value)}
                    options={ACTUATOR_TYPE_OPTIONS}
                    placeholder="Select actuator"
                    className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                  />
                </div>
                {isActuated && (
                  <div>
                    <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                      Fail Position
                    </label>
                    <Select
                      id={`fail-position-${entry.id}`}
                      value={failPosition}
                      onChange={(value) => updateSpec("failPosition", value)}
                      options={FAIL_POSITION_OPTIONS}
                      placeholder="Select fail position"
                      className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                    />
                  </div>
                )}
              </div>

              {isPneumatic && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                      Air Supply (bar)
                    </label>
                    <input
                      type="number"
                      value={airSupply || ""}
                      onChange={(e) => updateSpec("airSupply", parseFloat(e.target.value) || null)}
                      className="w-full px-2 py-1.5 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-green-50 text-gray-900 dark:bg-green-900/30 dark:border-green-600 dark:text-gray-100"
                      placeholder="e.g., 6"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                      Positioner
                    </label>
                    <Select
                      id={`positioner-${entry.id}`}
                      value={positioner}
                      onChange={(value) => updateSpec("positioner", value)}
                      options={POSITIONER_OPTIONS}
                      placeholder="Select positioner"
                      className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                    />
                  </div>
                </div>
              )}

              {isElectric && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                      Voltage
                    </label>
                    <Select
                      id={`voltage-${entry.id}`}
                      value={voltage}
                      onChange={(value) => updateSpec("voltage", value)}
                      options={VOLTAGE_OPTIONS}
                      placeholder="Select voltage"
                      className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                    />
                  </div>
                </div>
              )}

              {isActuated && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`limit-switches-${entry.id}`}
                      checked={limitSwitches}
                      onChange={(e) => updateSpec("limitSwitches", e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-green-300 rounded"
                    />
                    <label
                      htmlFor={`limit-switches-${entry.id}`}
                      className="ml-2 text-xs font-semibold text-green-900 dark:text-green-100"
                    >
                      Limit Switches
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`solenoid-valve-${entry.id}`}
                      checked={solenoidValve}
                      onChange={(e) => updateSpec("solenoidValve", e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-green-300 rounded"
                    />
                    <label
                      htmlFor={`solenoid-valve-${entry.id}`}
                      className="ml-2 text-xs font-semibold text-green-900 dark:text-green-100"
                    >
                      Solenoid Valve
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 dark:bg-amber-900/20 dark:border-amber-700">
              <h4 className="text-sm font-bold text-amber-900 border-b border-amber-400 pb-1.5 mb-3 dark:text-amber-100 dark:border-amber-600">
                Operating Conditions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Process Media *
                  </label>
                  <input
                    type="text"
                    value={media}
                    onChange={(e) => updateSpec("media", e.target.value)}
                    className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50 text-gray-900 dark:bg-amber-900/30 dark:border-amber-600 dark:text-gray-100"
                    placeholder="e.g., Steam, Water, Natural Gas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Hazardous Area
                  </label>
                  <Select
                    id={`hazardous-area-${entry.id}`}
                    value={hazardousArea}
                    onChange={(value) => updateSpec("hazardousArea", value)}
                    options={HAZARDOUS_AREA_OPTIONS}
                    placeholder="Select classification"
                    className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Operating Pressure (bar) *
                  </label>
                  <input
                    type="number"
                    value={operatingPressure || ""}
                    onChange={(e) =>
                      updateSpec("operatingPressure", parseFloat(e.target.value) || null)
                    }
                    className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50 text-gray-900 dark:bg-amber-900/30 dark:border-amber-600 dark:text-gray-100"
                    placeholder="Design pressure"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Operating Temp (°C) *
                  </label>
                  <input
                    type="number"
                    value={operatingTemp || ""}
                    onChange={(e) =>
                      updateSpec("operatingTemp", parseFloat(e.target.value) || null)
                    }
                    className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50 text-gray-900 dark:bg-amber-900/30 dark:border-amber-600 dark:text-gray-100"
                    placeholder="Design temperature"
                    step="1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3 dark:bg-indigo-900/20 dark:border-indigo-700">
              <h4 className="text-sm font-bold text-indigo-900 border-b border-indigo-400 pb-1.5 mb-3 dark:text-indigo-100 dark:border-indigo-600">
                Special Requirements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1 dark:text-indigo-100">
                    Seat Leakage Class
                  </label>
                  <Select
                    id={`seat-leakage-${entry.id}`}
                    value={seatLeakageClass}
                    onChange={(value) => updateSpec("seatLeakageClass", value)}
                    options={SEAT_LEAKAGE_CLASS_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description: o.description,
                    }))}
                    placeholder="Select leakage class"
                    className="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1 dark:text-indigo-100">
                    Fire Safe Standard
                  </label>
                  <Select
                    id={`fire-safe-${entry.id}`}
                    value={fireSafeStandard}
                    onChange={(value) => updateSpec("fireSafeStandard", value)}
                    options={FIRE_SAFE_STANDARDS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description: o.description,
                    }))}
                    placeholder="Select standard"
                    className="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1 dark:text-indigo-100">
                    Cryogenic Service
                  </label>
                  <Select
                    id={`cryogenic-${entry.id}`}
                    value={cryogenicService}
                    onChange={(value) => updateSpec("cryogenicService", value)}
                    options={CRYOGENIC_SERVICE_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description: o.description,
                    }))}
                    placeholder="Select service"
                    className="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1 dark:text-indigo-100">
                    Fugitive Emissions
                  </label>
                  <Select
                    id={`fugitive-${entry.id}`}
                    value={fugitiveEmissions}
                    onChange={(value) => updateSpec("fugitiveEmissions", value)}
                    options={FUGITIVE_EMISSIONS_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description: o.description,
                    }))}
                    placeholder="Select standard"
                    className="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1 dark:text-indigo-100">
                    Extended Bonnet
                  </label>
                  <Select
                    id={`bonnet-${entry.id}`}
                    value={extendedBonnet}
                    onChange={(value) => updateSpec("extendedBonnet", value)}
                    options={EXTENDED_BONNET_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description: o.description,
                    }))}
                    placeholder="Select bonnet type"
                    className="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1 dark:text-indigo-100">
                    Certifications
                  </label>
                  <Select
                    id={`certifications-${entry.id}`}
                    value={certifications.join(",")}
                    onChange={(value) =>
                      updateSpec("certifications", value ? value.split(",") : [])
                    }
                    options={VALVE_CERTIFICATIONS}
                    placeholder="Select certifications"
                    className="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 dark:bg-orange-900/20 dark:border-orange-700">
              <h4 className="text-sm font-bold text-orange-900 border-b border-orange-400 pb-1.5 mb-3 dark:text-orange-100 dark:border-orange-600">
                Supplier & Pricing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                    Supplier Reference
                  </label>
                  <input
                    type="text"
                    value={supplierReference}
                    onChange={(e) => updateSpec("supplierReference", e.target.value)}
                    className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                    placeholder="e.g., Crane, Cameron"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                    Unit Cost (R)
                  </label>
                  <input
                    type="number"
                    value={unitCostFromSupplier || ""}
                    onChange={(e) =>
                      updateSpec("unitCostFromSupplier", parseFloat(e.target.value) || null)
                    }
                    className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                    placeholder="Cost price"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                    Markup (%)
                  </label>
                  <input
                    type="number"
                    value={markupPercentage}
                    onChange={(e) =>
                      updateSpec("markupPercentage", parseFloat(e.target.value) || 15)
                    }
                    className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                    placeholder="15"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 dark:bg-gray-800 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-1.5 mb-3 dark:text-gray-100 dark:border-gray-600">
                Quantity
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1 dark:text-gray-100">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={quantity ?? ""}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      if (rawValue === "") {
                        updateSpec("quantityValue", undefined);
                        return;
                      }
                      updateSpec("quantityValue", parseInt(rawValue, 10));
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || parseInt(e.target.value, 10) < 1) {
                        updateSpec("quantityValue", 1);
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    min="1"
                    step="1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-1.5 mb-3 dark:text-gray-100 dark:border-gray-600">
                Notes
              </h4>
              <SmartNotesDropdown
                selectedNotes={
                  entry.notes ? (Array.isArray(entry.notes) ? entry.notes : [entry.notes]) : []
                }
                onNotesChange={(newNotes) =>
                  onUpdateEntry(entry.id, { notes: newNotes.join("\n") })
                }
                placeholder="Add notes for this valve..."
              />
            </div>
          </>
        }
        previewContent={
          <div className="space-y-4">
            {calculationResults && (
              <>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 dark:bg-teal-900/20 dark:border-teal-700">
                  <h5 className="text-sm font-bold text-teal-900 mb-2 dark:text-teal-100">
                    Valve Summary
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-teal-800 dark:text-teal-200">Type:</div>
                    <div className="font-semibold text-teal-900 dark:text-teal-100">
                      {calculationResults.valveType}
                    </div>
                    <div className="text-teal-800 dark:text-teal-200">Size:</div>
                    <div className="font-semibold text-teal-900 dark:text-teal-100">
                      DN{calculationResults.sizeDN}
                    </div>
                    <div className="text-teal-800 dark:text-teal-200">Pressure:</div>
                    <div className="font-semibold text-teal-900 dark:text-teal-100">
                      {PRESSURE_CLASS_OPTIONS.find(
                        (p) => p.value === calculationResults.pressureClass,
                      )?.label || calculationResults.pressureClass}
                    </div>
                  </div>
                </div>

                {calculationResults.torqueData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-700">
                    <h5 className="text-sm font-bold text-green-900 mb-2 dark:text-green-100">
                      Torque Data (Actuator Sizing)
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-green-800 dark:text-green-200">Breakaway Torque:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {calculationResults.torqueData.breakawayTorque} Nm
                      </div>
                      <div className="text-green-800 dark:text-green-200">Running Torque:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {calculationResults.torqueData.runningTorque} Nm
                      </div>
                      <div className="text-green-800 dark:text-green-200">End Torque:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {calculationResults.torqueData.endTorque} Nm
                      </div>
                      <div className="text-green-800 dark:text-green-200 font-bold">
                        Required Actuator:
                      </div>
                      <div className="font-bold text-green-900 dark:text-green-100">
                        {calculationResults.requiredActuatorTorque} Nm
                      </div>
                    </div>
                  </div>
                )}

                {calculationResults.pricing && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-900/20 dark:border-orange-700">
                    <h5 className="text-sm font-bold text-orange-900 mb-2 dark:text-orange-100">
                      Pricing Calculation
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-orange-800 dark:text-orange-200">Supplier Cost:</div>
                      <div className="font-semibold text-orange-900 dark:text-orange-100">
                        R {unitCostFromSupplier?.toLocaleString() || "-"}
                      </div>
                      <div className="text-orange-800 dark:text-orange-200">
                        Markup ({markupPercentage}%):
                      </div>
                      <div className="font-semibold text-orange-900 dark:text-orange-100">
                        R {calculationResults.pricing.markupAmount?.toLocaleString() || "-"}
                      </div>
                      <div className="text-orange-800 dark:text-orange-200">Unit Price:</div>
                      <div className="font-semibold text-orange-900 dark:text-orange-100">
                        R {calculationResults.pricing.unitCost?.toLocaleString() || "-"}
                      </div>
                      <div className="text-orange-800 dark:text-orange-200">
                        Total ({quantity} units):
                      </div>
                      <div className="font-bold text-orange-900 dark:text-orange-100">
                        R {calculationResults.pricing.totalCost?.toLocaleString() || "-"}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {!calculationResults && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>Select valve type, size, and pressure class to see calculations</p>
              </div>
            )}
          </div>
        }
      />

      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={() => onRemoveEntry(entry.id)}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          Remove Item
        </button>
      </div>
    </>
  );
}
