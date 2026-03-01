"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export interface CostSettings {
  baseMaterialPercent: number;
  processingFeePerKg: number;
  overheadPercent: number;
  defaultMarginPercent: number;
  categoryMarkups: CategoryMarkup[];
}

export interface CategoryMarkup {
  compoundType: string;
  markupPercent: number;
}

interface ProductCostBuilderProps {
  detectedCompounds: string[];
  onApply: (settings: CostSettings) => void;
}

const DEFAULT_COST_SETTINGS: CostSettings = {
  baseMaterialPercent: 100,
  processingFeePerKg: 0,
  overheadPercent: 0,
  defaultMarginPercent: 30,
  categoryMarkups: [],
};

export function ProductCostBuilder({ detectedCompounds, onApply }: ProductCostBuilderProps) {
  const [settings, setSettings] = useState<CostSettings>(() => ({
    ...DEFAULT_COST_SETTINGS,
    categoryMarkups: detectedCompounds.map((compound) => ({
      compoundType: compound,
      markupPercent: 30,
    })),
  }));

  const handleFieldChange = (field: keyof CostSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryMarkupChange = (index: number, markupPercent: number) => {
    setSettings((prev) => ({
      ...prev,
      categoryMarkups: prev.categoryMarkups.map((item, i) =>
        i === index ? { ...item, markupPercent } : item,
      ),
    }));
  };

  const handleAddCategoryMarkup = () => {
    setSettings((prev) => ({
      ...prev,
      categoryMarkups: [...prev.categoryMarkups, { compoundType: "", markupPercent: 30 }],
    }));
  };

  const handleRemoveCategoryMarkup = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      categoryMarkups: prev.categoryMarkups.filter((_, i) => i !== index),
    }));
  };

  const handleCategoryTypeChange = (index: number, compoundType: string) => {
    setSettings((prev) => ({
      ...prev,
      categoryMarkups: prev.categoryMarkups.map((item, i) =>
        i === index ? { ...item, compoundType } : item,
      ),
    }));
  };

  const handleApply = () => {
    onApply(settings);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Builder</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure how final prices are calculated from base costs
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base Material %</label>
          <input
            type="number"
            value={settings.baseMaterialPercent}
            onChange={(e) =>
              handleFieldChange("baseMaterialPercent", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            min={0}
            max={200}
            step={1}
          />
          <p className="mt-1 text-xs text-gray-500">Multiplier for base material cost</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Processing Fee (R/kg)
          </label>
          <input
            type="number"
            value={settings.processingFeePerKg}
            onChange={(e) =>
              handleFieldChange("processingFeePerKg", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            min={0}
            step={0.5}
          />
          <p className="mt-1 text-xs text-gray-500">Added per kg</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overhead %</label>
          <input
            type="number"
            value={settings.overheadPercent}
            onChange={(e) => handleFieldChange("overheadPercent", parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            min={0}
            max={100}
            step={1}
          />
          <p className="mt-1 text-xs text-gray-500">General overhead percentage</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Margin %</label>
          <input
            type="number"
            value={settings.defaultMarginPercent}
            onChange={(e) =>
              handleFieldChange("defaultMarginPercent", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            min={0}
            max={200}
            step={1}
          />
          <p className="mt-1 text-xs text-gray-500">Default markup if no category override</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Per-Category Markup Overrides</h4>
          <button
            type="button"
            onClick={handleAddCategoryMarkup}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 rounded hover:bg-yellow-100"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Category
          </button>
        </div>

        {settings.categoryMarkups.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No category overrides. Default margin will be applied to all products.
          </p>
        ) : (
          <div className="space-y-2">
            {settings.categoryMarkups.map((markup, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={markup.compoundType}
                  onChange={(e) => handleCategoryTypeChange(index, e.target.value)}
                  placeholder="Compound type (e.g., Natural Rubber)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-yellow-500 focus:border-yellow-500"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={markup.markupPercent}
                    onChange={(e) =>
                      handleCategoryMarkupChange(index, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-yellow-500 focus:border-yellow-500"
                    min={0}
                    max={200}
                    step={1}
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCategoryMarkup(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <p className="text-xs text-gray-600 font-mono">
            Final Price = (Base Cost × {settings.baseMaterialPercent}%) + R
            {settings.processingFeePerKg}/kg
            {settings.overheadPercent > 0 && ` + ${settings.overheadPercent}% overhead`}
            {" + markup%"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
        >
          Apply & Preview Prices
        </button>
      </div>
    </div>
  );
}
