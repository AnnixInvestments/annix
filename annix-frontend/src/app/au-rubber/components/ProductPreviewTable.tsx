"use client";

import { Trash2 } from "lucide-react";
import { type AnalyzedProductLine } from "@/app/lib/api/auRubberApi";
import type { RubberProductCodingDto } from "@/app/lib/api/rubberPortalApi";
import type { CostSettings } from "./ProductCostBuilder";

export interface EditableProductLine extends AnalyzedProductLine {
  calculatedPrice: number | null;
  selected: boolean;
}

interface ProductPreviewTableProps {
  products: EditableProductLine[];
  costSettings: CostSettings;
  codings: RubberProductCodingDto[];
  onUpdate: (index: number, updates: Partial<EditableProductLine>) => void;
  onDelete: (index: number) => void;
  onToggleSelect: (index: number) => void;
  onSelectAll: (selected: boolean) => void;
}

function calculateFinalPrice(
  baseCost: number | null,
  compound: string | null,
  settings: CostSettings,
): number | null {
  if (baseCost === null) return null;

  const categoryMarkup = settings.categoryMarkups.find(
    (m) => m.compoundType.toLowerCase() === compound?.toLowerCase(),
  );
  const markupPercent = categoryMarkup?.markupPercent ?? settings.defaultMarginPercent;

  const afterMaterial = baseCost * (settings.baseMaterialPercent / 100);
  const afterProcessing = afterMaterial + settings.processingFeePerKg;
  const afterOverhead = afterProcessing * (1 + settings.overheadPercent / 100);
  const finalPrice = afterOverhead * (1 + markupPercent / 100);

  return Math.round(finalPrice * 100) / 100;
}

export function ProductPreviewTable({
  products,
  costSettings,
  codings,
  onUpdate,
  onDelete,
  onToggleSelect,
  onSelectAll,
}: ProductPreviewTableProps) {
  const typeCodings = codings.filter((c) => c.codingType === "TYPE");
  const compoundCodings = codings.filter((c) => c.codingType === "COMPOUND");
  const colourCodings = codings.filter((c) => c.codingType === "COLOUR");
  const hardnessCodings = codings.filter((c) => c.codingType === "HARDNESS");

  const allSelected = products.length > 0 && products.every((p) => p.selected);
  const someSelected = products.some((p) => p.selected);

  const handleFieldChange = (
    index: number,
    field: keyof EditableProductLine,
    value: string | number | null,
  ) => {
    const updates: Partial<EditableProductLine> = { [field]: value };

    if (field === "baseCostPerKg" || field === "compound") {
      const product = products[index];
      const newBaseCost = field === "baseCostPerKg" ? (value as number) : product.baseCostPerKg;
      const newCompound = field === "compound" ? (value as string) : product.compound;
      updates.calculatedPrice = calculateFinalPrice(newBaseCost, newCompound, costSettings);
    }

    onUpdate(index, updates);
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return "-";
    return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compound
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Colour
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hardness
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Base Cost
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Final Price
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => (
              <tr
                key={index}
                className={`${product.selected ? "bg-yellow-50" : ""} ${
                  product.confidence < 0.5 ? "bg-red-50" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={product.selected}
                    onChange={() => onToggleSelect(index)}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">{product.lineNumber}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={product.title || ""}
                    onChange={(e) => handleFieldChange(index, "title", e.target.value || null)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Product title"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={product.type || ""}
                    onChange={(e) => handleFieldChange(index, "type", e.target.value || null)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select type</option>
                    {typeCodings.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={product.compound || ""}
                    onChange={(e) => handleFieldChange(index, "compound", e.target.value || null)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select compound</option>
                    {compoundCodings.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={product.colour || ""}
                    onChange={(e) => handleFieldChange(index, "colour", e.target.value || null)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select colour</option>
                    {colourCodings.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={product.hardness || ""}
                    onChange={(e) => handleFieldChange(index, "hardness", e.target.value || null)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select hardness</option>
                    {hardnessCodings.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    value={product.baseCostPerKg ?? ""}
                    onChange={(e) =>
                      handleFieldChange(
                        index,
                        "baseCostPerKg",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="R/kg"
                    step={0.01}
                    min={0}
                  />
                </td>
                <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(product.calculatedPrice)}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onDelete(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">No products to display</div>
      )}
      {products.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          {products.length} product{products.length !== 1 ? "s" : ""} |{" "}
          {products.filter((p) => p.selected).length} selected
        </div>
      )}
    </div>
  );
}

export function recalculatePrices(
  products: EditableProductLine[],
  costSettings: CostSettings,
): EditableProductLine[] {
  return products.map((product) => ({
    ...product,
    calculatedPrice: calculateFinalPrice(product.baseCostPerKg, product.compound, costSettings),
  }));
}
