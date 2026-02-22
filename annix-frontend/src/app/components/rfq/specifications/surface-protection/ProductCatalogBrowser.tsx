"use client";

import { ceramicProducts } from "@product-data/ceramic/ceramicProducts";
import { paintProducts } from "@product-data/paint/paintProducts";
import { rubberProducts } from "@product-data/rubber/rubberProducts";
import React, { useMemo, useState } from "react";

type ProductType = "paint" | "rubber" | "ceramic" | "all";
type PriceCategory = "economy" | "standard" | "premium" | "all";

interface ProductCatalogBrowserProps {
  onSelectProduct?: (product: any, type: ProductType) => void;
  filterType?: ProductType;
  showPricing?: boolean;
}

export function ProductCatalogBrowser({
  onSelectProduct,
  filterType = "all",
  showPricing = false,
}: ProductCatalogBrowserProps) {
  const [selectedType, setSelectedType] = useState<ProductType>(filterType);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedPriceCategory, setSelectedPriceCategory] = useState<PriceCategory>("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const allProducts = useMemo(() => {
    const products: Array<{
      id: string;
      name: string;
      supplier: string;
      type: ProductType;
      description: string;
      maxTempC: number;
      category: string;
    }> = [];

    if (selectedType === "all" || selectedType === "paint") {
      paintProducts.forEach((p) => {
        products.push({
          id: p.id,
          name: p.name,
          supplier: p.supplier,
          type: "paint",
          description: p.description || "",
          maxTempC: p.heatResistance.continuousC,
          category: p.genericType,
        });
      });
    }

    if (selectedType === "all" || selectedType === "rubber") {
      rubberProducts.forEach((p) => {
        products.push({
          id: p.id,
          name: p.name,
          supplier: p.supplier,
          type: "rubber",
          description: `${p.polymerBase} - ${p.sans1198 ? `SANS 1198 Type ${p.sans1198.type}` : "General purpose"}`,
          maxTempC: p.maxOperatingTempC,
          category: p.polymerBase,
        });
      });
    }

    if (selectedType === "all" || selectedType === "ceramic") {
      ceramicProducts.forEach((p) => {
        products.push({
          id: p.id,
          name: p.name,
          supplier: p.supplier,
          type: "ceramic",
          description: `${p.material} - ${p.aluminaContentPercent}% Al2O3`,
          maxTempC: p.maxOperatingTempC,
          category: p.material,
        });
      });
    }

    return products;
  }, [selectedType]);

  const suppliers = useMemo(() => {
    const supplierSet = new Set(allProducts.map((p) => p.supplier));
    return Array.from(supplierSet).sort();
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesSearch =
        searchTerm === "" ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSupplier = selectedSupplier === "all" || p.supplier === selectedSupplier;

      return matchesSearch && matchesSupplier;
    });
  }, [allProducts, searchTerm, selectedSupplier]);

  const typeColors = {
    paint: "bg-orange-100 text-orange-800",
    rubber: "bg-blue-100 text-blue-800",
    ceramic: "bg-purple-100 text-purple-800",
    all: "bg-gray-100 text-gray-800",
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Product Catalog
        </h3>
        <span className="text-xs text-gray-500">{filteredProducts.length} products</span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div>
          <label className="block text-[10px] font-medium text-gray-600 mb-1">Product Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ProductType)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="paint">Paint/Coating</option>
            <option value="rubber">Rubber Lining</option>
            <option value="ceramic">Ceramic Tile</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-600 mb-1">Supplier</label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-medium text-gray-600 mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded">
        {filteredProducts.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No products found matching your criteria
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium text-gray-600">Product</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-600">Supplier</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-600">Type</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-600">Max Temp</th>
                {onSelectProduct && (
                  <th className="px-2 py-1.5 text-center font-medium text-gray-600">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <React.Fragment key={`${product.type}-${product.id}`}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedProduct(expandedProduct === product.id ? null : product.id)
                    }
                  >
                    <td className="px-2 py-2">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-gray-500 truncate max-w-[200px]">{product.category}</div>
                    </td>
                    <td className="px-2 py-2 text-gray-700">{product.supplier}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[product.type]}`}
                      >
                        {product.type}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-gray-700">{product.maxTempC}C</td>
                    {onSelectProduct && (
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProduct(product, product.type);
                          }}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                        >
                          Select
                        </button>
                      </td>
                    )}
                  </tr>
                  {expandedProduct === product.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={onSelectProduct ? 5 : 4} className="px-4 py-2">
                        <div className="text-xs text-gray-600">
                          <strong>Description:</strong> {product.description}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
