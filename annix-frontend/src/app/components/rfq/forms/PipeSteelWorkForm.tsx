'use client';

import React, { useEffect, useState } from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { SmartNotesDropdown } from '@/app/components/rfq/SmartNotesDropdown';

export interface PipeSteelWorkFormProps {
  entry: any;
  index: number;
  entries: any[];
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  openSelects: Record<string, boolean>;
  openSelect: (id: string) => void;
  closeSelect: (id: string) => void;
  focusAndOpenSelect: (id: string, retryCount?: number) => void;
  generateItemDescription: (entry: any) => string;
  requiredProducts?: string[];
}

const WORK_TYPES = [
  { value: 'pipe_support', label: 'Pipe Support' },
  { value: 'reinforcement_pad', label: 'Reinforcement Pad (Compensation Plate)' },
  { value: 'saddle_support', label: 'Saddle Support' },
  { value: 'shoe_support', label: 'Shoe Support' },
];

const BRACKET_TYPES = [
  { value: 'clevis_hanger', label: 'Clevis Hanger', description: 'For suspended pipelines' },
  { value: 'three_bolt_clamp', label: 'Three-Bolt Clamp', description: 'Heavy-duty support' },
  { value: 'welded_bracket', label: 'Welded Bracket', description: 'Fixed support' },
  { value: 'pipe_saddle', label: 'Pipe Saddle', description: 'Base-mounted support' },
  { value: 'u_bolt', label: 'U-Bolt Clamp', description: 'Simple, economical' },
  { value: 'roller_support', label: 'Roller Support', description: 'Thermal expansion' },
  { value: 'slide_plate', label: 'Slide Plate', description: 'Low-friction support' },
];

const SUPPORT_SPACING_TABLE: Record<number, { water: number; vapor: number; rod: number }> = {
  50: { water: 3.4, vapor: 4.3, rod: 10 },
  80: { water: 3.7, vapor: 4.6, rod: 10 },
  100: { water: 4.3, vapor: 5.2, rod: 12 },
  150: { water: 4.9, vapor: 5.8, rod: 16 },
  200: { water: 5.2, vapor: 6.4, rod: 16 },
  250: { water: 5.8, vapor: 7.0, rod: 20 },
  300: { water: 6.4, vapor: 7.6, rod: 20 },
  350: { water: 6.7, vapor: 7.9, rod: 24 },
  400: { water: 7.0, vapor: 8.2, rod: 24 },
  500: { water: 7.6, vapor: 8.8, rod: 30 },
  600: { water: 7.9, vapor: 9.1, rod: 30 },
};

const NB_OPTIONS = [50, 80, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900];

export default function PipeSteelWorkForm({
  entry,
  index: _index,
  entries,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  openSelects,
  openSelect,
  closeSelect,
  focusAndOpenSelect,
  generateItemDescription,
  requiredProducts = [],
}: PipeSteelWorkFormProps) {
  const [calculationResults, setCalculationResults] = useState<any>(null);

  const workType = entry.specs?.workType || 'pipe_support';
  const nominalDiameterMm = entry.specs?.nominalDiameterMm || globalSpecs?.nominalDiameterMm || null;
  const bracketType = entry.specs?.bracketType || 'clevis_hanger';
  const pipelineLengthM = entry.specs?.pipelineLengthM || null;
  const branchDiameterMm = entry.specs?.branchDiameterMm || null;
  const quantity = entry.specs?.quantity || 1;

  const closestNb = (nb: number): number => {
    const sizes = Object.keys(SUPPORT_SPACING_TABLE).map(Number);
    return sizes.reduce((prev, curr) =>
      Math.abs(curr - nb) < Math.abs(prev - nb) ? curr : prev
    );
  };

  const supportSpacing = nominalDiameterMm
    ? SUPPORT_SPACING_TABLE[closestNb(nominalDiameterMm)]
    : null;

  useEffect(() => {
    if (workType === 'pipe_support' && nominalDiameterMm && pipelineLengthM && supportSpacing) {
      const spacing = supportSpacing.water;
      const numberOfSupports = Math.ceil(pipelineLengthM / spacing) + 1;
      const weightPerUnit = 0.5 + (nominalDiameterMm / 100) * 1.5;
      const totalWeight = weightPerUnit * numberOfSupports;
      const unitCost = getBracketCost(bracketType);
      const totalCost = unitCost * numberOfSupports;

      const results = {
        supportSpacingM: spacing,
        numberOfSupports,
        weightPerUnitKg: Math.round(weightPerUnit * 100) / 100,
        totalWeightKg: Math.round(totalWeight * 100) / 100,
        unitCost,
        totalCost,
        rodSizeMm: supportSpacing.rod,
      };

      setCalculationResults(results);

      onUpdateEntry(entry.id, {
        calculation: results,
        specs: {
          ...entry.specs,
          supportSpacingM: spacing,
          numberOfSupports,
        },
      });
    }

    if (workType === 'reinforcement_pad' && nominalDiameterMm && branchDiameterMm) {
      const padData = calculateReinforcementPad(nominalDiameterMm, branchDiameterMm);
      setCalculationResults(padData);
      onUpdateEntry(entry.id, {
        calculation: padData,
      });
    }
  }, [workType, nominalDiameterMm, pipelineLengthM, bracketType, branchDiameterMm, quantity]);

  const getBracketCost = (type: string): number => {
    const costs: Record<string, number> = {
      clevis_hanger: 150,
      three_bolt_clamp: 250,
      welded_bracket: 180,
      pipe_saddle: 280,
      u_bolt: 80,
      roller_support: 450,
      slide_plate: 350,
    };
    return costs[type] || 200;
  };

  const calculateReinforcementPad = (headerNb: number, branchNb: number) => {
    const nbToOd: Record<number, number> = {
      50: 60.3, 80: 88.9, 100: 114.3, 150: 168.3, 200: 219.1,
      250: 273.1, 300: 323.9, 350: 355.6, 400: 406.4, 500: 508.0, 600: 610.0,
    };
    const headerOd = nbToOd[headerNb] || headerNb * 1.05;
    const branchOd = nbToOd[branchNb] || branchNb * 1.05;

    const padOd = branchOd + 100;
    const padThickness = Math.max(6, Math.round(headerOd / 50));
    const padArea = (Math.PI / 4) * (padOd * padOd - branchOd * branchOd);
    const padVolume = (padArea * padThickness) / 1e9;
    const padWeight = padVolume * 7850;
    const unitCost = Math.round(padWeight * 25 * 2.5);

    return {
      padOuterDiameterMm: Math.round(padOd),
      padThicknessMm: padThickness,
      padWeightKg: Math.round(padWeight * 100) / 100,
      unitCost,
      totalCost: unitCost * quantity,
      totalWeightKg: Math.round(padWeight * quantity * 100) / 100,
      reinforcementRequired: true,
      notes: `Reinforcement pad per ASME B31.3. OD: ${Math.round(padOd)}mm, Thickness: ${padThickness}mm`,
    };
  };

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="pipe_steel_work"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                rows={2}
                placeholder="e.g., 200NB Pipe Support Brackets - Clevis Hanger Type"
                required
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 dark:bg-green-900/20 dark:border-green-700">
              <h4 className="text-sm font-bold text-green-900 border-b border-green-400 pb-1.5 mb-3 dark:text-green-100 dark:border-green-600">
                Pipe Steel Work Specifications
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Work Type *
                  </label>
                  <Select
                    id={`work-type-${entry.id}`}
                    value={workType}
                    onChange={(value) => {
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, workType: value },
                      });
                    }}
                    options={WORK_TYPES.map((wt) => ({
                      value: wt.value,
                      label: wt.label,
                    }))}
                    open={openSelects[`work-type-${entry.id}`] || false}
                    onOpenChange={(open) => open ? openSelect(`work-type-${entry.id}`) : closeSelect(`work-type-${entry.id}`)}
                    placeholder="Select work type"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                    Nominal Diameter (mm) *
                  </label>
                  <Select
                    id={`nb-${entry.id}`}
                    value={nominalDiameterMm?.toString() || ''}
                    onChange={(value) => {
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, nominalDiameterMm: parseInt(value) },
                      });
                    }}
                    options={NB_OPTIONS.map((nb) => ({
                      value: nb.toString(),
                      label: `${nb} NB`,
                    }))}
                    open={openSelects[`nb-${entry.id}`] || false}
                    onOpenChange={(open) => open ? openSelect(`nb-${entry.id}`) : closeSelect(`nb-${entry.id}`)}
                    placeholder="Select NB"
                    className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                  />
                </div>

                {workType === 'pipe_support' && (
                  <div>
                    <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                      Bracket Type *
                    </label>
                    <Select
                      id={`bracket-type-${entry.id}`}
                      value={bracketType}
                      onChange={(value) => {
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, bracketType: value },
                        });
                      }}
                      options={BRACKET_TYPES.map((bt) => ({
                        value: bt.value,
                        label: bt.label,
                      }))}
                      open={openSelects[`bracket-type-${entry.id}`] || false}
                      onOpenChange={(open) => open ? openSelect(`bracket-type-${entry.id}`) : closeSelect(`bracket-type-${entry.id}`)}
                      placeholder="Select bracket type"
                      className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                    />
                  </div>
                )}

                {workType === 'reinforcement_pad' && (
                  <div>
                    <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                      Branch Diameter (mm) *
                    </label>
                    <Select
                      id={`branch-nb-${entry.id}`}
                      value={branchDiameterMm?.toString() || ''}
                      onChange={(value) => {
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, branchDiameterMm: parseInt(value) },
                        });
                      }}
                      options={NB_OPTIONS.filter((nb) => nb < (nominalDiameterMm || 999)).map((nb) => ({
                        value: nb.toString(),
                        label: `${nb} NB`,
                      }))}
                      open={openSelects[`branch-nb-${entry.id}`] || false}
                      onOpenChange={(open) => open ? openSelect(`branch-nb-${entry.id}`) : closeSelect(`branch-nb-${entry.id}`)}
                      placeholder="Select Branch NB"
                      className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>

            {workType === 'pipe_support' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 dark:bg-blue-900/20 dark:border-blue-700">
                <h4 className="text-sm font-bold text-blue-900 border-b border-blue-400 pb-1.5 mb-3 dark:text-blue-100 dark:border-blue-600">
                  Pipeline Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                      Pipeline Length (m) *
                    </label>
                    <input
                      type="number"
                      value={pipelineLengthM || ''}
                      onChange={(e) => {
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, pipelineLengthM: parseFloat(e.target.value) || null },
                        });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                      placeholder="e.g., 100"
                      min="0"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                      Media Type
                    </label>
                    <Select
                      id={`media-type-${entry.id}`}
                      value={entry.specs?.mediaType || 'water_filled'}
                      onChange={(value) => {
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, mediaType: value },
                        });
                      }}
                      options={[
                        { value: 'water_filled', label: 'Water Filled' },
                        { value: 'vapor_gas', label: 'Vapor/Gas' },
                      ]}
                      open={openSelects[`media-type-${entry.id}`] || false}
                      onOpenChange={(open) => open ? openSelect(`media-type-${entry.id}`) : closeSelect(`media-type-${entry.id}`)}
                      placeholder="Select media"
                      className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

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
                    value={quantity}
                    onChange={(e) => {
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, quantity: parseInt(e.target.value) || 1 },
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                selectedNotes={entry.notes ? (Array.isArray(entry.notes) ? entry.notes : [entry.notes]) : []}
                onNotesChange={(newNotes) => onUpdateEntry(entry.id, { notes: newNotes.join('\n') })}
                placeholder="Add notes for this item..."
              />
            </div>
          </>
        }
        previewContent={
          <div className="space-y-4">
            {supportSpacing && workType === 'pipe_support' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700">
                <h5 className="text-sm font-bold text-blue-900 mb-2 dark:text-blue-100">
                  Support Spacing (MSS-SP-58)
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-blue-800 dark:text-blue-200">Water Filled:</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{supportSpacing.water}m</div>
                  <div className="text-blue-800 dark:text-blue-200">Vapor/Gas:</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{supportSpacing.vapor}m</div>
                  <div className="text-blue-800 dark:text-blue-200">Rod Size:</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{supportSpacing.rod}mm</div>
                </div>
              </div>
            )}

            {calculationResults && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-700">
                <h5 className="text-sm font-bold text-green-900 mb-2 dark:text-green-100">
                  Calculation Results
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {calculationResults.numberOfSupports && (
                    <>
                      <div className="text-green-800 dark:text-green-200">Number of Supports:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.numberOfSupports}</div>
                    </>
                  )}
                  {calculationResults.padOuterDiameterMm && (
                    <>
                      <div className="text-green-800 dark:text-green-200">Pad OD:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.padOuterDiameterMm}mm</div>
                      <div className="text-green-800 dark:text-green-200">Pad Thickness:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.padThicknessMm}mm</div>
                    </>
                  )}
                  <div className="text-green-800 dark:text-green-200">Weight per Unit:</div>
                  <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.weightPerUnitKg || calculationResults.padWeightKg} kg</div>
                  <div className="text-green-800 dark:text-green-200">Total Weight:</div>
                  <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.totalWeightKg} kg</div>
                  <div className="text-green-800 dark:text-green-200">Unit Cost:</div>
                  <div className="font-semibold text-green-900 dark:text-green-100">R {calculationResults.unitCost?.toLocaleString()}</div>
                  <div className="text-green-800 dark:text-green-200">Total Cost:</div>
                  <div className="font-semibold text-green-900 dark:text-green-100">R {calculationResults.totalCost?.toLocaleString()}</div>
                </div>
                {calculationResults.notes && (
                  <p className="mt-2 text-xs text-green-700 dark:text-green-300">{calculationResults.notes}</p>
                )}
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
