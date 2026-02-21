"use client";

import { useState } from "react";

interface CoatingSystem {
  id: string;
  name: string;
  type: "paint" | "rubber" | "ceramic" | "galvanized";
  description: string;
  totalDftMicrons: number;
  estimatedCostPerM2: number;
  durabilityYears: { min: number; max: number };
  maintenanceInterval: string;
  surfacePrepGrade: string;
  pros: string[];
  cons: string[];
  suitableFor: string[];
  standards: string[];
}

const COMPARISON_SYSTEMS: CoatingSystem[] = [
  {
    id: "epoxy-pu-c3",
    name: "Epoxy + Polyurethane (C3)",
    type: "paint",
    description: "Standard industrial coating system for moderate environments",
    totalDftMicrons: 200,
    estimatedCostPerM2: 45,
    durabilityYears: { min: 10, max: 15 },
    maintenanceInterval: "5-7 years touch-up",
    surfacePrepGrade: "Sa 2.5",
    pros: [
      "Good chemical resistance",
      "UV stable topcoat",
      "Proven track record",
      "Wide color range",
    ],
    cons: [
      "Multiple coats required",
      "Curing time dependent on temperature",
      "Requires controlled environment",
    ],
    suitableFor: ["Above ground piping", "Structural steel", "Tanks"],
    standards: ["ISO 12944-5", "NORSOK M-501"],
  },
  {
    id: "zinc-epoxy-pu-c4",
    name: "Zinc Rich + Epoxy + PU (C4/C5)",
    type: "paint",
    description: "High-performance system for aggressive environments",
    totalDftMicrons: 320,
    estimatedCostPerM2: 85,
    durabilityYears: { min: 15, max: 25 },
    maintenanceInterval: "10-15 years inspection",
    surfacePrepGrade: "Sa 2.5",
    pros: [
      "Excellent corrosion protection",
      "Cathodic protection from zinc",
      "Long service life",
      "Self-healing properties",
    ],
    cons: [
      "Higher initial cost",
      "Zinc primer requires careful handling",
      "Longer application time",
    ],
    suitableFor: ["Marine environments", "Coastal installations", "Offshore"],
    standards: ["ISO 12944-5", "NORSOK M-501", "ISO 20340"],
  },
  {
    id: "hdg",
    name: "Hot-Dip Galvanizing",
    type: "galvanized",
    description: "Factory-applied zinc coating by hot-dip process",
    totalDftMicrons: 85,
    estimatedCostPerM2: 35,
    durabilityYears: { min: 20, max: 50 },
    maintenanceInterval: "Maintenance-free",
    surfacePrepGrade: "Chemical pickling",
    pros: ["Excellent durability", "Self-healing", "Complete coverage", "Low maintenance"],
    cons: [
      "Limited to factory application",
      "Size restrictions",
      "Cannot be field repaired easily",
      "Gray appearance",
    ],
    suitableFor: ["Structural steel", "Gratings", "Handrails", "Pipe supports"],
    standards: ["ISO 1461", "AS/NZS 4680", "ASTM A123"],
  },
  {
    id: "rubber-nr",
    name: "Natural Rubber Lining (SANS 1198)",
    type: "rubber",
    description: "Vulcanized rubber lining for abrasion and impact",
    totalDftMicrons: 6000,
    estimatedCostPerM2: 180,
    durabilityYears: { min: 8, max: 15 },
    maintenanceInterval: "Annual inspection",
    surfacePrepGrade: "Sa 2.5",
    pros: [
      "Excellent abrasion resistance",
      "Good impact absorption",
      "Chemical resistance",
      "Noise reduction",
    ],
    cons: [
      "Higher cost",
      "Temperature limitations",
      "Requires specialized application",
      "Limited to internal use",
    ],
    suitableFor: ["Slurry pipes", "Tanks", "Chutes", "Mill linings"],
    standards: ["SANS 1198", "SANS 1201", "ISO 4649"],
  },
  {
    id: "ceramic-alumina",
    name: "Alumina Ceramic Tile (92%)",
    type: "ceramic",
    description: "High-alumina ceramic tiles for severe abrasion",
    totalDftMicrons: 12000,
    estimatedCostPerM2: 350,
    durabilityYears: { min: 10, max: 20 },
    maintenanceInterval: "2-3 year inspection",
    surfacePrepGrade: "Sa 2.5",
    pros: [
      "Exceptional wear resistance",
      "High hardness (1300+ HV)",
      "Temperature resistant",
      "Long life in severe service",
    ],
    cons: [
      "High initial cost",
      "Brittle - impact sensitive",
      "Complex installation",
      "Weight increase",
    ],
    suitableFor: ["Cyclones", "High-wear chutes", "Impact zones", "Transfer points"],
    standards: ["ASTM C1327", "ISO 14705"],
  },
  {
    id: "fbe",
    name: "Fusion Bonded Epoxy (FBE)",
    type: "paint",
    description: "Factory-applied powder coating for buried pipelines",
    totalDftMicrons: 400,
    estimatedCostPerM2: 55,
    durabilityYears: { min: 25, max: 40 },
    maintenanceInterval: "Field joint inspection",
    surfacePrepGrade: "Sa 2.5",
    pros: ["Excellent adhesion", "CP compatible", "Consistent thickness", "Fast application"],
    cons: [
      "Factory application only",
      "Field joint coating required",
      "Limited field repair options",
    ],
    suitableFor: ["Buried pipelines", "Water mains", "Gas lines"],
    standards: ["ISO 21809-2", "CSA Z245.20"],
  },
];

interface ComparisonToolProps {
  onSelectSystem?: (system: CoatingSystem) => void;
  maxSystems?: number;
}

export function ComparisonTool({ onSelectSystem, maxSystems = 3 }: ComparisonToolProps) {
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const toggleSystem = (systemId: string) => {
    setSelectedSystems((prev) => {
      if (prev.includes(systemId)) {
        return prev.filter((id) => id !== systemId);
      }
      if (prev.length >= maxSystems) {
        return prev;
      }
      return [...prev, systemId];
    });
  };

  const selectedSystemsData = COMPARISON_SYSTEMS.filter((s) => selectedSystems.includes(s.id));

  const typeColors = {
    paint: "bg-orange-100 text-orange-800",
    rubber: "bg-blue-100 text-blue-800",
    ceramic: "bg-purple-100 text-purple-800",
    galvanized: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          System Comparison Tool
        </h3>
        <span className="text-xs text-gray-500">Select up to {maxSystems} systems to compare</span>
      </div>

      {/* System Selection */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {COMPARISON_SYSTEMS.map((system) => (
          <div
            key={system.id}
            onClick={() => toggleSystem(system.id)}
            className={`p-2 border rounded cursor-pointer transition-colors ${
              selectedSystems.includes(system.id)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSystems.includes(system.id)}
                  onChange={() => {}}
                  className="rounded text-blue-600"
                />
                <span className="text-xs font-medium text-gray-900">{system.name}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[system.type]}`}
              >
                {system.type}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-gray-500 pl-6">
              {system.totalDftMicrons}um | R{system.estimatedCostPerM2}/m2
            </div>
          </div>
        ))}
      </div>

      {/* Compare Button */}
      {selectedSystems.length >= 2 && (
        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className="w-full px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 mb-4"
        >
          {showComparison ? "Hide Comparison" : "Compare Selected Systems"}
        </button>
      )}

      {/* Comparison Table */}
      {showComparison && selectedSystemsData.length >= 2 && (
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-600 w-32">Attribute</th>
                {selectedSystemsData.map((system) => (
                  <th key={system.id} className="px-2 py-2 text-center font-medium text-gray-900">
                    {system.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-2 py-2 font-medium text-gray-600">Total DFT</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-center text-gray-900">
                    {system.totalDftMicrons}um
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-2 py-2 font-medium text-gray-600">Est. Cost/m2</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-center text-gray-900">
                    R{system.estimatedCostPerM2}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium text-gray-600">Durability</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-center text-gray-900">
                    {system.durabilityYears.min}-{system.durabilityYears.max} years
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-2 py-2 font-medium text-gray-600">Maintenance</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-center text-gray-900">
                    {system.maintenanceInterval}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium text-gray-600">Surface Prep</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-center text-gray-900">
                    {system.surfacePrepGrade}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-2 py-2 font-medium text-gray-600">Standards</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-center text-gray-900">
                    {system.standards.slice(0, 2).join(", ")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium text-gray-600 align-top">Pros</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-gray-900">
                    <ul className="list-disc pl-3 space-y-0.5">
                      {system.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="text-green-700">
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-2 py-2 font-medium text-gray-600 align-top">Cons</td>
                {selectedSystemsData.map((system) => (
                  <td key={system.id} className="px-2 py-2 text-gray-900">
                    <ul className="list-disc pl-3 space-y-0.5">
                      {system.cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="text-red-700">
                          {con}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Select for Quote */}
      {onSelectSystem && selectedSystems.length === 1 && (
        <button
          type="button"
          onClick={() => {
            const system = COMPARISON_SYSTEMS.find((s) => s.id === selectedSystems[0]);
            if (system) onSelectSystem(system);
          }}
          className="w-full mt-4 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
        >
          Use Selected System
        </button>
      )}
    </div>
  );
}
