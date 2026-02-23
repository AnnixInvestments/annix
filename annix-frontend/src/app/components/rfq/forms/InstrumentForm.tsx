"use client";

import {
  ACCURACY_CLASS_OPTIONS,
  CABLE_ENTRY_OPTIONS,
  CALIBRATION_OPTIONS,
  COMMUNICATION_PROTOCOL_OPTIONS,
  DISPLAY_OPTIONS,
  EXPLOSION_PROOF_OPTIONS,
  IP_RATING_OPTIONS,
  OUTPUT_SIGNAL_OPTIONS,
  POWER_SUPPLY_OPTIONS,
  PROCESS_CONNECTION_OPTIONS,
  WETTED_PARTS_MATERIAL_OPTIONS,
} from "@annix/product-data/valves-instruments/instrumentSpecifications";
import {
  getInstrumentByValue,
  getInstrumentsByCategory,
  InstrumentCategory,
} from "@annix/product-data/valves-instruments/instrumentTypes";
import { useEffect, useMemo, useState } from "react";
import { SmartNotesDropdown } from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { Select } from "@/app/components/ui/Select";

export interface InstrumentFormProps {
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

const INSTRUMENT_CATEGORIES: {
  value: InstrumentCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "flow", label: "Flow", icon: "🌊", color: "blue" },
  { value: "pressure", label: "Pressure", icon: "⏱️", color: "red" },
  { value: "level", label: "Level", icon: "📊", color: "green" },
  { value: "temperature", label: "Temperature", icon: "🌡️", color: "orange" },
  { value: "analytical", label: "Analytical", icon: "🧪", color: "purple" },
];

const INSTRUMENT_SIZE_OPTIONS = [
  { value: "15", label: 'DN15 (½")' },
  { value: "25", label: 'DN25 (1")' },
  { value: "40", label: 'DN40 (1½")' },
  { value: "50", label: 'DN50 (2")' },
  { value: "80", label: 'DN80 (3")' },
  { value: "100", label: 'DN100 (4")' },
  { value: "150", label: 'DN150 (6")' },
  { value: "200", label: 'DN200 (8")' },
  { value: "250", label: 'DN250 (10")' },
  { value: "300", label: 'DN300 (12")' },
  { value: "400", label: 'DN400 (16")' },
  { value: "500", label: 'DN500 (20")' },
  { value: "600", label: 'DN600 (24")' },
];

const RANGE_UNIT_OPTIONS = [
  { value: "m3_h", label: "m³/h" },
  { value: "l_min", label: "L/min" },
  { value: "gpm", label: "GPM" },
  { value: "bar", label: "bar" },
  { value: "psi", label: "psi" },
  { value: "kpa", label: "kPa" },
  { value: "mbar", label: "mbar" },
  { value: "mm", label: "mm" },
  { value: "m", label: "m" },
  { value: "celsius", label: "°C" },
  { value: "fahrenheit", label: "°F" },
  { value: "ph", label: "pH" },
  { value: "us_cm", label: "µS/cm" },
  { value: "mg_l", label: "mg/L" },
  { value: "ntu", label: "NTU" },
  { value: "mv", label: "mV" },
];

export default function InstrumentForm({
  entry,
  index: _index,
  entriesCount: _entriesCount,
  globalSpecs,
  masterData: _masterData,
  onUpdateEntry,
  onRemoveEntry,
  generateItemDescription,
  requiredProducts: _requiredProducts = [],
}: InstrumentFormProps) {
  const [activeCategory, setActiveCategory] = useState<InstrumentCategory>("flow");
  const [calculationResults, setCalculationResults] = useState<any>(null);

  const instrumentType = entry.specs?.instrumentType || "";
  const size = entry.specs?.size || "";
  const processConnection = entry.specs?.processConnection || "";
  const wettedMaterial = entry.specs?.wettedMaterial || "";
  const rangeMin = entry.specs?.rangeMin || null;
  const rangeMax = entry.specs?.rangeMax || null;
  const rangeUnit = entry.specs?.rangeUnit || "";
  const outputSignal = entry.specs?.outputSignal || "4_20ma";
  const communicationProtocol = entry.specs?.communicationProtocol || "";
  const displayType = entry.specs?.displayType || "local_lcd";
  const powerSupply = entry.specs?.powerSupply || "loop_powered";
  const cableEntry = entry.specs?.cableEntry || "m20";
  const explosionProof = entry.specs?.explosionProof || "none";
  const ipRating = entry.specs?.ipRating || "ip65";
  const accuracyClass = entry.specs?.accuracyClass || "";
  const calibration = entry.specs?.calibration || "standard";
  const processMedia = entry.specs?.processMedia || "";
  const operatingPressure = entry.specs?.operatingPressure || null;
  const operatingTemp = entry.specs?.operatingTemp || null;
  const quantity = entry.specs?.quantityValue || 1;
  const supplierReference = entry.specs?.supplierReference || "";
  const modelNumber = entry.specs?.modelNumber || "";
  const unitCostFromSupplier = entry.specs?.unitCostFromSupplier || null;
  const markupPercentage = entry.specs?.markupPercentage || 15;

  const selectedInstrument = useMemo(() => getInstrumentByValue(instrumentType), [instrumentType]);

  const filteredInstruments = useMemo(() => {
    return getInstrumentsByCategory(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    if (selectedInstrument && selectedInstrument.category !== activeCategory) {
      setActiveCategory(selectedInstrument.category);
    }
  }, [selectedInstrument]);

  useEffect(() => {
    if (!instrumentType) {
      setCalculationResults(null);
      return;
    }

    const results: any = {
      instrumentType: selectedInstrument?.label || instrumentType,
      category: selectedInstrument?.category || activeCategory,
      measurementPrinciple: selectedInstrument?.measurementPrinciple || "N/A",
      accuracy: selectedInstrument?.accuracyRange || accuracyClass || "N/A",
    };

    if (rangeMin !== null && rangeMax !== null) {
      results.range = `${rangeMin} - ${rangeMax} ${RANGE_UNIT_OPTIONS.find((u) => u.value === rangeUnit)?.label || rangeUnit}`;
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
  }, [
    instrumentType,
    rangeMin,
    rangeMax,
    rangeUnit,
    accuracyClass,
    unitCostFromSupplier,
    markupPercentage,
    quantity,
  ]);

  const updateSpec = (field: string, value: any) => {
    onUpdateEntry(entry.id, {
      specs: { ...entry.specs, [field]: value },
    });
  };

  const categoryColor =
    INSTRUMENT_CATEGORIES.find((c) => c.value === activeCategory)?.color || "blue";

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="instrument"
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
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows={2}
                placeholder="e.g., DN100 Electromagnetic Flowmeter, 0-500 m³/h, SS316 Liner"
                required
              />
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mb-3 dark:bg-cyan-900/20 dark:border-cyan-700">
              <h4 className="text-sm font-bold text-cyan-900 border-b border-cyan-400 pb-1.5 mb-3 dark:text-cyan-100 dark:border-cyan-600">
                Instrument Category
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {INSTRUMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                      activeCategory === cat.value
                        ? `bg-${cat.color}-600 text-white`
                        : `bg-${cat.color}-100 text-${cat.color}-800 hover:bg-${cat.color}-200 dark:bg-${cat.color}-900/30 dark:text-${cat.color}-200`
                    }`}
                    style={{
                      backgroundColor:
                        activeCategory === cat.value
                          ? `var(--color-${cat.color}-600, #0891b2)`
                          : undefined,
                      color: activeCategory === cat.value ? "white" : undefined,
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-cyan-900 mb-1 dark:text-cyan-100">
                  Instrument Type *
                </label>
                <Select
                  id={`instrument-type-${entry.id}`}
                  value={instrumentType}
                  onChange={(value) => updateSpec("instrumentType", value)}
                  options={filteredInstruments.map((inst) => ({
                    value: inst.value,
                    label: `${inst.icon} ${inst.label}`,
                    description: inst.description,
                  }))}
                  placeholder="Select instrument type"
                  className="bg-cyan-50 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-600"
                />
              </div>
              {selectedInstrument && (
                <div className="mt-2 text-xs text-cyan-700 dark:text-cyan-300">
                  <span className="font-semibold">Principle:</span>{" "}
                  {selectedInstrument.measurementPrinciple} |{" "}
                  <span className="font-semibold">Accuracy:</span>{" "}
                  {selectedInstrument.accuracyRange || "N/A"} |{" "}
                  <span className="font-semibold">Applications:</span>{" "}
                  {selectedInstrument.typicalApplications.join(", ")}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 dark:bg-blue-900/20 dark:border-blue-700">
              <h4 className="text-sm font-bold text-blue-900 border-b border-blue-400 pb-1.5 mb-3 dark:text-blue-100 dark:border-blue-600">
                Sizing & Range
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Size
                  </label>
                  <Select
                    id={`size-${entry.id}`}
                    value={size}
                    onChange={(value) => updateSpec("size", value)}
                    options={INSTRUMENT_SIZE_OPTIONS}
                    placeholder="Select size"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Range Min
                  </label>
                  <input
                    type="number"
                    value={rangeMin || ""}
                    onChange={(e) => updateSpec("rangeMin", parseFloat(e.target.value) || null)}
                    className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                    placeholder="Minimum"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Range Max
                  </label>
                  <input
                    type="number"
                    value={rangeMax || ""}
                    onChange={(e) => updateSpec("rangeMax", parseFloat(e.target.value) || null)}
                    className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                    placeholder="Maximum"
                    step="any"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Range Unit
                  </label>
                  <Select
                    id={`range-unit-${entry.id}`}
                    value={rangeUnit}
                    onChange={(value) => updateSpec("rangeUnit", value)}
                    options={RANGE_UNIT_OPTIONS}
                    placeholder="Select unit"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                    Accuracy Class
                  </label>
                  <Select
                    id={`accuracy-${entry.id}`}
                    value={accuracyClass}
                    onChange={(value) => updateSpec("accuracyClass", value)}
                    options={ACCURACY_CLASS_OPTIONS}
                    placeholder="Select accuracy"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3 dark:bg-purple-900/20 dark:border-purple-700">
              <h4 className="text-sm font-bold text-purple-900 border-b border-purple-400 pb-1.5 mb-3 dark:text-purple-100 dark:border-purple-600">
                Process Connection & Materials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Process Connection *
                  </label>
                  <Select
                    id={`connection-${entry.id}`}
                    value={processConnection}
                    onChange={(value) => updateSpec("processConnection", value)}
                    options={PROCESS_CONNECTION_OPTIONS}
                    placeholder="Select connection"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Wetted Parts Material *
                  </label>
                  <Select
                    id={`wetted-material-${entry.id}`}
                    value={wettedMaterial}
                    onChange={(value) => updateSpec("wettedMaterial", value)}
                    options={WETTED_PARTS_MATERIAL_OPTIONS}
                    placeholder="Select material"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 dark:bg-green-900/20 dark:border-green-700">
              <h4 className="text-sm font-bold text-green-900 border-b border-green-400 pb-1.5 mb-3 dark:text-green-100 dark:border-green-600">
                Output & Communication
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Output Signal *
                  </label>
                  <Select
                    id={`output-signal-${entry.id}`}
                    value={outputSignal}
                    onChange={(value) => updateSpec("outputSignal", value)}
                    options={OUTPUT_SIGNAL_OPTIONS}
                    placeholder="Select output"
                    className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Communication Protocol
                  </label>
                  <Select
                    id={`protocol-${entry.id}`}
                    value={communicationProtocol}
                    onChange={(value) => updateSpec("communicationProtocol", value)}
                    options={COMMUNICATION_PROTOCOL_OPTIONS}
                    placeholder="Select protocol"
                    className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Display Type
                  </label>
                  <Select
                    id={`display-${entry.id}`}
                    value={displayType}
                    onChange={(value) => updateSpec("displayType", value)}
                    options={DISPLAY_OPTIONS}
                    placeholder="Select display"
                    className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Power Supply
                  </label>
                  <Select
                    id={`power-${entry.id}`}
                    value={powerSupply}
                    onChange={(value) => updateSpec("powerSupply", value)}
                    options={POWER_SUPPLY_OPTIONS}
                    placeholder="Select power"
                    className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 dark:bg-amber-900/20 dark:border-amber-700">
              <h4 className="text-sm font-bold text-amber-900 border-b border-amber-400 pb-1.5 mb-3 dark:text-amber-100 dark:border-amber-600">
                Enclosure & Protection
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Hazardous Area Classification
                  </label>
                  <Select
                    id={`explosion-proof-${entry.id}`}
                    value={explosionProof}
                    onChange={(value) => updateSpec("explosionProof", value)}
                    options={EXPLOSION_PROOF_OPTIONS}
                    placeholder="Select classification"
                    className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    IP Rating
                  </label>
                  <Select
                    id={`ip-rating-${entry.id}`}
                    value={ipRating}
                    onChange={(value) => updateSpec("ipRating", value)}
                    options={IP_RATING_OPTIONS}
                    placeholder="Select IP rating"
                    className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Cable Entry
                  </label>
                  <Select
                    id={`cable-entry-${entry.id}`}
                    value={cableEntry}
                    onChange={(value) => updateSpec("cableEntry", value)}
                    options={CABLE_ENTRY_OPTIONS}
                    placeholder="Select cable entry"
                    className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 dark:text-amber-100">
                    Calibration
                  </label>
                  <Select
                    id={`calibration-${entry.id}`}
                    value={calibration}
                    onChange={(value) => updateSpec("calibration", value)}
                    options={CALIBRATION_OPTIONS}
                    placeholder="Select calibration"
                    className="bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 dark:bg-red-900/20 dark:border-red-700">
              <h4 className="text-sm font-bold text-red-900 border-b border-red-400 pb-1.5 mb-3 dark:text-red-100 dark:border-red-600">
                Process Conditions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-red-900 mb-1 dark:text-red-100">
                    Process Media *
                  </label>
                  <input
                    type="text"
                    value={processMedia}
                    onChange={(e) => updateSpec("processMedia", e.target.value)}
                    className="w-full px-2 py-1.5 border border-red-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-red-50 text-gray-900 dark:bg-red-900/30 dark:border-red-600 dark:text-gray-100"
                    placeholder="e.g., Water, Steam, Natural Gas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-red-900 mb-1 dark:text-red-100">
                    Operating Pressure (bar)
                  </label>
                  <input
                    type="number"
                    value={operatingPressure || ""}
                    onChange={(e) =>
                      updateSpec("operatingPressure", parseFloat(e.target.value) || null)
                    }
                    className="w-full px-2 py-1.5 border border-red-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-red-50 text-gray-900 dark:bg-red-900/30 dark:border-red-600 dark:text-gray-100"
                    placeholder="Design pressure"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-red-900 mb-1 dark:text-red-100">
                    Operating Temp (°C)
                  </label>
                  <input
                    type="number"
                    value={operatingTemp || ""}
                    onChange={(e) =>
                      updateSpec("operatingTemp", parseFloat(e.target.value) || null)
                    }
                    className="w-full px-2 py-1.5 border border-red-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-red-50 text-gray-900 dark:bg-red-900/30 dark:border-red-600 dark:text-gray-100"
                    placeholder="Design temperature"
                    step="1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 dark:bg-orange-900/20 dark:border-orange-700">
              <h4 className="text-sm font-bold text-orange-900 border-b border-orange-400 pb-1.5 mb-3 dark:text-orange-100 dark:border-orange-600">
                Supplier & Pricing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                    Supplier Reference
                  </label>
                  <input
                    type="text"
                    value={supplierReference}
                    onChange={(e) => updateSpec("supplierReference", e.target.value)}
                    className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                    placeholder="e.g., Endress+Hauser, Rosemount"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => updateSpec("modelNumber", e.target.value)}
                    className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                    placeholder="e.g., Promag 10W, 3051S"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
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
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                placeholder="Add notes for this instrument..."
              />
            </div>
          </>
        }
        previewContent={
          <div className="space-y-4">
            {calculationResults && (
              <>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 dark:bg-cyan-900/20 dark:border-cyan-700">
                  <h5 className="text-sm font-bold text-cyan-900 mb-2 dark:text-cyan-100">
                    Instrument Summary
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-cyan-800 dark:text-cyan-200">Type:</div>
                    <div className="font-semibold text-cyan-900 dark:text-cyan-100">
                      {calculationResults.instrumentType}
                    </div>
                    <div className="text-cyan-800 dark:text-cyan-200">Category:</div>
                    <div className="font-semibold text-cyan-900 dark:text-cyan-100 capitalize">
                      {calculationResults.category}
                    </div>
                    <div className="text-cyan-800 dark:text-cyan-200">Principle:</div>
                    <div className="font-semibold text-cyan-900 dark:text-cyan-100">
                      {calculationResults.measurementPrinciple}
                    </div>
                    <div className="text-cyan-800 dark:text-cyan-200">Accuracy:</div>
                    <div className="font-semibold text-cyan-900 dark:text-cyan-100">
                      {calculationResults.accuracy}
                    </div>
                    {calculationResults.range && (
                      <>
                        <div className="text-cyan-800 dark:text-cyan-200">Range:</div>
                        <div className="font-semibold text-cyan-900 dark:text-cyan-100">
                          {calculationResults.range}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-700">
                  <h5 className="text-sm font-bold text-green-900 mb-2 dark:text-green-100">
                    Configuration Summary
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-green-800 dark:text-green-200">Output:</div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {OUTPUT_SIGNAL_OPTIONS.find((o) => o.value === outputSignal)?.label ||
                        outputSignal}
                    </div>
                    {communicationProtocol && (
                      <>
                        <div className="text-green-800 dark:text-green-200">Protocol:</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {COMMUNICATION_PROTOCOL_OPTIONS.find(
                            (p) => p.value === communicationProtocol,
                          )?.label || communicationProtocol}
                        </div>
                      </>
                    )}
                    <div className="text-green-800 dark:text-green-200">Display:</div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {DISPLAY_OPTIONS.find((d) => d.value === displayType)?.label || displayType}
                    </div>
                    <div className="text-green-800 dark:text-green-200">Power:</div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {POWER_SUPPLY_OPTIONS.find((p) => p.value === powerSupply)?.label ||
                        powerSupply}
                    </div>
                    <div className="text-green-800 dark:text-green-200">IP Rating:</div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {ipRating.toUpperCase()}
                    </div>
                    {explosionProof !== "none" && (
                      <>
                        <div className="text-green-800 dark:text-green-200">Hazardous Area:</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {EXPLOSION_PROOF_OPTIONS.find((e) => e.value === explosionProof)?.label ||
                            explosionProof}
                        </div>
                      </>
                    )}
                  </div>
                </div>

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
                <p>Select an instrument type to see configuration summary</p>
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
