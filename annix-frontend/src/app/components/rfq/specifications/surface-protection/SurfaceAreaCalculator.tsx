"use client";

import { useMemo, useState } from "react";

interface PipeItem {
  id: string;
  type: "straight" | "bend" | "reducer" | "tee";
  nominalBoreMm: number;
  lengthMm: number;
  quantity: number;
  description?: string;
}

interface SurfaceAreaResult {
  itemId: string;
  description: string;
  internalAreaM2: number;
  externalAreaM2: number;
  totalAreaM2: number;
}

interface SurfaceAreaCalculatorProps {
  items?: PipeItem[];
  onCalculationComplete?: (results: {
    totalInternal: number;
    totalExternal: number;
    totalArea: number;
    itemBreakdown: SurfaceAreaResult[];
  }) => void;
}

const NB_TO_OD_MAP: Record<number, number> = {
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73.0,
  80: 88.9,
  100: 114.3,
  125: 139.7,
  150: 168.3,
  200: 219.1,
  250: 273.0,
  300: 323.9,
  350: 355.6,
  400: 406.4,
  450: 457.2,
  500: 508.0,
  600: 609.6,
  750: 762.0,
  900: 914.4,
  1000: 1016.0,
  1200: 1219.2,
};

export function SurfaceAreaCalculator({
  items: propItems,
  onCalculationComplete,
}: SurfaceAreaCalculatorProps) {
  const [manualItems, setManualItems] = useState<PipeItem[]>([
    {
      id: "1",
      type: "straight",
      nominalBoreMm: 150,
      lengthMm: 6000,
      quantity: 10,
      description: "DN150 Straight Pipe",
    },
  ]);

  const [includeInternal, setIncludeInternal] = useState(true);
  const [includeExternal, setIncludeExternal] = useState(true);
  const [wastagePercent, setWastagePercent] = useState(10);

  const items = propItems || manualItems;

  const odFromNb = (nb: number): number => {
    return NB_TO_OD_MAP[nb] || nb + 10;
  };

  const calculateSurfaceArea = (item: PipeItem): SurfaceAreaResult => {
    const odMm = odFromNb(item.nominalBoreMm);
    const idMm = item.nominalBoreMm;
    const lengthM = item.lengthMm / 1000;

    let internalArea = 0;
    let externalArea = 0;

    switch (item.type) {
      case "straight":
        internalArea = Math.PI * (idMm / 1000) * lengthM;
        externalArea = Math.PI * (odMm / 1000) * lengthM;
        break;
      case "bend":
        internalArea = Math.PI * (idMm / 1000) * lengthM * 1.1;
        externalArea = Math.PI * (odMm / 1000) * lengthM * 1.1;
        break;
      case "reducer":
        internalArea = Math.PI * (idMm / 1000) * lengthM * 0.8;
        externalArea = Math.PI * (odMm / 1000) * lengthM * 0.8;
        break;
      case "tee":
        internalArea = Math.PI * (idMm / 1000) * lengthM * 1.5;
        externalArea = Math.PI * (odMm / 1000) * lengthM * 1.5;
        break;
    }

    internalArea *= item.quantity;
    externalArea *= item.quantity;

    return {
      itemId: item.id,
      description: item.description || `${item.type} DN${item.nominalBoreMm}`,
      internalAreaM2: Math.round(internalArea * 100) / 100,
      externalAreaM2: Math.round(externalArea * 100) / 100,
      totalAreaM2:
        Math.round(
          ((includeInternal ? internalArea : 0) + (includeExternal ? externalArea : 0)) * 100,
        ) / 100,
    };
  };

  const results = useMemo(() => {
    const itemBreakdown = items.map(calculateSurfaceArea);
    const totalInternal = itemBreakdown.reduce((sum, r) => sum + r.internalAreaM2, 0);
    const totalExternal = itemBreakdown.reduce((sum, r) => sum + r.externalAreaM2, 0);
    const totalArea = itemBreakdown.reduce((sum, r) => sum + r.totalAreaM2, 0);

    return {
      itemBreakdown,
      totalInternal: Math.round(totalInternal * 100) / 100,
      totalExternal: Math.round(totalExternal * 100) / 100,
      totalArea: Math.round(totalArea * 100) / 100,
      totalWithWastage: Math.round(totalArea * (1 + wastagePercent / 100) * 100) / 100,
    };
  }, [items, includeInternal, includeExternal, wastagePercent]);

  const addItem = () => {
    const newId = String(manualItems.length + 1);
    setManualItems([
      ...manualItems,
      {
        id: newId,
        type: "straight",
        nominalBoreMm: 150,
        lengthMm: 6000,
        quantity: 1,
        description: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setManualItems(manualItems.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<PipeItem>) => {
    setManualItems(manualItems.map((item) => (item.id === id ? { ...item, ...updates } : item)));
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
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          Surface Area Calculator
        </h3>
      </div>

      {/* Options */}
      <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeInternal"
            checked={includeInternal}
            onChange={(e) => setIncludeInternal(e.target.checked)}
            className="rounded text-blue-600"
          />
          <label htmlFor="includeInternal" className="text-xs font-medium text-gray-700">
            Include Internal
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeExternal"
            checked={includeExternal}
            onChange={(e) => setIncludeExternal(e.target.checked)}
            className="rounded text-blue-600"
          />
          <label htmlFor="includeExternal" className="text-xs font-medium text-gray-700">
            Include External
          </label>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-medium text-gray-600 mb-1">
            Wastage Allowance (%)
          </label>
          <input
            type="number"
            value={wastagePercent}
            onChange={(e) => setWastagePercent(parseInt(e.target.value, 10) || 0)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Manual Item Entry (if no prop items) */}
      {!propItems && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Pipe Items</span>
            <button
              type="button"
              onClick={addItem}
              className="px-2 py-1 text-[10px] font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {manualItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-6 gap-2 items-center p-2 bg-gray-50 rounded"
              >
                <select
                  value={item.type}
                  onChange={(e) =>
                    updateItem(item.id, {
                      type: e.target.value as PipeItem["type"],
                    })
                  }
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="straight">Straight</option>
                  <option value="bend">Bend</option>
                  <option value="reducer">Reducer</option>
                  <option value="tee">Tee</option>
                </select>
                <div>
                  <label className="block text-[10px] text-gray-500">NB (mm)</label>
                  <select
                    value={item.nominalBoreMm}
                    onChange={(e) =>
                      updateItem(item.id, {
                        nominalBoreMm: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    {Object.keys(NB_TO_OD_MAP).map((nb) => (
                      <option key={nb} value={nb}>
                        DN{nb}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">Length (mm)</label>
                  <input
                    type="number"
                    value={item.lengthMm}
                    onChange={(e) =>
                      updateItem(item.id, {
                        lengthMm: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">Description</label>
                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-600">Item</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">Internal (m2)</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">External (m2)</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-600">Total (m2)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.itemBreakdown.map((result) => (
              <tr key={result.itemId}>
                <td className="px-2 py-1.5 text-gray-900">{result.description}</td>
                <td className="px-2 py-1.5 text-right text-gray-700">
                  {includeInternal ? result.internalAreaM2.toFixed(2) : "-"}
                </td>
                <td className="px-2 py-1.5 text-right text-gray-700">
                  {includeExternal ? result.externalAreaM2.toFixed(2) : "-"}
                </td>
                <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                  {result.totalAreaM2.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-2 py-2 font-semibold text-gray-900">Subtotal</td>
              <td className="px-2 py-2 text-right font-semibold text-gray-900">
                {includeInternal ? results.totalInternal.toFixed(2) : "-"}
              </td>
              <td className="px-2 py-2 text-right font-semibold text-gray-900">
                {includeExternal ? results.totalExternal.toFixed(2) : "-"}
              </td>
              <td className="px-2 py-2 text-right font-semibold text-gray-900">
                {results.totalArea.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td colSpan={3} className="px-2 py-2 font-bold text-blue-900">
                Total with {wastagePercent}% Wastage
              </td>
              <td className="px-2 py-2 text-right font-bold text-blue-900">
                {results.totalWithWastage.toFixed(2)} m2
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Calculate Button */}
      {onCalculationComplete && (
        <button
          type="button"
          onClick={() =>
            onCalculationComplete({
              totalInternal: results.totalInternal,
              totalExternal: results.totalExternal,
              totalArea: results.totalWithWastage,
              itemBreakdown: results.itemBreakdown,
            })
          }
          className="w-full mt-4 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
        >
          Use Calculated Areas
        </button>
      )}
    </div>
  );
}
