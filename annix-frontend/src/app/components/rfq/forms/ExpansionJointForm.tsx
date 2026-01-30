'use client';

import React, { useEffect, useState } from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { SmartNotesDropdown } from '@/app/components/rfq/SmartNotesDropdown';
import {
  EXPANSION_JOINT_TYPES,
  BELLOWS_JOINT_TYPES,
  BELLOWS_MATERIALS,
  FABRICATED_LOOP_TYPES,
  EXPANSION_JOINT_END_OPTIONS,
  elbowsForLoopType,
  flangeConfigForEndOption,
  STEEL_DENSITY_KG_M3,
} from '@/app/lib/config/rfq';
import { NB_TO_OD_LOOKUP } from '@/app/lib/hooks/useFlangeWeights';

export interface ExpansionJointFormProps {
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

const NB_OPTIONS = [50, 80, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900];

const SCHEDULE_OPTIONS = [
  { value: 'Sch10', label: 'Sch 10' },
  { value: 'Sch20', label: 'Sch 20' },
  { value: 'Sch40', label: 'Sch 40 / STD' },
  { value: 'Sch80', label: 'Sch 80 / XS' },
  { value: 'Sch160', label: 'Sch 160' },
];

export default function ExpansionJointForm({
  entry,
  index: _index,
  entriesCount: _entriesCount,
  globalSpecs,
  masterData: _masterData,
  onUpdateEntry,
  onRemoveEntry,
  generateItemDescription,
  requiredProducts: _requiredProducts = [],
}: ExpansionJointFormProps) {
  const [calculationResults, setCalculationResults] = useState<any>(null);

  const expansionJointType = entry.specs?.expansionJointType || 'bought_in_bellows';
  const nominalDiameterMm = entry.specs?.nominalDiameterMm || globalSpecs?.nominalDiameterMm || null;
  const scheduleNumber = entry.specs?.scheduleNumber || globalSpecs?.scheduleNumber || 'Sch40';
  const quantity = entry.specs?.quantityValue || 1;

  const bellowsJointType = entry.specs?.bellowsJointType || 'axial';
  const bellowsMaterial = entry.specs?.bellowsMaterial || 'stainless_steel_304';
  const axialMovementMm = entry.specs?.axialMovementMm || null;
  const lateralMovementMm = entry.specs?.lateralMovementMm || null;
  const angularMovementDeg = entry.specs?.angularMovementDeg || null;
  const supplierReference = entry.specs?.supplierReference || '';
  const catalogNumber = entry.specs?.catalogNumber || '';
  const unitCostFromSupplier = entry.specs?.unitCostFromSupplier || null;
  const markupPercentage = entry.specs?.markupPercentage || 15;

  const loopType = entry.specs?.loopType || 'full_loop';
  const loopHeightMm = entry.specs?.loopHeightMm || null;
  const loopWidthMm = entry.specs?.loopWidthMm || null;
  const endConfiguration = entry.specs?.endConfiguration || 'FBE';

  const outsideDiameterMm = nominalDiameterMm
    ? (NB_TO_OD_LOOKUP[nominalDiameterMm as keyof typeof NB_TO_OD_LOOKUP] || nominalDiameterMm * 1.05)
    : null;

  useEffect(() => {
    if (expansionJointType === 'bought_in_bellows' && unitCostFromSupplier) {
      const unitPrice = unitCostFromSupplier * (1 + markupPercentage / 100);
      const totalPrice = unitPrice * quantity;

      const results = {
        unitCost: Math.round(unitPrice * 100) / 100,
        totalCost: Math.round(totalPrice * 100) / 100,
        markupAmount: Math.round((unitPrice - unitCostFromSupplier) * 100) / 100,
      };

      setCalculationResults(results);
      onUpdateEntry(entry.id, {
        calculation: results,
        totalWeightKg: 0,
      });
    }

    if (expansionJointType === 'fabricated_loop' && nominalDiameterMm && loopHeightMm) {
      const results = calculateFabricatedLoop();
      if (results) {
        setCalculationResults(results);
        onUpdateEntry(entry.id, {
          calculation: results,
          totalWeightKg: results.totalWeightKg,
        });
      }
    }
  }, [
    expansionJointType,
    nominalDiameterMm,
    scheduleNumber,
    quantity,
    unitCostFromSupplier,
    markupPercentage,
    loopType,
    loopHeightMm,
    loopWidthMm,
    endConfiguration,
  ]);

  const calculateFabricatedLoop = () => {
    if (!nominalDiameterMm || !loopHeightMm || !outsideDiameterMm) {
      return null;
    }

    const numberOfElbows = elbowsForLoopType(loopType);
    const flangeConfig = flangeConfigForEndOption(endConfiguration);
    const wallThicknessMm = wallThicknessForSchedule(scheduleNumber);

    const effectiveLoopWidth = loopWidthMm || nominalDiameterMm * 3;
    const elbowArcLength = (Math.PI / 2) * nominalDiameterMm;
    const straightLengthPerLoop = loopHeightMm * 2 + effectiveLoopWidth;
    const totalPipeLengthMm = straightLengthPerLoop + (elbowArcLength * numberOfElbows);

    const pipeWeightPerMeter =
      (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * STEEL_DENSITY_KG_M3) / 1000000;
    const pipeWeightKg = pipeWeightPerMeter * (totalPipeLengthMm / 1000);

    const elbowWeight = Math.pow(nominalDiameterMm / 25, 2) * 0.5;
    const elbowWeightKg = elbowWeight * numberOfElbows;

    const flangeWeightEach = flangeWeightForNb(nominalDiameterMm);
    const flangeWeightKg = flangeWeightEach * flangeConfig.flanges;

    const totalWeightKg = pipeWeightKg + elbowWeightKg + flangeWeightKg;

    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const numberOfButtWelds = numberOfElbows;
    const totalButtWeldLengthM = numberOfButtWelds * circumferenceM;
    const flangeWeldLengthM = flangeConfig.flangeWelds * circumferenceM;

    return {
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      pipeWeightKg: Math.round(pipeWeightKg * 100) / 100,
      elbowWeightKg: Math.round(elbowWeightKg * 100) / 100,
      flangeWeightKg: Math.round(flangeWeightKg * 100) / 100,
      numberOfElbows,
      numberOfButtWelds,
      totalButtWeldLengthM: Math.round(totalButtWeldLengthM * 1000) / 1000,
      numberOfFlangeWelds: flangeConfig.flangeWelds,
      flangeWeldLengthM: Math.round(flangeWeldLengthM * 1000) / 1000,
      pipeLengthTotalMm: Math.round(totalPipeLengthMm),
      outsideDiameterMm,
      wallThicknessMm,
    };
  };

  const wallThicknessForSchedule = (schedule: string): number => {
    const scheduleMap: Record<string, number> = {
      Sch10: 2.77,
      Sch20: 3.91,
      Sch40: 6.35,
      Sch80: 8.74,
      Sch160: 14.27,
    };
    return scheduleMap[schedule] || 6.35;
  };

  const flangeWeightForNb = (nb: number): number => {
    const flangeWeights: Record<number, number> = {
      50: 3.5,
      80: 6.0,
      100: 8.5,
      150: 14.0,
      200: 22.0,
      250: 32.0,
      300: 45.0,
      350: 55.0,
      400: 70.0,
      500: 100.0,
      600: 140.0,
      750: 200.0,
      900: 280.0,
    };
    return flangeWeights[nb] || nb * 0.15;
  };

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="expansion_joint"
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
                placeholder="e.g., 200NB Expansion Joint - Axial Bellows Type"
                required
              />
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3 dark:bg-purple-900/20 dark:border-purple-700">
              <h4 className="text-sm font-bold text-purple-900 border-b border-purple-400 pb-1.5 mb-3 dark:text-purple-100 dark:border-purple-600">
                Expansion Joint Type
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
                    Type *
                  </label>
                  <Select
                    id={`expansion-type-${entry.id}`}
                    value={expansionJointType}
                    onChange={(value) => {
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, expansionJointType: value },
                      });
                    }}
                    options={EXPANSION_JOINT_TYPES.map((et) => ({
                      value: et.value,
                      label: et.label,
                    }))}
                    placeholder="Select type"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1 dark:text-purple-100">
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
                    placeholder="Select NB"
                    className="bg-purple-50 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600"
                  />
                </div>
              </div>
            </div>

            {expansionJointType === 'bought_in_bellows' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 dark:bg-blue-900/20 dark:border-blue-700">
                  <h4 className="text-sm font-bold text-blue-900 border-b border-blue-400 pb-1.5 mb-3 dark:text-blue-100 dark:border-blue-600">
                    Bellows Specifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                        Joint Type *
                      </label>
                      <Select
                        id={`bellows-type-${entry.id}`}
                        value={bellowsJointType}
                        onChange={(value) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, bellowsJointType: value },
                          });
                        }}
                        options={BELLOWS_JOINT_TYPES.map((bt) => ({
                          value: bt.value,
                          label: bt.label,
                          description: bt.description,
                        }))}
                        placeholder="Select joint type"
                        className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                        Material *
                      </label>
                      <Select
                        id={`bellows-material-${entry.id}`}
                        value={bellowsMaterial}
                        onChange={(value) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, bellowsMaterial: value },
                          });
                        }}
                        options={BELLOWS_MATERIALS.map((bm) => ({
                          value: bm.value,
                          label: bm.label,
                        }))}
                        placeholder="Select material"
                        className="bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                        Axial Movement (mm)
                      </label>
                      <input
                        type="number"
                        value={axialMovementMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              axialMovementMm: parseFloat(e.target.value) || null,
                            },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                        placeholder="+/- mm"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                        Lateral Movement (mm)
                      </label>
                      <input
                        type="number"
                        value={lateralMovementMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              lateralMovementMm: parseFloat(e.target.value) || null,
                            },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                        placeholder="+/- mm"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1 dark:text-blue-100">
                        Angular Movement (deg)
                      </label>
                      <input
                        type="number"
                        value={angularMovementDeg || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              angularMovementDeg: parseFloat(e.target.value) || null,
                            },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:border-blue-600 dark:text-gray-100"
                        placeholder="+/- deg"
                        step="0.1"
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
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, supplierReference: e.target.value },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                        placeholder="e.g., Flexonics, Belman"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                        Catalog Number
                      </label>
                      <input
                        type="text"
                        value={catalogNumber}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, catalogNumber: e.target.value },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                        placeholder="e.g., EJ-200-AX-SS"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-orange-900 mb-1 dark:text-orange-100">
                        Unit Cost from Supplier (R) *
                      </label>
                      <input
                        type="number"
                        value={unitCostFromSupplier || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              unitCostFromSupplier: parseFloat(e.target.value) || null,
                            },
                          });
                        }}
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
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              markupPercentage: parseFloat(e.target.value) || 15,
                            },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-900/30 dark:border-orange-600 dark:text-gray-100"
                        placeholder="15"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {expansionJointType === 'fabricated_loop' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 dark:bg-green-900/20 dark:border-green-700">
                  <h4 className="text-sm font-bold text-green-900 border-b border-green-400 pb-1.5 mb-3 dark:text-green-100 dark:border-green-600">
                    Loop Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                        Schedule *
                      </label>
                      <Select
                        id={`schedule-${entry.id}`}
                        value={scheduleNumber}
                        onChange={(value) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, scheduleNumber: value },
                          });
                        }}
                        options={SCHEDULE_OPTIONS}
                        placeholder="Select schedule"
                        className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                        Loop Type *
                      </label>
                      <Select
                        id={`loop-type-${entry.id}`}
                        value={loopType}
                        onChange={(value) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, loopType: value },
                          });
                        }}
                        options={FABRICATED_LOOP_TYPES.map((lt) => ({
                          value: lt.value,
                          label: lt.label,
                          description: lt.description,
                        }))}
                        placeholder="Select loop type"
                        className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                        Loop Height (mm) *
                      </label>
                      <input
                        type="number"
                        value={loopHeightMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              loopHeightMm: parseFloat(e.target.value) || null,
                            },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-green-50 text-gray-900 dark:bg-green-900/30 dark:border-green-600 dark:text-gray-100"
                        placeholder="e.g., 500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                        Loop Width (mm)
                      </label>
                      <input
                        type="number"
                        value={loopWidthMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              loopWidthMm: parseFloat(e.target.value) || null,
                            },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-green-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-green-50 text-gray-900 dark:bg-green-900/30 dark:border-green-600 dark:text-gray-100"
                        placeholder="Auto-calculated if blank"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-green-900 mb-1 dark:text-green-100">
                        End Configuration *
                      </label>
                      <Select
                        id={`end-config-${entry.id}`}
                        value={endConfiguration}
                        onChange={(value) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, endConfiguration: value },
                          });
                        }}
                        options={EXPANSION_JOINT_END_OPTIONS.map((opt) => ({
                          value: opt.value,
                          label: opt.label,
                        }))}
                        placeholder="Select end config"
                        className="bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                      />
                    </div>
                  </div>
                </div>
              </>
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
                        specs: { ...entry.specs, quantityValue: parseInt(e.target.value) || 1 },
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
            {expansionJointType === 'bought_in_bellows' && calculationResults && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-900/20 dark:border-orange-700">
                <h5 className="text-sm font-bold text-orange-900 mb-2 dark:text-orange-100">
                  Pricing Calculation
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-orange-800 dark:text-orange-200">Supplier Cost:</div>
                  <div className="font-semibold text-orange-900 dark:text-orange-100">
                    R {unitCostFromSupplier?.toLocaleString() || '-'}
                  </div>
                  <div className="text-orange-800 dark:text-orange-200">Markup ({markupPercentage}%):</div>
                  <div className="font-semibold text-orange-900 dark:text-orange-100">
                    R {calculationResults.markupAmount?.toLocaleString() || '-'}
                  </div>
                  <div className="text-orange-800 dark:text-orange-200">Unit Price:</div>
                  <div className="font-semibold text-orange-900 dark:text-orange-100">
                    R {calculationResults.unitCost?.toLocaleString() || '-'}
                  </div>
                  <div className="text-orange-800 dark:text-orange-200">Total ({quantity} units):</div>
                  <div className="font-bold text-orange-900 dark:text-orange-100">
                    R {calculationResults.totalCost?.toLocaleString() || '-'}
                  </div>
                </div>
              </div>
            )}

            {expansionJointType === 'fabricated_loop' && calculationResults && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-700">
                  <h5 className="text-sm font-bold text-green-900 mb-2 dark:text-green-100">
                    Weight Calculation
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-green-800 dark:text-green-200">Pipe Weight:</div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {calculationResults.pipeWeightKg} kg
                    </div>
                    <div className="text-green-800 dark:text-green-200">
                      Elbow Weight ({calculationResults.numberOfElbows}x):
                    </div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {calculationResults.elbowWeightKg} kg
                    </div>
                    <div className="text-green-800 dark:text-green-200">Flange Weight:</div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      {calculationResults.flangeWeightKg} kg
                    </div>
                    <div className="text-green-800 dark:text-green-200 font-bold">Total Weight:</div>
                    <div className="font-bold text-green-900 dark:text-green-100">
                      {calculationResults.totalWeightKg} kg
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700">
                  <h5 className="text-sm font-bold text-blue-900 mb-2 dark:text-blue-100">
                    Weld Calculations
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-blue-800 dark:text-blue-200">
                      Butt Welds ({calculationResults.numberOfButtWelds}):
                    </div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      {calculationResults.totalButtWeldLengthM} m
                    </div>
                    <div className="text-blue-800 dark:text-blue-200">
                      Flange Welds ({calculationResults.numberOfFlangeWelds}):
                    </div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      {calculationResults.flangeWeldLengthM} m
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
                  <h5 className="text-sm font-bold text-gray-900 mb-2 dark:text-gray-100">
                    Dimensions
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-800 dark:text-gray-200">OD:</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {calculationResults.outsideDiameterMm} mm
                    </div>
                    <div className="text-gray-800 dark:text-gray-200">Wall Thickness:</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {calculationResults.wallThicknessMm} mm
                    </div>
                    <div className="text-gray-800 dark:text-gray-200">Total Pipe Length:</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {calculationResults.pipeLengthTotalMm} mm
                    </div>
                  </div>
                </div>
              </>
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
