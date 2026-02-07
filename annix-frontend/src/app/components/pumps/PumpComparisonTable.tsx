"use client";

import { useMemo, useState } from "react";
import { PumpProductCardData } from "./PumpProductCard";

interface PumpComparisonTableProps {
  products: PumpProductCardData[];
  onRemoveProduct?: (productId: number) => void;
  onRequestQuote?: (products: PumpProductCardData[]) => void;
}

interface ComparisonSpec {
  key: string;
  label: string;
  unit?: string;
  format?: (value: any, product: PumpProductCardData) => string;
  highlight?: "highest" | "lowest";
}

const COMPARISON_SPECS: ComparisonSpec[] = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "modelNumber", label: "Model Number" },
  { key: "pumpType", label: "Pump Type" },
  {
    key: "category",
    label: "Category",
    format: (v: string, _p) =>
      v?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "-",
  },
  {
    key: "flowRateRange",
    label: "Flow Rate",
    unit: "m³/h",
    format: (_v, product) => formatRange(product.flowRateMin, product.flowRateMax),
  },
  {
    key: "headRange",
    label: "Head",
    unit: "m",
    format: (_v, product) => formatRange(product.headMin, product.headMax),
  },
  { key: "motorPowerKw", label: "Motor Power", unit: "kW", highlight: "lowest" },
  {
    key: "listPrice",
    label: "List Price",
    format: (v: number | null, _p) => (v ? `R ${v.toLocaleString("en-ZA")}` : "Request quote"),
    highlight: "lowest",
  },
  {
    key: "stockQuantity",
    label: "Stock",
    format: (v: number, _p) => (v > 0 ? `${v} available` : "Out of stock"),
  },
  {
    key: "certifications",
    label: "Certifications",
    format: (v: string[] | null, _p) => (v?.length ? v.join(", ") : "-"),
  },
  {
    key: "status",
    label: "Status",
    format: (v: string, _p) => v?.charAt(0).toUpperCase() + v?.slice(1) || "-",
  },
];

function formatRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${min} - ${max}`;
  }
  if (min !== null && min !== undefined) {
    return `${min}+`;
  }
  if (max !== null && max !== undefined) {
    return `Up to ${max}`;
  }
  return "-";
}

function specValue(spec: ComparisonSpec, product: PumpProductCardData): string {
  const value = (product as any)[spec.key];
  if (spec.format) {
    return spec.format(value, product);
  }
  if (value === null || value === undefined) {
    return "-";
  }
  if (spec.unit) {
    return `${value} ${spec.unit}`;
  }
  return String(value);
}

function findHighlightedIndex(
  spec: ComparisonSpec,
  products: PumpProductCardData[],
): number | null {
  if (!spec.highlight) return null;

  const values = products.map((p) => {
    const val = (p as any)[spec.key];
    return typeof val === "number" ? val : null;
  });

  const numericValues = values.filter((v): v is number => v !== null);
  if (numericValues.length < 2) return null;

  const targetValue =
    spec.highlight === "highest" ? Math.max(...numericValues) : Math.min(...numericValues);

  return values.indexOf(targetValue);
}

export function PumpComparisonTable({
  products,
  onRemoveProduct,
  onRequestQuote,
}: PumpComparisonTableProps) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  const visibleSpecs = useMemo(() => {
    if (!showDifferencesOnly) return COMPARISON_SPECS;

    return COMPARISON_SPECS.filter((spec) => {
      const values = products.map((p) => specValue(spec, p));
      const uniqueValues = new Set(values);
      return uniqueValues.size > 1;
    });
  }, [products, showDifferencesOnly]);

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products to compare</h3>
        <p className="text-gray-600">
          Select products from the catalog to compare specifications side-by-side.
        </p>
      </div>
    );
  }

  if (products.length === 1) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-700">Select at least 2 products to compare specifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Comparing {products.length} Products
          </h3>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showDifferencesOnly}
              onChange={(e) => setShowDifferencesOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show differences only
          </label>
        </div>
        {onRequestQuote && (
          <button
            onClick={() => onRequestQuote(products)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Request Quote for All
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[180px]">
                Specification
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-900 min-w-[200px]"
                >
                  <div className="flex flex-col items-center gap-2">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 line-clamp-2">
                        {product.title}
                      </div>
                      <div className="text-xs text-gray-500">{product.sku}</div>
                    </div>
                    {onRemoveProduct && (
                      <button
                        onClick={() => onRemoveProduct(product.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove from comparison"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleSpecs.map((spec, specIndex) => {
              const highlightIndex = findHighlightedIndex(spec, products);
              return (
                <tr key={spec.key} className={specIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700 sticky left-0 bg-inherit border-r border-gray-200">
                    {spec.label}
                    {spec.unit && <span className="text-gray-400 ml-1">({spec.unit})</span>}
                  </td>
                  {products.map((product, productIndex) => {
                    const value = specValue(spec, product);
                    const isHighlighted = highlightIndex === productIndex;
                    return (
                      <td
                        key={product.id}
                        className={`px-4 py-3 text-sm text-center ${
                          isHighlighted
                            ? "bg-green-50 font-semibold text-green-700"
                            : "text-gray-600"
                        }`}
                      >
                        {value}
                        {isHighlighted && (
                          <span
                            className="ml-1 text-green-500"
                            title={`Best ${spec.highlight === "highest" ? "highest" : "lowest"}`}
                          >
                            *
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span className="inline-flex items-center">
          <span className="text-green-500 mr-1">*</span>
          Best value for the specification
        </span>
      </div>
    </div>
  );
}

export default PumpComparisonTable;
