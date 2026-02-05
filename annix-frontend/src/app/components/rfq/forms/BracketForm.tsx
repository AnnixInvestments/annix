'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { generateUniqueId } from '@/app/lib/datetime';
import {
  BracketEntry,
  BracketType,
  BRACKET_TYPES,
  defaultBracketDimensions,
} from '@/app/lib/config/rfq/bracketsAndPlates';
import { STEEL_MATERIALS, STEEL_MATERIAL_CATEGORIES, steelMaterialById } from '@/app/lib/config/rfq/steelMaterials';
import {
  calculateBracket,
  validateBracketDimensions,
  formatCurrency,
  formatWeight,
} from '@/app/lib/utils/bracketCalculations';

interface BracketFormProps {
  entries: BracketEntry[];
  onAddEntry: (entry: BracketEntry) => void;
  onUpdateEntry: (id: string, updates: Partial<BracketEntry>) => void;
  onRemoveEntry: (id: string) => void;
  onDuplicateEntry: (entry: BracketEntry) => void;
}

const generateId = (): string => `bracket-${generateUniqueId()}`;

export default function BracketForm({
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onDuplicateEntry,
}: BracketFormProps) {
  const addNewBracket = () => {
    const defaultMaterial = STEEL_MATERIALS[0];
    const dimensions = defaultBracketDimensions();
    const result = calculateBracket('L_BRACKET', dimensions, defaultMaterial.id, null, 1);

    const newEntry: BracketEntry = {
      id: generateId(),
      bracketType: 'L_BRACKET',
      dimensions,
      materialId: defaultMaterial.id,
      costPerKgOverride: null,
      quantity: 1,
      calculatedWeightKg: result.weightKg,
      calculatedCostPerUnit: result.costPerUnit,
      calculatedTotalCost: result.totalCost,
    };

    onAddEntry(newEntry);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Brackets</h3>
        <button
          type="button"
          onClick={addNewBracket}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Bracket
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-500 mb-2">No brackets added yet</p>
          <p className="text-sm text-gray-400">Click "Add Bracket" to add pipe support brackets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <BracketEntryCard
              key={entry.id}
              entry={entry}
              index={index}
              onUpdate={(updates) => onUpdateEntry(entry.id, updates)}
              onRemove={() => onRemoveEntry(entry.id)}
              onDuplicate={() => onDuplicateEntry(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BracketEntryCardProps {
  entry: BracketEntry;
  index: number;
  onUpdate: (updates: Partial<BracketEntry>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function BracketEntryCard({ entry, index, onUpdate, onRemove, onDuplicate }: BracketEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCostOverride, setShowCostOverride] = useState(entry.costPerKgOverride !== null);

  const material = useMemo(() => steelMaterialById(entry.materialId), [entry.materialId]);
  const validationErrors = useMemo(() => validateBracketDimensions(entry.dimensions), [entry.dimensions]);

  const effectiveCostPerKg = entry.costPerKgOverride !== null ? entry.costPerKgOverride : (material?.defaultCostPerKg || 0);

  useEffect(() => {
    const result = calculateBracket(
      entry.bracketType,
      entry.dimensions,
      entry.materialId,
      entry.costPerKgOverride,
      entry.quantity
    );

    if (
      result.weightKg !== entry.calculatedWeightKg ||
      result.costPerUnit !== entry.calculatedCostPerUnit ||
      result.totalCost !== entry.calculatedTotalCost
    ) {
      onUpdate({
        calculatedWeightKg: result.weightKg,
        calculatedCostPerUnit: result.costPerUnit,
        calculatedTotalCost: result.totalCost,
      });
    }
  }, [entry.bracketType, entry.dimensions, entry.materialId, entry.costPerKgOverride, entry.quantity]);

  const updateDimension = (field: keyof typeof entry.dimensions, value: number) => {
    onUpdate({
      dimensions: {
        ...entry.dimensions,
        [field]: value,
      },
    });
  };

  const bracketTypeInfo = BRACKET_TYPES.find((t) => t.id === entry.bracketType);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white text-sm font-bold rounded-full">
            {index + 1}
          </span>
          <div>
            <h4 className="font-semibold text-gray-900">
              {bracketTypeInfo?.name || 'Bracket'} - {material?.code || 'Unknown'}
            </h4>
            <p className="text-sm text-gray-500">
              {entry.dimensions.leg1LengthMm}×{entry.dimensions.leg2LengthMm}×{entry.dimensions.thicknessMm}mm | Qty: {entry.quantity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{formatWeight(entry.calculatedWeightKg)}</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(entry.calculatedTotalCost)}</p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bracket Type</label>
              <select
                value={entry.bracketType}
                onChange={(e) => onUpdate({ bracketType: e.target.value as BracketType })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BRACKET_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{bracketTypeInfo?.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <select
                value={entry.materialId}
                onChange={(e) => onUpdate({ materialId: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STEEL_MATERIAL_CATEGORIES.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {STEEL_MATERIALS.filter((m) => m.category === cat.id).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {material && (
                <p className="text-xs text-gray-500 mt-1">
                  Density: {material.densityKgM3} kg/m³ | Default cost: R{material.defaultCostPerKg}/kg
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">Dimensions (mm)</h5>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leg 1 Length</label>
                <input
                  type="number"
                  value={entry.dimensions.leg1LengthMm}
                  onChange={(e) => updateDimension('leg1LengthMm', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={2000}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leg 2 Length</label>
                <input
                  type="number"
                  value={entry.dimensions.leg2LengthMm}
                  onChange={(e) => updateDimension('leg2LengthMm', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={2000}
                  disabled={entry.bracketType === 'FLAT_BRACKET'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Width</label>
                <input
                  type="number"
                  value={entry.dimensions.widthMm}
                  onChange={(e) => updateDimension('widthMm', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={500}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Thickness</label>
                <input
                  type="number"
                  value={entry.dimensions.thicknessMm}
                  onChange={(e) => updateDimension('thicknessMm', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={50}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Angle (°)</label>
                <input
                  type="number"
                  value={entry.dimensions.angleDegrees}
                  onChange={(e) => updateDimension('angleDegrees', parseFloat(e.target.value) || 90)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={30}
                  max={180}
                  disabled={entry.bracketType === 'FLAT_BRACKET'}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={entry.quantity ?? ''}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  if (rawValue === '') {
                    onUpdate({ quantity: undefined });
                    return;
                  }
                  onUpdate({ quantity: parseInt(rawValue) });
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || parseInt(e.target.value) < 1) {
                    onUpdate({ quantity: 1 });
                  }
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Cost per kg</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCostOverride(!showCostOverride);
                    if (showCostOverride) {
                      onUpdate({ costPerKgOverride: null });
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showCostOverride ? 'Use default' : 'Override'}
                </button>
              </div>
              {showCostOverride ? (
                <input
                  type="number"
                  value={entry.costPerKgOverride || ''}
                  onChange={(e) => onUpdate({ costPerKgOverride: parseFloat(e.target.value) || null })}
                  placeholder={`Default: R${material?.defaultCostPerKg || 0}`}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={0}
                  step={0.01}
                />
              ) : (
                <div className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                  R {effectiveCostPerKg.toFixed(2)} / kg
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={entry.notes || ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="e.g., Location, purpose..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDuplicate}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                Duplicate
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-500">Unit Weight</p>
                  <p className="text-sm font-semibold text-gray-900">{formatWeight(entry.calculatedWeightKg)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unit Cost</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(entry.calculatedCostPerUnit)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(entry.calculatedTotalCost)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
