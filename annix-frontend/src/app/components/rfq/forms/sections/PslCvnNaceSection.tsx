"use client";

import { NACE_MAX_HARDNESS_HRC } from "@annix/product-data/steel";
import { isApi5LSpec } from "@/app/lib/utils/steelSpecGroups";

interface PslCvnNaceSectionProps {
  steelSpecName: string;
  entryId: string;
  specs: {
    pslLevel?: string | null;
    cvnTestTemperatureC?: number | null;
    cvnAverageJoules?: number | null;
    cvnMinimumJoules?: number | null;
    heatNumber?: string | null;
    mtcReference?: string | null;
    lotNumber?: string | null;
    naceCompliant?: boolean | null;
    h2sZone?: number | null;
    maxHardnessHrc?: number | null;
    sscTested?: boolean | null;
  };
  onUpdateSpecs: (updates: Record<string, unknown>) => void;
}

export function PslCvnNaceSection(props: PslCvnNaceSectionProps) {
  const { steelSpecName, entryId, specs, onUpdateSpecs } = props;

  if (!isApi5LSpec(steelSpecName)) return null;

  const pslLevel = specs.pslLevel;
  const showCvnFields = pslLevel === "PSL2";
  const rawCvnTestTemperatureC = specs.cvnTestTemperatureC;
  const rawCvnAverageJoules = specs.cvnAverageJoules;
  const rawCvnMinimumJoules = specs.cvnMinimumJoules;
  const rawHeatNumber = specs.heatNumber;
  const rawMtcReference = specs.mtcReference;
  const rawLotNumber = specs.lotNumber;
  const rawNaceCompliant = specs.naceCompliant;
  const rawH2sZone = specs.h2sZone;
  const rawMaxHardnessHrc = specs.maxHardnessHrc;
  const rawSscTested = specs.sscTested;

  return (
    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
      <h5 className="text-xs font-semibold text-amber-800 mb-2">API 5L Specification Level</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">PSL Level *</label>
          <select
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
            value={pslLevel || ""}
            onChange={(e) => {
              const val = e.target.value;
              const newPslLevel = val || null;
              const updates: Record<string, unknown> = { pslLevel: newPslLevel };
              if (newPslLevel !== "PSL2") {
                updates.cvnTestTemperatureC = null;
                updates.cvnAverageJoules = null;
                updates.cvnMinimumJoules = null;
              }
              onUpdateSpecs(updates);
            }}
          >
            <option value="">Select PSL level...</option>
            <option value="PSL1">PSL1 - Standard</option>
            <option value="PSL2">PSL2 - Enhanced (with CVN testing)</option>
          </select>
        </div>
        {showCvnFields && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CVN Test Temp (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                value={rawCvnTestTemperatureC || ""}
                onChange={(e) =>
                  onUpdateSpecs({
                    cvnTestTemperatureC: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="-46"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CVN Avg (J) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                value={rawCvnAverageJoules || ""}
                onChange={(e) =>
                  onUpdateSpecs({
                    cvnAverageJoules: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="27"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CVN Min (J) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                value={rawCvnMinimumJoules || ""}
                onChange={(e) =>
                  onUpdateSpecs({
                    cvnMinimumJoules: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="20"
              />
            </div>
          </>
        )}
      </div>
      {showCvnFields &&
        (rawCvnTestTemperatureC === null ||
          rawCvnTestTemperatureC === undefined ||
          rawCvnAverageJoules === null ||
          rawCvnAverageJoules === undefined ||
          rawCvnMinimumJoules === null ||
          rawCvnMinimumJoules === undefined) && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            PSL2 requires all CVN test data (temperature, average, and minimum values)
          </div>
        )}
      {/* Traceability fields */}
      <div className="mt-2 pt-2 border-t border-amber-200">
        <h5 className="text-xs font-semibold text-amber-800 mb-2">Traceability (Optional)</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Heat Number</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
              value={rawHeatNumber || ""}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateSpecs({ heatNumber: val || null });
              }}
              placeholder="Enter heat number"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">MTC Reference</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
              value={rawMtcReference || ""}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateSpecs({ mtcReference: val || null });
              }}
              placeholder="Enter MTC reference"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Lot Number</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
              value={rawLotNumber || ""}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateSpecs({ lotNumber: val || null });
              }}
              placeholder="Enter lot number"
            />
          </div>
        </div>
      </div>
      {/* NACE/Sour Service Compliance */}
      <div className="mt-2 pt-2 border-t border-amber-200">
        <h5 className="text-xs font-semibold text-amber-800 mb-2">
          NACE/Sour Service Compliance (Optional)
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`nace-compliant-${entryId}`}
              checked={rawNaceCompliant || false}
              onChange={(e) => {
                const checked = e.target.checked;
                onUpdateSpecs({ naceCompliant: checked || null });
              }}
              className="w-4 h-4"
            />
            <label
              htmlFor={`nace-compliant-${entryId}`}
              className="text-xs font-medium text-gray-700"
            >
              NACE MR0175 Compliant
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">H2S Zone</label>
            <select
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
              value={rawH2sZone || ""}
              onChange={(e) =>
                onUpdateSpecs({ h2sZone: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Not specified</option>
              <option value="1">Zone 1 (Severe)</option>
              <option value="2">Zone 2 (Moderate)</option>
              <option value="3">Zone 3 (Mild)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Hardness (HRC)
            </label>
            <input
              type="number"
              step="0.1"
              max="70"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
              value={rawMaxHardnessHrc || ""}
              onChange={(e) =>
                onUpdateSpecs({ maxHardnessHrc: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="≤22 for sour"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`ssc-tested-${entryId}`}
              checked={rawSscTested || false}
              onChange={(e) => {
                const checked = e.target.checked;
                onUpdateSpecs({ sscTested: checked || null });
              }}
              className="w-4 h-4"
            />
            <label htmlFor={`ssc-tested-${entryId}`} className="text-xs font-medium text-gray-700">
              SSC Tested
            </label>
          </div>
        </div>
        {rawNaceCompliant && rawMaxHardnessHrc && rawMaxHardnessHrc > NACE_MAX_HARDNESS_HRC && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            Sour service materials require hardness ≤{NACE_MAX_HARDNESS_HRC} HRC per NACE MR0175
          </div>
        )}
      </div>
    </div>
  );
}
