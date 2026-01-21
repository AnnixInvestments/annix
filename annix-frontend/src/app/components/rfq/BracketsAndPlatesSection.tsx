'use client';

import React, { useState, useCallback } from 'react';
import { BracketEntry, CompensationPlateEntry, defaultBracketDimensions, defaultPlateDimensions } from '@/app/lib/config/rfq/bracketsAndPlates';
import { STEEL_MATERIALS } from '@/app/lib/config/rfq/steelMaterials';
import {
  summarizeBracketsAndPlates,
  formatCurrency,
  formatWeight,
  calculateBracket,
  calculateCompensationPlate,
  recalculateBracketEntry,
  recalculatePlateEntry,
} from '@/app/lib/utils/bracketCalculations';
import BracketForm from './forms/BracketForm';
import CompensationPlateForm from './forms/CompensationPlateForm';

interface BracketsAndPlatesSectionProps {
  initialBrackets?: BracketEntry[];
  initialPlates?: CompensationPlateEntry[];
  onDataChange?: (brackets: BracketEntry[], plates: CompensationPlateEntry[]) => void;
}

export default function BracketsAndPlatesSection({
  initialBrackets = [],
  initialPlates = [],
  onDataChange,
}: BracketsAndPlatesSectionProps) {
  const [brackets, setBrackets] = useState<BracketEntry[]>(initialBrackets);
  const [plates, setPlates] = useState<CompensationPlateEntry[]>(initialPlates);
  const [activeTab, setActiveTab] = useState<'brackets' | 'plates'>('brackets');

  const notifyChange = useCallback(
    (newBrackets: BracketEntry[], newPlates: CompensationPlateEntry[]) => {
      if (onDataChange) {
        onDataChange(newBrackets, newPlates);
      }
    },
    [onDataChange]
  );

  const handleAddBracket = useCallback(
    (entry: BracketEntry) => {
      const newBrackets = [...brackets, entry];
      setBrackets(newBrackets);
      notifyChange(newBrackets, plates);
    },
    [brackets, plates, notifyChange]
  );

  const handleUpdateBracket = useCallback(
    (id: string, updates: Partial<BracketEntry>) => {
      const newBrackets = brackets.map((b) => {
        if (b.id === id) {
          const updated = { ...b, ...updates };
          return recalculateBracketEntry(updated);
        }
        return b;
      });
      setBrackets(newBrackets);
      notifyChange(newBrackets, plates);
    },
    [brackets, plates, notifyChange]
  );

  const handleRemoveBracket = useCallback(
    (id: string) => {
      const newBrackets = brackets.filter((b) => b.id !== id);
      setBrackets(newBrackets);
      notifyChange(newBrackets, plates);
    },
    [brackets, plates, notifyChange]
  );

  const handleDuplicateBracket = useCallback(
    (entry: BracketEntry) => {
      const newEntry: BracketEntry = {
        ...entry,
        id: `bracket-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
      const newBrackets = [...brackets, newEntry];
      setBrackets(newBrackets);
      notifyChange(newBrackets, plates);
    },
    [brackets, plates, notifyChange]
  );

  const handleAddPlate = useCallback(
    (entry: CompensationPlateEntry) => {
      const newPlates = [...plates, entry];
      setPlates(newPlates);
      notifyChange(brackets, newPlates);
    },
    [brackets, plates, notifyChange]
  );

  const handleUpdatePlate = useCallback(
    (id: string, updates: Partial<CompensationPlateEntry>) => {
      const newPlates = plates.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          return recalculatePlateEntry(updated);
        }
        return p;
      });
      setPlates(newPlates);
      notifyChange(brackets, newPlates);
    },
    [brackets, plates, notifyChange]
  );

  const handleRemovePlate = useCallback(
    (id: string) => {
      const newPlates = plates.filter((p) => p.id !== id);
      setPlates(newPlates);
      notifyChange(brackets, newPlates);
    },
    [brackets, plates, notifyChange]
  );

  const handleDuplicatePlate = useCallback(
    (entry: CompensationPlateEntry) => {
      const newEntry: CompensationPlateEntry = {
        ...entry,
        id: `plate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
      const newPlates = [...plates, newEntry];
      setPlates(newPlates);
      notifyChange(brackets, newPlates);
    },
    [brackets, plates, notifyChange]
  );

  const summary = summarizeBracketsAndPlates(brackets, plates);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Brackets & Compensation Plates</h2>
            <p className="text-slate-300 text-sm mt-1">
              Add pipe support brackets and reinforcement plates for your pipework
            </p>
          </div>
          <div className="flex items-center gap-4 text-white">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Items</p>
              <p className="text-lg font-bold">{summary.totalBrackets + summary.totalPlates}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Weight</p>
              <p className="text-lg font-bold">{formatWeight(summary.grandTotalWeight)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Cost</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(summary.grandTotalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            type="button"
            onClick={() => setActiveTab('brackets')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'brackets'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Brackets
              {brackets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {brackets.length}
                </span>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plates')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'plates'
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
              Compensation Plates
              {plates.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                  {plates.length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'brackets' ? (
          <BracketForm
            entries={brackets}
            onAddEntry={handleAddBracket}
            onUpdateEntry={handleUpdateBracket}
            onRemoveEntry={handleRemoveBracket}
            onDuplicateEntry={handleDuplicateBracket}
          />
        ) : (
          <CompensationPlateForm
            entries={plates}
            onAddEntry={handleAddPlate}
            onUpdateEntry={handleUpdatePlate}
            onRemoveEntry={handleRemovePlate}
            onDuplicateEntry={handleDuplicatePlate}
          />
        )}
      </div>

      {(brackets.length > 0 || plates.length > 0) && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
            <div className="flex gap-8">
              {brackets.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Brackets ({summary.totalBrackets} pcs)</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatWeight(summary.totalBracketWeight)} | {formatCurrency(summary.totalBracketCost)}
                  </p>
                </div>
              )}
              {plates.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Plates ({summary.totalPlates} pcs)</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatWeight(summary.totalPlateWeight)} | {formatCurrency(summary.totalPlateCost)}
                  </p>
                </div>
              )}
              <div className="text-right border-l border-gray-300 pl-8">
                <p className="text-xs text-gray-500">Grand Total</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.grandTotalCost)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
