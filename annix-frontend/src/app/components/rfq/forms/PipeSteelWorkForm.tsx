'use client';

import React, { useEffect } from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { SmartNotesDropdown } from '@/app/components/rfq/SmartNotesDropdown';
import { usePipeSteelWorkCalculations } from '@/app/lib/pipe-steel-work/usePipeSteelWorkCalculations';

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

const NB_OPTIONS = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900];

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
  const workType = entry.specs?.workType || 'pipe_support';
  const nominalDiameterMm = entry.specs?.nominalDiameterMm || globalSpecs?.nominalDiameterMm || null;
  const bracketType = entry.specs?.bracketType || 'clevis_hanger';
  const pipelineLengthM = entry.specs?.pipelineLengthM || null;
  const branchDiameterMm = entry.specs?.branchDiameterMm || null;
  const quantity = entry.specs?.quantity || 1;

  const {
    supportSpacing,
    bracketTypes,
    bracketDimensions,
    calculationResults,
    isLoading,
    error,
  } = usePipeSteelWorkCalculations({
    workType,
    nominalDiameterMm,
    bracketType,
    pipelineLengthM,
    branchDiameterMm,
    quantity,
  });

  useEffect(() => {
    if (calculationResults) {
      onUpdateEntry(entry.id, {
        calculation: calculationResults,
        specs: {
          ...entry.specs,
          supportSpacingM: calculationResults.supportSpacingM,
          numberOfSupports: calculationResults.numberOfSupports,
        },
      });
    }
  }, [calculationResults]);

  const selectedBracketType = bracketTypes.find((bt) => bt.typeCode === bracketType);

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
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                      options={bracketTypes
                        .filter((bt) => bt.isSuitable)
                        .map((bt) => ({
                          value: bt.typeCode,
                          label: bt.displayName,
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
                      className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
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
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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
                  Support Spacing ({supportSpacing.standard})
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-blue-800 dark:text-blue-200">Water Filled:</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{supportSpacing.waterFilledSpacingM}m</div>
                  <div className="text-blue-800 dark:text-blue-200">Vapor/Gas:</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{supportSpacing.vaporGasSpacingM}m</div>
                  <div className="text-blue-800 dark:text-blue-200">Rod Size:</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">{supportSpacing.rodSizeMm}mm</div>
                </div>
              </div>
            )}

            {selectedBracketType && workType === 'pipe_support' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 dark:bg-purple-900/20 dark:border-purple-700">
                <h5 className="text-sm font-bold text-purple-900 mb-2 dark:text-purple-100">
                  {selectedBracketType.displayName}
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedBracketType.description && (
                    <>
                      <div className="text-purple-800 dark:text-purple-200">Description:</div>
                      <div className="font-semibold text-purple-900 dark:text-purple-100">{selectedBracketType.description}</div>
                    </>
                  )}
                  <div className="text-purple-800 dark:text-purple-200">Allows Expansion:</div>
                  <div className="font-semibold text-purple-900 dark:text-purple-100">{selectedBracketType.allowsExpansion ? 'Yes' : 'No'}</div>
                  <div className="text-purple-800 dark:text-purple-200">Anchor Type:</div>
                  <div className="font-semibold text-purple-900 dark:text-purple-100">{selectedBracketType.isAnchorType ? 'Yes' : 'No'}</div>
                  {bracketDimensions && (
                    <>
                      <div className="text-purple-800 dark:text-purple-200">Unit Weight:</div>
                      <div className="font-semibold text-purple-900 dark:text-purple-100">{bracketDimensions.unitWeightKg} kg</div>
                      <div className="text-purple-800 dark:text-purple-200">Max Load:</div>
                      <div className="font-semibold text-purple-900 dark:text-purple-100">{bracketDimensions.maxLoadKg} kg</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Calculating...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-700">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {calculationResults && !isLoading && (
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
                  {calculationResults.reinforcementPad && (
                    <>
                      <div className="text-green-800 dark:text-green-200">Pad OD:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.reinforcementPad.padOuterDiameterMm}mm</div>
                      <div className="text-green-800 dark:text-green-200">Pad Thickness:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">{calculationResults.reinforcementPad.padThicknessMm}mm</div>
                      <div className="text-green-800 dark:text-green-200">Required:</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {calculationResults.reinforcementPad.reinforcementRequired ? 'Yes' : 'No'}
                      </div>
                    </>
                  )}
                  <div className="text-green-800 dark:text-green-200">Weight per Unit:</div>
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    {calculationResults.weightPerUnitKg || calculationResults.reinforcementPad?.padWeightKg} kg
                  </div>
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
