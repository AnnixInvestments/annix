"use client";

import { useCallback, useState } from "react";
import BracketsAndPlatesSection from "@/app/components/rfq/sections/BracketsAndPlatesSection";
import { BracketEntry, CompensationPlateEntry } from "@/app/lib/config/rfq/bracketsAndPlates";
import {
  formatCurrency,
  formatWeight,
  summarizeBracketsAndPlates,
} from "@/app/lib/utils/bracketCalculations";

export default function BracketsAndPlatesTestPage() {
  const [brackets, setBrackets] = useState<BracketEntry[]>([]);
  const [plates, setPlates] = useState<CompensationPlateEntry[]>([]);
  const [showJson, setShowJson] = useState(false);

  const handleDataChange = useCallback(
    (newBrackets: BracketEntry[], newPlates: CompensationPlateEntry[]) => {
      setBrackets(newBrackets);
      setPlates(newPlates);
    },
    [],
  );

  const summary = summarizeBracketsAndPlates(brackets, plates);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Brackets & Compensation Plates</h1>
              <p className="text-slate-600 mt-2">
                Standalone module for adding pipe support brackets and reinforcement plates
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/rfq"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                Back to RFQ
              </a>
              <button
                onClick={() => setShowJson(!showJson)}
                className="px-4 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                {showJson ? "Hide" : "Show"} JSON Data
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Brackets</p>
              <p className="text-2xl font-bold text-blue-600">{summary.totalBrackets}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Plates</p>
              <p className="text-2xl font-bold text-purple-600">{summary.totalPlates}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Combined Weight</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatWeight(summary.grandTotalWeight)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Combined Cost</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.grandTotalCost)}
              </p>
            </div>
          </div>
        </div>

        <BracketsAndPlatesSection
          initialBrackets={brackets}
          initialPlates={plates}
          onDataChange={handleDataChange}
        />

        {showJson && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-4 py-3">
              <h3 className="text-sm font-medium text-white">JSON Data Output</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Brackets ({brackets.length})
                  </h4>
                  <pre className="bg-slate-50 rounded-lg p-4 text-xs overflow-auto max-h-96 border border-slate-200">
                    {JSON.stringify(brackets, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Compensation Plates ({plates.length})
                  </h4>
                  <pre className="bg-slate-50 rounded-lg p-4 text-xs overflow-auto max-h-96 border border-slate-200">
                    {JSON.stringify(plates, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">Module Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-amber-800">
            <div>
              <h4 className="font-semibold mb-2">Steel Materials Supported:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Carbon Steel (ASTM A53/A106, API 5L)</li>
                <li>Alloy Steel (ASTM A335 P11/P22)</li>
                <li>Stainless Steel (304/304L, 316/316L)</li>
                <li>Abrasion-Resistant Steel (AR400/450/500)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Features:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Custom bracket dimensions (L, U, Flat types)</li>
                <li>Standard plate sizes (100-500mm)</li>
                <li>Custom plate dimensions</li>
                <li>Automatic weight calculations</li>
                <li>Cost per kg override option</li>
                <li>Duplicate and remove functionality</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-200">
            <p className="text-xs text-amber-700">
              <strong>Weight Calculation:</strong> Volume (m³) × Density (kg/m³) |{" "}
              <strong>Cost Calculation:</strong> Weight (kg) × Cost per kg (ZAR)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
