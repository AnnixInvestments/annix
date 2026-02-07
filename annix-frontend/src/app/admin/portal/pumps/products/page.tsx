"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PUMP_MANUFACTURERS, PUMP_PRICING_TIERS, PUMP_TYPES } from "@/app/lib/config/pumps";
import { Breadcrumb } from "../components/Breadcrumb";

type SortColumn = "label" | "category" | "priceRange";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="inline-block ml-1">
      {active ? (
        direction === "asc" ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )
      ) : (
        <svg
          className="w-4 h-4 inline text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      )}
    </span>
  );
}

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString("en-ZA")}`;
}

export default function PumpProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("label");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(PUMP_TYPES.map((t) => t.category))];
    return uniqueCategories.sort();
  }, []);

  const filteredProducts = useMemo(() => {
    let products = PUMP_TYPES.map((type) => {
      const pricingTier =
        PUMP_PRICING_TIERS.newPumps.find((tier) =>
          tier.value.toLowerCase().includes(type.category.toLowerCase()),
        ) || PUMP_PRICING_TIERS.newPumps[0];

      return {
        ...type,
        priceMin: pricingTier?.basePriceRange.min || 0,
        priceMax: pricingTier?.basePriceRange.max || 0,
      };
    });

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.label.toLowerCase().includes(query) ||
          p.value.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query),
      );
    }

    if (categoryFilter) {
      products = products.filter((p) => p.category === categoryFilter);
    }

    products.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "label") {
        return direction * a.label.localeCompare(b.label);
      } else if (sortColumn === "category") {
        return direction * a.category.localeCompare(b.category);
      } else if (sortColumn === "priceRange") {
        return direction * (a.priceMin - b.priceMin);
      }
      return 0;
    });

    return products;
  }, [searchQuery, categoryFilter, sortColumn, sortDirection]);

  const paginatedProducts = filteredProducts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setManufacturerFilter("");
    setCurrentPage(0);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Products" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pump Products</h1>
          <p className="mt-1 text-sm text-gray-600">Browse and manage pump types and products</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => {}}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Type, category..."
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-gray-600"
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
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Manufacturer:</label>
            <select
              value={manufacturerFilter}
              onChange={(e) => {
                setManufacturerFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">All Manufacturers</option>
              {PUMP_MANUFACTURERS.map((mfr) => (
                <option key={mfr.name} value={mfr.name}>
                  {mfr.name}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || categoryFilter || manufacturerFilter) && (
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800">
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || categoryFilter
                ? "Try adjusting your filters"
                : "Add your first pump product."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("label")}
                  >
                    Pump Type
                    <SortIcon active={sortColumn === "label"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("category")}
                  >
                    Category
                    <SortIcon active={sortColumn === "category"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    API Standard
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("priceRange")}
                  >
                    Price Range (ZAR)
                    <SortIcon active={sortColumn === "priceRange"} direction={sortDirection} />
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.value} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/portal/pumps/products/${encodeURIComponent(product.value)}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {product.label}
                      </Link>
                      <div className="text-xs text-gray-500">{product.value}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.category === "centrifugal"
                            ? "bg-blue-100 text-blue-700"
                            : product.category === "positive_displacement"
                              ? "bg-green-100 text-green-700"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {product.category
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.apiStandard || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.priceMin > 0 ? (
                        <span>
                          {formatCurrency(product.priceMin)} - {formatCurrency(product.priceMax)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Request quote</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/portal/pumps/products/${encodeURIComponent(product.value)}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {currentPage * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed border rounded"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed border rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Pump Categories</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Centrifugal:</strong> End suction, multistage, vertical turbine,
                  submersible
                </li>
                <li>
                  <strong>Positive Displacement:</strong> Gear, screw, vane, peristaltic, diaphragm,
                  piston
                </li>
                <li>
                  <strong>Specialty:</strong> Vacuum, cryogenic, chemical duty, slurry, fire pumps
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
