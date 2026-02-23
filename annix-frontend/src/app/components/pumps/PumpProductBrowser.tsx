"use client";

import { SelectionResult } from "@annix/product-data/pumps/pumpSelectionGuide";
import { useCallback, useMemo, useState } from "react";
import { Api610SelectionWizard } from "./Api610SelectionWizard";
import { PumpProductCard, PumpProductCardData } from "./PumpProductCard";
import { PumpSelectionWizard } from "./PumpSelectionWizard";

interface PumpProductBrowserProps {
  products: PumpProductCardData[];
  onRequestQuote?: (products: PumpProductCardData[], requirements?: any) => void;
  onProductDetail?: (product: PumpProductCardData) => void;
  showSelectionWizard?: boolean;
  showApi610Wizard?: boolean;
}

type BrowserMode = "browse" | "selection-wizard" | "api610-wizard";
type ViewMode = "grid" | "list";

const CATEGORY_LABELS: Record<string, string> = {
  centrifugal: "Centrifugal Pumps",
  positive_displacement: "Positive Displacement",
  specialty: "Specialty Pumps",
};

const APPLICATION_FILTERS = [
  { value: "water_supply", label: "Water Supply" },
  { value: "wastewater", label: "Wastewater" },
  { value: "chemical", label: "Chemical Process" },
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "mining", label: "Mining & Slurry" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "hvac", label: "HVAC" },
  { value: "fire_protection", label: "Fire Protection" },
];

export function PumpProductBrowser({
  products,
  onRequestQuote,
  onProductDetail,
  showSelectionWizard = true,
  showApi610Wizard = true,
}: PumpProductBrowserProps) {
  const [mode, setMode] = useState<BrowserMode>("browse");
  const [selectedProducts, setSelectedProducts] = useState<PumpProductCardData[]>([]);
  const [selectionRequirements, setSelectionRequirements] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("");
  const [applicationFilter, setApplicationFilter] = useState<string>("");
  const [flowRateRange, setFlowRateRange] = useState<{ min?: number; max?: number }>({});
  const [headRange, setHeadRange] = useState<{ min?: number; max?: number }>({});
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const manufacturers = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.manufacturer))];
    return unique.sort();
  }, [products]);

  const categories = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.category))];
    return unique.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products].filter((p) => p.status === "active");

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.manufacturer.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.pumpType?.toLowerCase().includes(query),
      );
    }

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (manufacturerFilter) {
      result = result.filter((p) => p.manufacturer === manufacturerFilter);
    }

    if (applicationFilter) {
      result = result.filter(
        (p) =>
          p.pumpType?.includes(applicationFilter) || p.description?.includes(applicationFilter),
      );
    }

    if (flowRateRange.min !== undefined) {
      result = result.filter((p) => (p.flowRateMax ?? 0) >= flowRateRange.min!);
    }
    if (flowRateRange.max !== undefined) {
      result = result.filter((p) => (p.flowRateMin ?? 0) <= flowRateRange.max!);
    }

    if (headRange.min !== undefined) {
      result = result.filter((p) => (p.headMax ?? 0) >= headRange.min!);
    }
    if (headRange.max !== undefined) {
      result = result.filter((p) => (p.headMin ?? 0) <= headRange.max!);
    }

    return result;
  }, [
    products,
    searchQuery,
    categoryFilter,
    manufacturerFilter,
    applicationFilter,
    flowRateRange,
    headRange,
  ]);

  const handleProductToggle = useCallback((product: PumpProductCardData) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  }, []);

  const handleSelectionComplete = useCallback((result: SelectionResult) => {
    setSelectionRequirements(result);

    const recommendedType = result.recommendedTypes[0]?.type;
    if (recommendedType) {
      setCategoryFilter(recommendedType.category);
    }

    setMode("browse");
  }, []);

  const handleApi610Complete = useCallback((result: any, criteria: any) => {
    setSelectionRequirements({ api610: result, criteria });

    const topType = result.suitableTypes[0];
    if (topType) {
      const category =
        topType.type.category === "OH"
          ? "centrifugal"
          : topType.type.category === "BB"
            ? "centrifugal"
            : "specialty";
      setCategoryFilter(category);
    }

    setMode("browse");
  }, []);

  const handleRequestQuote = useCallback(() => {
    if (onRequestQuote && selectedProducts.length > 0) {
      onRequestQuote(selectedProducts, selectionRequirements);
    }
  }, [onRequestQuote, selectedProducts, selectionRequirements]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("");
    setManufacturerFilter("");
    setApplicationFilter("");
    setFlowRateRange({});
    setHeadRange({});
  }, []);

  const isProductSelected = useCallback(
    (product: PumpProductCardData) => selectedProducts.some((p) => p.id === product.id),
    [selectedProducts],
  );

  if (mode === "selection-wizard") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode("browse")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Browse
        </button>
        <PumpSelectionWizard onComplete={handleSelectionComplete} />
      </div>
    );
  }

  if (mode === "api610-wizard") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode("browse")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Browse
        </button>
        <Api610SelectionWizard onComplete={handleApi610Complete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(showSelectionWizard || showApi610Wizard) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Need help selecting a pump?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use our selection wizards to find the right pump for your application
          </p>
          <div className="flex flex-wrap gap-3">
            {showSelectionWizard && (
              <button
                onClick={() => setMode("selection-wizard")}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Application-Based Selection
              </button>
            )}
            {showApi610Wizard && (
              <button
                onClick={() => setMode("api610-wizard")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                API 610 Classification
              </button>
            )}
          </div>
        </div>
      )}

      {selectionRequirements && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-green-800">Selection Criteria Applied</h4>
              <p className="text-sm text-green-700 mt-1">
                {selectionRequirements.api610
                  ? `API 610 Category: ${selectionRequirements.api610.categoryRecommendation}`
                  : `Recommended: ${selectionRequirements.recommendedTypes?.[0]?.type.label ?? "Based on your requirements"}`}
              </p>
            </div>
            <button
              onClick={() => setSelectionRequirements(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pumps by name, SKU, or manufacturer..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </option>
              ))}
            </select>

            <select
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((mfr) => (
                <option key={mfr} value={mfr}>
                  {mfr}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 border rounded-md flex items-center gap-2 ${
                showAdvancedFilters
                  ? "border-blue-500 text-blue-600"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>

            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 ${viewMode === "grid" ? "bg-gray-100" : ""}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 ${viewMode === "list" ? "bg-gray-100" : ""}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
              <select
                value={applicationFilter}
                onChange={(e) => setApplicationFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Applications</option>
                {APPLICATION_FILTERS.map((app) => (
                  <option key={app.value} value={app.value}>
                    {app.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flow Rate (m³/h)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={flowRateRange.min ?? ""}
                  onChange={(e) =>
                    setFlowRateRange((prev) => ({
                      ...prev,
                      min: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Min"
                  className="w-1/2 border border-gray-300 rounded-md px-2 py-2"
                />
                <input
                  type="number"
                  value={flowRateRange.max ?? ""}
                  onChange={(e) =>
                    setFlowRateRange((prev) => ({
                      ...prev,
                      max: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Max"
                  className="w-1/2 border border-gray-300 rounded-md px-2 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Head (m)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={headRange.min ?? ""}
                  onChange={(e) =>
                    setHeadRange((prev) => ({
                      ...prev,
                      min: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Min"
                  className="w-1/2 border border-gray-300 rounded-md px-2 py-2"
                />
                <input
                  type="number"
                  value={headRange.max ?? ""}
                  onChange={(e) =>
                    setHeadRange((prev) => ({
                      ...prev,
                      max: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Max"
                  className="w-1/2 border border-gray-300 rounded-md px-2 py-2"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
        </p>

        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedProducts([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
            {onRequestQuote && (
              <button
                onClick={handleRequestQuote}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                Request Quote
              </button>
            )}
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-4"
          }
        >
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`relative ${isProductSelected(product) ? "ring-2 ring-blue-500 rounded-lg" : ""}`}
            >
              <button
                onClick={() => handleProductToggle(product)}
                className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isProductSelected(product)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300"
                }`}
              >
                {isProductSelected(product) && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
              <PumpProductCard
                product={product}
                onSelect={onProductDetail ? () => onProductDetail(product) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PumpProductBrowser;
